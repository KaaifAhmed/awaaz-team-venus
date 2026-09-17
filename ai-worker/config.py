"""
Configuration, static reference data, and civic pattern definitions for AI Worker.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# SERVICE & MODEL CONFIGURATION
# ============================================================================

MAIN_SERVICE_URL = os.environ.get("MAIN_SERVICE_URL", "http://localhost:8000").rstrip("/")
WHATSAPP_SERVICE_URL = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:3000").rstrip("/")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini/gemini-2.5-flash").strip()
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = "ai_queue"

# Model fallback hierarchy for high demand resilience
CANDIDATE_MODELS = [
    GEMINI_MODEL.replace("gemini/", "") if GEMINI_MODEL else "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
]

# ============================================================================
# SPATIAL JURISDICTION BOUNDARIES (6 CANTONMENT BOARDS)
# ============================================================================

CANTONMENTS = [
    {
        "name": "Clifton Cantonment (CBC)",
        "code": "CANTONMENT",
        "polygon": [
            [67.01, 24.81],
            [67.06, 24.81],
            [67.06, 24.84],
            [67.01, 24.84]
        ],
        "aliases": [
            "clifton cantonment", "cbc", "clifton cantt", "dha", "defence",
            "phase 1", "phase 2", "phase 4", "phase 5", "phase 6", "phase 7", "phase 8"
        ]
    },
    {
        "name": "Karachi Cantonment (KCB)",
        "code": "CANTONMENT",
        "polygon": [
            [67.02, 24.85],
            [67.05, 24.85],
            [67.05, 24.87],
            [67.02, 24.87]
        ],
        "aliases": [
            "karachi cantonment", "kcb", "cantt station", "cantt", "saddar cantt"
        ]
    },
    {
        "name": "Faisal Cantonment",
        "code": "CANTONMENT",
        "polygon": [
            [67.10, 24.87],
            [67.15, 24.87],
            [67.15, 24.91],
            [67.10, 24.91]
        ],
        "aliases": [
            "faisal cantonment", "faisal cantt", "paf faisal", "shahrah-e-faisal cantt"
        ]
    },
    {
        "name": "Malir Cantonment",
        "code": "CANTONMENT",
        "polygon": [
            [67.18, 24.92],
            [67.24, 24.92],
            [67.24, 24.98],
            [67.18, 24.98]
        ],
        "aliases": [
            "malir cantonment", "malir cantt", "cantt malir"
        ]
    },
    {
        "name": "Korangi Creek Cantonment",
        "code": "CANTONMENT",
        "polygon": [
            [67.11, 24.78],
            [67.15, 24.78],
            [67.15, 24.82],
            [67.11, 24.82]
        ],
        "aliases": [
            "korangi creek cantonment", "korangi creek cantt", "paf korangi"
        ]
    },
    {
        "name": "Manora Cantonment",
        "code": "CANTONMENT",
        "polygon": [
            [66.97, 24.78],
            [66.99, 24.78],
            [66.99, 24.80],
            [66.97, 24.80]
        ],
        "aliases": [
            "manora cantonment", "manora cantt", "manora"
        ]
    }
]

# 26 Major KMC Arterial Roads
KMC_ARTERIAL_ROADS = [
    "Shahrah-e-Faisal", "University Road", "M.A. Jinnah Road", "Rashid Minhas Road",
    "Korangi Road", "Shahrah-e-Pakistan", "I.I. Chundrigar Road", "S.M. Taufeeq Road",
    "National Highway (N-5)", "Hub River Road", "Manghopir Road", "Nazimabad Road",
    "Stadium Road", "Sir Shah Muhammad Suleman Road", "Nishtar Road",
    "Abul Hasan Isphahani Road", "Shaheed-e-Millat Road", "Khayaban-e-Ittehad",
    "Sunset Boulevard", "Mauripur Road", "Marston Road", "Preedy Street",
    "Garden Road", "Business Recorder Road", "Jahangir Road", "Shahrah-e-Liaquat"
]

# ============================================================================
# STATUTORY CITATIONS & CONSTITUTIONAL REFERENCES
# ============================================================================

STATUTORY_REFERENCES = {
    "KWSC": {
        "name": "Karachi Water & Sewerage Corporation (KW&SC)",
        "act": "Karachi Water & Sewerage Corporation Act 2023 (Section 24) [KW&SC Act 2023 Sec. 24]",
        "mandate": (
            "Statutory duty to maintain, repair, and operate sewerage "
            "and potable water distribution infrastructure without causing "
            "public nuisance."
        ),
        "constitutional": (
            "Constitution of Pakistan 1973, Articles 9 (Right to Life) "
            "& 14 (Inviolability of Dignity of Man)"
        )
    },
    "KMC": {
        "name": "Karachi Metropolitan Corporation (KMC)",
        "act": (
            "Sindh Local Government Act 2021 / SLGO 2021 "
            "(Schedule II - Functions of Metropolitan Corporation)"
        ),
        "mandate": (
            "Statutory obligation to construct, repair, and maintain major "
            "arterial traffic corridors, primary stormwater drainage nallahs, "
            "and municipal infrastructure."
        ),
        "constitutional": (
            "Constitution of Pakistan 1973, Articles 9 & 14 (Right to Life & Dignity)"
        )
    },
    "SSWMB": {
        "name": "Sindh Solid Waste Management Board (SSWMB)",
        "act": (
            "Sindh Solid Waste Management Board Act 2021 "
            "[SSWMB Act 2021] (Sections 15 & 16)"
        ),
        "mandate": (
            "Exclusive authority for collection, transport, and disposal "
            "of municipal solid waste, sweeping, and maintenance of "
            "designated garbage transfer stations (GTS)."
        ),
        "constitutional": (
            "Constitution of Pakistan 1973, Articles 9 & 14"
        )
    },
    "CANTONMENT": {
        "name": "Military Lands and Cantonment Board",
        "act": "Cantonments Act 1924 (Sections 116, 130 & 131)",
        "mandate": (
            "Military lands and cantonment boards municipal duties regarding "
            "sanitation, public drainage, waste removal, and public health "
            "nuisance abatement."
        ),
        "constitutional": (
            "Constitution of Pakistan 1973, Articles 9 & 14"
        )
    }
}

# ============================================================================
# DETERMINISTIC NLP PATTERNS (URDU / ROMAN URDU / ENGLISH)
# ============================================================================

SEWERAGE_PATTERNS = [
    "gutter", "sewer", "sewage", "manhole", "ganda pani", "sewerage",
    "ubal", "drain cover", "گٹر", "سیوریج", "نالے کا پانی", "ڈھکن", "اوور فلو"
]

WATER_PATTERNS = [
    "water supply", "drinking water", "line leak", "burst pipe", "pipeline",
    "paani", "pani", "meetha pani", "tanker", "water line", "پانی",
    "پانی کی لائن", "پائپ لائن"
]

POTHOLE_PATTERNS = [
    "pothole", "crater", "road damage", "road broken", "gaddha", "khadda",
    "sarak", "sadak", "tuta", "toota", "asphalt", "سڑک", "کھڈا", "ٹوٹی سڑک"
]

DRAINAGE_PATTERNS = [
    "drainage", "nallah", "nullah", "storm water", "rain water", "submerged",
    "sailab", "barsati", "نالہ", "نالے", "برساتی"
]

GARBAGE_PATTERNS = [
    "garbage", "trash", "kachra", "kooda", "waste", "dump", "dustbin",
    "safai", "solid waste", "کوڑا", "کچرا", "صفائی", "ڈمپنگ"
]

ELECTRIC_PATTERNS = [
    "electric", "live wire", "wire", "current", "pole", "bijli", "khamba",
    "tar", "spark", "sparking", "کرنٹ", "بجلی", "پول", "تار"
]

SEVERITY_P0_PATTERNS = [
    "open manhole", "khula manhole", "manhole cover missing", "gutter ka dhakkan",
    "dhakkan", "current", "live wire", "sparking", "electrocution",
    "submerged", "doob", "drowning", "extreme danger", "hazard",
    "جان لیوا", "خطرناک", "ایمرجنسی", "ڈھکن غائب"
]

SEVERITY_P1_PATTERNS = [
    "rasta band", "blocked", "major", "heap", "overflow", "ubal raha",
    "toota hua", "burst", "accident", "badbu", "smell", "phat gayi",
    "حادثات", "بند", "تعفن"
]

KNOWN_KARACHI_LANDMARKS = [
    "Disco Bakery", "Gulshan-e-Iqbal", "Gulshan", "Clifton", "DHA", "Defence",
    "Saddar", "Korangi", "Malir", "Nazimabad", "North Nazimabad", "F.B. Area",
    "Federal B Area", "Liaquatabad", "PECHS", "Gulistan-e-Jauhar", "Jauhar",
    "Manora", "Kemari", "SITE", "Surjani", "Orangi", "Lyari",
    "Shahrah-e-Faisal", "University Road", "M.A. Jinnah Road", "Rashid Minhas Road",
    "Korangi Road", "Shahrah-e-Pakistan", "I.I. Chundrigar Road", "S.M. Taufeeq Road",
    "National Highway", "Hub River Road", "Manghopir Road", "Stadium Road"
]


CONVERSATION_QUEUE_NAME = "conversation_queue"


def resolve_internal_image_url(image_url: str) -> str:
    """
    BUG FIX: never trust the host inside image_url (it could be a public
    Cloudflare/Vercel domain the worker can't reach). Always rebuild the URL
    using MAIN_SERVICE_URL, which is the address the worker actually uses to
    talk to the Django service.
    """
    from urllib.parse import urlparse
    if not image_url:
        return image_url
    path = urlparse(image_url).path
    return f"{MAIN_SERVICE_URL}{path}"