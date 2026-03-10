"""
FIR Processing API Routes
Endpoints for uploading FIR images, extracting text, and identifying IPC sections
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import Optional
import logging
from datetime import datetime

from app.models.schemas import (
    FIRExtraction, 
    FIRAnalysis, 
    IPCSection, 
    ExtractIPCRequest, 
    ExtractIPCResponse,
    ErrorResponse
)
from app.services.ocr_service import (
    extract_text_from_image, 
    clean_extracted_text, 
    detect_language,
    translate_to_english
)
from app.services.ipc_extractor import (
    extract_ipc_sections, 
    extract_section_numbers,
    extract_fir_metadata,
    generate_summary
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Allowed image types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_image(file: UploadFile) -> None:
    """Validate uploaded image file"""
    # Check file extension
    if file.filename:
        ext = file.filename.rsplit('.', 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
    
    # Check content type
    if file.content_type and not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )


@router.post("/fir/extract", response_model=FIRExtraction)
async def extract_fir_text(
    file: UploadFile = File(..., description="FIR image file (PNG, JPG, etc.)"),
    preprocess: bool = Form(True, description="Apply image preprocessing for better OCR")
):
    """
    Extract text from an uploaded FIR image using OCR
    
    - **file**: FIR image file (supports PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP)
    - **preprocess**: Enable image preprocessing for better OCR results (default: True)
    
    Returns extracted text with confidence score
    """
    try:
        # Validate file
        validate_image(file)
        
        # Read file contents
        contents = await file.read()
        
        # Check file size
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        logger.info(f"Processing FIR image: {file.filename}, size: {len(contents)} bytes")
        
        # Extract text using OCR
        raw_text, confidence, method = extract_text_from_image(contents, preprocess=preprocess)
        
        # Clean the extracted text
        cleaned_text = clean_extracted_text(raw_text)
        
        # Translate if not English
        translated_text = None
        if language != "en":
            translated_text = translate_to_english(cleaned_text, language)
        
        return FIRExtraction(
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            translated_text=translated_text,
            confidence=round(confidence, 3),
            language_detected=language,
            extraction_method=method
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting text from FIR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )


@router.post("/fir/extract-ipc", response_model=ExtractIPCResponse)
async def extract_ipc_from_text(request: ExtractIPCRequest):
    """
    Extract IPC sections from provided text
    
    - **text**: Text containing IPC section references
    
    Returns list of identified IPC sections with details
    """
    try:
        logger.info(f"Extracting IPC sections from text ({len(request.text)} chars)")
        
        # Extract IPC sections
        ipc_sections = extract_ipc_sections(request.text)
        
        # Get raw matches for debugging
        _, raw_matches = extract_section_numbers(request.text)
        
        # Convert to response format
        sections = [
            IPCSection(
                section=s['section'],
                title=s['title'],
                description=s['description'],
                punishment=s['punishment'],
                category=s['category'],
                confidence=s['confidence']
            )
            for s in ipc_sections
        ]
        
        return ExtractIPCResponse(
            ipc_sections=sections,
            raw_matches=raw_matches,
            total_found=len(sections)
        )
        
    except Exception as e:
        logger.error(f"Error extracting IPC sections: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting IPC sections: {str(e)}"
        )


@router.post("/fir/analyze", response_model=FIRAnalysis)
async def analyze_fir(
    file: UploadFile = File(..., description="FIR image file"),
    preprocess: bool = Form(True, description="Apply image preprocessing")
):
    """
    Complete FIR analysis: Extract text, identify IPC sections, and extract metadata
    
    - **file**: FIR image file (PNG, JPG, etc.)
    - **preprocess**: Enable image preprocessing (default: True)
    
    Returns complete analysis including:
    - Extracted text
    - Identified IPC sections with details
    - Extracted metadata (complainant, accused, dates, etc.)
    - AI-generated summary
    """
    try:
        # Validate file
        validate_image(file)
        
        # Read file contents
        contents = await file.read()
        
        # Check file size
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        logger.info(f"Analyzing FIR image: {file.filename}")
        
        # Step 1: Extract text using OCR
        raw_text, confidence, method = extract_text_from_image(contents, preprocess=preprocess)
        cleaned_text = clean_extracted_text(raw_text)
        language = detect_language(cleaned_text)
        # Translate if necessary
        translated_text = None
        if language != "en":
            translated_text = translate_to_english(cleaned_text, language)
        
        extraction = FIRExtraction(
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            translated_text=translated_text,
            confidence=round(confidence, 3),
            language_detected=language,
            extraction_method=method
        )
        
        # Determine base text for downstream NLP tasks
        analysis_text = translated_text if translated_text else cleaned_text
        
        # Step 2: Extract IPC sections
        ipc_sections_raw = extract_ipc_sections(analysis_text)
        ipc_sections = [
            IPCSection(
                section=s['section'],
                title=s['title'],
                description=s['description'],
                punishment=s['punishment'],
                category=s['category'],
                confidence=s['confidence']
            )
            for s in ipc_sections_raw
        ]
        
        # Step 3: Extract metadata
        metadata = extract_fir_metadata(analysis_text)
        
        # Step 4: Generate summary
        summary = generate_summary(analysis_text, ipc_sections_raw)
        
        return FIRAnalysis(
            extraction=extraction,
            ipc_sections=ipc_sections,
            complainant_name=metadata.get('complainant_name'),
            accused_name=metadata.get('accused_name'),
            incident_date=metadata.get('incident_date'),
            incident_location=metadata.get('incident_location'),
            police_station=metadata.get('police_station'),
            fir_number=metadata.get('fir_number'),
            summary=summary,
            timestamp=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing FIR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing FIR: {str(e)}"
        )


@router.get("/ipc/sections")
async def list_ipc_sections(
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """
    List available IPC sections from database
    
    - **category**: Filter by category (e.g., "Against Person", "Against Property")
    - **search**: Search in section titles and descriptions
    """
    try:
        from app.services.ipc_extractor import load_ipc_database
        
        db = load_ipc_database()
        
        results = []
        for section_num, info in db.items():
            # Apply category filter
            if category and info.get('category', '').lower() != category.lower():
                continue
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                if not (
                    search_lower in section_num.lower() or
                    search_lower in info.get('title', '').lower() or
                    search_lower in info.get('description', '').lower()
                ):
                    continue
            
            results.append({
                "section": section_num,
                **info
            })
        
        return {
            "total": len(results),
            "sections": sorted(results, key=lambda x: x['section'])
        }
        
    except Exception as e:
        logger.error(f"Error listing IPC sections: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing IPC sections: {str(e)}"
        )


@router.get("/ipc/sections/{section_number}")
async def get_ipc_section(section_number: str):
    """
    Get details of a specific IPC section
    
    - **section_number**: IPC section number (e.g., "302", "376A")
    """
    try:
        from app.services.ipc_extractor import get_section_info
        
        info = get_section_info(section_number)
        
        if not info:
            raise HTTPException(
                status_code=404,
                detail=f"IPC Section {section_number} not found in database"
            )
        
        return {
            "section": section_number.upper(),
            **info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting IPC section: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting IPC section: {str(e)}"
        )


@router.get("/crime-statistics")
async def get_crime_statistics(
    state: Optional[str] = None,
    category: Optional[str] = None
):
    """
    Get crime statistics from NCRB data (2014-2016)
    
    - **state**: Filter by state name
    - **category**: Filter by crime category (e.g., "offences_affecting_human_body")
    
    Returns comprehensive crime statistics including incidence and crime rates
    """
    try:
        import json
        from pathlib import Path
        
        stats_path = Path(__file__).parent.parent.parent / "data" / "crime_statistics.json"
        
        with open(stats_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        result = {
            "metadata": data["metadata"],
            "all_india_summary": data["all_india_summary"]
        }
        
        # Filter by category if specified
        if category:
            category_key = category.lower().replace(" ", "_")
            if category_key in data["crime_categories"]:
                result["crime_categories"] = {
                    category_key: data["crime_categories"][category_key]
                }
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Category '{category}' not found. Available: {list(data['crime_categories'].keys())}"
                )
        else:
            result["crime_categories"] = data["crime_categories"]
        
        # Filter by state if specified
        if state:
            state_data = [
                s for s in data["state_wise_statistics_2016"]
                if state.lower() in s["state"].lower()
            ]
            if state_data:
                result["state_statistics"] = state_data
            else:
                available_states = [s["state"] for s in data["state_wise_statistics_2016"]]
                raise HTTPException(
                    status_code=404,
                    detail=f"State '{state}' not found. Available: {available_states}"
                )
        else:
            result["state_statistics"] = data["state_wise_statistics_2016"]
        
        result["top_crimes"] = data["top_crimes_by_incidence_2016"]
        
        return result
        
    except HTTPException:
        raise
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Crime statistics data not found"
        )
    except Exception as e:
        logger.error(f"Error fetching crime statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching crime statistics: {str(e)}"
        )


@router.get("/sample-firs")
async def get_sample_firs(
    category: Optional[str] = None,
    limit: int = 10
):
    """
    Get sample FIR templates for testing
    
    - **category**: Filter by crime category (murder, robbery, kidnapping, etc.)
    - **limit**: Maximum number of FIRs to return (default: 10)
    
    Returns realistic FIR templates for testing IPC extraction
    """
    try:
        import json
        from pathlib import Path
        
        firs_path = Path(__file__).parent.parent.parent / "data" / "sample_firs.json"
        
        with open(firs_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        firs = data["sample_firs"]
        
        # Filter by category if specified
        if category:
            firs = [f for f in firs if f["category"].lower() == category.lower()]
        
        # Apply limit
        firs = firs[:limit]
        
        return {
            "total": len(firs),
            "sample_firs": firs,
            "available_categories": list(set(f["category"] for f in data["sample_firs"]))
        }
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Sample FIRs data not found"
        )
    except Exception as e:
        logger.error(f"Error fetching sample FIRs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching sample FIRs: {str(e)}"
        )


@router.get("/sample-firs/{fir_id}")
async def get_sample_fir(fir_id: str):
    """
    Get a specific sample FIR by ID
    
    - **fir_id**: FIR identifier (e.g., "FIR-001")
    """
    try:
        import json
        from pathlib import Path
        
        firs_path = Path(__file__).parent.parent.parent / "data" / "sample_firs.json"
        
        with open(firs_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for fir in data["sample_firs"]:
            if fir["id"].lower() == fir_id.lower():
                return fir
        
        raise HTTPException(
            status_code=404,
            detail=f"FIR '{fir_id}' not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sample FIR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching sample FIR: {str(e)}"
        )
