# System Requirements Specification (SRS) — Karachi Civic AI Engine

**Project:** CWA Ship Karachi 2026 — Production-Grade AI Hackathon  
**Status:** Phase 1 Output (Discovery & SRS Generation)  
**Reference Document:** [`docs/project-info.md`](project-info.md)  
**Standard Guides:** [`Base/architecture-v3.md`](Base/architecture-v3.md) | [`Base/sdlc.md`](Base/sdlc.md) | [`Base/ai-system.md`](Base/ai-system.md)

---

## 1. Problem Statement & Scope

### 1.1 Problem Statement
When public infrastructure breaks in Karachi (sewage overflows, uncollected solid waste, road craters, potable water pipeline leaks, missing manhole covers), residents face extreme friction submitting and resolving complaints. Responsibilities are fragmented across overlapping authorities (KMC, KW&SC, SSWMB, 25 TMCs, Cantonment Boards) with no unified routing mechanism or formal drafting support. Simultaneously, municipal departments lack structured, authenticated incoming reports with visual proof and deduplication metrics.

### 1.2 System Scope
The Karachi Civic AI Engine is an intake, classification, and routing platform that:
- Authenticates citizens via CNIC on initial setup with multi-phone number linking (up to 2 numbers).
- Ingests multimodal reports (photos, voice notes, free-text) in **English, Urdu, and Roman Urdu** directly via Google Gemini multimodal processing alongside native WhatsApp/browser location coordinates.
- Classifies defects and applies two-stage spatial routing to target the correct municipal agency.
- Deduplicates incoming reports against nearby active incidents ($\le 50\text{m}$, $\le 72\text{h}$) to increment neighborhood priority weight.
- Provides an **interactive review and redo loop** allowing residents to amend the diagnosis and draft complaint before granting explicit submission approval.
- Stacks approved complaints into an internal management database accessed via a role-protected **Government Admin Dashboard** equipped with Role-Based Access Control (RBAC).

---

## 2. User Roles & Persona Stories

| Role Identifier | Role Name | Description & Capabilities |
|---|---|---|
| `CITIZEN` | Resident User | Karachi resident with verified CNIC. Submits multimodal reports via WhatsApp or Web, chats with the review agent to edit/approve drafts, and views status of filed complaints. |
| `GOVT_OFFICIAL` | Department Officer | Municipal official assigned to one specific department (KMC, KW&SC, SSWMB, TMC, or Cantonment). Can only view, filter, review evidence, and update statuses of complaints routed to their agency. |
| `SUPER_ADMIN` | System Administrator | Platform administrator with global access across all agencies, complaint queues, user role assignments, and routing boundary rules. |
| `AI_AGENT` | AI Service Account | Internal service role executing under least-privilege access. Ingests media, queries GIS boundaries, interacts with citizens during draft reviews, and queues approved complaints. |

### User Stories
- **US-01 (Citizen Intake & Language):** As a citizen speaking colloquial Roman Urdu, I want to send a voice note or photo on WhatsApp with my location so that the system immediately understands my issue without requiring me to navigate bureaucratic jargon or translate to formal English.
- **US-02 (Citizen Human-in-the-Loop Review):** As a citizen, I want to see what issue the AI identified and read the drafted complaint before it is submitted so that I can request corrections or add critical context.
- **US-03 (Official Scoped Dashboard):** As a KW&SC official, I want a filtered dashboard showing only sewerage and water complaints across Karachi with photographic proof and community report counts, without seeing unrelated garbage or street defect tickets.
- **US-04 (Admin Governance):** As a system admin, I want to onboard department officials and enforce strict data isolation between civic bodies.

---

## 3. Jurisdictional Routing Matrix

The system applies a simple two-stage routing flow:

```
                  Citizen Report (Lat, Long, Issue Category)
                                     │
                                     ▼
                        [Stage 1: Cantonment Check]
                        Is location inside Cantonment/DHA?
                                ├── YES ──► Respective Cantonment Board (e.g. CBC)
                                └── NO
                                     │
                                     ▼
                       [Stage 2: Category & Road Check]
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
    Water / Sewerage            Solid Waste             Roads / Drains
             │                       │                       │
             ▼                       ▼                       ▼
           KW&SC                   SSWMB           Is within 25m of KMC
    (Acts 2023 / 1334)      (Act 2014 / 1128)      26 Major Arterials?
                                                     ├── YES ──► KMC
                                                     └── NO  ──► Local TMC
```

| Authority | Spatial / Feature Trigger | Primary Scope | Statutory Reference |
|---|---|---|---|
| **Cantonment Boards (CBC, etc.)** | Inside Cantonment / DHA bounds | All municipal infrastructure inside military/DHA land | Cantonments Act 1924 |
| **KW&SC** | Outside Cantonments; Water / Sewage defect | Water mains, open manholes, choked trunk sewers | KW&SC Act 2023; Arts. 9 & 14 |
| **SSWMB** | Outside Cantonments; Solid waste issue | Dumpsters, garbage heaps, transit stations | SSWMB Act 2014 |
| **KMC** | Within 25m buffer of 26 Major Arteries / Primary Nullahs | Major roads, flyovers, main natural drains | SLGA 2021 / 2013 Sched. IV |
| **TMCs (25 Towns)** | Outside Cantonments; Local streets (<60ft) & branch drains | Residential street potholes, streetlights, local drains | SLGA 2021 / 2013 Sec. 54 |

---

## 4. Functional Requirements

### 4.1 Intake & Multimodal Processing
- **FR-01 (CNIC Setup & Binding):** The system shall prompt first-time citizens for a valid 13-digit Pakistani CNIC (`XXXXX-XXXXXXX-X`), storing it as the primary key. The user may link up to 2 active phone numbers to their CNIC profile.
- **FR-02 (Multimodal Direct Ingestion):** The system shall accept images (JPEG, PNG), audio voice notes (MP3, WAV, OGG), or free text directly via the Google Gemini Multimodal API without external ASR transcribers.
- **FR-03 (Trilingual Comprehension):** The system shall detect and parse user inputs in **English, Urdu, and Roman Urdu**, extracting:
  - `issue_category`: Water, Sewerage, Solid Waste, Major Road, Local Street, Drainage, or Manhole.
  - `severity_level`: P0 (Emergency hazard / open manhole), P1 (High / property inundation), P2 (Moderate / routine defect).
  - `visual_summary`: Factual 1–2 sentence description of physical evidence.
  - `landmark`: Landmark reference extracted from text/voice.
- **FR-04 (Location Ingestion):** The system shall ingest native coordinates (latitude/longitude) provided via WhatsApp Location Sharing or browser geolocation pins.

### 4.2 Routing & Deduplication
- **FR-05 (Two-Stage Routing):** The system shall resolve the responsible agency by evaluating GPS coordinates against Cantonment GeoJSON polygons first, followed by category and 25m corridor proximity to KMC's 26 major roads, defaulting to the local TMC polygon.
- **FR-06 (Spatiotemporal Deduplication):** If a new complaint matches an existing active incident within $50\text{m}$ (Haversine formula), within $72\text{hours}$, and shares the same category:
  - The system shall link the report to the existing Master Incident.
  - The system shall increment the community verification count (`community_reports_count += 1`).
  - The system shall append the new photo evidence to the dossier rather than creating an isolated ticket.

### 4.3 Human-in-the-Loop Review Loop
- **FR-07 (Interactive Review Presentation):** Before final submission, the system shall reply to the citizen with the identified defect, assigned authority, and draft formal complaint.
- **FR-08 (Conversational Revision & Redo):** The AI Agent shall accept modification requests from the resident (e.g., *"add that sewage is entering houses"*) and regenerate the draft in the conversational thread.
- **FR-09 (Explicit Submission Gate):** The complaint dossier status shall remain `DRAFT` until the citizen explicitly inputs approval (*"Yes, submit"* or equivalent confirmation). No complaint shall be stacked without user authorization.

### 4.4 Complaint Stacking & Government Admin Dashboard
- **FR-10 (Dossier Generation):** Upon confirmation, the system shall synthesize an official dual-language dossier (English & Urdu Nastaliq) with tracking ID (`KHI-CIVIC-XXXXX`) and statutory citations (SLGA, KW&SC Act, Articles 9 & 14).
- **FR-11 (Complaint Stacking):** The system shall store the approved dossier with status `QUEUED` in Postgres, assigned to the resolved agency.
- **FR-12 (Role-Based Dashboard Access):**
  - Officials assigned to `KW&SC` shall only access KW&SC complaints.
  - Officials assigned to `KMC` shall only access KMC complaints.
  - Officials assigned to `SSWMB` shall only access SSWMB complaints.
  - Officials assigned to `TMC` shall only access their respective town's complaints.
  - Officials assigned to `Cantonments` shall only access Cantonment complaints.
  - System admins (`SUPER_ADMIN`) shall have full platform visibility.
- **FR-13 (Status Lifecycle Management):** Department officials shall be able to inspect evidence, view community report counts, and transition ticket status (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`).

---

## 5. Non-Functional Requirements & Security

### 5.1 Security & Guardrails (Prompt Shield)
- **NFR-01 (Multi-Gate Defense):** All inbound user messages, tool results, and outgoing AI drafts must pass through Prompt Shield security gates (`security_input_node`, `security_output_node`) to block jailbreaks, prompt injections, and system prompt leakage.
- **NFR-02 (Separation of Auth & Guardrails):** Prompt Shield handles adversarial pattern defense; Django RBAC deterministically enforces data ownership and permission boundaries.
- **NFR-03 (Principle of Least Privilege):** The AI Worker never accesses Postgres directly and only communicates via scoped internal API endpoints.

### 5.2 Performance & Reliability
- **NFR-04 (Intake Latency):** Multimodal classification and review presentation must respond within $\le 5\text{ seconds}$.
- **NFR-05 (Availability & Fallback):** If Gemini encounters rate limits or latency spikes, the system must utilize LiteLLM fallback chains (`smart` $\rightarrow$ `fast` model tier).
- **NFR-06 (Data Integrity):** Unique constraint enforced on CNIC primary key; max 2 phone numbers linked per CNIC.

---

## 6. MVP Scope Boundary

| In-Scope (5-Hour Must-Haves) | Out-of-Scope (Excluded / Stretch) |
|---|---|
| Multimodal intake (Image, Voice, Text via Gemini) in English, Urdu, Roman Urdu | Real-time live biometric NADRA API lookup (regex/format check only) |
| CNIC primary identity + 2 linked phone numbers | External SMTP/Email dispatch to real government mailboxes |
| Two-stage jurisdictional routing (5 authorities) | Water tanker price transparency calculator |
| Interactive citizen review and redo loop | Background worker & PDF document generation |
| Spatiotemporal deduplication ($\le 50\text{m}$, $\le 72\text{h}$) | Real-time WebSocket push updates (polling used instead) |
| Internal complaint stacking & queueing | Direct integration into municipal intranet legacy systems |
| Role-protected Government Admin Dashboard (RBAC) | Live physical SMS gateway integration |
