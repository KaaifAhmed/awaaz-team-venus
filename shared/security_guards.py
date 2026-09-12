"""
Input/output guards for AI-generated content - docs/ai-system.md par 5.1.
Imported by ai-worker and background-worker.

Integrates Prompt Shield (prompt-shield) as the primary inspection engine
for Gate 1 (Input), Gate 2 (Tool Results), and Gate 3 (Output), with
regex pattern-based fallback if prompt-shield is not initialized.
"""
import re
from typing import Optional, Dict, Any

MAX_INPUT_LENGTH = 8000

INJECTION_PATTERNS = [
    r"ignore (all|any|previous) instructions",
    r"disregard (the )?system prompt",
    r"reveal (your|the) system prompt",
    r"you are now",
]

SECRET_PATTERNS = [
    r"sk-[a-zA-Z0-9]{20,}",      # generic API-key-shaped string
    r"AIza[0-9A-Za-z\-_]{35}",   # Google-style key
]

# Initialize Prompt Shield if installed
try:
    from prompt_shield import PromptShieldEngine
    from prompt_shield.integrations.agent_guard import AgentGuard
    _prompt_shield_engine = PromptShieldEngine()
    _agent_guard: Optional[AgentGuard] = AgentGuard(_prompt_shield_engine)
except Exception:
    _agent_guard = None


def get_agent_guard() -> Optional[Any]:
    """Returns the initialized Prompt Shield AgentGuard instance if available."""
    return _agent_guard


def input_guard(text: str) -> Dict[str, Any]:
    """
    Gate 1: Scans input for prompt injection, jailbreaks, and overrides.
    Uses Prompt Shield engine when available, falling back to regex patterns.
    """
    if not text or len(text) > MAX_INPUT_LENGTH:
        return {"ok": False, "flagged": True, "reason": "empty_or_too_long"}

    # Prompt Shield Gate 1 scan
    if _agent_guard is not None:
        try:
            result = _agent_guard.scan_input(text)
            if getattr(result, "blocked", False):
                reason = getattr(result, "reason", "prompt_shield_blocked")
                return {"ok": False, "flagged": True, "reason": f"prompt_shield: {reason}"}
        except Exception as err:
            # Fallback gracefully to pattern match if scanner fails
            pass

    # Regex heuristic fallback
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return {"ok": True, "flagged": True, "reason": f"matched: {pattern}"}

    return {"ok": True, "flagged": False, "reason": None}


def tool_result_guard(tool_name: str, result: str) -> Dict[str, Any]:
    """
    Gate 2: Scans tool / RAG results for indirect prompt injection before
    passing back to LLM context.
    """
    if not result:
        return {"ok": True, "sanitized_text": result, "reason": None}

    if _agent_guard is not None:
        try:
            security = _agent_guard.scan_tool_result(tool_name, result)
            if getattr(security, "blocked", False):
                return {
                    "ok": False,
                    "sanitized_text": getattr(security, "sanitized_text", None),
                    "reason": getattr(security, "reason", "indirect_prompt_injection_in_tool_result")
                }
            sanitized = getattr(security, "sanitized_text", None) or result
            return {"ok": True, "sanitized_text": sanitized, "reason": None}
        except Exception:
            pass

    return {"ok": True, "sanitized_text": result, "reason": None}


def output_guard(text: str) -> Dict[str, Any]:
    """
    Gate 3: Blocks credential/secret leakage and unsafe output before
    delivering externally (e.g. WhatsApp, Web UI).
    """
    if not text:
        return {"ok": True, "reason": None}

    # Prompt Shield Gate 3 scan
    if _agent_guard is not None:
        try:
            security = _agent_guard.scan_output(text)
            if getattr(security, "blocked", False):
                return {"ok": False, "reason": getattr(security, "reason", "prompt_shield_output_blocked")}
        except Exception:
            pass

    for pattern in SECRET_PATTERNS:
        if re.search(pattern, text):
            return {"ok": False, "reason": "possible_secret_leak"}

    return {"ok": True, "reason": None}
