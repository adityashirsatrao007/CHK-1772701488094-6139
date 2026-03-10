"""
Pydantic models for API request/response schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class IPCSection(BaseModel):
    """Represents an IPC section found in the FIR"""
    section: str = Field(..., description="IPC section number (e.g., '302', '376')")
    title: str = Field(..., description="Title of the section")
    description: str = Field(..., description="Brief description of the offense")
    punishment: str = Field(..., description="Punishment as per IPC")
    category: str = Field(..., description="Category of offense (e.g., 'Against Person', 'Against Property')")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score of extraction")


class FIRExtraction(BaseModel):
    """Result of FIR text extraction"""
    raw_text: str = Field(..., description="Raw extracted text from FIR image")
    cleaned_text: str = Field(..., description="Cleaned and processed text")
    translated_text: Optional[str] = Field(None, description="Translated text into English if original was in a regional language")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall OCR confidence")
    language_detected: str = Field(default="en", description="Detected language")
    extraction_method: str = Field(..., description="OCR method used (easyocr/trocr)")


class FIRAnalysis(BaseModel):
    """Complete FIR analysis result"""
    extraction: FIRExtraction
    ipc_sections: List[IPCSection] = Field(default_factory=list, description="List of IPC sections found")
    complainant_name: Optional[str] = Field(None, description="Name of complainant if found")
    accused_name: Optional[str] = Field(None, description="Name of accused if found")
    incident_date: Optional[str] = Field(None, description="Date of incident if found")
    incident_location: Optional[str] = Field(None, description="Location of incident if found")
    police_station: Optional[str] = Field(None, description="Police station name if found")
    fir_number: Optional[str] = Field(None, description="FIR number if found")
    summary: str = Field(..., description="AI-generated summary of the FIR")
    timestamp: datetime = Field(default_factory=datetime.now)


class ExtractIPCRequest(BaseModel):
    """Request for IPC extraction from text"""
    text: str = Field(..., min_length=10, description="Text to extract IPC sections from")


class ExtractIPCResponse(BaseModel):
    """Response for IPC extraction"""
    ipc_sections: List[IPCSection]
    raw_matches: List[str] = Field(default_factory=list, description="Raw regex matches found")
    total_found: int


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
