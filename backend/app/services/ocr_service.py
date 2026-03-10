"""
OCR Service for FIR Image Processing
Uses EasyOCR for text extraction with support for both printed and handwritten text
"""
import io
import re
import logging
from typing import Optional, Tuple
from PIL import Image
import numpy as np
from langdetect import detect
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)

# Global OCR reader (lazy loaded)
_ocr_reader = None


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
        
        # Preprocess if requested
        if preprocess:
            try:
                image = preprocess_image(image)
            except Exception as e:
                logger.warning(f"Preprocessing failed, using original image: {e}")
        
        # Convert to numpy array for EasyOCR
        img_array = np.array(image)
        
        # Get OCR reader
        reader = get_ocr_reader()
        
        # Perform OCR
        results = reader.readtext(img_array, detail=1, paragraph=True)
        
        # Extract text and calculate average confidence
        texts = []
        confidences = []
        
        for result in results:
            if len(result) >= 2:
                text = result[1] if isinstance(result[1], str) else str(result[1])
                texts.append(text)
                
                # Confidence is the third element if available
                if len(result) >= 3 and isinstance(result[2], (int, float)):
                    confidences.append(float(result[2]))
                else:
                    confidences.append(0.8)  # Default confidence
        
        extracted_text = '\n'.join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return extracted_text, avg_confidence, "easyocr"
        
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
