# System Architecture — Karachi Civic AI Engine

**Project:** CWA Ship Karachi 2026 — Production-Grade AI Product  
**Status:** Phase 2 Output (Solution Design Finalized)  
**Reference Document:** [`docs/srs.md`](srs.md)  
**Implementation Standards:** [`docs/Base/coding-guidelines.md`](Base/coding-guidelines.md) | [`docs/Base/sdlc.md`](Base/sdlc.md)

---

## 1. System Architecture Diagram

```
                       ┌───────────────────────────────────────────────┐
                       │              React Web Frontend               │
                       │   - Citizen Portal (Intake & Review)          │
                       │   - Government Officials Admin Dashboard      │
                       └───────────────────────┬───────────────────────┘
                                               │ HTTPS + CORS
                                               ▼
     ┌─────────────────────────────────────────────────────────────────────────────────┐
  ┌──│                              Main Service (Django)                              │
  │  │   /auth/*    /api/reports/*    /api/admin/dashboard/*    /api/whatsapp/inbound  │◄──────────────┐
  │  │   /api/internal/jobs/{job_id}  (Serves full job payload to workers)             │               │
  │  │   Django Admin Panel (Super Admin Management & Auditing)                        │               │
  │  └─────────────────────────────────────────┬───────────────────────────────────────┘               │
  │                                            │ enqueues {job_id} only                                │ inbound webhook
  │                                            │ (no heavy media bytes in queue)                       │ (metadata / media ref)
  │                                            ▼                                                       │
  │                                    ┌───────────────┐                                               │
  │                                    │   ai_queue    │  Redis                                        │
  │                                    └───────┬───────┘                                               │
  │                                            │ dequeues {job_id}                                     │
  │                                            ▼                                                       │
  │                                 ┌─────────────────────┐                                   ┌────────┴─────────┐
  │                                 │   AI Worker Pool    │                                   │ WhatsApp Service │
  │                                 │   (async Python)    │                                   │   (Express.js)   │
  │                                 │ Gemini Multimodal + │                                   └────────┬─────────┘
  │                                 │ LangGraph + Shield  │                                            ▲
  │                                 └──────────┬──────────┘                                            │
  │                                            │ 1. GET /api/internal/jobs/{job_id}                    │
  │                                            │ 2. Process with Gemini                                │
  │                                            │ 3. Update Main Service / Dispatch Review to Web/WA    │
  │                                            └───────────────────────┬───────────────────────────────┘
  │                                                                    │ (outbound WhatsApp)
  │                                                                    └───────────────────────────────┘
  │            
  │  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  │                                    PostgreSQL                                   │
  └──┼─► CitizenProfile, Incident, MasterIncident, ComplaintDossier, UserAccount       │
     │   Only Main Service reads/writes to the database                                │
     └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.1 Web Frontend (React + Vite)
- **Stack:** Vite + React + Tailwind CSS.
- **Portals Provided:**
  1. **Citizen Portal (Intake & Review):**
     - Citizen authentication via CNIC and phone.
     - Multimodal input: Photo upload, audio recording, and text in English, Urdu, or Roman Urdu.
     - Optional browser location picker (falls back to landmark description if skipped).
     - Interactive review screen displaying the plain-language summary alongside the formal complaint draft before user approval.
  2. **Government Officials Admin Dashboard:**
     - Role-protected operational dashboard for department officers (KMC, KW&SC, SSWMB, Cantonments).
     - Department-scoped ticket views: displays deduplicated/clustered incidents with community report counts, photo/audio proof, and location/landmarks.
     - Ticket lifecycle actions: change status (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`) and review timeline.
- **Connection:** REST over HTTPS directly to Main Service API (`/api/*`).

### 2.2 Main Service (Django Backend + Admin)
- **Stack:** Python 3.12 + Django + Django REST Framework (DRF).
- **Database Ownership:** Exclusively owns PostgreSQL.
- **Core Domain Apps:**
  - `users`: CNIC-centric identity (`CitizenProfile`), linked phone numbers (up to 2), role-based JWT auth (`CITIZEN`, `GOVT_OFFICIAL`, `SUPER_ADMIN`, `AI_AGENT`).
  - `reports`: Models for `Incident`, `MasterIncident` (clusters), and `ComplaintDossier`.
  - `admin_api`: REST endpoints powering the React Government Admin Dashboard with department query filters.
- **Job Buffer Pattern (Decoupled from Redis):**
  - Large binary blobs (images, audio files) are **never pushed to Redis**.
  - When a report is submitted (via web or WhatsApp), Main Service stores the media in PostgreSQL/media storage, creates a job record, and pushes **only `{job_id}`** to Redis `ai_queue`.
  - Main Service exposes `GET /api/internal/jobs/{job_id}` for AI workers to fetch the complete payload (text, media URLs, location) in one clean request.
- **Endpoints:**
  - `POST /auth/register` & `POST /auth/login`: CNIC-based authentication returning user `role`, `assigned_org`, and `dashboard_route`.
  - `POST /api/reports/submit`: Citizen web intake passing `user_id` (creates job record, enqueues `{job_id}` to `ai_queue`).
  - `GET /api/reports/review/{job_id}`: Poll endpoint for citizen to retrieve review package.
  - `POST /api/reports/confirm`: Citizen approval/revision endpoint with `user_id`.
  - `GET /api/reports/status/{tracking_id}`: Ticket tracking for citizens.
  - `GET /api/admin/dashboard/overview`: Official KPI metrics scoped to assigned organization.
  - `GET /api/admin/dashboard/complaints`: Department-scoped complaints feed for officials.
  - `GET /api/admin/dashboard/complaints/{id}`: Detailed incident dossier with combined proof.
  - `PATCH /api/admin/dashboard/complaints/{id}/status`: Official status transitions (`IN_PROGRESS`, `RESOLVED`).
  - `GET /api/admin/super/overview`: Super admin city-wide cross-departmental oversight.
  - `POST /api/whatsapp/inbound`: Webhook receiving inbound WhatsApp payloads and media references.
  - `GET /api/internal/jobs/{job_id}`: Delivers full job data batch to AI worker.
  - `GET /api/internal/spatial-boundaries`: Delivers GeoJSON layers for Cantonments and KMC corridors.
  - `GET /api/internal/active-incidents`: Search endpoint for worker deduplication candidates.
  - `GET /api/internal/ai-config`: Delivers prompts and model tier config to worker.
  - `POST /api/internal/worker-callback`: AI worker persists classification, clustering, and draft updates.

### 2.3 AI Worker Pool (Async Python)
- **Stack:** Async Python (LangGraph, Google Gemini Multimodal API via LiteLLM, Prompt Shield).
- **Queue Consumer Pattern:**
  - Consumes `{job_id}` from Redis `ai_queue`.
  - Calls `GET /api/internal/jobs/{job_id}` to retrieve text, audio, image references, and location.
  - Feeds multimodal context to Gemini: classifies issue, extracts landmarks, checks two-stage routing rules, and executes spatiotemporal clustering ($\le 50\text{m}$, $\le 72\text{h}$).
  - Formulates review package: conversational layman summary (for citizen only) + formal legal complaint draft (SLGA, KW&SC Act, SSWMB Act, Articles 9 & 14).
  - Delivers review package back to the origin channel:
    - If **WhatsApp**: calls `POST /whatsapp/send` on WhatsApp Service.
    - If **Web**: updates the job via `POST /api/internal/worker-callback`, allowing the React frontend polling client to render the interactive review screen.
- **Security & Guardrails:** Prompt Shield explicit state nodes (`security_input_node`, `security_output_node`) block prompt injection and system leakage.

### 2.4 WhatsApp Service (Express.js)
- **Stack:** Node.js + Express (powered by Baileys WhatsApp Web library).
- **Session:** Pre-authenticated and warm prior to demo.
- **Multimodal Inbound Path:** Receives citizen messages, voice notes (audio/ogg), photographs (jpeg/png), text in English/Urdu/Roman Urdu, and native WhatsApp location pins; forwards the structured payload to Main Service `POST /api/whatsapp/inbound`.
- **Multimodal Outbound Path:** Exposes `POST /whatsapp/send`, called by AI Worker and Main Service to dispatch:
  - **Text Messages:** Layman summaries, interactive confirmation prompts, tracking IDs, and status updates.
  - **Images:** Visual infographics, evidence confirmation snapshots, and marked maps.
  - **Audio Voice Notes:** Spoken voice replies in Urdu/Roman Urdu for illiterate or audio-preferring citizens.
  - **Location Pins:** Relevant departmental office coordinates or verified incident location markers.

### 2.5 Redis & PostgreSQL
- **Redis (Broker):** Lightweight queue holding `{job_id}` strings in `ai_queue`.
- **PostgreSQL (Storage):** Relational storage for citizens, phone mappings, clustered incidents, statutory complaint dossiers, and GIS boundary data.

---

## 3. Jurisdictional Routing Architecture

Routing is resolved deterministically through an extensible two-stage evaluation pipeline:

```
               Citizen Report (GPS Location or Landmark Description, Issue Category)
                                              │
                                              ▼
                                 [Stage 1: Cantonment Check]
                                Is inside Cantonment/DHA bounds?
                                         ├── YES ──► Respective Cantonment Board (e.g. CBC)
                                         └── NO
                                              │
                                              ▼
                             [Stage 2: Category & Asset Routing]
                       (Extensible generic mapping based on domain attributes)
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      ▼                       ▼                       ▼
             Water / Sewerage            Solid Waste             Roads / Drains
                      │                       │                       │
                      ▼                       ▼                       ▼
                    KW&SC                   SSWMB           Is on/near KMC Major
             (Acts 2023 / 1334)      (Act 2014 / 1128)      Arterial Corridors?
                                                              ├── YES ──► KMC
                                                              └── NO  ──► Relevant Road Authority
```

### Routing Decision Table

| Authority | Spatial / Category Trigger | Scope of Infrastructure | Statutory Anchor |
|---|---|---|---|
| **Cantonment Boards (CBC, etc.)** | Coordinates inside Cantonment / DHA polygon boundary | All municipal services inside military/DHA land | Cantonments Act 1924 |
| **KW&SC** | Outside Cantonments; Water supply or sewage failure | Water mains, open manholes, sewer trunk lines | KW&SC Act 2023; Arts. 9 & 14 |
| **SSWMB** | Outside Cantonments; Solid waste issue | Public dumpsters, open trash heaps, street waste | SSWMB Act 2014 |
| **KMC** | On/near 26 Major Arterial Corridors or Primary Drains | Major arterial roads, flyovers, main stormwater nullahs | SLGA 2021 / 2013 Sched. IV |

---

## 4. Spatiotemporal Deduplication & Incident Clustering

To prevent departmental dashboards from flooding with identical complaints:
- **Spatial Window:** $\le 50\text{ meters}$ (Haversine formula) or matching normalized landmark name.
- **Temporal Window:** $\le 72\text{ hours}$.
- **Attribute Match:** Matching `issue_category`.
- **System Action:**
  - Existing incident becomes the `MasterIncident`.
  - New report links as a child incident.
  - `community_reports_count` is incremented.
  - New citizen's photograph is appended to the cluster's photographic proof array.
  - Department officials in the Admin Dashboard see one clustered ticket with total citizen count and combined evidence.

---

## 5. Human-in-the-Loop Review Architecture (Web + WhatsApp)

```
User Input (WhatsApp or Web) ──► Main Service (creates job) ──► Enqueues {job_id} to Redis
                                                                           │
                                 ┌─────────────────────────────────────────┘
                                 ▼
                         AI Worker Pool:
                         1. Fetches job details from Main Service
                         2. Gemini Multimodal analysis & Routing
                         3. Generates Layman Summary + Legal Draft
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       If Inbound was WhatsApp           If Inbound was Web
                 │                               │
                 ▼                               ▼
       Sends WhatsApp Message            Updates Job via Callback;
       with Layman Summary +             React Frontend renders
       Formal Draft to Citizen           Interactive Review Screen
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                   Citizen Reviews & Confirms:
                   - Citizen sends revisions -> AI regenerates draft
                   - Citizen confirms "Yes, submit"
                                 │
                                 ▼
             Complaint Dossier Status set to QUEUED
             Visible in Government Officials Dashboard
```

The layman summary is strictly for citizen comprehension during review; it is not stored in the final official complaint dossier.

---

## 6. Role-Based Access Control (RBAC) Specification

The system enforces strict multi-tenant data boundaries across all interfaces (React Admin Dashboard, Django Admin, and REST APIs):

| Role / Identifier | Target Entity | Permitted Actions & Access Scope |
|---|---|---|
| **Resident (`CITIZEN`)** | Karachi Citizen | Authenticate via CNIC, link up to 2 phones, submit multimodal reports (WhatsApp/Web), view plain-language review summaries, approve/revise drafts, and track own submitted tickets. |
| **Government Official (`GOVT_OFFICIAL`)** | Department Officers (KW&SC, KMC, SSWMB, Cantonments) | Access the **React Government Admin Dashboard**. Scoped strictly to their assigned organization (e.g. KW&SC officers only see water/sewerage complaints; KMC officers only see road/nullah complaints). Can inspect clustered proof, view community counters, and transition ticket status (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`). |
| **System Admin (`SUPER_ADMIN`)** | Platform Administration | Access Django Admin and Dashboard with global privileges: manage users/roles, inspect worker queues and structured logs, adjust routing rules, and view city-wide complaints. |
| **AI Agent (`AI_AGENT`)** | Automation Service | Scoped service account: can only fetch assigned `{job_id}` details via internal API, run multimodal inference, and post back review packages and classifications. No arbitrary database access. |

---

## 7. Data Models Specification

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│         CitizenProfile          │       │           UserAccount           │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ cnic: VARCHAR(15) [PK]          │       │ id: UUID [PK]                   │
│ full_name: VARCHAR(150)         │◄──────┤ profile: FK(CitizenProfile)     │
│ primary_phone: VARCHAR(20) [UQ] │       │ role: VARCHAR(20)               │
│ secondary_phone: VARCHAR(20)    │       │ assigned_org: VARCHAR(50) [NULL]│
│ verified_at: TIMESTAMP          │       │ is_staff: BOOLEAN               │
└────────────────┬────────────────┘       │ date_joined: TIMESTAMP          │
                 │                        └─────────────────────────────────┘
                 │ 1:N
                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│            Incident             │  N:1  │         MasterIncident          │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id: UUID [PK]                   │──────►│ id: UUID [PK]                   │
│ job_id: VARCHAR(50) [UQ]        │       │ authority: VARCHAR(50)          │
│ citizen: FK(CitizenProfile)     │       │ issue_category: VARCHAR(50)     │
│ media_url: VARCHAR(500)         │       │ severity: VARCHAR(10)           │
│ raw_text: TEXT                  │       │ lat: DECIMAL(9,6) [NULLABLE]    │
│ lat: DECIMAL(9,6) [NULLABLE]    │       │ lng: DECIMAL(9,6) [NULLABLE]    │
│ lng: DECIMAL(9,6) [NULLABLE]    │       │ landmark: VARCHAR(255)          │
│ landmark: VARCHAR(255)          │       │ community_reports_count: INT    │
│ created_at: TIMESTAMP           │       │ status: VARCHAR(20)             │
└────────────────┬────────────────┘       │ first_reported_at: TIMESTAMP    │
                 │                        │ last_reported_at: TIMESTAMP     │
                 │ 1:1                    │ evidence_photos: JSONB          │
                 ▼                        └────────────────┬────────────────┘
┌─────────────────────────────────┐                        │
│        ComplaintDossier         │                        │
├─────────────────────────────────┤                        │ 1:1
│ id: UUID [PK]                   │◄───────────────────────┘
│ tracking_id: VARCHAR(30) [UQ]   │
│ target_authority: VARCHAR(50)   │
│ subject_en: VARCHAR(255)        │
│ body_en: TEXT                   │
│ body_ur: TEXT                   │
│ statutory_citations: TEXT       │
│ review_status: VARCHAR(25)      │ (DRAFT | REVISION_REQUESTED | APPROVED | QUEUED)
│ official_status: VARCHAR(20)    │ (PENDING | IN_PROGRESS | RESOLVED)
│ queued_at: TIMESTAMP            │
└─────────────────────────────────┘
```

---

## 8. Repository & Container Structure

```
repo/
├── compose.yaml                  # Services: postgres, redis, main-service, ai-worker, whatsapp-service, frontend
├── .env.example
├── README.md
├── docs/
│   ├── project-info.md
│   ├── srs.md
│   ├── architecture.md           # This document
│   ├── design.md                 # OpenAPI contracts & component design
│   └── Base/                     # Foundational standard guides
├── frontend/                     # React + Vite Client
│   ├── Dockerfile
│   └── src/
│       ├── citizen/              # Intake form, location pin, review & confirm screen
│       ├── admin/                # Government Officials Dashboard (RBAC filtered)
│       └── components/
├── main-service/                 # Django Backend + Admin Portal
│   ├── Dockerfile
│   ├── manage.py
│   ├── config/
│   ├── users/                    # Auth, CitizenProfile, RBAC
│   ├── reports/                  # Incidents, MasterIncidents, Dossiers
│   └── admin_api/                # Departmental dashboard endpoints
├── ai-worker/                    # LangGraph + Gemini Multimodal Worker
│   ├── Dockerfile
│   ├── main.py
│   ├── graph.py
│   ├── routing.py
│   └── security.py               # Prompt Shield integration
└── whatsapp-service/             # Express.js WhatsApp Webhook/Client
    ├── Dockerfile
    ├── index.js
    └── package.json
```
