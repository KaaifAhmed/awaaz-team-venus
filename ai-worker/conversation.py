"""
Conversation AI graph for the WhatsApp multi-turn flow.
Django owns the state machine (collect -> ask -> confirm -> submit).
This file only does the two AI jobs Django asks for:
  1) describe a photo (analyze_image)
  2) write the final complaint report (generate_report)

Reuses jurisdiction_router_node / dossier_generator_node / deterministic_rule_based_perception
from ai.py so we don't duplicate the report-writing logic.
"""
import base64
import json
import logging
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from langgraph.graph import END, StateGraph

from ai import (
    deterministic_rule_based_perception,
    jurisdiction_router_node,
    dossier_generator_node,
)
from config import (
    MAIN_SERVICE_URL,
    GEMINI_API_KEY,
    CANDIDATE_MODELS,
    resolve_internal_image_url,
)

logger = logging.getLogger("ai-worker-conversation")


class ConvState(TypedDict, total=False):
    job_type: str
    session_id: str

    # analyze_image job
    attachment_id: Optional[str]
    image_url: Optional[str]
    extracted_info: Optional[str]

    # generate_report job
    collected_texts: List[str]
    lat: Optional[float]
    lng: Optional[float]
    landmark_text: Optional[str]
    generated_report: Optional[Dict[str, Any]]


# ============================================================================
# NODE 1: describe a photo with Gemini vision
# ============================================================================

async def analyze_image_node(state: ConvState) -> Dict[str, Any]:
    if state.get("job_type") != "analyze_image":
        return {}

    image_url = state.get("image_url")
    resolved_url = resolve_internal_image_url(image_url)
    description = "Photo received (could not be analyzed automatically)."

    if GEMINI_API_KEY and resolved_url:
        try:
            async with httpx.AsyncClient(timeout=6.0) as img_client:
                img_resp = await img_client.get(resolved_url)
                if img_resp.status_code == 200:
                    img_b64 = base64.b64encode(img_resp.content).decode("utf-8")
                    mime = "image/png" if ".png" in resolved_url.lower() else "image/jpeg"

                    prompt = (
                        "You are looking at a photo of a civic/infrastructure problem in Karachi "
                        "(pothole, sewage, garbage, broken street light, flooding, etc). "
                        "In one short factual sentence, describe what the problem in the photo is."
                    )
                    parts = [{"text": prompt}, {"inlineData": {"mimeType": mime, "data": img_b64}}]

                    for model in CANDIDATE_MODELS:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                        try:
                            async with httpx.AsyncClient(timeout=10.0) as http_client:
                                resp = await http_client.post(url, json={"contents": [{"parts": parts}]})
                                if resp.status_code == 200:
                                    data = resp.json()
                                    description = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                                    break
                        except Exception as model_err:
                            logger.warning(f"[VISION] Model {model} failed: {model_err}")
        except Exception as exc:
            logger.warning(f"[VISION] Image analysis failed: {exc}")

    return {"extracted_info": description}


# ============================================================================
# NODE 2: fetch full session data from Django (only needed for report generation)
# ============================================================================

async def fetch_session_node(state: ConvState) -> Dict[str, Any]:
    if state.get("job_type") != "generate_report":
        return {}

    session_id = state["session_id"]
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{MAIN_SERVICE_URL}/api/internal/conversation/{session_id}")
        if resp.status_code == 200:
            data = resp.json().get("data") or {}
            return {
                "collected_texts": data.get("collected_texts", []),
                "lat": data.get("lat"),
                "lng": data.get("lng"),
                "landmark_text": data.get("landmark_text"),
            }
    return {}


# ============================================================================
# NODE 3: write the final report, reusing ai.py's existing functions
# ============================================================================

async def generate_report_node(state: ConvState) -> Dict[str, Any]:
    if state.get("job_type") != "generate_report":
        return {}

    combined_text = " ".join(state.get("collected_texts") or [])
    landmark_hint = state.get("landmark_text") or ""
    perception = deterministic_rule_based_perception(combined_text, landmark_hint)

    partial_state = {
        "lat": state.get("lat") or 24.9180,
        "lng": state.get("lng") or 67.0971,
        "landmark": perception["detected_landmark"],
        "landmark_hint": landmark_hint,
        "raw_text": combined_text,
        "issue_category": perception["issue_category"],
        "severity": perception["severity"],
        "core_problem": perception["core_problem"],
        "security_blocked": False,
    }

    routing = await jurisdiction_router_node(partial_state)
    partial_state.update(routing)

    dossier = await dossier_generator_node(partial_state)
    partial_state.update(dossier)

    return {"generated_report": partial_state}


# ============================================================================
# NODE 4: send the result back to Django
# ============================================================================

async def post_result_node(state: ConvState) -> Dict[str, Any]:
    session_id = state["session_id"]

    async with httpx.AsyncClient(timeout=5.0) as client:
        if state.get("job_type") == "analyze_image":
            attachment_id = state["attachment_id"]
            await client.post(
                f"{MAIN_SERVICE_URL}/api/internal/conversation/{session_id}/attachment/{attachment_id}/analyzed",
                json={"extracted_info": state.get("extracted_info", "")},
            )
        elif state.get("job_type") == "generate_report":
            report = state.get("generated_report") or {}
            await client.post(
                f"{MAIN_SERVICE_URL}/api/internal/conversation/{session_id}/report-generated",
                json=report,
            )

    return {}


# ============================================================================
# GRAPH ASSEMBLY - simple, linear, easy to follow
# ============================================================================

def build_conversation_graph():
    workflow = StateGraph(ConvState)
    workflow.add_node("analyze_image", analyze_image_node)
    workflow.add_node("fetch_session", fetch_session_node)
    workflow.add_node("generate_report", generate_report_node)
    workflow.add_node("post_result", post_result_node)

    workflow.set_entry_point("analyze_image")
    workflow.add_edge("analyze_image", "fetch_session")
    workflow.add_edge("fetch_session", "generate_report")
    workflow.add_edge("generate_report", "post_result")
    workflow.add_edge("post_result", END)

    return workflow.compile()


conversation_app = build_conversation_graph()


async def run_conversation_job(job: dict) -> None:
    """Entry point called by main.py for every conversation_queue job."""
    await conversation_app.ainvoke(job)