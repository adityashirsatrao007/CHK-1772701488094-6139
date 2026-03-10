"""
IPC Section Extractor
Extracts Indian Penal Code section references from text using regex patterns
and maps them to detailed section information
"""
import re
import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

# Load IPC sections database
_ipc_database: Optional[Dict] = None


def load_ipc_database() -> Dict:
    """Load IPC sections from JSON file"""
    global _ipc_database
    
    if _ipc_database is None:
        db_path = Path(__file__).parent.parent.parent / "data" / "ipc_sections.json"
        
        try:
            with open(db_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                _ipc_database = data.get("sections", {})
                logger.info(f"Loaded {len(_ipc_database)} IPC sections from database")
        except FileNotFoundError:
            logger.warning(f"IPC database not found at {db_path}, using empty database")
            _ipc_database = {}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse IPC database: {e}")
            _ipc_database = {}
    
    return _ipc_database


def get_ipc_patterns() -> List[Tuple[str, re.Pattern]]:
    """
    Returns list of regex patterns to match IPC section references
    Each pattern captures the section number with possible subsections
    """
    patterns = [
        # "Section 302" or "Section 302/307"
        ("section", re.compile(
            r'\bSection[s]?\s*(\d{1,3}[A-Z]?(?:\s*/\s*\d{1,3}[A-Z]?)*)',
            re.IGNORECASE
        )),
        
        # "Sec. 302" or "Sec 302"
        ("sec", re.compile(
            r'\bSec\.?\s*(\d{1,3}[A-Z]?(?:\s*/\s*\d{1,3}[A-Z]?)*)',
            re.IGNORECASE
        )),
        
        # "u/s 302" or "U/S 302" (under section)
        ("under_section", re.compile(
            r'\bu/s\.?\s*(\d{1,3}[A-Z]?(?:\s*/\s*\d{1,3}[A-Z]?)*)',
            re.IGNORECASE
        )),
        
        # "IPC 302" or "IPC Section 302"
        ("ipc_direct", re.compile(
            r'\bIPC\s*(?:Section[s]?)?\s*(\d{1,3}[A-Z]?(?:\s*/\s*\d{1,3}[A-Z]?)*)',
            re.IGNORECASE
        )),
        
        # "302 IPC" or "302/307 IPC"
        ("section_ipc", re.compile(
            r'(\d{1,3}[A-Z]?(?:\s*/\s*\d{1,3}[A-Z]?)*)\s*(?:of\s+)?IPC\b',
            re.IGNORECASE
        )),
        
        # "धारा 302" (Hindi)
        ("dhara", re.compile(
            r'धारा\s*(\d{1,3}[A-Z]?(?:\s*/\s*\d{1,3}[A-Z]?)*)',
            re.IGNORECASE
        )),
        
        # "302, 307, 420" - multiple sections
        ("comma_separated", re.compile(
            r'(?:Section[s]?|धारा|u/s|IPC)\s*(\d{1,3}[A-Z]?(?:\s*,\s*\d{1,3}[A-Z]?)+)',
            re.IGNORECASE
        )),
        
        # Standalone section numbers in legal context (with word boundaries)
        # Only match if surrounded by legal keywords
        ("contextual", re.compile(
            r'(?:charged|accused|booked|registered|filed|offense|offence|punishable|under)\s+(?:under\s+)?(\d{1,3}[A-Z]?)',
            re.IGNORECASE
        )),
    ]
    
    return patterns


def extract_section_numbers(text: str) -> Tuple[List[str], List[str]]:
    """
    Extract IPC section numbers from text
    
    Args:
        text: Input text containing IPC references
        
    Returns:
        Tuple of (unique_sections, raw_matches)
    """
    patterns = get_ipc_patterns()
    raw_matches = []
    sections = set()
    
    for pattern_name, pattern in patterns:
        matches = pattern.findall(text)
        
        for match in matches:
            raw_matches.append(f"{pattern_name}: {match}")
            
            # Handle multiple sections (separated by / or ,)
            if '/' in match or ',' in match:
                # Split by / or ,
                parts = re.split(r'[/,]\s*', match)
                for part in parts:
                    part = part.strip()
                    if part and re.match(r'^\d{1,3}[A-Z]?$', part, re.IGNORECASE):
                        sections.add(part.upper())
            else:
                match = match.strip()
                if match and re.match(r'^\d{1,3}[A-Z]?$', match, re.IGNORECASE):
                    sections.add(match.upper())
    
    return sorted(list(sections)), raw_matches


def get_section_info(section: str) -> Optional[Dict]:
    """
    Get detailed information about an IPC section
    
    Args:
        section: Section number (e.g., "302", "376A")
        
    Returns:
        Dictionary with section details or None if not found
    """
    db = load_ipc_database()
    
    # Normalize section number
    section = section.upper().strip()
    
    if section in db:
        return db[section]
    
    # Try without letter suffix
    base_section = re.match(r'^(\d+)', section)
    if base_section:
        base = base_section.group(1)
        if base in db:
            return db[base]
    
    return None


def extract_ipc_sections(text: str) -> List[Dict]:
    """
    Extract all IPC sections from text with detailed information
    
    Args:
        text: Input text containing IPC references
        
    Returns:
        List of dictionaries containing section details
    """
    sections, raw_matches = extract_section_numbers(text)
    
    results = []
    for section in sections:
        info = get_section_info(section)
        
        if info:
            results.append({
                "section": section,
                "title": info.get("title", f"Section {section}"),
                "description": info.get("description", ""),
                "punishment": info.get("punishment", ""),
                "category": info.get("category", "General"),
                "confidence": 0.95  # High confidence for matched sections
            })
        else:
            # Section found but not in database
            results.append({
                "section": section,
                "title": f"IPC Section {section}",
                "description": "Section found in FIR but details not available in database",
                "punishment": "Refer to Indian Penal Code for details",
                "category": "Unknown",
                "confidence": 0.7  # Lower confidence for unmatched sections
            })
    
    return results


def extract_fir_metadata(text: str) -> Dict:
    """
    Extract additional metadata from FIR text
    - Complainant name
    - Accused name
    - Date of incident
    - Location
    - Police station
    - FIR number
    """
    metadata = {}
    
    # FIR Number patterns
    fir_patterns = [
        r'FIR\s*(?:No\.?|Number)?\s*[:.]?\s*(\d+/\d{4})',
        r'FIR\s*(?:No\.?|Number)?\s*[:.]?\s*(\d+)',
        r'Case\s*No\.?\s*[:.]?\s*(\d+/\d{4})',
    ]
    
    for pattern in fir_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            metadata['fir_number'] = match.group(1)
            break
    
    # Police Station
    ps_patterns = [
        r'P\.?S\.?\s*[:.]?\s*([A-Za-z\s]+?)(?:\s*District|\s*,|\s*\n)',
        r'Police\s+Station\s*[:.]?\s*([A-Za-z\s]+?)(?:\s*District|\s*,|\s*\n)',
        r'थाना\s*[:.]?\s*([^\n,]+)',
    ]
    
    for pattern in ps_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            metadata['police_station'] = match.group(1).strip()
            break
    
    # Date patterns
    date_patterns = [
        r'dated?\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'on\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'दिनांक\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            metadata['incident_date'] = match.group(1)
            break
    
    # Complainant
    complainant_patterns = [
        r'Complainant\s*[:.]?\s*([A-Za-z\s]+?)(?:\s*S/O|\s*D/O|\s*W/O|\s*,|\s*\n)',
        r'शिकायतकर्ता\s*[:.]?\s*([^\n,]+)',
    ]
    
    for pattern in complainant_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            metadata['complainant_name'] = match.group(1).strip()
            break
    
    # Accused
    accused_patterns = [
        r'Accused\s*[:.]?\s*([A-Za-z\s]+?)(?:\s*S/O|\s*D/O|\s*W/O|\s*,|\s*\n)',
        r'आरोपी\s*[:.]?\s*([^\n,]+)',
    ]
    
    for pattern in accused_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            metadata['accused_name'] = match.group(1).strip()
            break
    
    return metadata


def generate_summary(text: str, ipc_sections: List[Dict]) -> str:
    """
    Generate a brief summary of the FIR based on extracted information
    """
    if not text or len(text) < 50:
        return "Insufficient text extracted from FIR for summary generation."
    
    sections_str = ""
    if ipc_sections:
        section_nums = [s['section'] for s in ipc_sections]
        sections_str = f"IPC Sections identified: {', '.join(section_nums)}. "
        
        # Add categories
        categories = set(s['category'] for s in ipc_sections if s.get('category') != 'Unknown')
        if categories:
            sections_str += f"Categories: {', '.join(categories)}. "
    
    # Get first 200 characters of cleaned text for context
    preview = text[:200].replace('\n', ' ').strip()
    if len(text) > 200:
        preview += "..."
    
    summary = f"{sections_str}FIR excerpt: {preview}"
    
    return summary
