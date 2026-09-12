# Project Discovery & Specification: Karachi Civic AI Engine

**Theme:** Karachi — The City Around You (CWA Ship Karachi 2026)  
**Target:** 5-Hour Production-Grade AI Hackathon MVP  
**Reference Standards:** [`architecture-v3.md`](Base/architecture-v3.md) | [`sdlc.md`](Base/sdlc.md) | [`ai-system.md`](Base/ai-system.md)

---

## 1. Discovery Question Bank (Phase 1 Baseline)

1. **What is the core problem, in one sentence?**  
   Karachi residents face acute civic breakdowns but cannot report or resolve them effectively due to overlapping jurisdictional mandates (KMC, KW&SC, SSWMB, TMCs, Cantonment Boards) and lack of bureaucratic wording.

2. **Who is the target user, specifically?**  
   Karachi residents with verified identity (CNIC + phone number) facing neighborhood municipal defects (open manholes, sewage leaks, garbage piles, road craters, potable water failure).

3. **What is the single primary user flow, start to finish?**  
   Citizen authenticates (Phone/CNIC) $\rightarrow$ Submits issue (Photo, Voice Note, or Text + GPS/Landmark) $\rightarrow$ AI Worker scans security gates, classifies issue & extracts entities $\rightarrow$ Deterministic Spatial Engine routes to responsible agency $\rightarrow$ Engine deduplicates against local clusters ($\le 50\text{m}$, $\le 72\text{h}$) $\rightarrow$ System renders dual-language (EN/UR) legally anchored complaint dossier $\rightarrow$ Dispatches via WhatsApp/Email simulation with tracking ID.

4. **What are the 3–5 must-have features for a working demo (MVP)? What's explicitly out of scope?**  
   - **Must-Haves:**
     1. Multimodal Intake (Image upload, Urdu/English audio voice notes via Whisper, Roman Urdu/English text).
     2. Deterministic Jurisdictional Router across 5 authorities (Cantonments, KW&SC, SSWMB, KMC, TMCs).
     3. Dual-Language Statutory Complaint Generator (English & Urdu Nastaliq with SLGA 2021/2013 & Art. 9/14 legal grounding).
     4. Incident Deduplication & Hotspot Aggregator ($50\text{m}$ radius + $72\text{h}$ window + issue match).
     5. KW&SC Water Tanker Fair-Price Calculator (distance-to-nearest-hydrant tariff check vs open market gouging).
   - **Out of Scope:** Physical dispatch API integration with government intranets (simulated/previewed only), live biometric Nadra verification (regex/format CNIC verification only), real-time map clustering GIS servers (PostGIS/GeoJSON bounding logic used instead).

5. **What data entities does the system need to store and manage?**  
   - `User` (phone number, name, CNIC number).
   - `Incident` (media URL/reference, transcript, issue category, severity P0–P4, lat/long, address/landmark, cluster_id).
   - `JurisdictionRule` / GeoJSON polygons (Cantonments, KMC major arterial corridors, TMC zones).
   - `ComplaintDossier` (tracking ID, target agency, legal references, rendered EN/UR texts, status).
   - `HydrantTariff` (official KW&SC base rates & per-km transit multipliers).

6. **Where does AI/LLM capability actually create value?**  
   - Multimodal defect recognition from messy user photos and colloquial audio/text (*“gutter ubal raha hai”*, *“kachra kundi bhar gayi”*).
   - Structured JSON taxonomy extraction and severity scoring.
   - Legally framed, dual-language administrative complaint synthesis.
   - *Security Note:* All AI input/output passes through Prompt Shield gates to prevent prompt injection and system leakage.

7. **What does success look like in the live demo?**  
   Judges see 3 end-to-end scenarios execute in seconds:
   - *Scenario A:* Open manhole / overflowing sewage in Gulshan $\rightarrow$ Routed to KW&SC with P0 safety hazard notice.
   - *Scenario B:* Trash heap in DHA Phase 5 $\rightarrow$ Spatial polygon detects Cantonment Board Clifton (CBC), overriding SSWMB.
   - *Scenario C:* Pothole on Shahrah-e-Faisal $\rightarrow$ Corridor buffer detects KMC arterial road instead of local TMC.
   - *Scenario D:* Tanker calculation showing official PKR 2,400 vs illegal market rate PKR 7,000.

8. **Are there any external APIs, datasets, or constraints?**  
   - Whisper ASR for voice transcription.
   - Multi-modal LLM API (LiteLLM / OpenAI / Gemini).
   - Static Karachi GIS dataset (Cantonment polygons, 26 KMC major roads, KW&SC hydrant coordinates).

9. **What is the single failure point that kills the demo, and mitigation?**  
   - *Risk:* WhatsApp session disconnection or LLM rate-limit/latency timeout.
   - *Mitigation:* In-memory fallback mock for WhatsApp outbound, LiteLLM fallback chains (`smart` $\rightarrow$ `fast` tiers), and local caching of GIS boundaries.

---

## 2. Jurisdictional Routing Specification

The system uses a **two-stage deterministic resolution** pipeline:

```
                  Citizen Report (Lat, Long, Issue Category)
                                     │
                                     ▼
                     [Stage 1: Cantonment Check]
                     Is point inside Cantonment/DHA?
                                ├── YES ──► Respective Cantonment Board (e.g. CBC)
                                └── NO
                                     │
                                     ▼
                   [Stage 2: Category & Asset Check]
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

| Authority | Spatial / Feature Trigger | Primary Scope | Helpline / Contact | Statutory Reference |
|---|---|---|---|---|
| **Cantonment Boards (CBC, etc.)** | Geofenced within Cantonment / DHA bounds | All civic services inside military/DHA land | 111-800-900 / info@cbc.gov.pk | Cantonments Act 1924 |
| **KW&SC** | Outside Cantonments; Water / Sewage defect | Water mains, open manholes, choked trunk sewers | 1334 / info@kwsc.gos.pk | KW&SC Act 2023; Arts. 9 & 14 |
| **SSWMB** | Outside Cantonments; Solid waste issue | Dumpsters, garbage heaps, transit stations | 1128 / info@sswmb.gos.pk | SSWMB Act 2014 |
| **KMC** | Within 25m buffer of 26 Major Arteries / Primary Nullahs | Major roads, flyovers, main natural drains | 1339 / mayor@kmc.gos.pk | SLGA 2021 / 2013 Sched. IV |
| **TMCs (25 Towns)** | Outside Cantonments; Local streets (<60ft) & branch drains | Residential street potholes, streetlights, local drains | Respective Town Office | SLGA 2021 / 2013 Sec. 54 |

---

## 3. Core Functional Modules (MVP Scope)

### M1: Multimodal Intake & Authentication
- **User Validation:** CNIC format validation (`XXXXX-XXXXXXX-X`) + mobile number candidate key on signup.
- **Multimodal Parser:** Accepts JPEG/PNG photos, audio voice notes (Whisper transcription), or text (English, Urdu, Roman Urdu).
- **Extraction Schema:** Outputs normalized JSON with `issue_category`, `severity_level` (P0–P4), `landmark_entities`, and `visual_evidence_summary`.

### M2: Deterministic Spatial Routing
- Fast point-in-polygon resolution for Cantonment boundaries.
- Polyline buffer calculation (25m threshold) for KMC 26 major arterial corridors.
- Default fallback to administrative TMC polygon.

### M3: Spatiotemporal Incident Deduplication
- **Clustering Rule:** Distance $\le 50\text{m}$ (Haversine) + Window $\le 72\text{h}$ + Identical `issue_category`.
- **Action:** Increments community witness count on the existing Master Incident instead of creating a duplicate; attaches additional photo proof to the dossier.

### M4: Statutory Complaint Generator (Dual-Language)
- Synthesizes ready-to-dispatch administrative complaint dossiers in **Bureaucratic English** and **Formal Urdu**.
- Automatically inserts tracking ID (`KHI-CIVIC-XXXXX`), GPS coordinates, landmark reference, community verification count, and statutory legal citations (SLGA, KW&SC Act, Articles 9 & 14).

### M5: KW&SC Water Tanker Fair-Price Calculator
- Ingests user's location and desired volume (1,000 / 2,000 / 3,000 Gallons).
- Computes road/haversine distance to nearest official KW&SC hydrant (Safoora, NIPA, Sakhi Hassan, Clifton, Crush Plant, etc.).
- Formula: $\text{Official Rate} = \text{Base Tier} + (\text{Distance km} \times \text{Transit Multiplier})$.
- Flags private market quote as "Fair" vs "Price Gouging" and provides direct KW&SC OTS 1334 helpline booking link.

---

## 4. Alignment with Base Architecture

- **Main Service (Django):** Manages `User` (CNIC, phone), stores `Incidents`, `Dossiers`, and GeoJSON data. Enqueues processing jobs to Redis.
- **AI Worker Pool:** Consumes `ai_queue`, runs Whisper transcription, LangGraph extraction with Prompt Shield security gates, and outputs validated structured JSON.
- **Background Worker:** Consumes `tasks_queue` for PDF dossier generation, deduplication clustering, and outbound notification dispatches.
- **WhatsApp Service:** Inbound audio/image metadata received via webhook; outbound complaints and updates dispatched directly via shared client.
- **Frontend (React/Vite):** Clean responsive web app for mobile/desktop citizen reporting, tanker price lookup, and complaint dossier tracking.