"""
OCR Service for FIR Image Processing
Uses EasyOCR for text extraction with support for both printed and handwritten text
"""
import io
import re
import logging
import os
from typing import Optional, Tuple
from PIL import Image, ImageEnhance
import numpy as np
from langdetect import detect
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)

# Global OCR reader (lazy loaded)
_ocr_reader = None
_trocr_processor = None
_trocr_model = None
_trocr_model_id = None

HF_OCR_ENABLE_TROCR = os.getenv("HF_OCR_ENABLE_TROCR", "true").lower() == "true"
HF_OCR_MODEL_ID = os.getenv("HF_OCR_MODEL_ID", "microsoft/trocr-base-printed")
HF_OCR_MAX_EDGE = int(os.getenv("HF_OCR_MAX_EDGE", "1400"))


def get_ocr_reader():
    """Lazy load EasyOCR reader"""
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            logger.info("Loading EasyOCR model (English + Hindi)...")
            _ocr_reader = easyocr.Reader(['en', 'hi'], gpu=False)
            logger.info("EasyOCR model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load EasyOCR: {e}")
            raise
    return _ocr_reader


def get_trocr_components():
    """Lazy load Hugging Face TrOCR model and processor"""
    global _trocr_processor, _trocr_model, _trocr_model_id

    if _trocr_processor is not None and _trocr_model is not None and _trocr_model_id == HF_OCR_MODEL_ID:
        return _trocr_processor, _trocr_model, _trocr_model_id

    from transformers import TrOCRProcessor, VisionEncoderDecoderModel

    logger.info("Loading Hugging Face TrOCR model: %s", HF_OCR_MODEL_ID)
    _trocr_processor = TrOCRProcessor.from_pretrained(HF_OCR_MODEL_ID)
    _trocr_model = VisionEncoderDecoderModel.from_pretrained(HF_OCR_MODEL_ID)
    _trocr_model_id = HF_OCR_MODEL_ID
    return _trocr_processor, _trocr_model, _trocr_model_id


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Preprocess image for better OCR results
    - Convert to grayscale
    - Enhance contrast
    - Denoise
    """
    import cv2
    
    # Convert PIL to numpy
    img_array = np.array(image)
    
    # Convert to grayscale if needed
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
        
    # Resize if image is too large (to prevent OCR from taking > 1 minute on CPU)
    # Maximum width 1000px, keeping aspect ratio
    height, width = gray.shape
    if width > 1000:
        ratio = 1000.0 / width
        new_height = int(height * ratio)
        gray = cv2.resize(gray, (1000, new_height), interpolation=cv2.INTER_AREA)
    
    # Apply adaptive thresholding for better text visibility
    # Use OTSU thresholding for mixed content
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # We remove fastNlMeansDenoising because it takes >60 seconds on standard CPU
    # Instead, we just return the optimized binary image
    return Image.fromarray(binary)


def _prepare_image_for_trocr(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    width, height = image.size
    longest_edge = max(width, height)
    if longest_edge > HF_OCR_MAX_EDGE:
        ratio = HF_OCR_MAX_EDGE / float(longest_edge)
        new_size = (int(width * ratio), int(height * ratio))
        image = image.resize(new_size)
    return image


def _extract_with_easyocr(image: Image.Image) -> Tuple[str, float]:
    img_array = np.array(image)
    reader = get_ocr_reader()
    results = reader.readtext(img_array, detail=1, paragraph=True)

    texts = []
    confidences = []
    for result in results:
        if len(result) >= 2:
            text = result[1] if isinstance(result[1], str) else str(result[1])
            texts.append(text)
            if len(result) >= 3 and isinstance(result[2], (int, float)):
                confidences.append(float(result[2]))
            else:
                confidences.append(0.8)

    extracted_text = "\n".join(texts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    return extracted_text, avg_confidence


def _extract_with_trocr(image: Image.Image) -> Tuple[str, float]:
    processor, model, _ = get_trocr_components()
    prepared = _prepare_image_for_trocr(image)
    pixel_values = processor(images=prepared, return_tensors="pt").pixel_values
    generated_ids = model.generate(pixel_values, max_new_tokens=1024)
    text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    # TrOCR does not output token-level confidence directly in this pipeline.
    return text, 0.75


def _score_fir_text_quality(text: str) -> float:
    if not text:
        return 0.0

    lowered = text.lower()
    fir_keywords = [
        "fir", "first information report", "police station", "ipc", "section",
        "u/s", "complainant", "accused", "offence", "incident", "investigation",
    ]
    keyword_hits = sum(1 for keyword in fir_keywords if keyword in lowered)
    section_hits = len(re.findall(r"\b(?:section|ipc|u/s)\s*\d{1,3}[a-z]?\b", lowered, flags=re.IGNORECASE))
    numeric_hits = len(re.findall(r"\b\d{2,4}\b", lowered))

    ipc_hits = 0
    try:
        # Late import avoids circular import overhead unless scoring is called.
        from app.services.ipc_extractor import extract_section_numbers
        extracted_sections, _ = extract_section_numbers(text)
        ipc_hits = len(extracted_sections)
    except Exception:
        ipc_hits = 0

    return (keyword_hits * 1.5) + (section_hits * 2.5) + min(3.0, numeric_hits * 0.05) + (ipc_hits * 3.0)


def _build_easyocr_candidates(base_image: Image.Image, preprocess: bool) -> list[tuple[str, Image.Image]]:
    """
    Build multiple OCR candidates so noisy FIR scans can be read from different renderings.
    """
    candidates: list[tuple[str, Image.Image]] = [("orig", base_image.convert("RGB"))]

    if preprocess:
        try:
            candidates.append(("preprocessed", preprocess_image(base_image)))
        except Exception as pre_error:
            logger.warning("Preprocess candidate generation failed: %s", pre_error)

    # High-contrast + sharpened candidate often helps form-like FIR documents.
    try:
        gray = base_image.convert("L")
        contrast = ImageEnhance.Contrast(gray).enhance(2.2)
        sharp = ImageEnhance.Sharpness(contrast).enhance(1.8)
        candidates.append(("contrast_sharp", sharp.convert("RGB")))
    except Exception as enhance_error:
        logger.warning("Enhanced candidate generation failed: %s", enhance_error)

    return candidates


def extract_text_from_image(image_bytes: bytes, preprocess: bool = True) -> Tuple[str, float, str]:
    """
    Extract text from FIR image using EasyOCR
    
    Args:
        image_bytes: Raw image bytes
        preprocess: Whether to preprocess the image
        
    Returns:
        Tuple of (extracted_text, confidence_score, method_used)
    """
    try:
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        candidates = _build_easyocr_candidates(image, preprocess)

        best_text = ""
        best_conf = 0.0
        best_method = "easyocr"
        best_score = -1.0

        for candidate_name, candidate_image in candidates:
            try:
                easy_text, easy_conf = _extract_with_easyocr(candidate_image)
                easy_score = _score_fir_text_quality(clean_extracted_text(easy_text))

                if easy_score > best_score:
                    best_text = easy_text
                    best_conf = easy_conf
                    best_method = f"easyocr:{candidate_name}"
                    best_score = easy_score
            except Exception as candidate_error:
                logger.warning("EasyOCR candidate '%s' failed: %s", candidate_name, candidate_error)

        if HF_OCR_ENABLE_TROCR:
            try:
                trocr_text, trocr_conf = _extract_with_trocr(image)
                trocr_score = _score_fir_text_quality(clean_extracted_text(trocr_text))
                if trocr_score > best_score:
                    best_text = trocr_text
                    best_conf = trocr_conf
                    best_method = f"trocr:{HF_OCR_MODEL_ID}"
                    best_score = trocr_score
            except Exception as trocr_error:
                logger.warning("TrOCR fallback failed, using EasyOCR result: %s", trocr_error)

        if not best_text.strip():
            raise RuntimeError("All OCR extraction candidates failed to produce text")

        return best_text, best_conf, best_method
        
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise


def clean_extracted_text(text: str) -> str:
    """
    Clean and normalize extracted text
    - Remove extra whitespace
    - Fix common OCR errors
    - Normalize IPC section references
    """
    if not text:
        return ""
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    # Fix common OCR errors for IPC sections
    # Pattern: "Section" or "Sec" or "S." followed by numbers
    text = re.sub(r'\bSec\.\s*', 'Section ', text, flags=re.IGNORECASE)
    text = re.sub(r'\bS\.\s*', 'Section ', text, flags=re.IGNORECASE)
    text = re.sub(r'\bSec\s+', 'Section ', text, flags=re.IGNORECASE)
    
    # Normalize "u/s" (under section) patterns
    text = re.sub(r'\bu/s\b', 'under Section', text, flags=re.IGNORECASE)
    text = re.sub(r'\bU/S\b', 'under Section', text)
    
    # Fix common number/letter confusions
    text = re.sub(r'\b0(?=[0-9])', 'O', text)  # Leading zero that should be O
    text = re.sub(r'l(?=[0-9]{2})', '1', text)  # lowercase L before numbers
    
    # Normalize IPC references
    text = re.sub(r'\bI\.P\.C\.?\b', 'IPC', text, flags=re.IGNORECASE)
    text = re.sub(r'\bIndian Penal Code\b', 'IPC', text, flags=re.IGNORECASE)
    
    return text


def detect_language(text: str) -> str:
    """
    Precise language detection using langdetect
    """
    if not text or not text.strip():
        return "en"
    
    try:
        lang = detect(text)
        return lang
    except Exception as e:
        logger.warning(f"Language detection failed, defaulting to 'en': {e}")
        return "en"

def translate_to_english(text: str, source_lang: str) -> str:
    """
    Translates text to English using Google Translator API via deep-translator 
    with high precision if the source language is not already English.
    """
    if not text or source_lang == 'en':
        return text
        
    try:
        logger.info(f"Translating FIR text from {source_lang} to English...")
        translator = GoogleTranslator(source=source_lang, target='en')
        
        # Google Translator has a 5000 char limit. Split if necessary.
        if len(text) > 4999:
            chunks = [text[i:i+4900] for i in range(0, len(text), 4900)]
            translated_chunks = [translator.translate(chunk) for chunk in chunks]
            translated_text = " ".join(translated_chunks)
        else:
            translated_text = translator.translate(text)
            
        logger.info("Translation complete.")
        return translated_text
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        # Return original text if translation fails to avoid breaking the pipeline
        return text
