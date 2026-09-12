# Component Design Specification (Contract & Interfaces)

**Project:** CWA Ship Karachi 2026 — Production-Grade AI Product  
**Status:** Phase 3 Output (Component Design Finalized)  
**References:** [`docs/srs.md`](srs.md) | [`docs/architecture.md`](architecture.md)

---

## 1. Main Service API Contract

### 1.1 Authentication & Role-Based Profile (`/auth/*`)
All authentication endpoints return the authenticated user's explicit **`role`**, **`assigned_org`**, and redirect route (`dashboard_route`) so the React frontend can immediately route users to their role-specific view.

- **`POST /auth/register`**
  - **Request Body:**
    ```json
    {
      "cnic": "42101-1234567-1",
      "full_name": "Muhammad Ali",
      "primary_phone": "+923001234567",
      "password": "securepassword123"
    }
    ```
  - **Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
        "cnic": "42101-1234567-1",
        "full_name": "Muhammad Ali",
        "primary_phone": "+923001234567",
        "role": "CITIZEN",
        "assigned_org": null,
        "dashboard_route": "/citizen/portal",
        "token": "jwt_token_string"
      }
    }
    ```

- **`POST /auth/login`**
  - **Request Body:**
    ```json
    {
      "identifier": "42101-1234567-1",
      "password": "securepassword123"
    }
    ```
  - **Response (200 OK) — Citizen:**
    ```json
    {
      "status": "success",
      "data": {
        "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
        "cnic": "42101-1234567-1",
        "full_name": "Muhammad Ali",
        "role": "CITIZEN",
        "assigned_org": null,
        "dashboard_route": "/citizen/portal",
        "token": "jwt_token_string"
      }
    }
    ```
  - **Response (200 OK) — Government Official (e.g. KW&SC):**
    ```json
    {
      "status": "success",
      "data": {
        "user_id": "usr_a14b98c2-3e4f-4d99-90b1-1234567890ab",
        "cnic": "42201-9876543-3",
        "full_name": "Engr. Tariq Aziz",
        "role": "GOVT_OFFICIAL",
        "assigned_org": "KWSC",
        "dashboard_route": "/admin/dashboard",
        "token": "jwt_token_string"
      }
    }
    ```
  - **Response (200 OK) — Super Admin:**
    ```json
    {
      "status": "success",
      "data": {
        "user_id": "usr_00000000-0000-0000-0000-000000000001",
        "cnic": "42000-0000000-0",
        "full_name": "System Administrator",
        "role": "SUPER_ADMIN",
        "assigned_org": null,
        "dashboard_route": "/admin/super",
        "token": "jwt_token_string"
      }
    }
    ```

- **`POST /auth/link-phone`**
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:** `{"secondary_phone": "+923129876543"}`
  - **Response (200 OK):** `{"status": "success", "message": "Secondary phone linked successfully"}`

---

### 1.2 Citizen Reports API (`/api/reports/*`)
- **`POST /api/reports/submit`** (Web Intake with User Identification)
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:**
    ```json
    {
      "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
      "text": "hamare block 4 me gutter ubal raha hai aur pani gharon me ja raha hai",
      "image_url": "https://storage.karachi-civic.pk/media/img_102.jpg",
      "audio_url": null,
      "lat": 24.9180,
      "lng": 67.0971,
      "landmark": "Near Disco Bakery, Gulshan-e-Iqbal"
    }
    ```
  - **Response (202 Accepted):**
    ```json
    {
      "status": "success",
      "job_id": "job_882910fa",
      "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
      "message": "Report registered in buffer and enqueued for AI processing"
    }
    ```

- **`GET /api/reports/review/{job_id}`** (Poll for Review Package on Web)
  - **Headers:** `Authorization: Bearer <token>`
  - **Response (200 OK):**
    ```json
    {
      "status": "READY_FOR_REVIEW",
      "job_id": "job_882910fa",
      "incident_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "layman_summary": "We identified a severe sewage overflow in Gulshan Block 4 under KW&SC jurisdiction.",
      "draft_complaint": {
        "target_authority": "KWSC",
        "subject_en": "URGENT GRIEVANCE: RAW SEWAGE OVERFLOW AT GULSHAN BLOCK 4",
        "body_en": "Formal complaint text citing KW&SC Act 2023 and Articles 9 & 14...",
        "body_ur": "مجاز اتھارٹی کراچی واٹر اینڈ سیوریج کارپوریشن برائے فوری کارروائی..."
      }
    }
    ```

- **`POST /api/reports/confirm`** (Human-in-the-Loop Confirmation/Edits)
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:**
    ```json
    {
      "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
      "job_id": "job_882910fa",
      "incident_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "action": "SUBMIT",
      "feedback_text": null
    }
    ```
  - **Response (200 OK):**
    ```json
    {
      "status": "success",
      "tracking_id": "KHI-CIVIC-90214",
      "target_authority": "KWSC",
      "official_status": "PENDING"
    }
    ```

- **`GET /api/reports/my-complaints`** (Citizen Personal Filing History)
  - **Headers:** `Authorization: Bearer <citizen_token>`
  - **Response (200 OK):**
    ```json
    {
      "status": "success",
      "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
      "complaints": [
        {
          "tracking_id": "KHI-CIVIC-90214",
          "issue_category": "Sewerage",
          "target_authority": "KWSC",
          "official_status": "IN_PROGRESS",
          "landmark": "Near Disco Bakery, Gulshan-e-Iqbal",
          "community_reports_count": 4,
          "created_at": "2026-09-12T12:00:00Z"
        }
      ]
    }
    ```

---

### 1.3 Role-Based Government Dashboard APIs (`/api/admin/dashboard/*`)
These endpoints power the React Government Admin Dashboard and enforce strict RBAC filters based on the authenticated official's role and `assigned_org`.

- **`GET /api/admin/dashboard/overview`** (Department KPI Metrics)
  - **Headers:** `Authorization: Bearer <official_token>`
  - **Response (200 OK):**
    ```json
    {
      "status": "success",
      "role": "GOVT_OFFICIAL",
      "organization": "KWSC",
      "metrics": {
        "total_active_clusters": 18,
        "pending_complaints": 12,
        "in_progress": 5,
        "resolved_today": 1,
        "critical_p0_count": 4
      }
    }
    ```

- **`GET /api/admin/dashboard/complaints`** (Scoped Complaints Feed)
  - **Headers:** `Authorization: Bearer <official_token>`
  - **Query Params:** `?status=PENDING&severity=P0&page=1`
  - **Access Control:**
    - `KWSC_Officers` $\rightarrow$ returns only KW&SC water/sewerage complaints.
    - `KMC_Officers` $\rightarrow$ returns only KMC road & major drainage complaints.
    - `SSWMB_Officers` $\rightarrow$ returns only SSWMB solid waste complaints.
    - `Cantonment_Officers` $\rightarrow$ returns only Cantonment Board complaints.
  - **Response (200 OK):**
    ```json
    {
      "status": "success",
      "organization": "KWSC",
      "results": [
        {
          "master_incident_id": "a3f81e2b-1c4a-4b92-8012-76fa91b01c34",
          "tracking_id": "KHI-CIVIC-90214",
          "issue_category": "Sewerage",
          "severity": "P0",
          "community_reports_count": 4,
          "landmark": "Near Disco Bakery, Gulshan-e-Iqbal",
          "coordinates": { "lat": 24.9180, "lng": 67.0971 },
          "evidence_photos": [
            "https://storage.karachi-civic.pk/media/img_102.jpg",
            "https://storage.karachi-civic.pk/media/img_105.jpg"
          ],
          "official_status": "PENDING",
          "first_reported_at": "2026-09-12T10:15:00Z",
          "last_reported_at": "2026-09-12T12:00:00Z"
        }
      ]
    }
    ```

- **`GET /api/admin/dashboard/complaints/{id}`** (Detailed Incident Dossier View)
  - **Headers:** `Authorization: Bearer <official_token>`
  - **Response (200 OK):**
    ```json
    {
      "status": "success",
      "dossier": {
        "master_incident_id": "a3f81e2b-1c4a-4b92-8012-76fa91b01c34",
        "tracking_id": "KHI-CIVIC-90214",
        "target_authority": "KWSC",
        "statutory_citations": "KW&SC Act 2023 (Sec. 24); Constitution of Pakistan Arts. 9 & 14",
        "subject_en": "URGENT GRIEVANCE: RAW SEWAGE OVERFLOW AT GULSHAN BLOCK 4",
        "body_en": "Formal legal complaint dossier content...",
        "body_ur": "بخدمت جناب چیف انجینئر سیوریج، کراچی واٹر اینڈ سیوریج کارپوریشن...",
        "official_status": "PENDING",
        "reporting_citizens_count": 4,
        "co_reporting_users": [
          { "user_id": "usr_c83f12a9", "cnic": "42101-*******-1", "phone": "+92300****567" }
        ],
        "all_evidence": [
          { "url": "https://storage.karachi-civic.pk/media/img_102.jpg", "type": "image" }
        ]
      }
    }
    ```

- **`PATCH /api/admin/dashboard/complaints/{id}/status`** (Official Status Transition)
  - **Headers:** `Authorization: Bearer <official_token>`
  - **Request Body:**
    ```json
    {
      "official_status": "IN_PROGRESS",
      "official_notes": "Maintenance crew dispatched from Gulshan Sub-division"
    }
    ```
  - **Response (200 OK):** `{"status": "success", "new_status": "IN_PROGRESS"}`

- **`GET /api/admin/super/overview`** (Super Admin City-Wide Platform Overview)
  - **Headers:** `Authorization: Bearer <super_admin_token>`
  - **Response (200 OK):**
    ```json
    {
      "status": "success",
      "city_overview": {
        "KWSC": { "active_clusters": 18, "resolved": 4 },
        "KMC": { "active_clusters": 9, "resolved": 2 },
        "SSWMB": { "active_clusters": 14, "resolved": 6 },
        "CANTONMENT": { "active_clusters": 5, "resolved": 3 }
      },
      "system_health": {
        "redis_queue_depth": 2,
        "active_ai_workers": 3,
        "worker_heartbeat": "HEALTHY"
      }
    }
    ```

---

### 1.4 WhatsApp Inbound Webhook (`/api/whatsapp/inbound`)
- **`POST /api/whatsapp/inbound`**
  - **Request Payload:**
    ```json
    {
      "sender_phone": "+923001234567",
      "message_type": "text | audio | image | location",
      "text": "hamare block me gutter ubal raha hai",
      "media_url": "https://whatsapp-media-store.internal/audio_8829.ogg",
      "location": {
        "lat": 24.9180,
        "lng": 67.0971
      }
    }
    ```
  - **Behavior:** Resolves phone to `CitizenProfile`/`user_id`, stores the payload in Main Service database buffer, and enqueues `{job_id}` to Redis `ai_queue`.
  - **Response (200 OK):** `{"status": "received", "job_id": "job_99182a"}`

---

### 1.5 Dedicated Internal APIs for AI Worker (`/api/internal/*`)
To keep the AI Worker decoupled from PostgreSQL, Main Service provides separate, dedicated endpoints for each specific data requirement:

- **`GET /api/internal/jobs/{job_id}`** (Retrieve Batch Data for Inference)
  - **Response (200 OK):**
    ```json
    {
      "job_id": "job_882910fa",
      "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
      "citizen_cnic": "42101-1234567-1",
      "phone": "+923001234567",
      "source": "web",
      "text": "hamare block 4 me gutter ubal raha hai aur pani gharon me ja raha hai",
      "image_url": "https://storage.karachi-civic.pk/media/img_102.jpg",
      "audio_url": null,
      "location": {
        "lat": 24.9180,
        "lng": 67.0971
      },
      "landmark_hint": "Near Disco Bakery, Gulshan-e-Iqbal"
    }
    ```

- **`GET /api/internal/spatial-boundaries`** (Retrieve GeoJSON Layers)
  - Delivers geo-polygons for Cantonment boards, KMC 26 major corridors, and municipal boundaries.
  - Cached locally in worker memory for fast point-in-polygon checks.

- **`GET /api/internal/active-incidents`** (Deduplication Candidate Search)
  - **Query Params:** `?category=Sewerage&lat=24.9180&lng=67.0971&radius_m=50`
  - Returns open incidents in the vicinity logged within the last 72 hours so the worker can link them to an existing `MasterIncident`.

- **`GET /api/internal/ai-config`** (Prompts & Model Tier Config)
  - Returns active prompt templates, fallback order, and temperature settings managed via Django Admin.

- **`POST /api/internal/worker-callback`** (Persist Inference & Review Package)
  - **Request Payload:**
    ```json
    {
      "job_id": "job_882910fa",
      "user_id": "usr_c83f12a9-91bc-4e20-80d1-0f4b360172e1",
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
        "layman_summary": "We identified an acute sewage overflow in Gulshan Block 4 under KW&SC jurisdiction.",
        "subject_en": "URGENT GRIEVANCE: RAW SEWAGE OVERFLOW AT GULSHAN BLOCK 4",
        "body_en": "Formal legal complaint body citing KW&SC Act 2023 and Articles 9 & 14...",
        "body_ur": "مجاز اتھارٹی کراچی واٹر اینڈ سیوریج کارپوریشن برائے فوری کارروائی..."
      }
    }
    ```

---

## 2. Redis Queue Contract (`ai_queue`)

Only the lightweight job identifier is enqueued into Redis:

```json
{
  "job_id": "job_882910fa",
  "created_at": "2026-09-12T12:40:00Z"
}
```

The AI Worker reads `job_id`, calls `GET /api/internal/jobs/{job_id}` on Main Service, retrieves spatial boundaries/active incidents from the respective internal endpoints, and then completes the pipeline.

---

## 3. LangGraph State & Node Pipeline

1. **`security_input_node`**: Prompt Shield Gate 1 scanning user prompts for injection/jailbreaks.
2. **`fetch_job_batch_node`**: Invokes `GET /api/internal/jobs/{job_id}`.
3. **`gemini_multimodal_classifier`**: Unified Gemini call processing audio, photo, and text to extract category, severity, and landmark.
4. **`fetch_spatial_rules_node`**: Invokes `GET /api/internal/spatial-boundaries` (cached).
5. **`jurisdiction_router_node`**: Two-stage routing (Cantonment $\rightarrow$ KMC arterial roads $\rightarrow$ Utility).
6. **`check_deduplication_node`**: Invokes `GET /api/internal/active-incidents` to match against open incidents within $50\text{m}$ and $72\text{h}$.
7. **`dossier_generator_node`**: Generates citizen layman summary + statutory EN/UR complaint draft.
8. **`security_output_node`**: Prompt Shield Gate 2 scanning outbound text.
9. **`dispatch_review_node`**:
   - If WhatsApp: sends message via WhatsApp Service `POST /whatsapp/send`.
   - If Web: posts review package to Main Service via `POST /api/internal/worker-callback`.
