# Component Design Specification (Contract & Interfaces)

**Project:** CWA Ship Karachi 2026 — Production-Grade AI Product  
**Status:** Phase 3 Output (Component Design)  
**References:** [`docs/srs.md`](srs.md) | [`docs/architecture.md`](architecture.md)

---

## 1. Main Service API Contract

### 1.1 Authentication & Profile (`/auth/*`)
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
        "cnic": "42101-1234567-1",
        "full_name": "Muhammad Ali",
        "primary_phone": "+923001234567",
        "token": "jwt_token_string"
      }
    }
    ```

- **`POST /auth/link-phone`**
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:** `{"secondary_phone": "+923129876543"}`
  - **Response (200 OK):** `{"status": "success", "message": "Secondary phone linked successfully"}`

### 1.2 Citizen Reports API (`/api/reports/*`)
- **`POST /api/reports/submit`**
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:**
    ```json
    {
      "image_url": "https://storage.karachi-civic.pk/media/img_102.jpg",
      "audio_url": null,
      "text": "hamare block 4 me gutter ubal raha hai aur pani gharon me ja raha hai",
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
      "message": "Report enqueued for AI classification and review preparation"
    }
    ```

- **`POST /api/reports/confirm`**
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:**
    ```json
    {
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

- **`GET /api/reports/status/{tracking_id}`**
  - **Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "tracking_id": "KHI-CIVIC-90214",
        "target_authority": "KWSC",
        "issue_category": "Sewerage",
        "official_status": "IN_PROGRESS",
        "community_reports_count": 4,
        "landmark": "Near Disco Bakery, Gulshan-e-Iqbal",
        "queued_at": "2026-09-12T12:00:00Z"
      }
    }
    ```

### 1.3 WhatsApp Inbound Webhook (`/api/whatsapp/inbound`)
- **`POST /api/whatsapp/inbound`**
  - **Request Payload:**
    ```json
    {
      "sender_phone": "+923001234567",
      "message_type": "text | audio | image | location",
      "text": "pothole on university road near NED",
      "media_url": null,
      "location": {
        "lat": 24.9312,
        "lng": 67.1123
      }
    }
    ```
  - **Response (200 OK):** `{"status": "received"}`

### 1.4 Internal AI Worker API (`/api/internal/*`)
- **`GET /api/internal/ai-config`**
  - Delivers prompt versions, active model tiers, and spatial GeoJSON layers.
- **`POST /api/internal/worker-callback`**
  - **Payload:**
    ```json
    {
      "job_id": "job_882910fa",
      "incident_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
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
        "layman_summary": "We detected an acute sewage overflow in Gulshan Block 4 under KW&SC jurisdiction.",
        "subject_en": "URGENT GRIEVANCE: RAW SEWAGE OVERFLOW AT GULSHAN BLOCK 4",
        "body_en": "Formal legal complaint body citing KW&SC Act 2023 and Articles 9 & 14...",
        "body_ur": "مجاز اتھارٹی کراچی واٹر اینڈ سیوریج کارپوریشن برائے فوری کارروائی..."
      }
    }
    ```

---

## 2. AI Worker Queue Payload & State Graph

### 2.1 Redis Queue Item (`ai_queue`)
```json
{
  "job_id": "job_882910fa",
  "citizen_cnic": "42101-1234567-1",
  "phone": "+923001234567",
  "source": "whatsapp | web",
  "payload": {
    "image_url": "https://storage.karachi-civic.pk/media/img_102.jpg",
    "audio_url": null,
    "text": "hamare block 4 me gutter ubal raha hai",
    "lat": 24.9180,
    "lng": 67.0971,
    "landmark": "Near Disco Bakery, Gulshan-e-Iqbal"
  }
}
```

### 2.2 LangGraph Node Responsibilities
1. `security_input_node`: Prompt Shield input gate.
2. `gemini_multimodal_classifier`: Evaluates image, audio, or text to extract category, severity, visual proof description, and landmark.
3. `jurisdiction_router_node`: Resolves Cantonment $\rightarrow$ KMC major corridor $\rightarrow$ utility agency.
4. `deduplication_node`: Matches against open incidents in $50\text{m}$ / $72\text{h}$.
5. `dossier_generator_node`: Generates conversational citizen summary + formal EN/UR complaint texts.
6. `security_output_node`: Prompt Shield output gate validating the generated content.
7. `dispatch_review_node`: Posts message to WhatsApp `POST /whatsapp/send` or returns to web client.
