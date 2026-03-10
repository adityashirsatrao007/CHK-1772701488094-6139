# Nyaya AI

A tool to digitize and analyze FIR (First Information Report) documents from Indian police stations.

## What it does

- Extracts text from scanned FIR images (works with handwritten docs too)
- Finds IPC sections mentioned in the document  
- Lets you search through Indian Penal Code sections
- Manages cases with login/authentication

## Tech used

**Backend:** Python, FastAPI, EasyOCR, PostgreSQL  
**Frontend:** React, Vite, TailwindCSS, NextUI

## Quick start

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py   # runs on localhost:8000

# Frontend  
cd frontend
npm install
npm run dev      # runs on localhost:5173
```

## Project layout

```
backend/
  ├── main.py           # API entry point
  ├── app/routes/       # auth, fir processing, legal search
  ├── app/services/     # OCR and IPC extraction logic
  └── data/             # IPC sections database

frontend/
  └── src/
      ├── pages/        # Dashboard, Login, Search pages
      └── components/   # UI components

datasets/               # Training data (FIR images + YOLO labels)
```

## Notes

- OCR uses EasyOCR with English + Hindi support
- IPC extraction uses regex pattern matching
- Search uses TF-IDF for relevance ranking
- Auth is JWT-based with PostgreSQL
