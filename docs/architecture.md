# System Architecture — Karachi Civic AI Engine

**Project:** CWA Ship Karachi 2026 — Production-Grade AI Product  
**Status:** Phase 2 Output (Solution Design Finalized)  
**Reference Document:** [`docs/srs.md`](srs.md)  
**Implementation Standards:** [`docs/Base/coding-guidelines.md`](Base/coding-guidelines.md) | [`docs/Base/sdlc.md`](Base/sdlc.md)

---

## 1. System Architecture Diagram

```
                       ┌─────────────────────────┐
                       │   React Web Frontend    │
                       └────────────┬────────────┘
                                    │ HTTPS + CORS
                                    ▼
     ┌─────────────────────────────────────────────────────────────┐
  ┌──│                  Main Service (Django)                      │
  │  │   /auth/*    /api/reports/*    /api/whatsapp/inbound        │◄──────────────┐
  │  │   Django Admin Panel (RBAC Department Views)                │               │
  │  └──────────────────────────────┬──────────────────────────────┘               │
  │                                 │ enqueues                                     │ inbound webhook
  │                                 │ {job_id, user_id, payload}                   │ (metadata / media ref)
  │                                 ▼                                              │
  │                         ┌───────────────┐                                      │
  │                         │   ai_queue    │  Redis                               │
  │                         └───────┬───────┘                                      │
  │                                 ▼                                              │
  │                      ┌─────────────────────┐                          ┌────────┴─────────┐
  │                      │   AI Worker Pool    │                          │ WhatsApp Service │
  │                      │   (async Python)    │                          │   (Express.js)   │
  │                      │ Gemini Multimodal + │                          └────────┬─────────┘
  │                      │ LangGraph + Shield  │                                   ▲
  │                      └──────────┬──────────┘                                   │
  │                                 │ direct HTTP outbound message send            │
  │                                 └──────────────────────────────────────────────┘
  │            
  │  ┌─────────────────────────────────────────────────────────────┐
  │  │                     PostgreSQL                              │
  └──┼─► CitizenProfile, Incident, MasterIncident, ComplaintDossier│
     │   Only Main Service reads/writes to the database            │
     └─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.1 Web Frontend (React + Vite)
- **Stack:** Vite + React + Tailwind CSS.
- **Runtime:** Independent lightweight container.
- **Audience:** Citizens submitting multimodal reports and tracking tickets.
- **Capabilities:**
  - Citizen authentication via CNIC and phone.
  - Multimodal input: Photo upload, audio recording, and text in English, Urdu, or Roman Urdu.
  - Optional browser location picker (defaults to landmark text if skipped).
  - Interactive review screen displaying the plain-language summary alongside the formal complaint draft before approval.
- **Connection:** REST over HTTPS directly to Main Service API (`/api/*`).

### 2.2 Main Service (Django + Django Admin)
- **Stack:** Python 3.12 + Django + Django REST Framework (DRF).
- **Database Ownership:** Exclusively owns PostgreSQL. No other component holds database credentials.
- **Core Domain Apps:**
  - `users`: CNIC-centric identity (`CitizenProfile`), phone number linking (up to 2), session tokens, and Django Groups/Permissions for RBAC.
  - `reports`: Models for `Incident`, `MasterIncident` (clusters), `ComplaintDossier`, and GeoJSON routing layers.
- **Government Management & RBAC:**
  - Native **Django Admin Panel** serves as the administrative portal for government officials.
  - Django User Groups (`KWSC_Officers`, `KMC_Officers`, `SSWMB_Officers`, `Cantonment_Officers`) enforce scoped querysets so officials only access complaints assigned to their department.
  - `SUPER_ADMIN` oversees the entire platform, worker queue metrics, and structured logs.
- **Endpoints:**
  - `POST /auth/register` & `POST /auth/login`: CNIC-based authentication.
  - `POST /api/reports/submit`: Citizen web intake (enqueues to `ai_queue`).
  - `POST /api/reports/confirm`: Citizen approval/revision endpoint.
  - `GET /api/reports/status/{tracking_id}`: Ticket tracking for citizens.
  - `POST /api/whatsapp/inbound`: Webhook receiving inbound WhatsApp payloads and media references.
  - `GET /api/internal/ai-config`: Internal cached endpoint delivering prompts and routing rules to AI workers.
  - `POST /api/internal/worker-callback`: AI worker persists classification, clustering, and draft updates.

### 2.3 AI Worker Pool (Async Python)
- **Stack:** Async Python (LangGraph, Google Gemini Multimodal API via LiteLLM, Prompt Shield).
- **Concurrency & Scaling:** Multi-replica worker consuming `ai_queue` via `BLPOP`.
- **Runtime Responsibility:**
  - Ingests user input (audio voice notes, photos, text in Roman Urdu/Urdu/English) directly using Gemini multimodal perception.
  - Extracts issue category, severity (P0–P2), visual evidence summary, and landmarks.
  - Resolves responsible civic agency via two-stage jurisdictional routing rules.
  - Executes spatiotemporal clustering ($\le 50\text{m}$, $\le 72\text{h}$) against existing incidents.
  - Runs conversational review state graph: generates layman summary (for citizen eyes only) + formal legal complaint draft (SLGA, KW&SC Act, SSWMB Act, Articles 9 & 14).
  - Sends review prompts and draft revisions directly to WhatsApp Service (`POST /whatsapp/send`) or posts updates back to Main Service via internal callback.
- **Security & Guardrails:** Prompt Shield explicit state nodes (`security_input_node`, `security_output_node`) protect against prompt injections, jailbreaks, and prompt exfiltration.

### 2.4 WhatsApp Service (Express.js)
- **Stack:** Node.js + Express.
- **Session:** Pre-authenticated and warm prior to demo.
- **Inbound Path:** Receives citizen messages, voice notes, photos, and native WhatsApp locations; posts metadata to Main Service `POST /api/whatsapp/inbound`.
- **Outbound Path:** Exposes `POST /whatsapp/send`, called by AI Worker to send layman summaries, review drafts, and tracking confirmations back to the citizen.

### 2.5 Redis & PostgreSQL
- **Redis (Broker):** Manages `ai_queue` for worker task distribution and heartbeat monitoring.
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
| **KMC** | On/near 26 Major Arterial Corridors or Primary Nullahs | Major arterial roads, flyovers, main stormwater nullahs | SLGA 2021 / 2013 Sched. IV |

---

## 4. Spatiotemporal Deduplication & Incident Clustering

To prevent departmental inboxes from flooding with identical complaints:
- **Spatial Window:** $\le 50\text{ meters}$ (Haversine formula) or matching normalized landmark name.
- **Temporal Window:** $\le 72\text{ hours}$.
- **Attribute Match:** Matching `issue_category`.
- **System Action:**
  - Existing incident becomes the `MasterIncident`.
  - New report links as a child incident.
  - `community_reports_count` is incremented.
  - New citizen's photograph is appended to the cluster's photographic proof array.
  - Department officials in Django Admin see one clustered ticket with total citizen count and combined evidence.

---

## 5. Human-in-the-Loop Review Architecture

```
User Input (WhatsApp/Web) ──► AI Ingestion & Routing ──► Generate Review Package
                                                                │
                                ┌───────────────────────────────┘
                                ▼
              Review Package to Citizen:
              1. Layman Summary (Jargon-free, for citizen only)
              2. Draft Formal Complaint (Legal grounding & recipient)
              3. Call to Action: "Reply with edits or 'Yes, submit'"
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
        [Citizen Edits]                [Citizen: "Yes, submit"]
                 │                             │
                 ▼                             ▼
        AI Regenerates Draft          Complaint Dossier Status = QUEUED
        Re-sends to Citizen           Visible in Django Admin to Official
```

The layman summary is conversational only; it is explicitly excluded from the database record of the formal statutory dossier.

---

## 6. Role-Based Access Control (RBAC) in Django Admin

| Group / Role | Allowed Admin Model Scope | Permitted Actions |
|---|---|---|
| **`KWSC_Officers`** | `ComplaintDossier` & `MasterIncident` where `authority == 'KWSC'` | View clustered tickets, inspect photos/audio, update status (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`). |
| **`KMC_Officers`** | `ComplaintDossier` & `MasterIncident` where `authority == 'KMC'` | View clustered road/drainage tickets, update status. |
| **`SSWMB_Officers`** | `ComplaintDossier` & `MasterIncident` where `authority == 'SSWMB'` | View clustered solid waste tickets, update status. |
| **`Cantonment_Officers`** | `ComplaintDossier` & `MasterIncident` where `authority == 'CANTONMENT'` | View clustered cantonment tickets, update status. |
| **`SUPER_ADMIN`** | All Models, Users, Groups, System Logs, AI Config | Full system configuration, user onboarding, log audit, and city-wide overview. |

---

## 7. Data Models Specification

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│         CitizenProfile          │       │           UserAccount           │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ cnic: VARCHAR(15) [PK]          │       │ id: UUID [PK]                   │
│ full_name: VARCHAR(150)         │◄──────┤ profile: FK(CitizenProfile)     │
│ primary_phone: VARCHAR(20) [UQ] │       │ is_staff: BOOLEAN               │
│ secondary_phone: VARCHAR(20)    │       │ groups: M2M(Django Groups)      │
│ verified_at: TIMESTAMP          │       │ date_joined: TIMESTAMP          │
└────────────────┬────────────────┘       └─────────────────────────────────┘
                 │
                 │ 1:N
                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│            Incident             │  N:1  │         MasterIncident          │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id: UUID [PK]                   │──────►│ id: UUID [PK]                   │
│ citizen: FK(CitizenProfile)     │       │ authority: VARCHAR(50)          │
│ media_url: VARCHAR(500)         │       │ issue_category: VARCHAR(50)     │
│ raw_text: TEXT                  │       │ severity: VARCHAR(10)           │
│ lat: DECIMAL(9,6) [NULLABLE]    │       │ lat: DECIMAL(9,6) [NULLABLE]    │
│ lng: DECIMAL(9,6) [NULLABLE]    │       │ lng: DECIMAL(9,6) [NULLABLE]    │
│ landmark: VARCHAR(255)          │       │ landmark: VARCHAR(255)          │
│ created_at: TIMESTAMP           │       │ community_reports_count: INT    │
└────────────────┬────────────────┘       │ status: VARCHAR(20)             │
                 │                        │ first_reported_at: TIMESTAMP    │
                 │ 1:1                    │ last_reported_at: TIMESTAMP     │
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

## 8. Clean Repository & Container Structure

```
repo/
├── compose.yaml                  # Services: postgres, redis, main-service, ai-worker, whatsapp-service, frontend
├── .env.example
├── README.md
├── docs/
│   ├── project-info.md
│   ├── srs.md
│   ├── architecture.md           # This document
│   └── Base/                     # Foundational standard guides (SDLC, Coding, Testing, UI, UX)
├── frontend/                     # React + Vite Client
│   ├── Dockerfile
│   └── src/
├── main-service/                 # Django Backend + Admin Portal
│   ├── Dockerfile
│   ├── manage.py
│   ├── config/
│   ├── users/                    # Auth, CitizenProfile, RBAC
│   └── reports/                  # Incidents, Dossiers, Spatial Routing
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
