"""
Convert Kaggle IPC dataset (dev523/indian-penal-code-ipc-sections-information)
into the ipc_full_data.json format expected by the legal-search backend.

Run from backend/: python3 scripts/convert_ipc_kaggle.py
"""

import re
import json
import os
import pandas as pd

CSV_PATH = os.path.expanduser(
    "~/.cache/kagglehub/datasets/dev523/indian-penal-code-ipc-sections-information"
    "/versions/1/ipc_sections.csv"
)
OUT_PATH = os.path.join(os.path.dirname(__file__), "../data/ipc_full_data.json")

# ── Category rules — ordered from most-specific to most-general ─────────────
CATEGORY_RULES = [
    # Women
    (r"\b(woman|women|rape|sexual|modesty|dowry|wife|husband|marital|cruelty to wife|stri)\b",
     "Offences Against Women"),
    # Children
    (r"\b(child|minor|juvenile|infant|guardian)\b",
     "Offences Against Children"),
    # Public servants
    (r"\b(public servant|government servant|official|magistrate|police officer|officer)\b",
     "Offences Against Public Servants"),
    # Property
    (r"\b(theft|robbery|dacoity|extortion|cheating|fraud|mischief|trespass|stolen|property|burglary|embezzle|breach of trust|forgery|counterfeit|document)\b",
     "Offences Against Property"),
    # Human body
    (r"\b(murder|homicide|kill|hurt|grievous|assault|kidnap|abduct|restrain|confine|rash|negligent|death|suicide|attempt to)\b",
     "Offences Against Human Body"),
    # State
    (r"\b(sedition|government|state|war|sovereignty|armed forces|navy|army|air force|military|rebellion|treason|prisoner of war)\b",
     "Offences Against the State"),
    # Currency
    (r"\b(currency|coin|note|counterfeit currency|forged note|bank note)\b",
     "Offences Relating to Currency"),
    # Religion
    (r"\b(religion|religious|mosque|temple|church|worship|sacred|blasphemy|god|faith)\b",
     "Offences Relating to Religion"),
    # Justice / evidence
    (r"\b(evidence|false evidence|perjury|judicial|court|justice|contempt|obstruct justice|false charge)\b",
     "Offences Against Administration of Justice"),
    # Public health
    (r"\b(nuisance|health|environment|pollution|adulterate|poison|animal|disease)\b",
     "Offences Against Public Health & Safety"),
    # Public tranquility
    (r"\b(riot|unlawful assembly|mob|affray|communal|enmity|disharmony)\b",
     "Offences Against Public Tranquility"),
    # Intimidation / reputation
    (r"\b(intimidat|threat|blackmail|criminal intimidation)\b",
     "Criminal Intimidation"),
    (r"\b(defam|libel|slander|reputation)\b",
     "Offences Affecting Reputation"),
    # Conspiracy
    (r"\b(conspir|abetment|abet|criminal plan)\b",
     "Criminal Conspiracy & Abetment"),
    # Morality / obscenity
    (r"\b(obscen|indecent|pornograph|lewd|immoral)\b",
     "Offences Against Morality"),
    # Elections
    (r"\b(election|voter|ballot|vote)\b",
     "Offences Relating to Elections"),
    # Weights & measures
    (r"\b(weight|measure|stamp|seal)\b",
     "Offences Relating to Weights & Measures"),
]


def classify_category(text: str) -> str:
    low = text.lower()
    for pattern, category in CATEGORY_RULES:
        if re.search(pattern, low):
            return category
    return "General Provisions"


# ── Bailable / Cognizable heuristics ────────────────────────────────────────
NON_BAILABLE_SECTIONS = {
    str(n) for n in (
        list(range(121, 131)) +
        list(range(124, 132)) +
        [143, 144, 145, 146, 147, 148, 149, 153, "153A", 159, 160] +
        [191, 192, 193, 194, 195, "195A", 196, 197, 198, 199, 200] +
        [201, 202, 203, 204, 232, 233, 234, 235, 236, 237, 238, 239, 240, 255, 257, 258] +
        [263, 266, 267, 270, 272, 273, 274, 275, 277, 278, 280, 281, 282, 284, 285, 286, 290] +
        [295, "295A", 296, 302, 303, 304, "304A", "304B", 305, 306, 307, 308, 309, 310, 311] +
        [312, 313, 314, 315, 316, 317, 325, 326, "326A", "326B", 327, 328, 329, 330, 331, 332, 333] +
        [334, 336, 337, 338] +
        list(range(354, 358)) + ["354A", "354B", "354C", "354D"] +
        list(range(363, 376)) + list(range(376, 378)) +
        [384, 385, 386, 387, 388, 389, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402] +
        [406, 407, 408, 409, 420] +
        ["465", "466", "467", "468", "469", "471", "472", "473", "474", "475", "476"] +
        [489, "489A", "489B", "489C", "489D"] +
        [498, "498A", 499, 500, 506, 509]
    )
}

COGNIZABLE_SECTIONS = {
    str(n) for n in (
        list(range(121, 132)) +
        [147, 148, 153, "153A", 161, 162, 163, 164, 165] +
        [191, 193, "193A", 201, 202] +
        [295, "295A", 302, 303, 304, "304B", 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317] +
        [323, 324, 325, 326, "326A", "326B", 327, 328, 329, 330, 331, 332, 333, 336, 337, 338] +
        list(range(354, 380)) + ["354A", "354B", "354C", "354D"] +
        list(range(363, 380)) +
        [384, 385, 386, 387, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402] +
        [406, 407, 408, 409, 420] +
        ["468", "471", "477A"] +
        ["489A", "489B", "489C"] +
        [495, "498A", 499, 506, 509]
    )
}


def is_non_bailable(section_num: str, punishment: str) -> bool:
    low = punishment.lower()
    if section_num in NON_BAILABLE_SECTIONS:
        return True
    if re.search(r"(imprisonment for life|death|rigorous imprisonment)\b", low):
        return True
    # If imprisonment exceeds 3 years usually non-bailable
    match = re.search(r"(\d+)\s*years?", low)
    if match and int(match.group(1)) > 3:
        return True
    return False


def is_cognizable(section_num: str, punishment: str) -> bool:
    if section_num in COGNIZABLE_SECTIONS:
        return True
    low = punishment.lower()
    if re.search(r"(imprisonment for life|death|rigorous imprisonment)\b", low):
        return True
    match = re.search(r"(\d+)\s*years?", low)
    if match and int(match.group(1)) >= 3:
        return True
    return False


# ── Keyword extraction ────────────────────────────────────────────────────────
STOPWORDS = {
    "the", "a", "an", "of", "in", "to", "by", "with", "or", "and", "is", "are",
    "be", "for", "on", "at", "from", "that", "this", "which", "shall", "may",
    "such", "any", "who", "not", "as", "if", "it", "he", "she", "its", "his",
    "her", "their", "person", "whoever", "both", "either", "punished", "punishment",
    "description", "according", "section", "indian", "penal", "code", "ipc",
    "simple", "words", "can", "also", "they", "them", "up", "more", "than",
    "extend", "liable", "fine", "imprisonment"
}


def extract_keywords(offense: str, description: str) -> list[str]:
    combined = f"{offense} {description}"
    words = re.findall(r"[a-z][a-z]+", combined.lower())
    seen = set()
    kws = []
    for w in words:
        if w not in STOPWORDS and w not in seen and len(w) > 3:
            seen.add(w)
            kws.append(w)
        if len(kws) >= 10:
            break
    # Always include key offense words even if < 4 chars
    for token in re.findall(r"\b[a-z]{3,}\b", offense.lower()):
        if token not in STOPWORDS and token not in seen and len(kws) < 12:
            seen.add(token)
            kws.append(token)
    return kws[:12]


# ── Clean description text ────────────────────────────────────────────────────
def clean_description(raw: str, section_num: str) -> str:
    # Remove "Description of IPC Section X\nAccording to section X of Indian penal code, "
    text = re.sub(
        r"Description of IPC Section.*?\n+According to section.*?of Indian penal code,?\s*",
        "", raw, flags=re.IGNORECASE | re.DOTALL
    )
    # Remove "IPC X in Simple Words\n..." tail — keep just the legal text
    text = re.sub(
        r"\s*IPC\s*\S+\s*in Simple Words\s*\n.*",
        "", text, flags=re.IGNORECASE | re.DOTALL
    )
    return text.strip()


# ── BNS rough mapping (section number ranges) ─────────────────────────────────
def bhns_note(section_num: str) -> str:
    """Return a rough BNS 2023 note where easily derivable."""
    try:
        n = float(re.sub(r"[^0-9.]", "", section_num))
    except ValueError:
        return ""
    if n <= 50:
        return "Refer BNS 2023 Part I"
    if 100 <= n <= 160:
        return "Ref BNS Ch. VII (Against State)"
    if 299 <= n <= 318:
        return "Refer BNS Ch. VI (Human Body)"
    if 354 <= n <= 376:
        return "Refer BNS Ch. V (Women)"
    if 378 <= n <= 420:
        return "Refer BNS Ch. XVII (Property)"
    if 461 <= n <= 477:
        return "Refer BNS Ch. XVIII (Documents)"
    if 489 <= n <= 489.5:
        return "Refer BNS Ch. XII (Currency)"
    if 498 <= n <= 509:
        return "Refer BNS Ch. XIX"
    return ""


# ── Main conversion ───────────────────────────────────────────────────────────
def convert():
    df = pd.read_csv(CSV_PATH)
    df = df.dropna(subset=["Section", "Offense", "Punishment"])
    df = df.fillna("")

    records = []
    for _, row in df.iterrows():
        raw_section = str(row["Section"]).strip()   # e.g. "IPC_302"
        section = raw_section.replace("IPC_", "IPC ").replace("__", " ")
        section_num = section.replace("IPC ", "").strip()

        offense = str(row["Offense"]).strip()
        punishment = str(row["Punishment"]).strip()
        description = clean_description(str(row["Description"]), section_num)

        # Classify
        combined_text = f"{offense} {punishment} {description}"
        category = classify_category(combined_text)
        keywords = extract_keywords(offense, description[:400])

        non_bail = is_non_bailable(section_num, punishment)
        cognizable = is_cognizable(section_num, punishment)

        # Resource link — Indian Kanoon is the best free resource
        ik_query = f"IPC+{section_num}+{'+'.join(offense.split()[:4])}"
        resources = [
            {
                "name": "Indian Kanoon",
                "url": f"https://indiankanoon.org/search/?formInput={ik_query}"
            },
            {
                "name": "India Code",
                "url": f"https://www.indiacode.nic.in/handle/123456789/2551?locale=en&searchQuery={section_num}"
            }
        ]

        records.append({
            "section": section,
            "title": offense,
            "description": description,
            "keywords": keywords,
            "punishment": punishment,
            "bailable": not non_bail,
            "cognizable": cognizable,
            "category": category,
            "bhns_equivalent": bhns_note(section_num),
            "resources": resources
        })

    # Sort by numeric section value
    def sort_key(r):
        num = re.sub(r"[^0-9.]", "", r["section"].replace("IPC ", ""))
        try:
            return float(num) if num else 9999
        except ValueError:
            return 9999

    records.sort(key=sort_key)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"✅ Written {len(records)} IPC sections to {OUT_PATH}")


if __name__ == "__main__":
    convert()
