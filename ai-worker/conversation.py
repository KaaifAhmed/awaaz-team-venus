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

    # classify_intent job
    new_text: Optional[str]
    collected_texts: List[str]
    landmark_text: Optional[str]
    session_status: Optional[str]
    intent: Optional[str]

    # generate_report job
    lat: Optional[float]
    lng: Optional[float]
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
        elif state.get("job_type") == "classify_intent":
            await client.post(
                f"{MAIN_SERVICE_URL}/api/internal/conversation/{session_id}/intent-classified",
                json={"intent": state.get("intent", "OTHER"), "text": state.get("new_text", "")},
            )

    return {}


async def classify_intent_node(state: ConvState) -> Dict[str, Any]:
    if state.get("job_type") != "classify_intent":
        return {}

    text = state.get("new_text", "")
    collected_texts = state.get("collected_texts") or []
    landmark_text = state.get("landmark_text") or "(not given yet)"
    session_status = state.get("session_status", "COLLECTING")

    history_lines = [f"- {t}" for t in collected_texts]
    history_text = "\n".join(history_lines) if history_lines else "(nothing yet)"

    intent = "OTHER"

    if GEMINI_API_KEY:
        prompt = (
            "You are reading a WhatsApp conversation where a citizen in Karachi is reporting a civic "
            "problem (pothole, sewage, garbage, water, electric hazard, etc). Messages can be in "
            "English, Urdu, or Roman Urdu, and may contain typos.\n\n"
            f"What the user already told us about the problem:\n{history_text}\n\n"
            f"Location already given: {landmark_text}\n"
            f"Current conversation stage: {session_status}\n\n"
            f"New message just received: \"{text}\"\n\n"
            "Classify this new message into EXACTLY ONE of these categories:\n"
            "RESTART - user wants to discard everything and start reporting a different/new issue\n"
            "GENERATE - user wants the report prepared now (any phrasing: 'generate', 'genrate', "
            "'report bnado', 'banado', 'ready karo', 'now do it', etc)\n"
            "SUBMIT_YES - user is agreeing to submit the report that was already shown to them\n"
            "SUBMIT_NO - user does NOT want to submit yet / wants to change something\n"
            "LOCATION - this message is giving a location / area / landmark\n"
            "PROBLEM - this message is describing the civic problem or adding detail about it\n"
            "OTHER - greeting, unclear, small talk, anything that doesn't fit above\n\n"
            'Reply with ONLY this JSON, nothing else: {"intent": "ONE_OF_THE_CATEGORIES_ABOVE"}'
        )

        for model in CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        url,
                        json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json"},
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        raw = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw)
                        candidate_intent = parsed.get("intent", "OTHER")
                        valid_intents = {"RESTART", "GENERATE", "SUBMIT_YES", "SUBMIT_NO", "LOCATION", "PROBLEM", "OTHER"}
                        if candidate_intent in valid_intents:
                            intent = candidate_intent
                            break
            except Exception as exc:
                logger.warning(f"[INTENT] Model {model} failed: {exc}")

    return {"intent": intent}

# ============================================================================
# GRAPH ASSEMBLY - simple, linear, easy to follow
# ============================================================================

def build_conversation_graph():
    workflow = StateGraph(ConvState)
    workflow.add_node("analyze_image", analyze_image_node)
    workflow.add_node("classify_intent", classify_intent_node)   # add
    workflow.add_node("fetch_session", fetch_session_node)
    workflow.add_node("generate_report", generate_report_node)
    workflow.add_node("post_result", post_result_node)

    workflow.set_entry_point("analyze_image")
    workflow.add_edge("analyze_image", "classify_intent")        # add
    workflow.add_edge("classify_intent", "fetch_session")        # changed
    workflow.add_edge("fetch_session", "generate_report")
    workflow.add_edge("generate_report", "post_result")
    workflow.add_edge("post_result", END)

    return workflow.compile()


conversation_app = build_conversation_graph()


async def run_conversation_job(job: dict) -> None:
    """Entry point called by main.py for every conversation_queue job."""
    await conversation_app.ainvoke(job)