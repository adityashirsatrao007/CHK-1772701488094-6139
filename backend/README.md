# Nyaya AI Backend

AI-powered backend for FIR processing and IPC section extraction.

## Features

- **OCR Text Extraction**: Extract text from FIR images (handwritten or printed) using EasyOCR
- **IPC Section Identification**: Automatically identify Indian Penal Code sections from extracted text
- **Metadata Extraction**: Extract complainant name, accused name, dates, police station, etc.
- **IPC Database**: Comprehensive database of 100+ IPC sections with descriptions and punishments

## Setup

### Prerequisites
- Python 3.9+
- pip

### Installation

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

### Running the Server

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or simply
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
- `GET /` - Welcome message and available endpoints
- `GET /health` - Health check

### FIR Processing
- `POST /api/v1/fir/extract` - Extract text from FIR image
- `POST /api/v1/fir/extract-ipc` - Extract IPC sections from text
- `POST /api/v1/fir/analyze` - Complete FIR analysis (OCR + IPC extraction + metadata)

### IPC Database
- `GET /api/v1/ipc/sections` - List all IPC sections (with optional filtering)
- `GET /api/v1/ipc/sections/{section_number}` - Get details of a specific section

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Example Usage

### Extract text from FIR image

```bash
curl -X POST "http://localhost:8000/api/v1/fir/extract" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@fir_image.jpg" \
  -F "preprocess=true"
```

### Extract IPC sections from text

```bash
curl -X POST "http://localhost:8000/api/v1/fir/extract-ipc" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"text": "The accused is charged under Section 302, 307 and 420 IPC for murder and cheating."}'
```

### Complete FIR Analysis

```bash
curl -X POST "http://localhost:8000/api/v1/fir/analyze" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@fir_image.jpg"
```

## IPC Sections Supported

The database includes 100+ commonly used IPC sections including:

- **Against Person**: 302 (Murder), 307 (Attempt to Murder), 323-326 (Hurt/Grievous Hurt), etc.
- **Against Women**: 354 (Assault), 376 (Rape), 498A (Cruelty), etc.
- **Against Property**: 379-382 (Theft), 392-399 (Robbery/Dacoity), 420 (Cheating), etc.
- **Against Public Tranquility**: 144, 147, 148 (Rioting), etc.

## Tech Stack

- **FastAPI** - Modern Python web framework
- **EasyOCR** - Deep learning based OCR (supports English + Hindi)
- **OpenCV** - Image preprocessing
- **Pydantic** - Data validation

## License

MIT
