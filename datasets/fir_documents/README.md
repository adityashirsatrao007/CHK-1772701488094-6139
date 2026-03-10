# FIR Training Dataset

Training data for the OCR and document analysis module. Contains scanned FIR (First Information Report) documents collected from various police stations.

## Overview

This folder contains FIR document images used to train our text extraction and field recognition models. The documents are a mix of printed forms with handwritten entries - which is the standard format used in Indian police stations.

## Structure

- `FIR_images_v1/` - Scanned FIR document images (544 files)
- `FIR_details.json` - Annotation data with bounding boxes and text transcriptions

## Annotation Format

Each document has annotations for key fields:

| Field | Description |
|-------|-------------|
| Police Station | Name of the PS where the FIR was filed |
| Year | Year when the complaint was registered |
| Statutes | IPC sections / laws mentioned |
| Complainant Name | Name of the person filing the complaint |

The JSON structure looks like:
```json
{
  "image_id": 1,
  "bbox": [x_min, y_min, x_max, y_max],
  "category_id": 0,
  "image_name": "filename.jpg",
  "text": "extracted text"
}
```

Category IDs:
- 0: Police Station
- 1: Year
- 2: Statutes
- 3: Complainant Name

## Usage

This data is used by the backend OCR service (`backend/app/services/ocr_service.py`) to:
1. Train text localization models
2. Improve handwriting recognition accuracy
3. Extract key information from uploaded FIRs

## Notes

- All images are standardized to 740x1180 pixels
- Documents are from West Bengal police stations (anonymized where needed)
- Total annotations: ~2400+ bounding boxes across all images
