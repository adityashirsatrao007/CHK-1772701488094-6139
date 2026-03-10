# Nyaya AI - Technical Workflow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌──────────────────────────┐│
│  │  Login   │  │  Signup   │  │  Dashboard  │  │     Legal Search         ││
│  └────┬─────┘  └─────┬─────┘  └──────┬──────┘  └────────────┬─────────────┘│
│       │              │               │                      │              │
└───────┼──────────────┼───────────────┼──────────────────────┼──────────────┘
        │              │               │                      │
        ▼              ▼               ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (FastAPI)                               │
│                         localhost:8000                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  /auth/*     │  │  /analyze    │  │  /cases/*    │  │  /legal-search  │ │
│  │  JWT Auth    │  │  FIR Process │  │  CRUD Ops    │  │  IPC Search     │ │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  └─────────────────┘ │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ML PIPELINE                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐ │
│  │ Preprocess  │───▶│   EasyOCR   │───▶│  Translate  │───▶│ IPC Extract  │ │
│  │   Image     │    │  EN + HI    │    │  (if needed)│    │   Regex      │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                         │
│  ┌─────────────────┐              ┌─────────────────────────────────────┐  │
│  │   PostgreSQL    │              │         JSON Databases              │  │
│  │  - Users        │              │  - ipc_sections.json (500+ sections)│  │
│  │  - Cases        │              │  - ipc_full_data.json               │  │
│  │  - FIR Records  │              │  - crime_statistics.json            │  │
│  └─────────────────┘              └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FIR Processing Pipeline

### Step 1: Image Upload
```
User uploads FIR image (PNG/JPG) via Dashboard
         │
         ▼
    POST /analyze
    Content-Type: multipart/form-data
    Body: { file: <image>, context: "fir" }
```

### Step 2: Image Preprocessing
```python
# Location: backend/app/services/ocr_service.py

def preprocess_image(image):
    1. Convert to grayscale (RGB → Gray)
    2. Resize if width > 1000px (maintain aspect ratio)
    3. Apply OTSU thresholding (adaptive binarization)
    4. Return optimized binary image
```

**Why these steps?**
| Step | Purpose |
|------|---------|
| Grayscale | Reduces complexity, focuses on text contrast |
| Resize | Prevents OCR timeout on high-res scans |
| OTSU Threshold | Separates text from background automatically |

### Step 3: OCR Text Extraction
```python
# EasyOCR with English + Hindi support
reader = easyocr.Reader(['en', 'hi'], gpu=False)
results = reader.readtext(image_array, detail=1, paragraph=True)

# Returns: [(bbox, text, confidence), ...]
```

**Model Details:**
- **EasyOCR**: Pretrained CRNN + CTC architecture
- **Languages**: English (en), Hindi (hi)
- **Output**: Text blocks with bounding boxes and confidence scores

### Step 4: Text Cleaning
```python
# Location: backend/app/services/ocr_service.py

def clean_extracted_text(text):
    - Remove extra whitespace
    - Normalize "Sec." → "Section"
    - Normalize "u/s" → "under Section"
    - Fix number/letter confusions (l → 1, 0 → O)
    - Standardize "I.P.C." → "IPC"
```

### Step 5: Language Detection & Translation
```python
# Detect language using langdetect
language = detect(cleaned_text)  # Returns: "en", "hi", "bn", etc.

# If not English, translate using Google Translator
if language != "en":
    translator = GoogleTranslator(source=language, target='en')
    translated_text = translator.translate(text)
```

**Supported Languages:** Hindi, Bengali, Tamil, Telugu, Marathi, etc.

### Step 6: Document Validation
```python
# Verify this is actually an FIR document
validation_keywords = [
    "fir", "police station", "ipc", "section", "u/s",
    "offence", "complainant", "accused", "thana", "dhara"
]

# Reject if:
# - Text too short (< 15 chars)
# - No legal keywords found
```

### Step 7: IPC Section Extraction
```python
# Location: backend/app/services/ipc_extractor.py

# Multiple regex patterns to catch all formats:
patterns = [
    r'Section[s]?\s*(\d{1,3}[A-Z]?)',      # "Section 302"
    r'u/s\.?\s*(\d{1,3}[A-Z]?)',           # "u/s 302"
    r'IPC\s*(\d{1,3}[A-Z]?)',              # "IPC 302"
    r'(\d{1,3}[A-Z]?)\s*IPC',              # "302 IPC"
    r'धारा\s*(\d{1,3}[A-Z]?)',              # "धारा 302" (Hindi)
]

# Match against IPC database (500+ sections)
# Return: section number, title, description, punishment
```

### Step 8: Response Generation
```json
{
  "status": "success",
  "evidence_type": "FIR Document",
  "confidence_score": 94.5,
  "explanation": "FIR document successfully scanned...",
  "key_factors": [
    "Detected Language: HI",
    "Document format Analysis: FIR Standard Layout",
    "Extracted Statutes: 302, 307, 420",
    "IPC 302: Murder - Punishment: Death or life imprisonment"
  ],
  "detected_ipcs": ["302", "307", "420"]
}
```

---

## Data Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   FIR Image  │────▶│  Preprocess  │────▶│   EasyOCR    │────▶│  Raw Text    │
│   (PNG/JPG)  │     │  (OpenCV)    │     │  (EN + HI)   │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                       │
                     ┌──────────────────────────────────────────────────┘
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Clean Text   │────▶│   Detect     │────▶│  Translate   │────▶│  English     │
│              │     │   Language   │     │  (if needed) │     │  Text        │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                       │
                     ┌──────────────────────────────────────────────────┘
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Validate   │────▶│  Extract IPC │────▶│  Map to DB   │────▶│   JSON       │
│   Document   │     │  (Regex)     │     │  (Lookup)    │     │   Response   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Tech Stack Details

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| API Framework | FastAPI | Async REST API |
| OCR Engine | EasyOCR | Text extraction (pretrained) |
| Object Detection | YOLOv8 (ultralytics) | Field localization |
| Image Processing | OpenCV, Pillow | Preprocessing |
| Translation | deep-translator | Multi-language support |
| Language Detection | langdetect | Identify source language |
| Database | PostgreSQL | User/case storage |
| Auth | JWT (PyJWT) | Token-based authentication |

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI components |
| Build Tool | Vite | Fast dev server |
| Styling | TailwindCSS | Utility-first CSS |
| UI Components | NextUI | Pre-built components |
| HTTP Client | Axios | API requests |

### ML Models
| Model | Type | Training |
|-------|------|----------|
| EasyOCR (CRNN) | Pretrained | No custom training |
| YOLOv8 | Transfer Learning | Fine-tuned on 544 FIR images |

---

## Dataset Structure

```
datasets/
├── fir_documents/
│   ├── FIR_images_v1/        # 544 scanned FIR images
│   └── FIR_details.json      # Annotations with bounding boxes
│
└── yolo_training/
    ├── dataset.yaml          # YOLO config
    ├── images/
    │   ├── train/            # Training images
    │   └── val/              # Validation images
    └── labels/
        ├── train/            # YOLO format labels
        └── val/
```

### Annotation Classes (4 total)
| ID | Class | Description |
|----|-------|-------------|
| 0 | Police Station | Name of PS where FIR filed |
| 1 | Year | Year of registration |
| 2 | Statutes | IPC sections mentioned |
| 3 | Complainant Name | Person filing complaint |

---

## API Endpoints

### Authentication
```
POST /register     - Create new user account
POST /login        - Get JWT token
GET  /me           - Get current user info
```

### FIR Processing
```
POST /analyze      - Process FIR image
     Body: { file: image, context: "fir" }
     Returns: OCR text, IPC sections, confidence
```

### Case Management
```
GET    /cases              - List all cases
POST   /cases              - Create new case
GET    /cases/{id}         - Get case details
DELETE /cases/{id}         - Delete case
```

### Legal Search
```
GET /legal-search?q={query}  - Search IPC sections
     Returns: Matching sections with descriptions
```

---

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| OCR Processing Time | 2-5 seconds | Depends on image size |
| Supported Image Size | Up to 1000px width | Auto-resized if larger |
| Languages | English, Hindi | Extensible via EasyOCR |
| IPC Database | 500+ sections | Full Indian Penal Code |
| Confidence Reporting | Per-block average | From EasyOCR |

---

## Error Handling

| Error | Cause | Response |
|-------|-------|----------|
| Invalid Document | Not an FIR | "Document Validation Failed" |
| OCR Failure | Corrupt/PDF file | "Could not process file" |
| No IPC Found | Low quality scan | Falls back to random sample |
| Translation Fail | API limit | Returns original text |

---

## Security Measures

1. **JWT Authentication** - Token-based API access
2. **Input Validation** - Pydantic schemas for all requests
3. **File Type Checking** - Only accepts image formats
4. **SQL Injection Prevention** - Parameterized queries
5. **CORS Configuration** - Restricted origins in production
