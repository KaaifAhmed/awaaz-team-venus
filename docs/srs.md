# System Requirements Specification (SRS) — Awaaz

**Project:** CWA Ship Karachi 2026 — Production-Grade AI Hackathon  
**Status:** Phase 1 Output (Discovery & SRS Generation)  
**Reference Document:** [`docs/project-info.md`](project-info.md)  
**Standard Guides:** [`Base/architecture-v3.md`](Base/architecture-v3.md) | [`Base/sdlc.md`](Base/sdlc.md) | [`Base/ai-system.md`](Base/ai-system.md)

---

## 1. Problem Statement & Scope

### 1.1 Problem Statement
When public infrastructure breaks in Karachi (sewage overflows, uncollected solid waste, road craters, potable water pipeline leaks, missing manhole covers), residents face extreme friction submitting and resolving complaints. Responsibilities are fragmented across overlapping authorities (KMC, KW&SC, SSWMB, Cantonment Boards) with no clear routing mechanism or formal drafting support. Simultaneously, municipal departments lack structured, authenticated incoming reports with visual proof and deduplication metrics.

### 1.2 System Scope
Awaaz is an intake, classification, and routing platform that:
- Authenticates citizens via CNIC on initial setup with multi-phone number linking (up to 2 numbers).
- Ingests multimodal reports (photos, voice notes, free-text) in **English, Urdu, and Roman Urdu** directly via Google Gemini multimodal processing; location is optional (uses GPS coordinates if shared via WhatsApp/web, else extracts landmarks from the user's text/voice description).
- Classifies defects and applies an extensible two-stage spatial and category routing structure to target the correct municipal agency.
- Deduplicates incoming reports against nearby active incidents ($\le 50\text{m}$, $\le 72\text{h}$) to aggregate community reports into a single master incident with a community counter.
- Provides an **interactive review and redo loop** with a jargon-free summary (shared only with the citizen for review, not persisted in the complaint dossier) alongside the formal draft before explicit submission approval.
- Stacks approved complaints into an internal management database accessed via the **Django Admin Panel** using native Django Groups & Permissions for Role-Based Access Control (RBAC) and system observability.

---

## 2. User Roles & Persona Stories

| Role Identifier | Role Name | Description & Capabilities |
|---|---|---|
| `CITIZEN` | Resident User | Karachi resident with verified CNIC. Submits multimodal reports via WhatsApp or Web, receives jargon-free AI summaries, chats with the review agent to edit/approve drafts, and tracks status of filed complaints. |
| `GOVT_OFFICIAL` | Department Officer | Municipal official assigned to an agency group (KMC, KW&SC, SSWMB, Cantonments). Authenticates into the **React Government Admin Dashboard** and only accesses complaints clustered under their organization. |
| `SUPER_ADMIN` | System Administrator | Platform administrator overseeing the entire platform: manages user roles and department assignments, inspects system/worker logs, views all city complaints, and configures routing rules. |
| `AI_AGENT` | AI Service Account | Internal service role executing under least-privilege access. Fetches assigned jobs from Main Service buffer, runs multimodal diagnosis, interacts with citizens during draft reviews, and queues approved complaints. |

### User Stories
- **US-01 (Citizen Intake & Flexible Location):** As a citizen speaking colloquial Roman Urdu, I want to send a voice note or photo on WhatsApp or the Web portal—sharing my GPS location if I want, or just describing the landmark—so that the system immediately understands my issue without mandatory technical hurdles.
- **US-02 (Citizen Human-in-the-Loop Review & Plain Summary):** As a citizen, I want to see what issue the AI identified along with a **short, jargon-free summary (for my eyes only)** and the drafted complaint so that I can easily understand it, request corrections, and approve submission.
- **US-03 (Official Scoped Dashboard & Clustered Incident View):** As a KW&SC official, I want to log into my dedicated **Government Admin Dashboard** and see a deduplicated/clustered view showing the total number of people who reported each incident rather than 1,000 duplicate rows, accompanied by photographic evidence and status controls.
- **US-04 (Admin Governance & System Observability):** As a system admin, I want to onboard department officials, manage permissions, and oversee system health, worker queues, and structured logs.

---

## 3. Jurisdictional Routing Matrix

The system applies an extensible routing architecture:

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

| Authority | Spatial / Feature Trigger | Primary Scope | Statutory Reference |
|---|---|---|---|
| **Cantonment Boards (CBC, etc.)** | Inside Cantonment / DHA bounds | All municipal infrastructure inside military/DHA land | Cantonments Act 1924 |
| **KW&SC** | Outside Cantonments; Water / Sewage defect | Water mains, open manholes, choked trunk sewers | KW&SC Act 2023; Arts. 9 & 14 |
| **SSWMB** | Outside Cantonments; Solid waste issue | Dumpsters, garbage heaps, transit stations | SSWMB Act 2014 |
| **KMC** | On/near KMC Major Arterial Corridors / Primary Drains | Major arterial roads, flyovers, main natural drains | SLGA 2021 / 2013 Sched. IV |

---

## 4. Functional Requirements

### 4.1 Intake & Multimodal Processing
- **FR-01 (CNIC Setup, User Account & Multi-Number Binding):** The system shall prompt first-time citizens for a valid 13-digit Pakistani CNIC (`XXXXX-XXXXXXX-X`), storing it as the primary key (`CitizenProfile`). The user may link up to 2 active phone numbers to their profile. On login/registration, the system returns the user's `user_id`, `role`, `assigned_org`, and `dashboard_route` for frontend routing.
- **FR-02 (Multimodal Direct Ingestion with User Tracking):** The intake API shall ingest `user_id`, images (JPEG, PNG), audio voice notes (MP3, WAV, OGG), or free text directly via the Google Gemini Multimodal API without external ASR transcribers.
- **FR-03 (Trilingual Comprehension):** The system shall detect and parse user inputs in **English, Urdu, and Roman Urdu**, extracting:
  - `issue_category`: Water, Sewerage, Solid Waste, Major Road, Local Street, Drainage, or Manhole.
  - `severity_level`: P0 (Emergency hazard / open manhole), P1 (High / property inundation), P2 (Moderate / routine defect).
  - `visual_summary`: Factual 1–2 sentence description of physical evidence.
  - `landmark`: Landmark/area extracted from text/voice description or reverse-geocoded coordinates.
- **FR-04 (Flexible Location Ingestion):** Geolocation is **not mandatory**. The web application shall request browser coordinates automatically but permit manual omission. The system shall prioritize GPS coordinates if provided; otherwise, it shall extract location details and landmarks directly from the citizen's text/voice narrative.

### 4.2 Routing & Deduplication
- **FR-05 (Extensible Two-Stage Routing):** The system shall evaluate Cantonment boundaries first; for non-cantonment areas, it shall route dynamically based on issue category, landmark proximity, and major road corridor alignments. The routing architecture shall remain generic and extensible for future jurisdictional tiers.
- **FR-06 (Spatiotemporal Incident Clustering & Deduplication):** When a new complaint matches an active incident within $50\text{m}$ (or matching landmark entity), within $72\text{hours}$, and shares the same issue category:
  - The system shall cluster the report under the existing Master Incident.
  - The system shall increment the community verification count (`community_reports_count += 1`).
  - The system shall append the new photo evidence to the master cluster rather than duplicating complaints in officials' feeds.

### 4.3 Human-in-the-Loop Review Loop
- **FR-07 (Interactive Review Presentation with Citizen Summary):** Before final submission, the system shall present:
  1. A **short, plain-language summary** (specifically for the citizen, explaining what was detected in layman's terms without technical/legal jargon; this summary is conversational and not stored in the final official complaint).
  2. The draft formal administrative complaint dossier with target agency and citations.
- **FR-08 (Conversational Revision & Redo):** The AI Agent shall accept citizen modifications (e.g., *"add that sewage is entering houses"*) and dynamically update the draft complaint in the chat.
- **FR-09 (Explicit Submission Gate):** The complaint dossier status shall remain `DRAFT` until the citizen explicitly sends approval (*"Yes, submit"*). No complaint shall be queued without explicit citizen consent.

### 4.4 Complaint Stacking & Government Admin Dashboard
- **FR-10 (Dossier Generation):** Upon confirmation, the system shall synthesize an official dual-language dossier (English & Urdu Nastaliq) with tracking ID (`KHI-CIVIC-XXXXX`) and statutory citations (SLGA, KW&SC Act, Articles 9 & 14).
- **FR-11 (Complaint Stacking):** The system shall store the approved dossier with status `QUEUED` in Postgres, assigned to the resolved agency.
- **FR-12 (Role-Based Government Admin Dashboard & RBAC Isolation):**
  - The system shall provide dedicated REST APIs (`/api/admin/dashboard/*`) consumed by the React Government Admin Dashboard.
  - Departmental access control and user groups shall enforce strict scoping via database querysets:
    - Officials assigned to `KW&SC` shall only access KW&SC complaints.
    - Officials assigned to `KMC` shall only access KMC complaints.
    - Officials assigned to `SSWMB` shall only access SSWMB complaints.
    - Officials assigned to `Cantonments` shall only access Cantonment complaints.
  - `SUPER_ADMIN` shall have full platform visibility and access to system logs and worker queues.
- **FR-13 (Status Lifecycle Management):** Department officials shall inspect evidence, view clustered community report counts, and transition ticket status (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`).

---

## 5. Non-Functional Requirements & Security

### 5.1 Security & Guardrails (Prompt Shield)
- **NFR-01 (Multi-Gate Defense):** All inbound user messages, tool results, and outgoing AI drafts must pass through Prompt Shield security gates (`security_input_node`, `security_output_node`) to block jailbreaks, prompt injections, and system prompt leakage.
- **NFR-02 (Separation of Auth & Guardrails):** Prompt Shield handles adversarial pattern defense; Django native permissions deterministically enforce data ownership and department boundaries.
- **NFR-03 (Principle of Least Privilege):** The AI Worker never accesses Postgres directly and only communicates via scoped internal API endpoints.

### 5.2 Performance & Reliability
- **NFR-04 (Intake Latency):** Multimodal classification and review presentation must respond within $\le 5\text{ seconds}$.
- **NFR-05 (Availability & Fallback):** If Gemini encounters rate limits or latency spikes, the system must utilize LiteLLM fallback chains (`smart` $\rightarrow$ `fast` model tier).
- **NFR-06 (Data Integrity):** Unique constraint enforced on CNIC primary key; max 2 phone numbers linked per CNIC.

---

## 6. MVP Scope Boundary

| In-Scope (5-Hour Must-Haves) | Out-of-Scope (Excluded / Stretch) |
|---|---|
| Multimodal intake (Image, Voice, Text via Gemini) in English, Urdu, Roman Urdu | Live physical SMS gateway integration (omitted) |
| Flexible location: GPS or landmark description from text/voice | External SMTP/Email dispatch to government mailboxes |
| CNIC primary identity + 2 linked phone numbers | Water tanker price transparency calculator |
| Extensible two-stage jurisdictional routing (Cantonment, KW&SC, SSWMB, KMC) | Separate TMC authority layer (omitted for MVP) |
| Interactive citizen review with plain-language explanation | Background worker & PDF document generation |
| Incident clustering & deduplication ($\le 50\text{m}$, $\le 72\text{h}$) | Real-time WebSocket push updates (polling used instead) |
| Complaint stacking & Django Admin RBAC (Group & Permission isolation) | Direct integration into municipal intranet legacy systems |
| System admin oversight and structured logging | Real-time live biometric NADRA API integration |
