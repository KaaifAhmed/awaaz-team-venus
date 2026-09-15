"""
Modular AI Worker intelligence pipeline for Awaaz (Karachi Civic AI Platform).
Orchestrates the civic grievance LangGraph workflow.
"""
import asyncio
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from langgraph.graph import END, StateGraph

# Path setup for shared security guards
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from shared.security_guards import input_guard, output_guard
from config import (
    MAIN_SERVICE_URL,
    WHATSAPP_SERVICE_URL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    CANDIDATE_MODELS,
    CANTONMENTS,
    KMC_ARTERIAL_ROADS,
    STATUTORY_REFERENCES,
    SEWERAGE_PATTERNS,
    WATER_PATTERNS,
    POTHOLE_PATTERNS,
    DRAINAGE_PATTERNS,
    GARBAGE_PATTERNS,
    ELECTRIC_PATTERNS,
    SEVERITY_P0_PATTERNS,
    SEVERITY_P1_PATTERNS,
    KNOWN_KARACHI_LANDMARKS,
)

logger = logging.getLogger("ai-worker")


# ============================================================================
# 1. STATE SCHEMA
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

    issue_category: str
    severity: str
    target_authority: str
    landmark: str
    core_problem: str

    is_clustered: bool
    master_incident_id: Optional[str]
    community_reports_count: int

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
    dispatched: bool
    callback_payload: Optional[Dict[str, Any]]


# ============================================================================
# 2. UTILITY HELPERS
# ============================================================================

def point_in_polygon(lng: float, lat: float, polygon: List[List[float]]) -> bool:
    """Standard ray-casting algorithm to determine if GPS coordinate falls in polygon."""
    num_vertices = len(polygon)
    inside = False
    p1_lng, p1_lat = polygon[0]
    for i in range(num_vertices + 1):
        p2_lng, p2_lat = polygon[i % num_vertices]
        if min(p1_lat, p2_lat) < lat <= max(p1_lat, p2_lat):
            if lng <= max(p1_lng, p2_lng):
                x_inters = (
                    (lat - p1_lat) * (p2_lng - p1_lng) / (p2_lat - p1_lat) + p1_lng
                    if p1_lat != p2_lat
                    else p1_lng
                )
                if p1_lng == p2_lng or lng <= x_inters:
                    inside = not inside
        p1_lng, p1_lat = p2_lng, p2_lat
    return inside


def deterministic_rule_based_perception(text: str, landmark_hint: Optional[str] = None) -> Dict[str, str]:
    """Deterministic NLP classifier for trilingual intake (Urdu / Roman Urdu / English)."""
    lower_raw = (text or "").lower()

    # Category matching
    if any(p in lower_raw for p in SEWERAGE_PATTERNS):
        category = "Sewerage"
    elif any(p in lower_raw for p in ELECTRIC_PATTERNS):
        category = "Street Light / Electric Hazard"
    elif any(p in lower_raw for p in WATER_PATTERNS):
        category = "Water Supply"
    elif any(p in lower_raw for p in GARBAGE_PATTERNS):
        category = "Solid Waste / Garbage"
    elif any(p in lower_raw for p in DRAINAGE_PATTERNS):
        category = "Drainage Overflow"
    else:
        category = "Pothole / Road Damage"

    # Severity matching
    if any(p in lower_raw for p in SEVERITY_P0_PATTERNS):
        severity = "P0"
    elif any(p in lower_raw for p in SEVERITY_P1_PATTERNS):
        severity = "P1"
    else:
        severity = "P2"

    # Landmark extraction
    detected_landmark = landmark_hint or "Karachi"
    for area in KNOWN_KARACHI_LANDMARKS:
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
        "core_problem": core_problem,
    }


# ============================================================================
# 3. LANGGRAPH WORKFLOW NODES
# ============================================================================

async def fetch_job_batch_node(state: JobState) -> Dict[str, Any]:
    """Node 1: Fetch job payload from Main Service."""
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
        logger.warning(f"[AI-WORKER] Failed to fetch job {job_id}: {exc}")

    raw_text = (
        fetched_data.get("text")
        or initial_payload.get("text")
        or initial_payload.get("input")
        or state.get("raw_text")
        or ""
    )

    location = fetched_data.get("location") or initial_payload.get("location") or {}
    lat = location.get("lat") if isinstance(location, dict) else None
    lng = location.get("lng") if isinstance(location, dict) else None
    if lat is None:
        lat = 24.9180
    if lng is None:
        lng = 67.0971

    landmark_hint = (
        fetched_data.get("landmark_hint")
        or initial_payload.get("landmark_hint")
        or state.get("landmark_hint")
        or ""
    )

    source = fetched_data.get("source") or initial_payload.get("source") or state.get("source") or "web"
    phone = fetched_data.get("phone") or initial_payload.get("phone") or state.get("phone")
    user_id = fetched_data.get("user_id") or initial_payload.get("user_id")
    citizen_cnic = fetched_data.get("citizen_cnic") or initial_payload.get("citizen_cnic")
    image_url = fetched_data.get("image_url") or initial_payload.get("image_url") or state.get("image_url")
    audio_url = fetched_data.get("audio_url") or initial_payload.get("audio_url") or state.get("audio_url")

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
    """Node 2: Gate 1 prompt shield and injection detector."""
    text = state.get("raw_text", "")
    if not text.strip():
        return {"security_blocked": False, "security_flagged": False, "security_reason": None}

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

    return {"security_blocked": False, "security_flagged": guard.get("flagged", False), "security_reason": guard.get("reason")}


async def gemini_multimodal_perception_node(state: JobState) -> Dict[str, Any]:
    """Node 3: Multimodal Gemini 2.5/2.0/1.5 Flash call with deterministic fallback."""
    if state.get("security_blocked"):
        return {}

    raw_text = (state.get("raw_text") or "").strip()
    landmark_hint = state.get("landmark_hint") or ""
    image_url = state.get("image_url")
    audio_url = state.get("audio_url")

    # If completely empty
    if not raw_text and not image_url and not audio_url:
        return {
            "issue_category": "Pothole / Road Damage",
            "severity": "P2",
            "landmark": landmark_hint or "Karachi",
            "core_problem": "No complaint text or visual evidence was available for automatic classification.",
        }

    # Attempt Multimodal REST Call if API key configured
    if GEMINI_API_KEY:
        try:
            system_prompt = (
                "You are the Awaaz Civic AI Perception Model. Analyze the citizen's complaint "
                "(which may contain text in Urdu, Roman Urdu, or English, alongside photo references).\n\n"
                "Extract strictly in JSON format:\n"
                "1. issue_category: Exactly one of ['Sewerage', 'Water Supply', 'Pothole / Road Damage', "
                "'Drainage Overflow', 'Solid Waste / Garbage', 'Street Light / Electric Hazard']\n"
                "2. severity: 'P0' (immediate biological hazard, open manhole, submerged road, live wire), "
                "'P1' (major road obstruction, large garbage heap, broken water main), 'P2' (minor defect)\n"
                "3. detected_landmark: Prominent landmark or neighborhood visible or mentioned.\n"
                "4. core_problem: 1-sentence factual description.\n\n"
                "Return STRICT JSON only, matching schema:\n"
                '{"issue_category": "...", "severity": "...", "detected_landmark": "...", "core_problem": "..."}'
            )

            prompt_text = f"{system_prompt}\n\nComplaint Text: {raw_text}\nLandmark Hint: {landmark_hint}"
            parts: List[Dict[str, Any]] = [{"text": prompt_text}]

            # Fetch image bytes across docker network if present
            if image_url:
                try:
                    import base64
                    resolved_url = image_url.replace("localhost:8000", "main-service:8000").replace("127.0.0.1:8000", "main-service:8000")
                    async with httpx.AsyncClient(timeout=5.0) as img_client:
                        img_resp = await img_client.get(resolved_url)
                        if img_resp.status_code == 200:
                            img_b64 = base64.b64encode(img_resp.content).decode("utf-8")
                            mime = "image/png" if ".png" in resolved_url.lower() else "image/jpeg"
                            parts.append({"inlineData": {"mimeType": mime, "data": img_b64}})
                            logger.info(f"[GEMINI-MULTIMODAL] Attached photo ({len(img_resp.content)} bytes)")
                except Exception as img_err:
                    logger.warning(f"[GEMINI-MULTIMODAL] Image fetch failed: {img_err}")

            # Call candidate models in order for 503 high-demand resilience
            for model in CANDIDATE_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                try:
                    async with httpx.AsyncClient(timeout=10.0) as http_client:
                        resp = await http_client.post(
                            url,
                            json={
                                "contents": [{"parts": parts}],
                                "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
                            parsed = json.loads(raw_content)
                            logger.info(f"[GEMINI-REST] Succeeded with {model}: {parsed.get('issue_category')} / {parsed.get('severity')}")
                            return {
                                "issue_category": parsed.get("issue_category", "Pothole / Road Damage"),
                                "severity": parsed.get("severity", "P1"),
                                "landmark": parsed.get("detected_landmark") or landmark_hint or "Karachi",
                                "core_problem": parsed.get("core_problem", raw_text or "Civic infrastructure issue detected."),
                            }
                except Exception as model_err:
                    logger.warning(f"[GEMINI-REST] Model {model} attempt error: {model_err}")

        except Exception as exc:
            logger.warning(f"[GEMINI] Multimodal inference failed: {exc}")

    # Fallback to deterministic NLP
    if not raw_text:
        return {
            "issue_category": "Pothole / Road Damage",
            "severity": "P2",
            "landmark": landmark_hint or "Karachi",
            "core_problem": "Civic infrastructure issue submitted via image, but automatic vision was unavailable.",
        }

    parsed = deterministic_rule_based_perception(raw_text, landmark_hint)
    return {
        "issue_category": parsed["issue_category"],
        "severity": parsed["severity"],
        "landmark": parsed["detected_landmark"],
        "core_problem": parsed["core_problem"],
    }


async def jurisdiction_router_node(state: JobState) -> Dict[str, Any]:
    """Node 4: Two-stage spatial routing (Cantonments -> KMC Arterials -> Utilities)."""
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
        if lat is not None and lng is not None:
            if point_in_polygon(lng, lat, cant["polygon"]):
                return {"target_authority": "CANTONMENT"}
        if any(alias in full_context for alias in cant["aliases"]):
            return {"target_authority": "CANTONMENT"}

    # Stage 2: KMC Major Arterial Roads
    normalized_context = full_context.replace("-", " ").replace(".", "")
    for road in KMC_ARTERIAL_ROADS:
        road_clean = road.lower().replace("-", " ").replace(".", "")
        if road_clean in normalized_context:
            return {"target_authority": "KMC"}

    # Stage 3: Utility Matrix
    if category in ["Sewerage", "Water Supply"]:
        return {"target_authority": "KWSC"}
    if category == "Solid Waste / Garbage":
        return {"target_authority": "SSWMB"}

    return {"target_authority": "KMC"}


async def deduplication_check_node(state: JobState) -> Dict[str, Any]:
    """Node 5: Spatial 50m radius cluster check against active incidents."""
    if state.get("security_blocked"):
        return {"is_clustered": False, "master_incident_id": None, "community_reports_count": 1}

    cat = state.get("issue_category", "Pothole / Road Damage")
    lat, lng = state.get("lat"), state.get("lng")

    if lat is not None and lng is not None:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                url = f"{MAIN_SERVICE_URL}/api/internal/active-incidents"
                resp = await client.get(url, params={"category": cat, "lat": lat, "lng": lng, "radius_m": 50})
                if resp.status_code == 200:
                    data = resp.json().get("data") or {}
                    matching_id = data.get("master_incident_id")
                    if matching_id:
                        return {
                            "is_clustered": True,
                            "master_incident_id": matching_id,
                            "community_reports_count": data.get("current_reports_count", 1) + 1,
                        }
        except Exception as exc:
            logger.warning(f"[DEDUP] Spatial cluster query skipped: {exc}")

    return {"is_clustered": False, "master_incident_id": None, "community_reports_count": 1}


async def dossier_generator_node(state: JobState) -> Dict[str, Any]:
    """Node 6: Citizen Layman Summary & Statutory Legal Complaint Dossier."""
    if state.get("security_blocked"):
        return {}

    target = state.get("target_authority", "KMC")
    category = state.get("issue_category", "Pothole / Road Damage")
    severity = state.get("severity", "P2")
    landmark = state.get("landmark", "Karachi")
    lat = state.get("lat", 24.9180)
    lng = state.get("lng", 67.0971)
    core_problem = state.get("core_problem", state.get("raw_text", "Civic infrastructure issue reported."))
    statutory = STATUTORY_REFERENCES.get(target, STATUTORY_REFERENCES["KMC"])

    # Citizen Layman Summary
    summary_en = (
        f"We identified an acute {category.lower()} issue near {landmark} falling under "
        f"{statutory['name']} jurisdiction. It has been designated as a {severity} priority "
        f"public grievance and routed for urgent field action."
    )
    summary_ur = (
        f"ہم نے {landmark} کے قریب {category} کے مسئلے کا جائزہ لیا ہے، جو کہ "
        f"{statutory['name']} کے دائرہ اختیار میں ہے۔ اسے {severity} ترجیحی بنیاد پر حل کے لیے "
        f"متعلقہ عملے کو بھیج دیا گیا ہے۔"
    )
    layman_summary = f"{summary_en}\n\n{summary_ur}"

    # Formal Statutory Dossier
    subject_en = f"STATUTORY NOTICE & URGENT GRIEVANCE: {severity} {category.upper()} AT {landmark.upper()}"
    body_en = (
        f"To:\nThe Executive Authority / Competent Officer\n{statutory['name']}\n\n"
        f"Subject: Formal Statutory Grievance regarding {category} at {landmark}\n\n"
        f"1. STATUTORY JURISDICTION & MANDATE:\nThis complaint is formally served under {statutory['act']}. "
        f"Under the cited statutory enactment, the Authority is bound by legal obligation: {statutory['mandate']}\n\n"
        f"2. CONSTITUTIONAL BACKING:\nThe persistent failure to rectify this hazard violates fundamental rights "
        f"guaranteed under {statutory['constitutional']}.\n\n"
        f"3. FACTUAL PARTICULARS OF PUBLIC HAZARD:\n- Location: {landmark} (GPS: {lat}, {lng})\n"
        f"- Classification: {category} [Severity: {severity}]\n- Verified Issue: {core_problem}\n\n"
        f"4. REQUISITION FOR IMMEDIATE ACTION:\nThe Authority is hereby notified to dispatch emergency inspection "
        f"and rectification squads immediately to resolve this defect and avert further danger to the public."
    )

    body_ur = (
        f"بخدمت جناب مجاز اتھارٹی / چیف ایگزیکٹو صاحب\nادارہ: {statutory['name']}\n\n"
        f"عنوان: باضابطہ قانونی شکایت و نوٹس برائے فوری ازالہ - {category} بمقام {landmark}\n\n"
        f"جناب عالی،\n\n"
        f"1. قانونی دائرہ اختیار و فرائض:\nیہ باضابطہ قانونی شکایت {statutory['act']} کے تحت پیش کی جا رہی ہے۔ "
        f"قانون کے تحت متعلقہ اتھارٹی کا فرض ہے: {statutory['mandate']}\n\n"
        f"2. آئینی تحفظات:\nعوامی خطرے کا بر وقت ازالہ نہ ہونا {statutory['constitutional']} کے تحت شہریوں کے بنیادی "
        f"حقوق کی پامالی کے مترادف ہے۔\n\n"
        f"3. جائے وقوعہ اور شکایت کی نوعیت:\n- مقام: {landmark} (جغرافیائی نقاط: {lat}، {lng})\n"
        f"- نوعیت: {category} (ترجیح: {severity})\n- تفصیل: {core_problem}\n\n"
        f"4. فوری قانونی کارروائی کی استدعا:\nعوامی تحفظ کے پیش نظر گزارش ہے کہ فوری طور پر تکنیکی ٹیم تعینات فرما کر "
        f"اس مسئلے کو ترجیحی بنیادوں پر حل کیا جائے۔"
    )

    statutory_citations = f"{statutory['act']}; {statutory['constitutional']}"

    return {
        "layman_summary": layman_summary,
        "subject_en": subject_en,
        "body_en": body_en,
        "body_ur": body_ur,
        "statutory_citations": statutory_citations,
    }


async def security_output_node(state: JobState) -> Dict[str, Any]:
    """Node 7: Gate 2 Output Guard."""
    if state.get("security_blocked"):
        return {}

    for field in ["layman_summary", "subject_en", "body_en", "body_ur"]:
        text = state.get(field, "")
        guard = output_guard(text)
        if not guard.get("ok", True):
            reason = guard.get("reason", "output_blocked")
            logger.warning(f"[SECURITY] Output check failed on {field}: {reason}")
            return {
                field: "[REDACTED DUE TO SECURITY POLICY]",
                "error": f"Security output guard flagged: {reason}",
            }
    return {}


async def dispatch_node(state: JobState) -> Dict[str, Any]:
    """Node 8: Callback to Main Service & WhatsApp notification dispatch."""
    job_id = state.get("job_id", "")
    source = state.get("source", "web")
    phone = state.get("phone")

    callback_payload = {
        "job_id": job_id,
        "classification": {
            "issue_category": state.get("issue_category", "Pothole / Road Damage"),
            "severity": state.get("severity", "P2"),
            "target_authority": state.get("target_authority", "KMC"),
            "landmark": state.get("landmark", "Karachi"),
        },
        "clustering": {
            "is_clustered": state.get("is_clustered", False),
            "master_incident_id": state.get("master_incident_id"),
            "community_reports_count": state.get("community_reports_count", 1),
        },
        "review_package": {
            "layman_summary": state.get("layman_summary", ""),
            "subject_en": state.get("subject_en", ""),
            "body_en": state.get("body_en", ""),
            "body_ur": state.get("body_ur", ""),
            "statutory_citations": state.get("statutory_citations", ""),
        },
    }

    # Post callback to Django Main Service
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(f"{MAIN_SERVICE_URL}/api/internal/worker-callback", json=callback_payload)
            if resp.status_code == 200:
                logger.info(f"[DISPATCH] Successfully posted worker callback for job {job_id}")
            else:
                logger.warning(f"[DISPATCH] Main service returned {resp.status_code}")
    except Exception as exc:
        logger.warning(f"[DISPATCH] Main service callback failed: {exc}")

    # WhatsApp Interactive Response
    if source == "whatsapp" and phone:
        dept = state.get("target_authority", "Relevant Authority")
        severity = state.get("severity", "P2")
        summary_short = state.get("core_problem") or state.get("issue_category") or "Civic issue detected."
        wa_message = (
            "Assalam-o-Alaikum! We have analyzed your complaint.\n\n"
            f"📍 Department: {dept}\n"
            f"⚠️ Severity: {severity}\n"
            f"📝 Summary: {summary_short}\n\n"
            "Reply 'YES' to confirm and file this official complaint."
        )
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(f"{WHATSAPP_SERVICE_URL}/whatsapp/send", json={"to": phone, "message": wa_message})
        except Exception as exc:
            logger.warning(f"[DISPATCH] WhatsApp notification failed: {exc}")

    return {"dispatched": True, "callback_payload": callback_payload}


# ============================================================================
# 4. LANGGRAPH PIPELINE ASSEMBLY
# ============================================================================

def decide_after_input_guard(state: JobState) -> str:
    return "dispatch" if state.get("security_blocked") else "gemini_perception"


def build_pipeline_graph():
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
        {"gemini_perception": "gemini_perception", "dispatch": "dispatch"},
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
# 5. MAIN ENTRYPOINT
# ============================================================================

async def main(job: dict, role: str = "responder") -> Dict[str, Any]:
    """Single entrypoint to process an individual civic job."""
    job_id = job.get("job_id", f"job_{os.urandom(4).hex()}")

    # Handle test ping jobs
    if job.get("type") == "test" and "input" in job:
        return {
            "message": f"Worker successfully processed: {job.get('input', '')}",
            "worker": "ai-worker",
            "task_type": "test",
            "processed": True,
        }

    location = job.get("location", {})
    initial_state: JobState = {
        "job_id": job_id,
        "initial_job_payload": job,
        "source": job.get("source", "web"),
        "phone": job.get("phone"),
        "raw_text": job.get("text") or job.get("input") or "",
        "lat": job.get("lat") or (location.get("lat") if isinstance(location, dict) else None),
        "lng": job.get("lng") or (location.get("lng") if isinstance(location, dict) else None),
        "landmark_hint": job.get("landmark_hint"),
        "image_url": job.get("image_url"),
        "audio_url": job.get("audio_url"),
    }

    final_state = await pipeline_app.ainvoke(initial_state)
    return final_state.get("callback_payload") or {
        "job_id": job_id,
        "classification": {
            "issue_category": final_state.get("issue_category", "Pothole / Road Damage"),
            "severity": final_state.get("severity", "P2"),
            "target_authority": final_state.get("target_authority", "KMC"),
            "landmark": final_state.get("landmark", "Karachi"),
        },
        "clustering": {
            "is_clustered": final_state.get("is_clustered", False),
            "master_incident_id": final_state.get("master_incident_id"),
            "community_reports_count": final_state.get("community_reports_count", 1),
        },
        "review_package": {
            "layman_summary": final_state.get("layman_summary", ""),
            "subject_en": final_state.get("subject_en", ""),
            "body_en": final_state.get("body_en", ""),
            "body_ur": final_state.get("body_ur", ""),
            "statutory_citations": final_state.get("statutory_citations", ""),
        },
    }
