# Karachi Civic AI Engine (CWA 2026)

## 1. What It Is
The Karachi Civic AI Engine is an automated civic grievance intake, spatial routing, and statutory legal dispatch platform designed for the citizens and administrative agencies of Karachi, Pakistan. Citizens report infrastructure hazards—such as overflowing sewage, water leaks, major arterial road damage, and uncollected municipal waste—via WhatsApp or a web portal in Urdu, Roman Urdu, or English. The platform utilizes multimodal vision-language intelligence, two-stage administrative boundary routing (resolving overlaps across KW&SC, KMC, SSWMB, and 6 Cantonment boards), and constitutional statutory enforcement to automatically generate formal legal dossiers and route grievances to the correct municipal authority within seconds.

---

## 2. How to Run It

### Quickstart (Development & Evaluation)
Clone the repository and spin up all 6 microservices with Docker Compose:

`ash
# 1. Clone the repository
git clone https://github.com/KaaifAhmed/team-venus.git
cd team-venus

# 2. Setup environment file
cp .env.example .env

# 3. Start the system (Postgres, Redis, Django API, AI Worker, WhatsApp, Frontend)
docker compose up -d --build
`

### Production Deployment
For cloud production environments (AWS, GCP, DigitalOcean, Hetzner), run the production compose manifest:

`ash
# Start with production workers, asset collection, and auto-restart policies
docker compose -f compose.prod.yaml up -d --build
`

### Service Endpoints
- **Citizen & Official Web Portal**: [http://localhost:5173](http://localhost:5173)
- **Django Core REST API**: [http://localhost:8000](http://localhost:8000)
- **API Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Django Administration**: [http://localhost:8000/admin/](http://localhost:8000/admin/)
- **WhatsApp Gateway (QR Pairing)**: [http://localhost:3000](http://localhost:3000)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 3. Configuration & API Keys

Environment variables are managed in .env at the repository root:

| Variable | Description | Required | Default / Example |
| :--- | :--- | :--- | :--- |
| GEMINI_API_KEY | Google Gemini API key for multimodal vision & Urdu parsing | **Optional** | AIzaSy... (offline heuristic fallback active if blank) |
| GEMINI_MODEL | Gemini Model identifier | Optional | gemini/gemini-2.5-flash |
| DJANGO_SECRET_KEY | Cryptographic secret for JWT signing and session security | Production | change-me-in-production-long-random-string |
| DEBUG | Django debug mode toggle | Production | False (in production), True (dev) |
| ALLOWED_HOSTS | Comma-separated hostnames/IPs | Production | * or civic.karachi.gov.pk,api.karachi.gov.pk |
| CORS_ALLOWED_ORIGINS| Allowed frontend origins | Production | http://localhost:5173,https://civic.karachi.gov.pk |
| POSTGRES_DB | PostgreSQL database name | Optional | main_db |
| POSTGRES_USER | PostgreSQL user | Optional | postgres |
| POSTGRES_PASSWORD | PostgreSQL password | Optional | postgres |
| REDIS_URL | Redis broker connection URL | Optional | edis://redis_server:6379/0 |

> [!NOTE]
> **Offline Resilience:** The AI Worker features a deterministic rule-based perception and routing fallback. If GEMINI_API_KEY is omitted or rate-limited, all core classification, two-stage spatial routing, and statutory dossier generation remain fully operational.

---

## 4. How It Works

For detailed technical specifications, refer to [Architecture Specification](docs/architecture.md) and [System Requirements Specification](docs/srs.md).

`mermaid
graph TD
    A[Citizen WhatsApp / Web Portal] -->|Multimodal Input: Text / Photo / Audio / GPS| B[Main Service Buffer]
    B -->|Enqueue Job ID| C[(Redis ai_queue)]
    C -->|Dequeue| D[AI Worker Pipeline]
    D -->|Gate 1: Adversarial Prompt Shield| D1[Security Guard]
    D1 -->|Multimodal Gemini 2.5 Flash / Fallback| D2[Category & Severity Classifier]
    D2 -->|Stage 1: Cantonments | Stage 2: KMC Arterials | Stage 3: Utilities| D3[Jurisdiction Router]
    D3 -->|Spatial Deduplication / 50m Radius| D4[Cluster Matcher]
    D4 -->|Citizen Layman Summary + Statutory Legal Notice| D5[Dossier Generator]
    D5 -->|POST /api/internal/worker-callback| B
    B -->|Verified Tracking ID| A
    B -->|Isolated Departmental RBAC Feed| E[Official Dashboard / Super Admin HQ]
`

### Jurisdiction Matrix
1. **Cantonments (6 Boards)**: Clifton (CBC/DHA), Karachi (KCB), Faisal, Malir, Korangi Creek, Manora.
2. **KMC (26 Major Arterials)**: Shahrah-e-Faisal, University Road, M.A. Jinnah Road, Rashid Minhas Road, etc.
3. **Provincial Utilities**:
   - Sewerage & Potable Water $\rightarrow$ **KW&SC** (*KW&SC Act 2023 Sec. 24*)
   - Solid Waste & Garbage $\rightarrow$ **SSWMB** (*Sindh Solid Waste Management Board Act 2021*)
   - Major Arterial Roads & Drainage $\rightarrow$ **KMC** (*Sindh Local Government Act 2021*)

---

## 5. Demo Walkthrough

The application comes pre-seeded with 4 demo personas accessible via quick-switch chips on the Login screen ([http://localhost:5173/login](http://localhost:5173/login)):

1. **Citizen Submission (Intake)**:
   - Log in using the **Citizen Demo** button (CNIC: 42101-1234567-1, Password: password123).
   - Enter a grievance in Roman Urdu (e.g., *\"Shahrah-e-Faisal par sewage ka pani jamah hai, traffic ruk raha hai\"*), attach an optional photo, click **Get Current Location**, and press **Submit Civic Grievance**.
   - Review the AI-generated conversational Layman Summary and bilingual Statutory Notice.
   - Click **Confirm & Dispatch** to generate verified tracking ID KHI-CIVIC-XXXXX.

2. **Official Scoped Triage**:
   - Log out and click **KW&SC Official** (CNIC: 42201-1111111-1, Password: password123).
   - Observe that only KW&SC sewerage/water grievances appear in the feed.
   - Click **View Dossier** to inspect the formal legal notice citing *KW&SC Act 2023 Section 24* and update status from PENDING to IN PROGRESS.

3. **Inter-Agency Tenant Isolation**:
   - Switch to **KMC Official** (CNIC: 42201-2222222-2, Password: password123).
   - Confirm that KW&SC complaints are strictly isolated and invisible to KMC staff (HTTP 403 / 0 results).

4. **Super Administrator Command Overview**:
   - Log in as **Super Admin** (CNIC: 42000-0000000-0, Password: password123).
   - View real-time aggregated metrics across KW&SC, KMC, SSWMB, and Cantonments, alongside Redis queue health.

---

## 6. Out of Scope / Deliberate Constraints

To ensure reliability, speed, and focus within hackathon parameters:
1. **SMS OTP Gateway**: Phone number authentication uses CNIC and linked numbers rather than paid SMS OTP aggregators.
2. **Third-Party Contractor Dispatch**: The system assigns grievances directly to jurisdictional government departments; sub-tier private contractor field assignment is deferred to agency-internal ERPs.
3. **Automated Payment/Fines**: The engine focuses strictly on grievance redressal and statutory accountability, not municipal tax collection or penalty enforcement.
