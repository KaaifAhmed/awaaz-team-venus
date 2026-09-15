# Component Implementation Specification: AI Worker & LangGraph Intelligence Engine

**Project:** CWA Ship Karachi 2026 — Awaaz  
**Component:** AI Worker Service (`ai-worker/`)  
**Message Broker:** Redis (`localhost:6379/0`, queue: `ai_queue`)  
**Main Service Base URL:** `http://main-service:8000` (in Docker) or `http://localhost:8000` (local)  
**WhatsApp Service URL:** `http://whatsapp-service:3000`  
**AI Models:** Google Gemini (`gemini-2.5-flash` / multimodal vision & audio) via `litellm` or `google.genai`

---

## 1. Architectural Role & Responsibilities

The **AI Worker** is the cognitive engine of the civic platform. It executes as an autonomous Python worker decoupled from the database:
1. **Zero Database Access:** The worker does NOT connect to PostgreSQL. It interacts exclusively with Redis (`ai_queue`) and the Main Service internal REST endpoints (`/api/internal/*`).
2. **Job Buffer Consumer:** Consumes lightweight job tokens `{"job_id": "job_...", "created_at": "..."}` from Redis via non-blocking `blpop`.
3. **Pure Gemini Multimodal Perception (No Whisper):** Raw photos, audio voice notes (OGG/MP3/WAV), and multilingual text (Urdu, Roman Urdu, English) are passed directly into Google Gemini for unified perception.
4. **Two-Stage Spatial & Jurisdiction Routing:**
   - **Stage 1 (Cantonment Check):** Point-in-polygon check against Karachi's 6 Cantonment boards.
   - **Stage 2 (KMC Arterial Check):** Proximity check against KMC's 26 major arterial road corridors.
   - **Stage 3 (Utility Matrix):** Utility routing: Water & Sewerage $\rightarrow$ KW&SC; Solid Waste & Garbage $\rightarrow$ SSWMB.
5. **Spatiotemporal Deduplication:** Queries `GET /api/internal/active-incidents` to identify existing un-resolved clusters within a 50m radius and 72-hour window.
6. **Dual-Audience Generation:**
   - **Citizen Layman Summary:** Conversational, empathetic, plain-language Urdu/English explanation for the citizen review loop only.
   - **Formal Statutory Complaint Dossier:** High-precision legal complaints in English and Urdu citing statutory provisions (KW&SC Act 2023, SLGO 2021, SSWMB Act 2021, Cantonments Act 1924, Constitution Arts 9 & 14).
7. **Callback Dispatch:** Posts the completed review package to `POST /api/internal/worker-callback`. If the report originated from WhatsApp, triggers an interactive WhatsApp message via `POST /whatsapp/send`.

```mermaid
flowchart TD
    Queue[(Redis ai_queue)] -->|1. BLPOP job_id| Worker[AI Worker Consumer]
    Worker -->|2. GET /api/internal/jobs/id| MainAPI[Main Service :8000]
    
    subgraph LangGraph Pipeline
        G1[Prompt Shield Gate 1: Input Scan]
        FetchJob[Fetch Batch Intake Media & Text]
        Gemini[Google Gemini 2.5 Multimodal Node]
        Spatial[Two-Stage Spatial & Jurisdiction Router]
        Dedup[Deduplication Check 50m / 72h]
        Dossier[Dual Generation: Layman Summary + Statutory Drafts]
        G2[Prompt Shield Gate 2: Output Scan]
        
        G1 --> FetchJob --> Gemini --> Spatial --> Dedup --> Dossier --> G2
    end
    
    Worker --> LangGraph Pipeline
    G2 -->|POST /api/internal/worker-callback| MainAPI
    G2 -.->|If WhatsApp source: POST /whatsapp/send| WAGateway[WhatsApp Gateway :3000]
```

---

## 2. Queue & Internal API Contracts

### 2.1 Redis Queue Contract (`ai_queue`)
The worker listens on Redis list `ai_queue`:
```json
{
  "job_id": "job_882910fa",
  "created_at": "2026-09-12T12:40:00Z"
}
```

### 2.2 Consumed Internal Endpoints (`main-service`)

#### 1. Fetch Intake Batch
- **Endpoint:** `GET /api/internal/jobs/{job_id}`
- **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "job_id": "job_882910fa",
      "user_id": "c83f12a9-91bc-4e20-80d1-0f4b360172e1",
      "citizen_cnic": "42101-1234567-1",
      "phone": "+923001234567",
      "source": "web",
      "text": "hamare block 4 me gutter ubal raha hai aur rasta band hai",
      "image_url": "http://main-service:8000/media/complaints/images/img_102.jpg",
      "audio_url": null,
      "location": {
        "lat": 24.9180,
        "lng": 67.0971
      },
      "landmark_hint": "Near Disco Bakery, Gulshan-e-Iqbal"
    },
    "error": null
  }
  ```

#### 2. Fetch Spatial Boundaries (Cached in Worker Memory)
- **Endpoint:** `GET /api/internal/spatial-boundaries`
- **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "cantonments": [
        { "name": "Clifton Cantonment (CBC)", "polygon": [[67.01, 24.81], [67.06, 24.81], [67.06, 24.84], [67.01, 24.84]] },
        { "name": "Karachi Cantonment (KCB)", "polygon": [[67.02, 24.85], [67.05, 24.85], [67.05, 24.87], [67.02, 24.87]] },
        { "name": "Faisal Cantonment", "polygon": [[67.10, 24.87], [67.15, 24.87], [67.15, 24.91], [67.10, 24.91]] },
        { "name": "Malir Cantonment", "polygon": [[67.18, 24.92], [67.24, 24.92], [67.24, 24.98], [67.18, 24.98]] },
        { "name": "Korangi Creek Cantonment", "polygon": [[67.11, 24.78], [67.15, 24.78], [67.15, 24.82], [67.11, 24.82]] },
        { "name": "Manora Cantonment", "polygon": [[66.97, 24.78], [66.99, 24.78], [66.99, 24.80], [66.97, 24.80]] }
      ],
      "kmc_arterials": [
        "Shahrah-e-Faisal", "University Road", "M.A. Jinnah Road", "Rashid Minhas Road",
        "Korangi Road", "Shahrah-e-Pakistan", "I.I. Chundrigar Road", "S.M. Taufeeq Road",
        "National Highway (N-5)", "Hub River Road", "Manghopir Road", "Nazimabad Road"
      ]
    },
    "error": null
  }
  ```

#### 3. Search Active Incidents for Deduplication
- **Endpoint:** `GET /api/internal/active-incidents?category=Sewerage&lat=24.9180&lng=67.0971&radius_m=50`
- **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "matching_master_id": "a3f81e2b-1c4a-4b92-8012-76fa91b01c34",
      "distance_meters": 24.5,
      "current_reports_count": 3
    },
    "error": null
  }
  ```
  *(Returns `matching_master_id: null` if no active incident exists within 50m / 72h).*

#### 4. Callback to Main Service
- **Endpoint:** `POST /api/internal/worker-callback`
- **Payload:**
  ```json
  {
    "job_id": "job_882910fa",
    "classification": {
      "issue_category": "Sewerage",
      "severity": "P0",
      "target_authority": "KWSC",
      "landmark": "Near Disco Bakery, Gulshan-e-Iqbal"
    },
    "clustering": {
      "is_clustered": true,
      "master_incident_id": "a3f81e2b-1c4a-4b92-8012-76fa91b01c34",
      "community_reports_count": 4
    },
    "review_package": {
      "layman_summary": "We identified an acute sewage overflow in Gulshan Block 4 under KW&SC jurisdiction. It poses an immediate health risk and will be escalated as a P0 emergency.",
      "subject_en": "URGENT GRIEVANCE: RAW SEWAGE OVERFLOW AT GULSHAN BLOCK 4",
      "body_en": "Formal legal complaint body citing KW&SC Act 2023 and Articles 9 & 14...",
      "body_ur": "مجاز اتھارٹی کراچی واٹر اینڈ سیوریج کارپوریشن برائے فوری کارروائی...",
      "statutory_citations": "KW&SC Act 2023 (Sec. 24); Constitution of Pakistan Arts. 9 & 14"
    }
  }
  ```

---

## 3. LangGraph Pipeline Architecture

Implement the pipeline state and nodes in `ai-worker/ai.py`:

### 3.1 State Schema (`JobState`)
```python
from typing import TypedDict, Optional, List, Dict, Any

class JobState(TypedDict):
    job_id: str
    source: str
    phone: Optional[str]
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
    error: Optional[str]
```

### 3.2 Detailed Node Logic

#### Node 1: `fetch_job_batch_node`
- Invokes `GET {MAIN_SERVICE_URL}/api/internal/jobs/{job_id}`.
- Populates `raw_text`, `image_url`, `audio_url`, `lat`, `lng`, `landmark_hint`, `source`, `phone`.

#### Node 2: `security_input_node`
- Runs `input_guard(text)` from `shared/security_guards.py`.
- Checks for prompt injection, jailbreak attempts, or malicious inputs.

#### Node 3: `gemini_multimodal_perception_node`
- Invokes Google Gemini (`gemini-2.5-flash`) via `litellm` or SDK.
- **Multimodal Payload:** Feeds available media (downloaded image bytes / audio bytes) + text.
- **System Prompt:**
  ```text
  You are the Karachi Civic AI Perception Model. Analyze the citizen's complaint (which may contain text in Urdu, Roman Urdu, or English, alongside a photo or audio voice note).
  
  Extract:
  1. issue_category: Choose from ["Sewerage", "Water Supply", "Pothole / Road Damage", "Drainage Overflow", "Solid Waste / Garbage", "Street Light / Electric Hazard"]
  2. severity: "P0" (immediate biological hazard, open manhole, submerged road, contaminated water), "P1" (major road obstruction, large garbage heap, broken water main), "P2" (minor pothole, dry trash bin)
  3. detected_landmark: Area name or prominent landmark mentioned or visible in image.
  4. core_problem: A 1-sentence factual description of the issue.
  
  Return STRICT JSON matching the schema.
  ```

#### Node 4: `jurisdiction_router_node`
- Retrieves spatial boundary layers from memory (cached from `GET /api/internal/spatial-boundaries`).
- **Two-Stage Routing Rules:**
  1. **Stage 1 — Cantonment Check:** If `lat`/`lng` fall inside one of the 6 Cantonment polygons $\rightarrow$ `target_authority = "CANTONMENT"`.
  2. **Stage 2 — KMC Arterial Check:** If `lat`/`lng` fall within 50m of a KMC Major Arterial road OR `detected_landmark` explicitly mentions one of the 26 KMC roads (e.g. "Shahrah-e-Faisal", "University Road") $\rightarrow$ `target_authority = "KMC"`.
  3. **Stage 3 — Utility Matrix:**
     - If category is `"Sewerage"` or `"Water Supply"` $\rightarrow$ `target_authority = "KWSC"` (Karachi Water & Sewerage Corporation).
     - If category is `"Solid Waste / Garbage"` $\rightarrow$ `target_authority = "SSWMB"` (Sindh Solid Waste Management Board).
     - If category is `"Pothole / Road Damage"` or `"Drainage Overflow"` (off major road) $\rightarrow$ defaults to `target_authority = "KMC"`.

#### Node 5: `deduplication_check_node`
- If `lat` and `lng` are available, calls `GET /api/internal/active-incidents?category={cat}&lat={lat}&lng={lng}&radius_m=50`.
- If a matching master incident is returned:
  - `is_clustered = True`
  - `master_incident_id = data["matching_master_id"]`
  - `community_reports_count = data["current_reports_count"] + 1`
- Otherwise:
  - `is_clustered = False`
  - `community_reports_count = 1`

#### Node 6: `dossier_generator_node`
- Generates two completely separate documents:
  1. **Citizen Layman Summary (Citizen-Only):**
     - Empathetic, conversational, bilingual (English + Urdu script).
     - Explains that the grievance was routed to the specific department and summarizes the action being taken.
     - *Example:* *"We identified an acute sewage overflow in Gulshan Block 4 under KW&SC jurisdiction. It poses an immediate health risk and will be escalated as a P0 emergency."*
  2. **Statutory Complaint Dossier (Official Legal Draft):**
     - Formatted formal grievance incorporating the exact legal citations:
       - **KW&SC Issues:** *Karachi Water & Sewerage Corporation Act 2023 (Section 24 - Maintenance of sewerage infrastructure and potable water supply)*.
       - **KMC Road/Drain Issues:** *Sindh Local Government Act 2021 (Schedule II - Roads, Bridges & Primary Storm Water Drains)*.
       - **SSWMB Garbage Issues:** *Sindh Solid Waste Management Board Act 2021 (Sections 15 & 16 - Municipal solid waste collection and sanitary landfills)*.
       - **Cantonment Issues:** *Cantonments Act 1924 (Sections 116 & 130 - Sanitation, public drainage, and health hazards)*.
       - **Universal Constitutional Backing:** *Constitution of the Islamic Republic of Pakistan, Articles 9 (Right to Life / Healthy Environment) & 14 (Inviolability of Dignity)*.
     - Creates both `body_en` and formal `body_ur` (بخدمت جناب مجاز اتھارٹی...).

#### Node 7: `security_output_node`
- Runs `output_guard(text)` to ensure no sensitive internal instructions or prompt leakages exist.

#### Node 8: `dispatch_node`
- Sends payload to `POST {MAIN_SERVICE_URL}/api/internal/worker-callback`.
- If `source == "whatsapp"` and `phone` is present:
  - Sends review message via `POST {WHATSAPP_SERVICE_URL}/whatsapp/send`:
    ```json
    {
      "to": "+923001234567",
      "message": "Assalam-o-Alaikum! We have analyzed your complaint.\n\n📍 Department: KW&SC\n⚠️ Severity: P0 Emergency\n📝 Summary: We identified an acute sewage overflow in Gulshan Block 4.\n\nReply 'YES' to confirm and file this official complaint."
    }
    ```

---

## 4. Statutory Citations Knowledge Base

```python
STATUTORY_REFERENCES = {
    "KWSC": {
        "act": "Karachi Water & Sewerage Corporation Act 2023 (Section 24)",
        "mandate": "Statutory duty to maintain, repair, and operate sewerage and potable water distribution infrastructure without causing public nuisance.",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 (Right to Life) & 14 (Inviolability of Dignity of Man)"
    },
    "KMC": {
        "act": "Sindh Local Government Act 2021 (Schedule II - Functions of Metropolitan Corporation)",
        "mandate": "Statutory obligation to construct, repair, and maintain major arterial traffic corridors, primary stormwater drainage nallahs, and municipal infrastructure.",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 & 25"
    },
    "SSWMB": {
        "act": "Sindh Solid Waste Management Board Act 2021 (Sections 15 & 16)",
        "mandate": "Exclusive authority for collection, transport, and disposal of municipal solid waste, sweeping, and maintenance of designated garbage transfer stations (GTS).",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 & 14"
    },
    "CANTONMENT": {
        "act": "Cantonments Act 1924 (Sections 116, 130 & 131)",
        "mandate": "Military lands and cantonment boards municipal duties regarding sanitation, public drainage, waste removal, and public health nuisance abatement.",
        "constitutional": "Constitution of Pakistan 1973, Articles 9 & 14"
    }
}
```

---

## 5. Implementation Step-by-Step Guide

1. **Configure Environment (`ai-worker/.env`):**
   ```ini
   REDIS_URL=redis://localhost:6379/0
   MAIN_SERVICE_URL=http://localhost:8000
   WHATSAPP_SERVICE_URL=http://localhost:3000
   GEMINI_API_KEY=your_gemini_api_key_here
   AI_WORKER_CONCURRENCY=5
   AI_JOB_TIMEOUT=60
   ```
2. **Build LangGraph Workflow (`ai.py`):**
   - Implement nodes: `fetch_job_batch`, `security_input`, `gemini_multimodal_perception`, `jurisdiction_router`, `deduplication_check`, `dossier_generator`, `security_output`, `dispatch_result`.
   - Wire nodes using LangGraph `StateGraph(JobState)`.
3. **Connect to Consumer Loop (`main.py`):**
   - Verify `blpop(QUEUE_NAME)` parses `{ "job_id": "..." }`.
   - Pass `job_id` into LangGraph execution.
4. **Offline / Fallback Resilience:**
   - Implement graceful fallback: If Gemini API is unreachable or rate-limited, apply deterministic keyword heuristic classification to prevent worker stalls.
5. **Worker Verification:**
   - Push a mock test job to Redis:
     `redis-cli rpush ai_queue '{"job_id": "job_test_123", "created_at": "2026-09-12T12:00:00Z"}'`
   - Confirm worker fetches batch, processes inference, and posts callback to Main Service.
