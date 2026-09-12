"""
Modular AI Worker intelligence pipeline for Karachi Civic AI Engine.
Implements the LangGraph state graph and nodes per docs/components/ai-worker.md
and docs/Base/ai-system.md.
"""
import asyncio
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, TypedDict

import httpx
from dotenv import load_dotenv
from langgraph.graph import END, StateGraph

# Ensure shared directory is on sys.path in both local and container environments
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from shared.security_guards import input_guard, output_guard

load_dotenv()
logger = logging.getLogger("ai-worker")

MAIN_SERVICE_URL = os.environ.get("MAIN_SERVICE_URL", "http://localhost:8000").rstrip("/")
WHATSAPP_SERVICE_URL = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:3000").rstrip("/")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini/gemini-2.5-flash")

# ============================================================================
# 1. SPATIAL & STATUTORY KNOWLEDGE BASES
# ============================================================================

CANTONMENTS = [
    {
        "name": "Clifton Cantonment (CBC)",
        "code": "CANTONMENT",
        "polygon": [[67.01, 24.81], [67.06, 24.81], [67.06, 24.84], [67.01, 24.84]],
        "aliases": ["clifton cantonment", "cbc", "clifton cantt", "dha", "defence", "phase 1", "phase 2", "phase 4", "phase 5", "phase 6", "phase 7", "phase 8"]
    },
    {
        "name": "Karachi Cantonment (KCB)",
        "code": "CANTONMENT",
        "polygon": [[67.02, 24.85], [67.05, 24.85], [67.05, 24.87], [67.02, 24.87]],
        "aliases": ["karachi cantonment", "kcb", "cantt station", "cantt", "saddar cantt"]
    },
    {
        "name": "Faisal Cantonment",
        "code": "CANTONMENT",
        "polygon": [[67.10, 24.87], [67.15, 24.87], [67.15, 24.91], [67.10, 24.91]],
        "aliases": ["faisal cantonment", "faisal cantt", "paf faisal", "shahrah-e-faisal cantt"]
    },
    {
        "name": "Malir Cantonment",
        "code": "CANTONMENT",
        "polygon": [[67.18, 24.92], [67.24, 24.92], [67.24, 24.98], [67.18, 24.98]],
        "aliases": ["malir cantonment", "malir cantt", "cantt malir"]
    },
    {
        "name": "Korangi Creek Cantonment",
        "code": "CANTONMENT",
        "polygon": [[67.11, 24.78], [67.15, 24.78], [67.15, 24.82], [67.11, 24.82]],
        "aliases": ["korangi creek cantonment", "korangi creek cantt", "paf korangi"]
    },
    {
        "name": "Manora Cantonment",
        "code": "CANTONMENT",
        "polygon": [[66.97, 24.78], [66.99, 24.78], [66.99, 24.80], [66.97, 24.80]],
        "aliases": ["manora cantonment", "manora cantt", "manora"]
    },
]

KMC_ARTERIAL_ROADS = [
    "Shahrah-e-Faisal", "University Road", "M.A. Jinnah Road", "Rashid Minhas Road",
    "Korangi Road", "Shahrah-e-Pakistan", "I.I. Chundrigar Road", "S.M. Taufeeq Road",
    "National Highway (N-5)", "Hub River Road", "Manghopir Road", "Nazimabad Road",
    "Stadium Road", "Sir Shah Muhammad Suleman Road", "Nishtar Road", "Abul Hasan Isphahani Road",
    "Shaheed-e-Millat Road", "Khayaban-e-Ittehad", "Sunset Boulevard", "Mauripur Road",
    "Marston Road", "Preedy Street", "Garden Road", "Business Recorder Road",
    "Jahangir Road", "Shahrah-e-Liaquat"
]

STATUTORY_REFERENCES = {
    "KWSC": {
        "name": "Karachi Water & Sewerage Corporation (KW&SC)",
        "act": "Karachi Water & Sewerage Corporation Act 2023 (Section 24) [KW&SC Act 2023 Sec. 24]",
        "mandate": "Statutory duty to maintain, repair, and operate sewerage and potable water distribution infrastructure without causing public nuisance.",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 (Right to Life) & 14 (Inviolability of Dignity of Man)"
    },
    "KMC": {
        "name": "Karachi Metropolitan Corporation (KMC)",
        "act": "Sindh Local Government Act 2021 / SLGO 2021 (Schedule II - Functions of Metropolitan Corporation)",
        "mandate": "Statutory obligation to construct, repair, and maintain major arterial traffic corridors, primary stormwater drainage nallahs, and municipal infrastructure.",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 & 14 (Right to Life & Dignity)"
    },
    "SSWMB": {
        "name": "Sindh Solid Waste Management Board (SSWMB)",
        "act": "Sindh Solid Waste Management Board Act 2021 [SSWMB Act 2021] (Sections 15 & 16)",
        "mandate": "Exclusive authority for collection, transport, and disposal of municipal solid waste, sweeping, and maintenance of designated garbage transfer stations (GTS).",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 & 14"
    },
    "CANTONMENT": {
        "name": "Military Lands and Cantonment Board",
        "act": "Cantonments Act 1924 (Sections 116, 130 & 131)",
        "mandate": "Military lands and cantonment boards municipal duties regarding sanitation, public drainage, waste removal, and public health nuisance abatement.",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 & 14"
    }
}

# ============================================================================
# 2. STATE SCHEMA
# ============================================================================

class JobState(TypedDict, total=False):
    job_id: str
    source: str
    phone: Optional[str]
    user_id: Optional[str]
    citizen_cnic: Optional[str]
    raw_text: str
    image_url: Optional[str]
    audio_url: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    landmark_hint: Optional[str]

    # Inferred intermediate state
    issue_category: str
    severity: str
    target_authority: str
    landmark: str
    core_problem: str
    is_clustered: bool
    master_incident_id: Optional[str]
    community_reports_count: int

    # Output drafts
    layman_summary: str
    subject_en: str
    body_en: str
    body_ur: str
    statutory_citations: str

    security_flagged: bool
    security_blocked: bool
    security_reason: Optional[str]
    error: Optional[str]
    initial_job_payload: Optional[Dict[str, Any]]


# ============================================================================
# 3. HELPER ALGORITHMS: POINT-IN-POLYGON & NORMALIZE
# ============================================================================

def point_in_polygon(lng: float, lat: float, polygon: List[List[float]]) -> bool:
    """Ray-casting algorithm to test if (lng, lat) falls within polygon coordinates [[lng, lat], ...]."""
    num_vertices = len(polygon)
    inside = False
    p1_lng, p1_lat = polygon[0]
    for i in range(num_vertices + 1):
        p2_lng, p2_lat = polygon[i % num_vertices]
        if min(p1_lat, p2_lat) < lat <= max(p1_lat, p2_lat):
            if lng <= max(p1_lng, p2_lng):
                if p1_lat != p2_lat:
                    x_inters = (lat - p1_lat) * (p2_lng - p1_lng) / (p2_lat - p1_lat) + p1_lng
                if p1_lng == p2_lng or lng <= x_inters:
                    inside = not inside
        p1_lng, p1_lat = p2_lng, p2_lat
    return inside


def normalize_text(text: str) -> str:
    """Normalize text for consistent keyword matching."""
    if not text:
        return ""
    return re.sub(r"[^\w\s]", " ", text.lower())


# ============================================================================
# 4. DETERMINISTIC RULE-BASED FALLBACK PERCEPTION
# ============================================================================

def deterministic_rule_based_perception(text: str, landmark_hint: Optional[str] = None) -> Dict[str, str]:
    """
    Intelligent deterministic fallback when Gemini API key is missing or offline.
    Extracts issue_category, severity (P0/P1/P2), detected_landmark, and core_problem
    across Urdu, Roman Urdu, and English texts.
    """
    lower_raw = (text or "").lower()

    # Category matching
    sewerage_patterns = [
        "gutter", "sewer", "sewage", "manhole", "ganda pani", "sewerage", "ubal", "drain cover",
        "گٹر", "سیوریج", "نالے کا پانی", "ڈھکن", "اوور فلو"
    ]
    water_patterns = [
        "water supply", "drinking water", "line leak", "burst pipe", "pipeline", "paani", "pani",
        "meetha pani", "tanker", "water line", "پانی", "پانی کی لائن", "پائپ لائن"
    ]
    pothole_patterns = [
        "pothole", "crater", "road damage", "road broken", "gaddha", "khadda", "sarak", "sadak",
        "tuta", "toota", "crater", "asphalt", "سڑک", "کھڈا", "ٹوٹی سڑک"
    ]
    drainage_patterns = [
        "drainage", "nallah", "nullah", "storm water", "rain water", "submerged", "sailab", "barsati",
        "نالہ", "نالے", "برساتی"
    ]
    garbage_patterns = [
        "garbage", "trash", "kachra", "kooda", "waste", "dump", "dustbin", "safai", "solid waste",
        "کوڑا", "کچرا", "صفائی", "ڈمپنگ"
    ]
    electric_patterns = [
        "electric", "live wire", "wire", "current", "pole", "bijli", "khamba", r"\btar\b", "spark",
        "کرنٹ", "بجلی", "پول", "تار"
    ]

    category = "Pothole / Road Damage"  # default
    if any(p in lower_raw for p in sewerage_patterns):
        category = "Sewerage"
    elif any(re.search(p, lower_raw) if "\\" in p else p in lower_raw for p in electric_patterns):
        category = "Street Light / Electric Hazard"
    elif any(p in lower_raw for p in water_patterns):
        category = "Water Supply"
    elif any(p in lower_raw for p in garbage_patterns):
        category = "Solid Waste / Garbage"
    elif any(p in lower_raw for p in drainage_patterns):
        category = "Drainage Overflow"
    elif any(p in lower_raw for p in pothole_patterns):
        category = "Pothole / Road Damage"

    # Severity matching
    p0_patterns = [
        "open manhole", "khula manhole", "manhole cover missing", "gutter ka dhakkan", "dhakkan",
        "current", "live wire", "sparking", "electrocution", "submerged", "doob", "drowning",
        "extreme danger", "hazard", "جان لیوا", "خطرناک", "ایمرجنسی", "ڈھکن غائب"
    ]
    p1_patterns = [
        "rasta band", "blocked", "major", "heap", "overflow", "ubal raha", "toota hua",
        "burst", "accident", "badbu", "smell", "phat gayi", "حادثات", "بند", "تعفن"
    ]

    if any(p in lower_raw for p in p0_patterns):
        severity = "P0"
    elif any(p in lower_raw for p in p1_patterns):
        severity = "P1"
    else:
        severity = "P2"

    # Landmark matching
    known_areas = [
        "Disco Bakery", "Gulshan-e-Iqbal", "Gulshan", "Clifton", "DHA", "Defence",
        "Saddar", "Korangi", "Malir", "Nazimabad", "North Nazimabad", "F.B. Area",
        "Federal B Area", "Liaquatabad", "PECHS", "Gulistan-e-Jauhar", "Jauhar",
        "Manora", "Kemari", "SITE", "Surjani", "Orangi", "Lyari",
        "Shahrah-e-Faisal", "University Road", "M.A. Jinnah Road", "Rashid Minhas Road",
        "Korangi Road", "Shahrah-e-Pakistan", "I.I. Chundrigar Road", "S.M. Taufeeq Road",
        "National Highway", "Hub River Road", "Manghopir Road", "Stadium Road"
    ]

    detected_landmark = landmark_hint or "Karachi Urban Center"
    for area in known_areas:
        if area.lower() in lower_raw:
            detected_landmark = area
            if landmark_hint and landmark_hint.lower() not in area.lower():
                detected_landmark = f"{area}, {landmark_hint}"
            break

    core_problem = f"Acute {category.lower()} reported at {detected_landmark}, assessed at {severity} priority."
    if category == "Sewerage" and severity == "P0":
        core_problem = f"Uncovered manhole or dangerous sewage overflow hazard reported at {detected_landmark}."
    elif category == "Street Light / Electric Hazard":
        core_problem = f"Dangerous exposed electrical wiring or failing pole reported at {detected_landmark}."

    return {
        "issue_category": category,
        "severity": severity,
        "detected_landmark": detected_landmark,
        "core_problem": core_problem
    }


# ============================================================================
# 5. PIPELINE NODES
# ============================================================================

async def fetch_job_batch_node(state: JobState) -> Dict[str, Any]:
    """
    Node 1: Calls Main Service GET /api/internal/jobs/{job_id} with graceful offline fallback.
    """
    job_id = state.get("job_id", "mock_job")
    initial_payload = state.get("initial_job_payload") or {}

    fetched_data: Dict[str, Any] = {}

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{MAIN_SERVICE_URL}/api/internal/jobs/{job_id}")
            if resp.status_code == 200:
                payload = resp.json()
                if payload.get("success") and payload.get("data"):
                    fetched_data = payload["data"]
    except Exception as exc:
        logger.warning(f"[AI-WORKER] Offline or failed to fetch job {job_id} from main service: {exc}")

    # Fallback resolution from initial payload or deterministic defaults
    raw_text = (
        fetched_data.get("text")
        or initial_payload.get("text")
        or initial_payload.get("input")
        or state.get("raw_text")
        or "gutter ubal raha hai Disco Bakery Gulshan-e-Iqbal"
    )

    location = fetched_data.get("location") or initial_payload.get("location") or {}
    lat = location.get("lat") if isinstance(location, dict) else None
    lng = location.get("lng") if isinstance(location, dict) else None

    if lat is None and "lat" in state:
        lat = state["lat"]
    if lng is None and "lng" in state:
        lng = state["lng"]

    # Fallback to Karachi centroid if completely absent
    if lat is None or lng is None:
        lat = lat or 24.9180
        lng = lng or 67.0971

    landmark_hint = (
        fetched_data.get("landmark_hint")
        or initial_payload.get("landmark_hint")
        or state.get("landmark_hint")
        or "Near Disco Bakery, Gulshan-e-Iqbal"
    )

    source = (
        fetched_data.get("source")
        or initial_payload.get("source")
        or state.get("source")
        or "web"
    )

    phone = fetched_data.get("phone") or initial_payload.get("phone") or state.get("phone")
    user_id = fetched_data.get("user_id") or initial_payload.get("user_id")
    citizen_cnic = fetched_data.get("citizen_cnic") or initial_payload.get("citizen_cnic")
    image_url = fetched_data.get("image_url") or initial_payload.get("image_url")
    audio_url = fetched_data.get("audio_url") or initial_payload.get("audio_url")

    return {
        "job_id": job_id,
        "source": source,
        "phone": phone,
        "user_id": user_id,
        "citizen_cnic": citizen_cnic,
        "raw_text": raw_text,
        "image_url": image_url,
        "audio_url": audio_url,
        "lat": lat,
        "lng": lng,
        "landmark_hint": landmark_hint,
    }


async def security_input_node(state: JobState) -> Dict[str, Any]:
    """
    Node 2: Runs security_input_guard on raw_text using shared/security_guards.py.
    """
    text = state.get("raw_text", "")
    guard = input_guard(text)

    if not guard.get("ok", True) or guard.get("flagged"):
        reason = guard.get("reason", "prompt_injection_or_prohibited_content")
        logger.warning(f"[SECURITY] Input blocked for job {state.get('job_id')}: {reason}")
        refusal_msg = (
            "Your grievance could not be processed because it contains prohibited instructions or unsafe content.\n"
            "آپ کی شکایت غیر محفوظ مواد یا ممنوعہ ہدایات کی وجہ سے آگے نہیں بھیجی جا سکی۔"
        )
        return {
            "security_blocked": True,
            "security_flagged": True,
            "security_reason": reason,
            "layman_summary": refusal_msg,
            "subject_en": "REJECTED: UNTRUSTED CIVIC INTAKE",
            "body_en": f"Intake rejected by Gate 1 Input Guard: {reason}",
            "body_ur": "سیکیورٹی جانچ کے نتیجے میں یہ درخواست مسترد کر دی گئی۔",
            "statutory_citations": "N/A - Security Policy Block",
            "target_authority": "UNASSIGNED",
            "issue_category": "Other",
            "severity": "P2",
            "landmark": state.get("landmark_hint") or "Unspecified",
        }

    return {
        "security_blocked": False,
        "security_flagged": guard.get("flagged", False),
        "security_reason": guard.get("reason"),
    }


async def gemini_multimodal_perception_node(state: JobState) -> Dict[str, Any]:
    """
    Node 3: Multimodal call to Google Gemini (gemini-2.5-flash via litellm)
    with intelligent deterministic rule-based fallback if offline or API key missing.
    """
    if state.get("security_blocked"):
        return {}

    raw_text = state.get("raw_text", "")
    landmark_hint = state.get("landmark_hint")
    image_url = state.get("image_url")
    audio_url = state.get("audio_url")

    # Attempt Gemini call if API key configured
    if GEMINI_API_KEY:
        try:
            import litellm

            system_prompt = (
                "You are the Karachi Civic AI Perception Model. Analyze the citizen's complaint "
                "(which may contain text in Urdu, Roman Urdu, or English, alongside photo or audio references).\n\n"
                "Extract strictly in JSON format:\n"
                "1. issue_category: Exactly one of ['Sewerage', 'Water Supply', 'Pothole / Road Damage', "
                "'Drainage Overflow', 'Solid Waste / Garbage', 'Street Light / Electric Hazard']\n"
                "2. severity: 'P0' (immediate biological hazard, open manhole, submerged road, contaminated water), "
                "'P1' (major road obstruction, large garbage heap, broken water main), 'P2' (minor pothole, dry trash bin)\n"
                "3. detected_landmark: Prominent landmark or neighborhood mentioned or visible.\n"
                "4. core_problem: 1-sentence factual description.\n\n"
                "Return STRICT JSON only, matching schema:\n"
                "{\"issue_category\": \"...\", \"severity\": \"...\", \"detected_landmark\": \"...\", \"core_problem\": \"...\"}"
            )

            messages = [{"role": "system", "content": system_prompt}]
            user_content: List[Dict[str, Any]] = [{"type": "text", "text": f"Complaint: {raw_text}\nHint: {landmark_hint}"}]
            if image_url:
                user_content.append({"type": "image_url", "image_url": {"url": image_url}})

            messages.append({"role": "user", "content": user_content})

            response = await litellm.acompletion(
                model=GEMINI_MODEL,
                messages=messages,
                api_key=GEMINI_API_KEY,
                temperature=0.1,
                max_tokens=300,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            parsed = json.loads(content)
            return {
                "issue_category": parsed.get("issue_category", "Pothole / Road Damage"),
                "severity": parsed.get("severity", "P1"),
                "landmark": parsed.get("detected_landmark") or landmark_hint or "Karachi",
                "core_problem": parsed.get("core_problem", raw_text)
            }
        except Exception as exc:
            logger.warning(f"[GEMINI] Inference failed, falling back to rule-based parser: {exc}")

    # Fallback to intelligent deterministic rule-based perception
    parsed = deterministic_rule_based_perception(raw_text, landmark_hint)
    return {
        "issue_category": parsed["issue_category"],
        "severity": parsed["severity"],
        "landmark": parsed["detected_landmark"],
        "core_problem": parsed["core_problem"],
    }


async def jurisdiction_router_node(state: JobState) -> Dict[str, Any]:
    """
    Node 4: Two-stage spatial & jurisdiction routing:
    Stage 1: Cantonments check (6 Cantonments polygon ray-cast + text aliases).
    Stage 2: KMC 26 major arterial roads check.
    Stage 3: Utility matrix (Sewerage/Water -> KW&SC, Garbage -> SSWMB, Roads/Drains -> KMC).
    """
    if state.get("security_blocked"):
        return {"target_authority": "UNASSIGNED"}

    lat = state.get("lat")
    lng = state.get("lng")
    landmark = (state.get("landmark") or "").lower()
    landmark_hint = (state.get("landmark_hint") or "").lower()
    raw_text = (state.get("raw_text") or "").lower()
    full_context = f"{landmark} {landmark_hint} {raw_text}"
    category = state.get("issue_category", "")

    # Stage 1: Cantonments Check
    for cant in CANTONMENTS:
        # Spatial polygon check
        if lat is not None and lng is not None:
            if point_in_polygon(lng, lat, cant["polygon"]):
                return {"target_authority": "CANTONMENT"}
        # Text alias check
        if any(alias in full_context for alias in cant["aliases"]):
            return {"target_authority": "CANTONMENT"}

    # Stage 2: KMC 26 Major Arterial Roads Check
    for road in KMC_ARTERIAL_ROADS:
        road_clean = road.lower().replace("-", " ").replace(".", "")
        if road_clean in full_context.replace("-", " ").replace(".", ""):
            return {"target_authority": "KMC"}

    # Stage 3: Utility Matrix
    if category in ["Sewerage", "Water Supply"]:
        return {"target_authority": "KWSC"}
    elif category == "Solid Waste / Garbage":
        return {"target_authority": "SSWMB"}
    else:
        # Roads, drainage overflow, streetlights default to KMC Metropolitan
        return {"target_authority": "KMC"}


async def deduplication_check_node(state: JobState) -> Dict[str, Any]:
    """
    Node 5: Queries GET /api/internal/active-incidents with 50m / 72h spatiotemporal deduplication.
    """
    if state.get("security_blocked"):
        return {"is_clustered": False, "master_incident_id": None, "community_reports_count": 1}

    cat = state.get("issue_category", "Sewerage")
    lat = state.get("lat")
    lng = state.get("lng")

    if lat is not None and lng is not None:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                url = f"{MAIN_SERVICE_URL}/api/internal/active-incidents"
                params = {"category": cat, "lat": lat, "lng": lng, "radius_m": 50}
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    payload = resp.json()
                    data = payload.get("data") or {}
                    matching_id = data.get("matching_master_id")
                    if matching_id:
                        count = data.get("current_reports_count", 1) + 1
                        return {
                            "is_clustered": True,
                            "master_incident_id": matching_id,
                            "community_reports_count": count
                        }
        except Exception as exc:
            logger.warning(f"[DEDUP] Could not query active incidents: {exc}")

    # Offline / Default unclustered
    return {
        "is_clustered": False,
        "master_incident_id": None,
        "community_reports_count": 1
    }


async def dossier_generator_node(state: JobState) -> Dict[str, Any]:
    """
    Node 6: Dual generation:
    1. Citizen Layman Summary: Bilingual empathetic conversational summary.
    2. Statutory Complaint Dossier: Formal legal English grievance + Urdu notice with exact statutory citations.
    """
    if state.get("security_blocked"):
        return {}

    target = state.get("target_authority", "KMC")
    category = state.get("issue_category", "Pothole / Road Damage")
    severity = state.get("severity", "P1")
    landmark = state.get("landmark", "Karachi")
    lat = state.get("lat", 24.9180)
    lng = state.get("lng", 67.0971)
    core_problem = state.get("core_problem", state.get("raw_text", ""))
    statutory = STATUTORY_REFERENCES.get(target, STATUTORY_REFERENCES["KMC"])

    # 1. Citizen Layman Summary
    summary_en = (
        f"We identified an acute {category.lower()} issue near {landmark} falling under {statutory['name']} jurisdiction. "
        f"It has been designated as a {severity} priority public grievance and routed for urgent field action."
    )
    summary_ur = (
        f"ہم نے {landmark} کے قریب {category} کے مسئلے کا جائزہ لیا ہے، جو کہ {statutory['name']} کے دائرہ اختیار میں ہے۔ "
        f"اسے {severity} ترجیحی بنیاد پر حل کے لیے متعلقہ عملے کو بھیج دیا گیا ہے۔"
    )
    layman_summary = f"{summary_en}\n\n{summary_ur}"

    # 2. Statutory Complaint Dossier
    subject_en = f"STATUTORY NOTICE & URGENT GRIEVANCE: {severity} {category.upper()} AT {landmark.upper()}"

    body_en = (
        f"To:\n"
        f"The Executive Authority / Competent Officer\n"
        f"{statutory['name']}\n\n"
        f"Subject: Formal Statutory Grievance regarding {category} at {landmark}\n\n"
        f"1. STATUTORY JURISDICTION & MANDATE:\n"
        f"This complaint is formally served under {statutory['act']}. Under the cited statutory enactment, "
        f"the Authority is bound by legal obligation: {statutory['mandate']}\n\n"
        f"2. CONSTITUTIONAL BACKING:\n"
        f"The persistent failure to rectify this hazard violates fundamental rights guaranteed under the "
        f"{statutory['constitutional']} (Right to Life, Healthy Environment, and Inviolability of Human Dignity).\n\n"
        f"3. FACTUAL PARTICULARS OF PUBLIC HAZARD:\n"
        f"- Location: {landmark} (GPS Coordinates: {lat}, {lng})\n"
        f"- Classification: {category} [Severity: {severity}]\n"
        f"- Verified Issue: {core_problem}\n\n"
        f"4. REQUISITION FOR IMMEDIATE ACTION:\n"
        f"The Authority is hereby notified to dispatch emergency inspection and rectification squads immediately "
        f"to resolve this defect and avert further danger to the public."
    )

    body_ur = (
        f"بخدمت جناب مجاز اتھارٹی / چیف ایگزیکٹو صاحب\n"
        f"ادارہ: {statutory['name']}\n\n"
        f"عنوان: باضابطہ قانونی شکایت و نوٹس برائے فوری ازالہ - {category} بمقام {landmark}\n\n"
        f"جناب عالی،\n\n"
        f"1. قانونی دائرہ اختیار و فرائض:\n"
        f"یہ باضابطہ قانونی شکایت {statutory['act']} کے تحت پیش کی جا رہی ہے۔ قانون کے تحت متعلقہ اتھارٹی کا فرض ہے: "
        f"{statutory['mandate']}\n\n"
        f"2. آئینی تحفظات:\n"
        f"عوامی خطرے کا بر وقت ازالہ نہ ہونا {statutory['constitutional']} کے تحت شہریوں کے بنیادی حقوق کی پامالی کے مترادف ہے۔\n\n"
        f"3. جائے وقوعہ اور شکایت کی نوعیت:\n"
        f"- مقام: {landmark} (جغرافیائی نقاط: {lat}، {lng})\n"
        f"- نوعیت: {category} (ترجیح: {severity})\n"
        f"- تفصیل: {core_problem}\n\n"
        f"4. فوری قانونی کارروائی کی استدعا:\n"
        f"عوامی تحفظ کے پیش نظر گزارش ہے کہ فوری طور پر تکنیکی ٹیم تعینات فرما کر اس مسئلے کو ترجیحی بنیادوں پر حل کیا جائے۔"
    )

    statutory_citations = f"{statutory['act']}; {statutory['constitutional']}"

    return {
        "layman_summary": layman_summary,
        "subject_en": subject_en,
        "body_en": body_en,
        "body_ur": body_ur,
        "statutory_citations": statutory_citations
    }


async def security_output_node(state: JobState) -> Dict[str, Any]:
    """
    Node 7: Runs security_output_guard on layman_summary, subject_en, body_en, body_ur.
    """
    if state.get("security_blocked"):
        return {}

    for field_name in ["layman_summary", "subject_en", "body_en", "body_ur"]:
        text = state.get(field_name, "")
        guard = output_guard(text)
        if not guard.get("ok", True):
            reason = guard.get("reason", "output_blocked")
            logger.warning(f"[SECURITY] Output check failed on {field_name}: {reason}")
            return {
                field_name: "[REDACTED DUE TO SECURITY POLICY]",
                "error": f"Security output guard flagged: {reason}"
            }

    return {}


async def dispatch_node(state: JobState) -> Dict[str, Any]:
    """
    Node 8: Posts callback to Main Service POST /api/internal/worker-callback
    and if source is WhatsApp, triggers message via POST http://whatsapp-service:3000/whatsapp/send.
    """
    job_id = state.get("job_id", "")
    source = state.get("source", "web")
    phone = state.get("phone")

    callback_payload = {
        "job_id": job_id,
        "classification": {
            "issue_category": state.get("issue_category", "Pothole / Road Damage"),
            "severity": state.get("severity", "P1"),
            "target_authority": state.get("target_authority", "KMC"),
            "landmark": state.get("landmark", "Karachi")
        },
        "clustering": {
            "is_clustered": state.get("is_clustered", False),
            "master_incident_id": state.get("master_incident_id"),
            "community_reports_count": state.get("community_reports_count", 1)
        },
        "review_package": {
            "layman_summary": state.get("layman_summary", ""),
            "subject_en": state.get("subject_en", ""),
            "body_en": state.get("body_en", ""),
            "body_ur": state.get("body_ur", ""),
            "statutory_citations": state.get("statutory_citations", "")
        }
    }

    # 1. Post callback to Main Service
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(f"{MAIN_SERVICE_URL}/api/internal/worker-callback", json=callback_payload)
            if resp.status_code == 200:
                logger.info(f"[DISPATCH] Successfully posted worker callback for job {job_id}")
    except Exception as exc:
        logger.warning(f"[DISPATCH] Main service callback failed (non-fatal offline): {exc}")

    # 2. Trigger WhatsApp interactive dispatch if applicable
    if source == "whatsapp" and phone:
        dept = state.get("target_authority", "Relevant Authority")
        severity = state.get("severity", "P1")
        summary_short = state.get("core_problem") or state.get("issue_category")
        wa_message = (
            f"Assalam-o-Alaikum! We have analyzed your complaint.\n\n"
            f"📍 Department: {dept}\n"
            f"⚠️ Severity: {severity}\n"
            f"📝 Summary: {summary_short}\n\n"
            f"Reply 'YES' to confirm and file this official complaint."
        )
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    f"{WHATSAPP_SERVICE_URL}/whatsapp/send",
                    json={"to": phone, "message": wa_message}
                )
        except Exception as exc:
            logger.warning(f"[DISPATCH] WhatsApp notification failed (non-fatal): {exc}")

    return {
        "dispatched": True,
        "callback_payload": callback_payload
    }


# ============================================================================
# 6. LANGGRAPH ORCHESTRATION GRAPH
# ============================================================================

def decide_after_input_guard(state: JobState) -> str:
    """Route to dispatch if blocked, else continue to Gemini perception."""
    if state.get("security_blocked"):
        return "dispatch"
    return "gemini_perception"


def build_pipeline_graph():
    """Builds and compiles the StateGraph workflow."""
    workflow = StateGraph(JobState)

    workflow.add_node("fetch_job_batch", fetch_job_batch_node)
    workflow.add_node("security_input", security_input_node)
    workflow.add_node("gemini_perception", gemini_multimodal_perception_node)
    workflow.add_node("jurisdiction_router", jurisdiction_router_node)
    workflow.add_node("deduplication_check", deduplication_check_node)
    workflow.add_node("dossier_generator", dossier_generator_node)
    workflow.add_node("security_output", security_output_node)
    workflow.add_node("dispatch", dispatch_node)

    workflow.set_entry_point("fetch_job_batch")
    workflow.add_edge("fetch_job_batch", "security_input")
    workflow.add_conditional_edges(
        "security_input",
        decide_after_input_guard,
        {
            "gemini_perception": "gemini_perception",
            "dispatch": "dispatch"
        }
    )
    workflow.add_edge("gemini_perception", "jurisdiction_router")
    workflow.add_edge("jurisdiction_router", "deduplication_check")
    workflow.add_edge("deduplication_check", "dossier_generator")
    workflow.add_edge("dossier_generator", "security_output")
    workflow.add_edge("security_output", "dispatch")
    workflow.add_edge("dispatch", END)

    return workflow.compile()


pipeline_app = build_pipeline_graph()


# ============================================================================
# 7. MAIN ENTRY POINT CALLED BY CONSUMER LOOP
# ============================================================================

async def main(job: dict, role: str = "responder") -> Dict[str, Any]:
    """
    Main entry point for processing a job from Redis ai_queue.
    Accepts job token {"job_id": "...", ...} or legacy test jobs.
    """
    job_id = job.get("job_id", f"job_{os.urandom(4).hex()}")

    # Handle pre-hackathon simple test job pass-through if explicitly requested
    if job.get("type") == "test" and "input" in job and "test" in str(job.get("input")):
        message = job.get("input", "")
        return {
            "message": f"Worker successfully processed: {message}",
            "worker": "ai-worker",
            "task_type": "test",
            "processed": True,
        }

    initial_state: JobState = {
        "job_id": job_id,
        "initial_job_payload": job,
        "source": job.get("source", "web"),
        "phone": job.get("phone"),
        "raw_text": job.get("text") or job.get("input") or "",
        "lat": job.get("lat") or (job.get("location", {}).get("lat") if isinstance(job.get("location"), dict) else None),
        "lng": job.get("lng") or (job.get("location", {}).get("lng") if isinstance(job.get("location"), dict) else None),
        "landmark_hint": job.get("landmark_hint"),
        "image_url": job.get("image_url"),
        "audio_url": job.get("audio_url"),
    }

    final_state = await pipeline_app.ainvoke(initial_state)

    # Return standard callback payload
    return final_state.get("callback_payload") or {
        "job_id": job_id,
        "classification": {
            "issue_category": final_state.get("issue_category", "Pothole / Road Damage"),
            "severity": final_state.get("severity", "P1"),
            "target_authority": final_state.get("target_authority", "KMC"),
            "landmark": final_state.get("landmark", "Karachi")
        },
        "clustering": {
            "is_clustered": final_state.get("is_clustered", False),
            "master_incident_id": final_state.get("master_incident_id"),
            "community_reports_count": final_state.get("community_reports_count", 1)
        },
        "review_package": {
            "layman_summary": final_state.get("layman_summary", ""),
            "subject_en": final_state.get("subject_en", ""),
            "body_en": final_state.get("body_en", ""),
            "body_ur": final_state.get("body_ur", ""),
            "statutory_citations": final_state.get("statutory_citations", "")
        }
    }
