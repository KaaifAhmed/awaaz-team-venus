# Project Discovery & Specification: Karachi Civic AI Engine

**Theme:** Karachi — The City Around You (CWA Ship Karachi 2026)  
**Target:** 5-Hour Production-Grade AI Hackathon MVP  
**Reference Standards:** [`architecture-v3.md`](Base/architecture-v3.md) | [`sdlc.md`](Base/sdlc.md) | [`ai-system.md`](Base/ai-system.md)

---

## 1. Discovery Question Bank (Phase 1 Baseline)

1. **What is the core problem, in one sentence?**  
   Karachi residents face acute civic breakdowns but cannot seamlessly submit, track, or resolve complaints due to overlapping administrative jurisdictions (KMC, KW&SC, SSWMB, TMCs, Cantonment Boards) and lack of formal bureaucratic wording.

2. **Who is the target user, specifically?**  
   - **Citizens:** Karachi residents verified by CNIC submitting civic issues via WhatsApp or the web portal.
   - **Government Officials:** Department officers (KMC, TMC, KW&SC, SSWMB, Cantonments) reviewing, prioritizing, and resolving complaints routed specifically to their agency.

3. **What is the single primary user flow, start to finish?**  
   Citizen verifies CNIC once on setup (links primary/secondary phone number) $\rightarrow$ Submits issue via WhatsApp or Web (Photo, Audio, or Text in English/Urdu/Roman Urdu + WhatsApp/browser Location) $\rightarrow$ AI Worker (Gemini Multimodal + Prompt Shield) diagnoses the defect, identifies the language, extracts details, and determines the responsible agency via spatial routing $\rightarrow$ Deduplication checks if the problem was already reported nearby ($\le 50\text{m}$, $\le 72\text{h}$) $\rightarrow$ System sends the diagnosis and draft complaint back to the citizen for review $\rightarrow$ Citizen requests revisions or confirms *"Yes, submit"* $\rightarrow$ Complaint is stacked and queued in the database with a tracking ID $\rightarrow$ Relevant government official views and manages it in their departmental dashboard.

4. **What are the 3–5 must-have features for a working demo (MVP)? What's explicitly out of scope?**  
   - **Must-Haves:**
     1. **CNIC Identity & Multi-Phone Linking:** One-time CNIC verification on initial setup (CNIC as primary identity); allows linking/unlinking up to 2 phone numbers.
     2. **Gemini Multimodal Intake:** Direct image, audio voice note, and text processing in English, Urdu, and Roman Urdu.
     3. **Jurisdictional Routing:** Automatic routing across the 5 governing bodies (Cantonments, KW&SC, SSWMB, KMC, TMCs).
     4. **Interactive Review & Redo Loop:** Conversational check where the citizen reviews the AI's diagnosis and complaint text, makes edits, and gives final approval before submission.
     5. **Incident Deduplication:** Combines duplicate reports within 50m and 72 hours, increasing the community priority count.
     6. **Government Admin Dashboard with Role-Based Access Control (RBAC):** Departmental portals for officials to review incoming stacked complaints, update statuses, and view issue evidence.
   - **Out of Scope:** Direct automated email/SMS dispatch to external inboxes (complaints are queued internally for the admin dashboard), live biometric NADRA calls (regex/format validation only), water tanker price calculator, background worker/PDF exports.

5. **What data entities does the system need to store and manage?**  
   - `CitizenProfile` (CNIC [PK], full name, verified_at, linked phone numbers [max 2]).
   - `UserAccount` (auth credentials, role: `SUPER_ADMIN`, `GOVT_OFFICIAL`, `CITIZEN`, `AI_AGENT`, assigned_organization).
   - `Incident` (media reference, user text/audio, issue category, severity P0–P4, lat/long, landmark, master_incident_id).
   - `JurisdictionRule` / GeoJSON boundaries (Cantonments, KMC 26 major arterial corridors, TMC zones).
   - `ComplaintDossier` (tracking ID, target agency, legal references, rendered EN/UR text, review_status [DRAFT, AMENDMENT_REQUESTED, APPROVED, QUEUED], official_status [PENDING, IN_PROGRESS, RESOLVED]).

6. **Where does AI/LLM capability actually create value?**  
   - Direct multimodal perception via Gemini (image defect recognition, audio transcription, multilingual Roman Urdu/Urdu/English comprehension).
   - Conversational review agent that refines complaint drafts based on resident feedback.
   - Formal administrative complaint writing anchored to municipal laws (SLGA, KW&SC Act, Articles 9 & 14).
   - *Security Note:* Prompt Shield gates ensure all prompt inputs, tool calls, and drafts remain secure against prompt injection and system leakage.

7. **What does success look like in the live demo?**  
   Judges observe live end-to-end complaint submission and departmental dashboard isolation:
   - *Scenario A (WhatsApp Inbound & Human Review):* User sends a voice note in Roman Urdu (*"hamare block me gutter ubal raha hai"*) + location $\rightarrow$ Gemini diagnoses sewage overflow $\rightarrow$ System drafts KW&SC complaint $\rightarrow$ User texts *"add that water is entering homes"* $\rightarrow$ AI updates draft $\rightarrow$ User confirms *"yes submit"* $\rightarrow$ Complaint queued with tracking ID.
   - *Scenario B (RBAC Departmental Dashboard):* Log in as a **KW&SC official** $\rightarrow$ sees Scenario A's complaint with evidence, location, and community count. Log in as a **KMC official** $\rightarrow$ Scenario A is hidden; only road and major drain complaints appear.
   - *Scenario C (Spatial Routing & Cantonment Bypass):* Rubbish report in DHA Phase 5 routes to Cantonment Board Clifton (CBC) instead of SSWMB.

8. **Are there any external APIs, datasets, or constraints?**  
   - Google Gemini Multimodal API (unified vision, voice, and language model).
   - Static Karachi GIS dataset (Cantonment boundaries, KMC 26 arterial lines, TMC boundaries).

9. **What is the single failure point that kills the demo, and mitigation?**  
   - *Risk:* Complaint drafted incorrectly, routed to the wrong authority, or accessible by unauthorized roles.
   - *Mitigation:* Mandatory citizen sign-off before queuing, rule-based spatial routing overriding model guesses, and strict Django RBAC query filters per department.

---

## 2. Role-Based Access Control (RBAC) Specification

The system implements strict role isolation across endpoints and data models:

| Role | Target Entity | Permissions & Access Scope |
|---|---|---|
| **System Admin (`SUPER_ADMIN`)** | Platform Administration | Full global access: manage user accounts, assign government officials to departments, view all complaints across Karachi. |
| **Government Official (`GOVT_OFFICIAL`)** | KMC, TMC, KW&SC, SSWMB, Cantonments | Department-scoped access: can **only view, filter, and update complaints routed to their assigned organization**. Cannot view other departments' queues. |
| **Citizen (`CITIZEN`)** | Karachi Resident | Resident-scoped access: authenticate via CNIC, submit multimodal reports, chat with the review agent, and view the status of their own submitted complaints. |
| **AI Agent (`AI_AGENT`)** | Automation Service | Scoped service account: can only classify intake payloads, run spatial routing, update drafts during review, and queue approved complaints. Cannot view arbitrary database records or perform admin actions. |

---

## 3. Jurisdictional Routing Specification

The system uses a simple **two-stage routing** pipeline:

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

| Authority | Spatial / Feature Trigger | Primary Scope | Official Helpline / Contact | Statutory Reference |
|---|---|---|---|---|
| **Cantonment Boards (CBC, etc.)** | Inside Cantonment / DHA bounds | All civic services inside military/DHA land | 111-800-900 | Cantonments Act 1924 |
| **KW&SC** | Outside Cantonments; Water / Sewage defect | Water mains, open manholes, choked trunk sewers | 1334 | KW&SC Act 2023; Arts. 9 & 14 |
| **SSWMB** | Outside Cantonments; Solid waste issue | Dumpsters, garbage heaps, transit stations | 1128 | SSWMB Act 2014 |
| **KMC** | Within 25m buffer of 26 Major Arteries / Primary Nullahs | Major roads, flyovers, main natural drains | 1339 | SLGA 2021 / 2013 Sched. IV |
| **TMCs (25 Towns)** | Outside Cantonments; Local streets (<60ft) & branch drains | Residential street potholes, streetlights, local drains | Local TMC Office | SLGA 2021 / 2013 Sec. 54 |

---

## 4. Core Functional Modules (MVP Scope)

### M1: CNIC Authentication & Multi-Number Binding
- **Identity Backbone:** CNIC number acts as the primary key (`CitizenProfile`).
- **Phone Association:** First WhatsApp/Web interaction asks for CNIC; once verified, the phone number is linked. A citizen can associate up to 2 active phone numbers or unlink old ones.

### M2: Gemini Multimodal Intake & Language Processing
- **Unified Perception:** Directly passes image, voice note audio, or text to Gemini without separate transcription pipelines.
- **Language Inclusivity:** Automatically understands and interacts in **English, Urdu, and Roman Urdu**.
- **Location Ingestion:** Ingests native WhatsApp location coordinates or browser GPS from the web portal.

### M3: Jurisdictional Routing
- Point-in-polygon resolution for Cantonment boundaries.
- Road corridor buffer calculation (25m threshold) for KMC 26 major arterial corridors.
- Fallback to administrative TMC boundaries for neighborhood streets.

### M4: Incident Deduplication
- **Deduplication Logic:** If a new complaint is within $50\text{m}$ and logged within $72\text{h}$ for the same issue category:
- Flags the incident as a community co-report. Increments incident confirmation tally and attaches the new citizen's visual evidence rather than creating an isolated duplicate record.

### M5: Interactive Review & Redo Loop (Human-in-the-Loop)
- Presents draft summary to resident: *"I have detected an overflowing sewage issue at Block 4, Gulshan, under KW&SC jurisdiction. Here is the draft complaint: [...] Would you like to make any changes or submit?"*
- Allows resident to reply with corrections, additional details, or modifications.
- AI dynamically re-drafts until the user explicitly confirms *"Yes, submit"*.

### M6: Complaint Stacking & Government Admin Dashboard
- Once approved, the complaint is saved and queued under the assigned department with a unique tracking ID (`KHI-CIVIC-XXXXX`).
- Departmental officials log into the web dashboard to inspect incoming complaints, review uploaded photos/audio evidence, see community deduplication counts, and update resolution statuses.

---

## 5. Architectural Alignment

- **Main Service (Django):** Owns Postgres database (`CitizenProfile`, `Incident`, `ComplaintDossier`, `UserAccount`), enforces RBAC querysets per government agency, handles auth, and stores queued complaints.
- **AI Worker Pool:** Consumes `ai_queue`, manages LangGraph conversational states (intake $\rightarrow$ review loop $\rightarrow$ complaint formatting) via Gemini API + Prompt Shield security gates.
- **WhatsApp Service (Express.js):** Receives WhatsApp messages and native location payloads via webhook; forwards to Main Service; streams conversational replies back to citizens.
- **Frontend (React/Vite):** 
  - *Citizen Portal:* Multimodal reporting, location pin, and interactive complaint review.
  - *Government Admin Dashboard:* Role-protected interface for officials (KMC, KW&SC, SSWMB, TMCs, Cantonments) to view and manage departmental complaints.
- *(Note: External email dispatch, background worker, and PDF generation are omitted per MVP scope to maintain a lean, highly reliable system).*