# AI System — Karachi Civic AI Engine

**Project:** CWA Ship Karachi 2026 — Production-Grade AI Product  
**Status:** Finalized System Specification  
**References:** [`docs/srs.md`](../srs.md) | [`docs/architecture.md`](../architecture.md)

---

## 1. Orchestration & Model Stack

- **Orchestration:** LangGraph (built on LangChain) — state graphs manage the multimodal intake, deterministic routing, deduplication, and conversational human-in-the-loop review.
- **Model Access:** Google Gemini Multimodal API via LiteLLM (`ChatLiteLLMRouter`). LangGraph nodes interact with Gemini for vision, voice notes, and multilingual understanding (English, Urdu, Roman Urdu) without separate external transcription tools.
- **Model Tiers & Fallback:** Configured in LiteLLM router (`gemini-2.5-flash` / `gemini-1.5-pro`) with automated fallback chains on rate-limits or timeouts.
- **Structured Output:** Pydantic schema validation (`.with_structured_output(IncidentExtractionModel)`) guarantees normalized JSON extraction.
- **Security & Guardrails:** Prompt Shield (`prompt-shield`) integrated as explicit LangGraph state nodes (`security_input_node`, `security_output_node`).

---

## 2. AI Worker Pool Runtime

- **Runtime:** Async Python consuming Redis `ai_queue` via `BLPOP`.
- **Scaling:** Multi-replica worker pool with per-replica concurrency limits and job timeouts.
- **Data Access Principle:** AI Workers **never** access PostgreSQL directly. Configuration and GIS rules are retrieved via Main Service (`GET /api/internal/ai-config`), and outputs are returned via `POST /api/internal/worker-callback`.

---

## 3. Dynamic Configuration

Managed in Django Admin and delivered via cached internal endpoints:
- Prompt templates and versions (intake, classification, layman summarization, formal EN/UR complaint drafting).
- Model tier routing and fallback priorities.
- Temperature and max token limits.
- *Note:* Graph topology, Prompt Shield security rules, and statutory legal anchors are locked in code.

---

## 4. Multi-Gate Security Architecture (Prompt Shield)

### 4.1 Gate 1 — User Input Guard (`security_input_node`)
- **Action:** Scans raw citizen messages (text or transcribed multimodal prompts) for jailbreaks, prompt injection, and adversarial instruction overrides.
- **Behavior:** Blocks malicious queries before they hit the LLM, routing to `END` with a polite refusal.

### 4.2 Gate 2 — Citizen Review & Output Guard (`security_output_node`)
- **Action:** Scans outgoing layman summaries and formal complaint drafts before they reach the citizen or official queue.
- **Protection:** Prevents system prompt leakage, secret exposure, or unauthorized payload generation.

### 4.3 Separation of Concerns: Prompt Shield vs. Django Permissions
- **Prompt Shield:** Evaluates adversarial attacks and injection patterns.
- **Django Native RBAC:** Deterministically enforces department data boundaries so officials only see complaints for their assigned authority (KMC, KW&SC, SSWMB, Cantonments).

---

## 5. LangGraph Conversational State Graph

```text
Citizen Message (WhatsApp/Web)
           │
           ▼
┌─────────────────────────────────┐
│       security_input_node       │ (Prompt Shield Gate 1)
└──────────────┬──────────────────┘
               │
        [security_blocked?]
        /                 \
   [Blocked]            [Allowed]
      │                     │
      ▼                     ▼
    [END]         ┌───────────────────────────────┐
 (Refusal Msg)    │ gemini_multimodal_classifier  │ (Extracts category, severity, landmarks)
                  └─────────────┬─────────────────┘
                                │
                                ▼
                  ┌───────────────────────────────┐
                  │    jurisdiction_router_node   │ (Cantonment -> Road Buffer -> Utility)
                  └─────────────┬─────────────────┘
                                │
                                ▼
                  ┌───────────────────────────────┐
                  │      deduplication_node       │ (Clusters matching incidents <=50m, <=72h)
                  └─────────────┬─────────────────┘
                                │
                                ▼
                  ┌───────────────────────────────┐
                  │     dossier_generator_node    │ (Drafts citizen layman summary + EN/UR legal dossier)
                  └─────────────┬─────────────────┘
                                │
                                ▼
                  ┌───────────────────────────────┐
                  │      security_output_node     │ (Prompt Shield Gate 2: Leakage / Safety)
                  └─────────────┬─────────────────┘
                                │
                                ▼
                  ┌───────────────────────────────┐
                  │      dispatch_review_node     │ (Sends layman summary + draft to user for review)
                  └───────────────────────────────┘
```

---

## 6. Review Loop & Citizen Summary

1. **Layman Summary:** AI generates a short, conversational explanation explaining the diagnosis in plain terms (Urdu, English, or Roman Urdu). This text is shared only with the resident during the review loop and is **not** stored in the permanent legal complaint dossier.
2. **Formal Draft:** AI formats the official complaint citing the specific governing statute (KW&SC Act 2023, SSWMB Act 2014, SLGA 2021/2013, or Cantonments Act 1924) and constitutional Articles 9 and 14.
3. **Execution Gate:** No complaint is queued in Postgres until the resident provides explicit confirmation (*"Yes, submit"*).
