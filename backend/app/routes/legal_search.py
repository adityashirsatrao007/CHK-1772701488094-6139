import json
import os
import math
import re
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ── Load IPC data ────────────────────────────────────────────────────────────
_DATA_PATH = os.path.join(os.path.dirname(__file__), "../../data/ipc_full_data.json")

with open(_DATA_PATH, "r", encoding="utf-8") as f:
    IPC_SECTIONS: List[dict] = json.load(f)

# ── TF-IDF Vector Engine ──────────────────────────────────────────────────────
# Build a lightweight in-process TF-IDF index so the feature works immediately
# without downloading external models.

def _tokenize(text: str) -> List[str]:
    # Include numbers so section IDs like "302", "498a" are indexed
    return re.findall(r"[a-z0-9]+", text.lower())

def _build_doc_text(sec: dict) -> str:
    parts = [
        sec.get("section", ""),
        sec.get("title", ""),
        sec.get("description", ""),
        sec.get("category", ""),
        " ".join(sec.get("keywords", [])),
        sec.get("punishment", ""),
    ]
    return " ".join(parts)

# Pre-compute document term frequencies
_documents = [_build_doc_text(s) for s in IPC_SECTIONS]
_N = len(_documents)

def _tf(tokens: List[str]) -> dict:
    freq: dict = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    total = len(tokens) or 1
    return {t: c / total for t, c in freq.items()}

def _df_counts(docs: List[List[str]]) -> dict:
    df: dict = {}
    for doc in docs:
        for t in set(doc):
            df[t] = df.get(t, 0) + 1
    return df

_tokenized_docs = [_tokenize(d) for d in _documents]
_df = _df_counts(_tokenized_docs)

def _tfidf_vec(tokens: List[str]) -> dict:
    tf = _tf(tokens)
    vec: dict = {}
    for t, tf_val in tf.items():
        idf = math.log((_N + 1) / (_df.get(t, 0) + 1)) + 1
        vec[t] = tf_val * idf
    return vec

def _cosine(a: dict, b: dict) -> float:
    if not a or not b:
        return 0.0
    dot = sum(a.get(t, 0) * v for t, v in b.items())
    mag_a = math.sqrt(sum(v * v for v in a.values()))
    mag_b = math.sqrt(sum(v * v for v in b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)

# Pre-compute document vectors
_doc_vecs = [_tfidf_vec(toks) for toks in _tokenized_docs]

# ── Schemas ───────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 8
    category: Optional[str] = None

class ResourceLink(BaseModel):
    name: str
    url: str

class SearchResult(BaseModel):
    section: str
    title: str
    description: str
    punishment: str
    category: str
    bailable: bool
    cognizable: bool
    bhns_equivalent: str
    keywords: List[str]
    resources: List[ResourceLink]
    score: float

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    query: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/search", response_model=SearchResponse)
def semantic_search(req: SearchRequest):
    query_tokens = _tokenize(req.query)
    query_vec = _tfidf_vec(query_tokens)

    scored = []
    # Extract all number tokens from the query (e.g. "302", "506", "498a")
    query_numbers = re.findall(r"\d+[a-z]?", req.query.lower())
    query_lower = req.query.strip().lower().replace("ipc", "").strip()

    for idx, doc_vec in enumerate(_doc_vecs):
        score = _cosine(query_vec, doc_vec)

        sec_raw = IPC_SECTIONS[idx]["section"]  # e.g. "IPC 302" or "302"
        section_clean = sec_raw.replace("IPC ", "").replace("ipc ", "").strip().lower()

        # Boost 1: the entire query (stripped of "ipc") exactly matches the section number
        if section_clean == query_lower.strip():
            score = max(score, 1.0)

        # Boost 2: any number token in the query matches the section number exactly
        elif section_clean in query_numbers:
            score = max(score, 0.97)

        # Boost 3: section number starts with a queried number token (e.g. "302" matches "302A")
        elif any(section_clean.startswith(n) for n in query_numbers):
            score = max(score, 0.85)

        # Boost 4: keyword overlap
        kws = [k.lower() for k in IPC_SECTIONS[idx].get("keywords", [])]
        q_words = set(_tokenize(req.query))
        overlap = sum(1 for k in kws if any(qw in k or k in qw for qw in q_words))
        if overlap:
            score += overlap * 0.05

        scored.append((score, idx))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Filter by category if specified
    if req.category and req.category.lower() != "all":
        scored = [
            (s, i) for s, i in scored
            if req.category.lower() in IPC_SECTIONS[i]["category"].lower()
        ]

    limit = max(1, min(req.limit or 8, 20))
    results = []
    for score, idx in scored[:limit]:
        sec = IPC_SECTIONS[idx]
        results.append(SearchResult(
            section=sec["section"],
            title=sec["title"],
            description=sec["description"],
            punishment=sec["punishment"],
            category=sec["category"],
            bailable=sec.get("bailable", True),
            cognizable=sec.get("cognizable", False),
            bhns_equivalent=sec.get("bhns_equivalent", ""),
            keywords=sec.get("keywords", []),
            resources=[ResourceLink(**r) for r in sec.get("resources", [])],
            score=round(score, 4),
        ))

    return SearchResponse(results=results, total=len(results), query=req.query)


@router.get("/categories")
def get_categories():
    cats = sorted(set(s["category"] for s in IPC_SECTIONS))
    return {"categories": cats}


@router.get("/section/{section_number}")
def get_section(section_number: str):
    """Retrieve a specific IPC section by number."""
    needle = section_number.strip().upper()
    for sec in IPC_SECTIONS:
        if sec["section"].replace("IPC ", "").upper() == needle or sec["section"].upper() == needle:
            return sec
    return {"error": f"Section {section_number} not found"}, 404
