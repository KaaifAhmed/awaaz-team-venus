# Component Implementation Specification: React Frontend Single Page Application

**Project:** CWA Ship Karachi 2026 — Karachi Civic AI Engine  
**Component:** Frontend (`frontend/`)  
**Target Port:** `http://localhost:5173` (Vite Dev Server)  
**Framework:** React 19 + TypeScript + Vite + Tailwind CSS  
**Backend Origin:** `http://localhost:8000` (Main Service)

---

## 1. Architectural Role & Responsibilities

The React frontend delivers a clean, responsive, accessible civic interface:
1. **Strict Role-Based Routing:** Upon login, the user's role and assigned department automatically determine their destination:
   - `CITIZEN` $\rightarrow$ `/citizen/portal`
   - `GOVT_OFFICIAL` $\rightarrow$ `/admin/dashboard` (scoped strictly to KW&SC, KMC, SSWMB, or Cantonment)
   - `SUPER_ADMIN` $\rightarrow$ `/admin/super` (city-wide intelligence and health overview)
2. **Citizen Grievance Lifecycle:**
   - Multimodal intake (photos, audio voice notes, English/Urdu/Roman Urdu text).
   - Optional GPS location detect or manual landmark input.
   - Interactive Human-in-the-Loop review: Displays AI-generated **Layman Summary** in plain Urdu/English before formal filing.
   - Tracking dashboard ("My Grievances") with real-time status badges and community counters.
3. **Government Official Operational Command:**
   - Scoped strictly to the authenticated official's department.
   - Real-time KPI cards (active clusters, pending, in progress, resolved today, P0 emergency).
   - Detailed Incident Dossier view: High-res evidence photo viewer, bilingual statutory drafts (formal English complaint / Urdu statutory notice), citations reference, and status transition actions with dispatch notes.
4. **Design System:** Material Design 3 (MD3) structural foundation, 4px spacing scale, semantic color slots, high-contrast civic trust palette (Karachi Civic Green `#0F5132`, Amber `#B45309`, Crimson `#B91C1C`).

```mermaid
flowchart TD
    User([User arrives at /login]) --> AuthForm{Authenticate}
    AuthForm -->|Role: CITIZEN| CitizenPortal[/citizen/portal]
    AuthForm -->|Role: GOVT_OFFICIAL| GovtDashboard[/admin/dashboard]
    AuthForm -->|Role: SUPER_ADMIN| SuperDashboard[/admin/super]
    
    subgraph Citizen Flow
        CitizenPortal --> Intake[Multimodal File/Audio/Text Intake]
        Intake --> Submit[POST /api/reports/submit]
        Submit --> Polling[Poll GET /api/reports/review/job_id]
        Polling --> ReviewModal[Interactive Review Modal: Layman Summary]
        ReviewModal --> Confirm[POST /api/reports/confirm]
        Confirm --> Tracking[Tracking ID: KHI-CIVIC-XXXXX]
    end

    subgraph Government Official Flow
        GovtDashboard --> DeptFeed[Filtered Complaints Table]
        DeptFeed --> Dossier[Inspect Dossier Modal: Photos, Legal Draft, Citations]
        Dossier --> StatusUpdate[PATCH /api/admin/dashboard/complaints/id/status]
    end
```

---

## 2. Design System & Styling Tokens

Adhere strictly to [`frontend/Team Venus — UI Style Guide.md`](file:///c:/Users/kaaif/Documents/Github/team-venus/frontend/Team%20Venus%20%E2%80%94%20UI%20Style%20Guide.md):

### 2.1 Spacing & Typography
- **4px Spacing Scale:** `4`, `8`, `12`, `16`, `24`, `32`, `48`, `64` px (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `p-8`, `p-12`, `p-16`).
- **Typography Scale:**
  - `Display`: 32px / Bold (`text-3xl font-bold tracking-tight`)
  - `Headline`: 24px / SemiBold (`text-2xl font-semibold`)
  - `Title`: 18px / Medium (`text-lg font-medium`)
  - `Body`: 14px-16px / Regular (`text-sm` / `text-base text-slate-700`)
  - `Label`: 12px / Medium (`text-xs font-medium uppercase tracking-wider text-slate-500`)

### 2.2 Semantic Color Roles
- `primary`: `#0F5132` (Civic Deep Green) / Hover: `#0B3D26`
- `primary-container`: `#D1E7DD` / On-primary: `#FFFFFF`
- `secondary`: `#0284C7` (Sky Blue)
- `surface`: `#FFFFFF` / `background`: `#F8FAFC` (Slate 50)
- `surface-variant`: `#F1F5F9` (Slate 100) / `border`: `#E2E8F0` (Slate 200)
- `error`: `#B91C1C` (Red 700) / `error-container`: `#FEE2E2`
- `warning`: `#B45309` (Amber 700) / `warning-container`: `#FEF3C7`
- `success`: `#15803D` (Green 700) / `success-container`: `#DCFCE7`

### 2.3 Prohibited Patterns
- ❌ No background gradients or decorative visual noise.
- ❌ No animations longer than 200ms.
- ❌ No skeuomorphism or heavy box-shadows (use subtle borders `border border-slate-200` and `shadow-sm`).
- ❌ No more than two active accent colors visible simultaneously.

---

## 3. Application State & Storage Contracts

Store session state in `localStorage`:
- `authToken`: JWT Access token string.
- `currentUser`:
  ```typescript
  interface CurrentUser {
    userId: string;
    cnic: string;
    fullName: string;
    role: "CITIZEN" | "GOVT_OFFICIAL" | "SUPER_ADMIN" | "AI_AGENT";
    assignedOrg: "KWSC" | "KMC" | "SSWMB" | "CANTONMENT" | null;
    dashboardRoute: string;
  }
  ```

### Standard Response Envelope Unwrapping
All backend responses use the standard envelope:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}
```
The API client must unwrap `response.data.data` on `success: true` or throw an error with `response.data.error.message`.

---

## 4. Complete Screen Specifications

### 4.1 Authentication Page (`/login`)
- **Visual Design:** Centered clean card with Karachi Civic AI Engine crest/badge.
- **Tabs:**
  - **Citizen Login:** CNIC field with auto-formatting (`42XXX-XXXXXXX-X`) or phone number, password, and link to Register.
  - **Official Login:** Government ID / CNIC, Password, and department selector hint.
- **Demo Quick-Fill Buttons:**
  - *Citizen Demo* (`42101-1234567-1` / `password123`)
  - *KW&SC Official* (`42201-1111111-1` / `password123`)
  - *KMC Official* (`42201-2222222-2` / `password123`)
  - *Super Admin* (`42000-0000000-0` / `password123`)
- **Redirect Logic:** Reads `dashboard_route` from login response and executes `navigate(dashboardRoute)`.

### 4.2 Citizen Grievance Portal (`/citizen/portal`)

#### A. Intake Form (`GrievanceIntakeCard`)
1. **Complaint Text Box:**
   - Large textarea with multilingual placeholder: *"Describe the issue (English, Urdu, or Roman Urdu) e.g., Gulshan Block 4 me sewer line band hai..."*
2. **Multimodal Media Uploader:**
   - Drag-and-drop photo uploader with thumbnail preview and remove button.
   - Audio Voice Note: Record button using browser MediaRecorder API (or audio file selector) with waveform indicator and playback preview.
3. **Location Selector:**
   - Button: *"📍 Use Current GPS Location"* (retrieves `navigator.geolocation` coordinates).
   - Landmark Text Input: *"Nearby Landmark (e.g., Near Disco Bakery, Main University Road)"*.
4. **Submit Button:**
   - Shows spinner: *"Analyzing Grievance with Civic AI..."* during upload.

#### B. Polling & Review Modal (`HumanInTheLoopReviewModal`)
1. Polls `GET /api/reports/review/{job_id}` every 1.5 seconds until `status == "READY_FOR_REVIEW"`.
2. **Review Dialog (Layman Summary First):**
   - **Target Authority Badge:** e.g., `KW&SC (Water & Sewerage)` or `KMC (Roads & Drainage)`.
   - **Severity Badge:** `P0 Critical` (Red) or `P1 Major` (Amber).
   - **Citizen Layman Summary (Boxed Callout):**
     > *"We identified an acute sewage overflow in Gulshan Block 4 under KW&SC jurisdiction. Our legal engine has drafted formal citations under the KW&SC Act 2023."*
   - **Toggle: "View Statutory Legal Draft":** Expands formal complaint text in English and Urdu.
   - **Actions:**
     - Primary Button: *"Confirm & File Grievance"* $\rightarrow$ calls `POST /api/reports/confirm`.
     - Secondary Button: *"Make Changes"* $\rightarrow$ returns to editor with feedback.
3. **Success State:**
   - Displays prominent tracking badge: `KHI-CIVIC-90214`.
   - Copy tracking ID button.
   - Automatically adds the new incident to "My Grievances".

#### C. My Grievances Tracker (`CitizenHistoryTable`)
- Fetches `GET /api/reports/my-complaints`.
- Displays cards / table with:
  - Tracking ID (`KHI-CIVIC-90214`)
  - Category (`Sewerage`) & Authority (`KW&SC`)
  - Landmark location
  - Community Report Count Badge (`👥 4 Citizens Affected`)
  - Official Status Badge:
    - `PENDING` (Amber)
    - `IN_PROGRESS` (Blue)
    - `RESOLVED` (Green)
  - Date reported.

---

### 4.3 Government Official Dashboard (`/admin/dashboard`)

#### A. Scoped Header
- Prominently displays the official's name and department banner:
  - `KW&SC`: Karachi Water & Sewerage Corporation Portal
  - `KMC`: Karachi Metropolitan Corporation Portal
  - `SSWMB`: Sindh Solid Waste Management Board Portal
  - `CANTONMENT`: Cantonment Boards Administration Portal

#### B. KPI Metrics Row
Four metric summary cards:
1. **Active Grievance Clusters** (Total un-resolved clusters)
2. **Pending Official Action** (Status: `PENDING`)
3. **Crews Dispatched / In Progress** (Status: `IN_PROGRESS`)
4. **Emergency P0 Hazards** (Severity: `P0`)

#### C. Scoped Complaints Feed Table
- Displays list from `GET /api/admin/dashboard/complaints`.
- Columns:
  - Tracking ID
  - Category & Severity Pill (`P0 - Hazard`, `P1 - Major`)
  - Landmark / Area
  - Community Reports Count (`4 reports stacked`)
  - Evidence Preview (Clickable thumbnail)
  - Status Pill (`PENDING`, `IN_PROGRESS`, `RESOLVED`)
  - Action: *"Open Dossier"* button.
- Filters: Status dropdown (`All`, `PENDING`, `IN_PROGRESS`, `RESOLVED`), Severity dropdown.

#### D. Incident Dossier Inspection Modal
- Triggered when clicking *"Open Dossier"*.
- **Left Column: Evidence & Community Impact:**
  - Photo Evidence carousel / grid.
  - Geo-coordinates and Landmark.
  - Co-reporting Citizens list (showing masked CNICs: `42101-*******-1`).
  - First reported and last updated timestamps.
- **Right Column: Statutory Complaint & Official Actions:**
  - Statutory Legal Citations Box (`KW&SC Act 2023 Sec. 24, Constitution Arts. 9 & 14`).
  - Bilingual Tabs:
    - **English Statutory Complaint:** Full formal legal text.
    - **Urdu Formal Notice:** Complete Urdu legal draft.
  - **Action Panel:**
    - Status Selector: `PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`.
    - Internal Dispatch / Official Notes: Textarea for field crew updates.
    - Button: *"Save Official Status Update"* $\rightarrow$ calls `PATCH /api/admin/dashboard/complaints/{id}/status`.

---

### 4.4 Super Admin City-Wide Overview (`/admin/super`)
- Displays city-wide matrix from `GET /api/admin/super/overview`:
  - Comparative cards for `KWSC`, `KMC`, `SSWMB`, `CANTONMENT` showing active vs resolved counts.
  - System Queue Health card: Redis Queue Depth, AI Worker status (`HEALTHY`), and live processing telemetry.

---

## 5. TypeScript API Client & Types

Implement in `src/api/client.ts` and `src/api/types.ts`:

```typescript
// src/api/types.ts

export type UserRole = "CITIZEN" | "GOVT_OFFICIAL" | "SUPER_ADMIN" | "AI_AGENT";
export type AuthorityOrg = "KWSC" | "KMC" | "SSWMB" | "CANTONMENT";
export type IncidentSeverity = "P0" | "P1" | "P2";
export type OfficialStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export interface AuthResponse {
  user_id: string;
  cnic: string;
  full_name: string;
  primary_phone?: string;
  role: UserRole;
  assigned_org: AuthorityOrg | null;
  dashboard_route: string;
  token: string;
}

export interface SubmitReportPayload {
  text: string;
  image?: File | null;
  audio?: Blob | File | null;
  lat?: number | null;
  lng?: number | null;
  landmark?: string;
}

export interface ReviewPackage {
  job_id: string;
  status: "PROCESSING" | "READY_FOR_REVIEW" | "FAILED";
  layman_summary?: string;
  target_authority?: AuthorityOrg;
  issue_category?: string;
  severity?: IncidentSeverity;
  draft_complaint?: {
    subject_en: string;
    body_en: string;
    body_ur: string;
  };
}

export interface ComplaintCard {
  master_incident_id: string;
  tracking_id: string;
  issue_category: string;
  severity: IncidentSeverity;
  community_reports_count: number;
  landmark: string;
  coordinates: { lat: number; lng: number };
  evidence_photos: string[];
  official_status: OfficialStatus;
  first_reported_at: string;
  last_reported_at: string;
}

export interface ComplaintDossier {
  master_incident_id: string;
  tracking_id: string;
  target_authority: AuthorityOrg;
  statutory_citations: string;
  subject_en: string;
  body_en: string;
  body_ur: string;
  official_status: OfficialStatus;
  official_notes: string;
  reporting_citizens_count: number;
  evidence_photos: string[];
}
```

---

## 6. Frontend File Structure & Implementation Plan

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios instance with JWT interceptor & unwrap logic
│   │   └── types.ts           # Shared TypeScript interfaces
│   ├── components/
│   │   ├── Navbar.tsx         # Responsive header with user badge & logout
│   │   ├── StatusBadge.tsx    # Severity (P0/P1) and Status (Pending/Done) pills
│   │   ├── ReviewModal.tsx    # Layman summary review & confirm dialog
│   │   └── DossierModal.tsx   # Detailed legal dossier & photo inspector
│   ├── pages/
│   │   ├── LoginPage.tsx      # Dual-tab login & demo auto-fill
│   │   ├── RegisterPage.tsx   # Citizen CNIC registration form
│   │   ├── CitizenPortal.tsx  # Intake form, polling state, "My Grievances"
│   │   ├── OfficialDashboard.tsx # Scoped KPI metrics & complaints feed
│   │   └── SuperAdminPage.tsx # City-wide cross-agency matrix & health
│   ├── App.tsx                # Route definitions with role-based route guard
│   ├── index.css              # Tailwind imports & M3 design tokens
│   └── main.tsx               # Root React bootstrap
├── tailwind.config.js         # Semantic color tokens & spacing configuration
└── package.json               # Dependencies (axios, lucide-react, tailwindcss)
```

### Step-by-Step Implementation Guide
1. **Dependencies:** Install `axios`, `lucide-react`, and configure `tailwindcss`.
2. **API Client (`client.ts`):** Configure base URL `http://localhost:8000`, attach `Authorization: Bearer <token>` automatically, and unwrap standard `{ success, data, error }` envelopes.
3. **Auth System (`LoginPage.tsx`, `App.tsx`):** Build stateful authentication context; store user profile and redirect based on `dashboard_route`.
4. **Citizen Portal (`CitizenPortal.tsx`):**
   - Implement multimodal input (file uploader, text input, audio recording/upload).
   - Implement polling hook for `GET /api/reports/review/{job_id}`.
   - Build `ReviewModal.tsx` showing the layman summary and legal draft toggle.
   - Build "My Grievances" tracking feed.
5. **Government Dashboard (`OfficialDashboard.tsx`):**
   - Implement KPI metrics row.
   - Build scoped complaint cards/table.
   - Build `DossierModal.tsx` with high-res photo viewer, EN/UR tabs, and status updater.
6. **Super Admin Page (`SuperAdminPage.tsx`):** Implement 4-authority comparison matrix.
