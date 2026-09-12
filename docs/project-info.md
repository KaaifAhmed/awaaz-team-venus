# Project Discovery & Specification: Karachi Civic AI Engine

**Theme:** Karachi — The City Around You (CWA Ship Karachi 2026)  
**Target:** 5-Hour Production-Grade AI Hackathon MVP  
**Reference Standards:** [`architecture-v3.md`](Base/architecture-v3.md) | [`sdlc.md`](Base/sdlc.md) | [`ai-system.md`](Base/ai-system.md)

---

## 1. Discovery Question Bank (Phase 1 Baseline)

1. **What is the core problem, in one sentence?**  
   Karachi residents face acute civic breakdowns but cannot seamlessly submit, track, or resolve complaints due to overlapping administrative jurisdictions (KMC, KW&SC, SSWMB, Cantonment Boards) and lack of formal bureaucratic wording.

2. **Who is the target user, specifically?**  
   - **Citizens:** Karachi residents verified by CNIC submitting civic issues via WhatsApp or the web portal.
   - **Government Officials:** Department officers (KMC, KW&SC, SSWMB, Cantonments) reviewing, prioritizing, and resolving complaints clustered under their specific agency.

3. **What is the single primary user flow, start to finish?**  
   Citizen verifies CNIC once on setup (links primary/secondary phone number) $\rightarrow$ Submits issue via WhatsApp or Web (Photo, Audio, or Text in English/Urdu/Roman Urdu + optional GPS location or landmark description) $\rightarrow$ AI Worker (Gemini Multimodal + Prompt Shield) diagnoses the defect, extracts location/landmark details, and routes to the responsible agency $\rightarrow$ Deduplication checks if the problem was already reported nearby ($\le 50\text{m}$, $\le 72\text{h}$) to cluster into a master incident $\rightarrow$ System sends a short, jargon-free summary (for citizen's eyes only) alongside the formal draft complaint for review $\rightarrow$ Citizen requests revisions or confirms *"Yes, submit"* $\rightarrow$ Complaint is stacked and queued in the database with a tracking ID $\rightarrow$ Department official views the clustered incident in Django Admin with RBAC permissions.

4. **What are the 3–5 must-have features for a working demo (MVP)? What's explicitly out of scope?**  
   - **Must-Haves:**
     1. **CNIC Identity & Multi-Phone Linking:** One-time CNIC verification on initial setup (CNIC as primary identity); allows linking/unlinking up to 2 phone numbers.
     2. **Gemini Multimodal Intake:** Direct image, audio voice note, and text processing in English, Urdu, and Roman Urdu with flexible/optional location input (GPS or landmark text extraction).
     3. **Extensible Jurisdictional Routing:** Automatic routing across key bodies (Cantonments, KW&SC, SSWMB, KMC) with a generic, extensible structure.
     4. **Interactive Review & Redo Loop with Layman Summary:** Conversational check where the citizen reviews a plain-language explanation (not stored in the official dossier) and formal draft, makes edits, and gives final approval before submission.
     5. **Incident Clustering & Deduplication:** Combines duplicate reports within 50m and 72 hours into master incidents, increasing the community count.
     6. **Government Admin Oversight with Django RBAC:** Native Django Admin panel utilizing Django Groups & Permissions to enforce strict agency data isolation and platform logging/system oversight.
   - **Out of Scope:** Direct automated email/SMS dispatch to external inboxes (complaints are queued internally for admin review), live physical SMS gateway integration, live biometric NADRA calls (regex/format validation only), separate TMC layer (omitted for MVP), water tanker price calculator, background worker/PDF exports.

5. **What data entities does the system need to store and manage?**  
   - `CitizenProfile` (CNIC [PK], full name, verified_at, linked phone numbers [max 2]).
   - `UserAccount` (auth credentials, role: `SUPER_ADMIN`, `GOVT_OFFICIAL`, `CITIZEN`, `AI_AGENT`, assigned_organization).
   - `Incident` (media reference, user text/audio, issue category, severity P0–P4, lat/long [nullable], landmark, master_incident_id, community_reports_count).
   - `JurisdictionRule` / GeoJSON boundaries (Cantonments, KMC arterial corridors).
   - `ComplaintDossier` (tracking ID, target agency, legal references, rendered EN/UR text, review_status [DRAFT, AMENDMENT_REQUESTED, APPROVED, QUEUED], official_status [PENDING, IN_PROGRESS, RESOLVED]).

6. **Where does AI/LLM capability actually create value?**  
   - Direct multimodal perception via Gemini (image defect recognition, audio transcription, multilingual Roman Urdu/Urdu/English comprehension).
   - Conversational review agent that provides plain layman explanations and refines formal complaint drafts based on resident feedback.
   - Formal administrative complaint writing anchored to municipal laws (SLGA, KW&SC Act, Articles 9 & 14).
   - *Security Note:* Prompt Shield gates ensure all prompt inputs, tool calls, and drafts remain secure against prompt injection and system leakage.

7. **What does success look like in the live demo?**  
   Judges observe live end-to-end complaint submission and departmental dashboard isolation:
   - *Scenario A (WhatsApp Inbound & Human Review):* User sends a voice note in Roman Urdu (*"hamare block me gutter ubal raha hai"*) without GPS $\rightarrow$ Gemini diagnoses sewage overflow & extracts landmark $\rightarrow$ AI presents a plain-language summary for the user + formal draft $\rightarrow$ User confirms *"yes submit"* $\rightarrow$ Complaint queued with tracking ID.
   - *Scenario B (RBAC Department Isolation):* Log in as a **KW&SC official** in Django Admin $\rightarrow$ sees Scenario A's clustered complaint with photo evidence, landmark, and community count. Log in as a **KMC official** $\rightarrow$ Scenario A is hidden; only road and major drain complaints appear.
   - *Scenario C (Spatial Routing & Cantonment Bypass):* Rubbish report in DHA Phase 5 routes to Cantonment Board Clifton (CBC) instead of SSWMB.

8. **Are there any external APIs, datasets, or constraints?**  
   - Google Gemini Multimodal API (unified vision, voice, and language model).
   - Static Karachi GIS dataset (Cantonment boundaries, KMC arterial lines).

9. **What is the single failure point that kills the demo, and mitigation?**  
   - *Risk:* Complaint drafted incorrectly, routed to the wrong authority, or accessible by unauthorized roles.
   - *Mitigation:* Mandatory citizen sign-off before queuing, rule-based spatial routing overriding model guesses, and native Django Admin group permissions per department.

---

## 2. Role-Based Access Control (RBAC) Specification

The system leverages Django's native Groups and Permissions:

| Role | Target Entity | Permissions & Access Scope |
|---|---|---|
| **System Admin (`SUPER_ADMIN`)** | Platform Administration | Full global access: manage user accounts, assign government officials to department groups, inspect structured logs, monitor worker queues, and view all city complaints. |
| **Government Official (`GOVT_OFFICIAL`)** | KMC, KW&SC, SSWMB, Cantonments | Department-scoped access: can **only view, filter, and update complaints clustered under their assigned agency group**. Cannot view other departments' queues. |
| **Citizen (`CITIZEN`)** | Karachi Resident | Resident-scoped access: authenticate via CNIC, submit multimodal reports, receive layman explanations, chat with the review agent, and view the status of their own submitted complaints. |
| **AI Agent (`AI_AGENT`)** | Automation Service | Scoped service account: can only classify intake payloads, run routing, update drafts during review, and queue approved complaints. Cannot view arbitrary database records or perform admin actions. |

---

## 3. Jurisdictional Routing Specification

The system uses an extensible **two-stage routing** pipeline:

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

| Authority | Spatial / Feature Trigger | Primary Scope | Official Helpline / Contact | Statutory Reference |
|---|---|---|---|---|
| **Cantonment Boards (CBC, etc.)** | Inside Cantonment / DHA bounds | All civic services inside military/DHA land | 111-800-900 | Cantonments Act 1924 |
| **KW&SC** | Outside Cantonments; Water / Sewage defect | Water mains, open manholes, choked trunk sewers | 1334 | KW&SC Act 2023; Arts. 9 & 14 |
| **SSWMB** | Outside Cantonments; Solid waste issue | Dumpsters, garbage heaps, transit stations | 1128 | SSWMB Act 2014 |
| **KMC** | On/near KMC Major Arterial Corridors / Primary Drains | Major roads, flyovers, main natural drains | 1339 | SLGA 2021 / 2013 Sched. IV |

---

## 4. Core Functional Modules (MVP Scope)

### M1: CNIC Authentication & Multi-Number Binding
- **Identity Backbone:** CNIC number acts as the primary key (`CitizenProfile`).
- **Phone Association:** First WhatsApp/Web interaction asks for CNIC; once verified, the phone number is linked. A citizen can associate up to 2 active phone numbers or unlink old ones.

### M2: Gemini Multimodal Intake & Language Processing
- **Unified Perception:** Directly passes image, voice note audio, or text to Gemini without separate transcription pipelines.
- **Language Inclusivity:** Automatically understands and interacts in **English, Urdu, and Roman Urdu**.
- **Flexible Location:** Ingests native WhatsApp/web coordinates if shared; otherwise, extracts location and landmarks directly from conversational text/voice descriptions.

### M3: Jurisdictional Routing
- Generic, extensible routing structure evaluating Cantonment boundaries first, then category and road alignments.

### M4: Incident Clustering & Deduplication
- If a new complaint is within $50\text{m}$ (or matching landmark) and logged within $72\text{h}$ for the same issue category:
- Clusters the report under a Master Incident, increments the community verification count, and appends photo evidence rather than creating separate rows.

### M5: Interactive Review & Redo Loop (Human-in-the-Loop)
- Presents a **short, plain-language summary** (for citizen's eyes only) + the formal complaint draft.
- Citizen can reply with corrections or extra details.
- AI dynamically re-drafts until the user explicitly confirms *"Yes, submit"*.

### M6: Complaint Stacking & Django Admin Panel Management
- Once approved, the complaint is saved and queued under the assigned department with a unique tracking ID (`KHI-CIVIC-XXXXX`).
- Departmental officials log into the Django Admin panel (isolated via native Django Groups & Permissions) to view clustered complaints, inspect evidence, and manage ticket status. System admins oversee full logs and worker health.

---

## 5. Architectural Alignment

- **Main Service (Django):** Owns Postgres database (`CitizenProfile`, `Incident`, `ComplaintDossier`, `UserAccount`), manages native Django Admin RBAC, handles auth, and stores queued complaints.
- **AI Worker Pool:** Consumes `ai_queue`, manages LangGraph conversational states (intake $\rightarrow$ layman summary + review loop $\rightarrow$ complaint formatting) via Gemini API + Prompt Shield security gates.
- **WhatsApp Service (Express.js):** Receives WhatsApp messages and optional location payloads via webhook; forwards to Main Service; streams conversational replies back to citizens.
- **Frontend (React/Vite):** Accessible web reporting portal providing identical multimodal upload, optional location pin, and interactive complaint review capabilities.
- *(Note: External email/SMS dispatch, background worker, and PDF generation are omitted per MVP scope to maintain a lean, highly reliable system).*
