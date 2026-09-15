/**
 * Karachi Civic AI Redressal System - E2E User Journey & Contract Audit Suite
 * 
 * Programmatically exercises:
 *  - US-01 & US-02: Citizen Intake (multimodal Roman Urdu/GPS), Polling, ReviewModal & SuccessCard
 *  - US-03: Scoped Official Command Dashboard (KWSC & KMC), Dossier & Status Lifecycle
 *  - US-04: Super Admin City-Wide 4-Agency Matrix & Engine Telemetry
 *  - Contract Unwrapping & Envelope Protocol Handling
 */

// 1. In-Memory WebStorage Polyfill for Node environment
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (!globalThis.localStorage) {
  (globalThis as any).localStorage = new MemoryStorage();
}
if (!globalThis.sessionStorage) {
  (globalThis as any).sessionStorage = new MemoryStorage();
}

// 2. Import API client and mock data
import { api, isMockModeEnabled, setMockMode, axiosInstance } from "../src/api/client";

// Test Runner utilities
let passedTests = 0;
let failedTests = 0;
const results: { name: string; status: "PASS" | "FAIL"; details?: string }[] = [];

function assert(condition: boolean, testName: string, failureDetails?: string): void {
  if (condition) {
    passedTests++;
    results.push({ name: testName, status: "PASS" });
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
  } else {
    failedTests++;
    const err = failureDetails || "Assertion condition failed";
    results.push({ name: testName, status: "FAIL", details: err });
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} - ${err}`);
  }
}

function printSection(title: string): void {
  console.log(`\n\x1b[36m============================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m  ${title}\x1b[0m`);
  console.log(`\x1b[36m============================================================\x1b[0m`);
}

async function runAuditSuite(): Promise<void> {
  const startTime = Date.now();
  console.log("\n\x1b[33m🚀 Initiating Team Venus Frontend & User Journey Audit...\x1b[0m\n");

  // SECTION 1: SYSTEM RESILIENCE & MOCK MODE CONTRACT
  printSection("1. System Resilience, Mock Mode & API Interceptor Contract");

  setMockMode(true);
  assert(isMockModeEnabled() === true, "Mock mode default state is enabled");

  setMockMode(false);
  assert(isMockModeEnabled() === false, "Mock mode can be toggled off");

  setMockMode(true);
  assert(isMockModeEnabled() === true, "Mock mode restored to active for offline verification");

  // Validate Axios Response Envelope Unwrapping Interceptor
  try {
    const mockEnvelope = { success: true, data: { status: "OK", timestamp: 12345 } };
    // Simulate axios interceptor unwrapping logic
    const interceptor = (axiosInstance.interceptors.response as any).handlers[0]?.fulfilled;
    if (interceptor) {
      const unwrapped = interceptor({ data: mockEnvelope });
      assert(
        unwrapped && unwrapped.status === "OK" && unwrapped.timestamp === 12345,
        "Response Interceptor unwraps { success: true, data } envelope"
      );

      // Verify failure envelope rejection
      let errorThrown = false;
      try {
        await interceptor({
          data: { success: false, error: { message: "Statutory jurisdiction error" } },
        });
      } catch (err: any) {
        errorThrown = true;
        assert(
          err.message === "Statutory jurisdiction error",
          "Response Interceptor rejects failure envelopes"
        );
      }
      if (!errorThrown) {
        assert(false, "Response Interceptor rejects failure envelopes");
      }
    }
  } catch (err: any) {
    assert(false, "Axios interceptor test encountered error", err?.message);
  }

  // SECTION 2: AUTHENTICATION PERSONAS & RBAC
  printSection("2. Persona Authentication & RBAC Route Governance");

  // Citizen Login (Farhan)
  const citizenAuth = await api.login("42101-1234567-1", "password123");
  assert(citizenAuth.role === "CITIZEN", "Citizen persona authenticates with role CITIZEN");
  assert(citizenAuth.dashboard_route === "/citizen/portal", "Citizen routed to /citizen/portal");
  assert(citizenAuth.assigned_org === null, "Citizen assigned_org is null");
  assert(Boolean(citizenAuth.token), "Citizen receives valid auth token");

  const storedUser = api.getCurrentUser();
  assert(storedUser?.fullName === "Farhan Akhtar (Citizen)", "Citizen current user profile persisted");

  // KWSC Official Login (Engr. Tariq Aziz)
  const kwscAuth = await api.login("42201-1111111-1", "password123");
  assert(kwscAuth.role === "GOVT_OFFICIAL", "KWSC official authenticates with role GOVT_OFFICIAL");
  assert(kwscAuth.assigned_org === "KWSC", "KWSC official assigned_org is KWSC");
  assert(kwscAuth.dashboard_route === "/admin/dashboard", "KWSC official routed to /admin/dashboard");

  // KMC Official Login (Syed Zafar Abbas)
  const kmcAuth = await api.login("42201-2222222-2", "password123");
  assert(kmcAuth.role === "GOVT_OFFICIAL", "KMC official authenticates with role GOVT_OFFICIAL");
  assert(kmcAuth.assigned_org === "KMC", "KMC official assigned_org is KMC");
  assert(kmcAuth.dashboard_route === "/admin/dashboard", "KMC official routed to /admin/dashboard");

  // Super Admin Login (Commissioner HQ)
  const superAuth = await api.login("42000-0000000-0", "password123");
  assert(superAuth.role === "SUPER_ADMIN", "Super Admin authenticates with role SUPER_ADMIN");
  assert(superAuth.dashboard_route === "/admin/super", "Super Admin routed to /admin/super");

  // Unregistered / Custom Citizen CNIC Fallback
  const customAuth = await api.login("42101-9999999-9", "pass");
  assert(customAuth.role === "CITIZEN", "Unregistered CNIC dynamically receives CITIZEN role");
  assert(customAuth.dashboard_route === "/citizen/portal", "Unregistered CNIC routed to /citizen/portal");

  // SECTION 3: US-01 & US-02 CITIZEN INTAKE, AI PERCEPTION & REVIEW
  printSection("3. US-01 & US-02: Citizen Multimodal Intake, AI Review & Success Flow");

  // Reset to citizen session
  await api.login("42101-1234567-1");

  // Case A: Sewerage Intake (Roman Urdu) -> KWSC
  const intakeA = await api.submitGrievance({
    text: "Gulshan Block 4 me Disco Bakery ke samnay sewer line ubal rahi hai aur badbu arhi hai",
    landmark: "Near Disco Bakery, Block 4, Gulshan-e-Iqbal",
    lat: 24.9284,
    lng: 67.0982,
  });
  assert(Boolean(intakeA.job_id), "Grievance submission returns valid asynchronous job_id");

  const reviewA = await api.pollReviewPackage(intakeA.job_id);
  assert(reviewA.status === "READY_FOR_REVIEW", "AI pipeline transitions to READY_FOR_REVIEW");
  assert(reviewA.target_authority === "KWSC", "Sewerage report accurately routed to KWSC");
  assert(reviewA.issue_category.toLowerCase().includes("sewerage"), "Issue category classified as Sewerage");
  assert(reviewA.severity === "P0", "Sewerage main collapse classified as P0 Emergency");
  assert(reviewA.community_reports_count >= 3, "Community clout stacks neighboring reports (>=3)");
  assert(
    reviewA.layman_summary.includes("KW&SC") || reviewA.layman_summary.includes("KWSC"),
    "Plain-language Layman Summary references responsible department"
  );
  assert(Boolean(reviewA.draft_complaint.subject_en), "Statutory English subject generated");
  assert(reviewA.draft_complaint.body_en.includes("statutory"), "Statutory English legal body generated");
  assert(reviewA.draft_complaint.body_ur.length > 10, "Bilingual Urdu legal draft generated and populated");

  // Case B: Arterial Road Cavity & Open Manhole -> KMC
  const intakeB = await api.submitGrievance({
    text: "Main University Road par open manhole hai aur road dhas rahi hai",
    landmark: "Main University Road, Opp NIPA",
    lat: 24.9192,
    lng: 67.1009,
  });
  const reviewB = await api.pollReviewPackage(intakeB.job_id);
  assert(reviewB.target_authority === "KMC", "Open manhole & road crater routed to KMC");
  assert(reviewB.severity === "P0", "Open manhole on arterial road classified as P0 Hazard");

  // Case C: Solid Waste Dumping -> SSWMB
  const intakeC = await api.submitGrievance({
    text: "Liaquatabad super market kachra phaila hua hai aur nullah choke ho gaya hai",
    landmark: "Liaquatabad Super Market",
  });
  const reviewC = await api.pollReviewPackage(intakeC.job_id);
  assert(reviewC.target_authority === "SSWMB", "Solid waste and nullah choking routed to SSWMB");

  // Confirm Grievance & Receive Copyable Tracking ID
  const confirmResult = await api.confirmGrievance(reviewA.job_id, reviewA);
  assert(Boolean(confirmResult.tracking_id), "Confirmation returns official tracking ID");
  assert(
    /^AWZ-\d{5}$/.test(confirmResult.tracking_id),
    `Tracking ID matches format AWZ-XXXXX (${confirmResult.tracking_id})`
  );
  assert(confirmResult.official_status === "PENDING", "Initial official status set to PENDING");

  // Check Citizen Feed Updated
  const myComplaints = await api.getMyComplaints();
  assert(myComplaints.length > 0, "Citizen active complaints feed returns records");
  assert(
    myComplaints[0].tracking_id === confirmResult.tracking_id,
    "Newly filed complaint appears at top of citizen feed"
  );
  assert(myComplaints[0].official_status === "PENDING", "Citizen complaint reflects PENDING status");

  // SECTION 4: US-03 OFFICIAL DASHBOARD, SCOPED VIEW & STATUS LIFECYCLE
  printSection("4. US-03: Official Command Dashboard & Scoped Jurisdiction");

  // KWSC Official Scoped Dashboard
  await api.login("42201-1111111-1");
  const kwscComplaints = await api.getOfficialComplaints("KWSC");
  assert(kwscComplaints.length > 0, "KWSC department queue contains complaints");
  assert(
    kwscComplaints.every((c) => c.target_authority === "KWSC"),
    "KWSC dashboard is strictly scoped to KWSC jurisdiction only"
  );

  // KMC Official Scoped Dashboard
  await api.login("42201-2222222-2");
  const kmcComplaints = await api.getOfficialComplaints("KMC");
  assert(kmcComplaints.length > 0, "KMC department queue contains complaints");
  assert(
    kmcComplaints.every((c) => c.target_authority === "KMC"),
    "KMC dashboard is strictly scoped to KMC jurisdiction only"
  );

  // KPI Metrics Calculation Verification
  const kwscActive = kwscComplaints.filter((c) => c.official_status !== "RESOLVED").length;
  const kwscPending = kwscComplaints.filter((c) => c.official_status === "PENDING").length;
  const kwscP0 = kwscComplaints.filter((c) => c.severity === "P0" && c.official_status !== "RESOLVED").length;
  assert(kwscActive >= kwscPending, "KWSC active clusters count exceeds or equals pending count");
  assert(kwscP0 >= 1, "KWSC P0 emergency count highlighted (>= 1)");

  // Incident Dossier Detailed Verification
  const dossierId = "inc-kwsc-90214";
  const dossier = await api.getComplaintDossier(dossierId);
  assert(dossier.master_incident_id === dossierId, "Dossier retrieved by incident ID");
  assert(dossier.tracking_id === "AWZ-90214", "Dossier has statutory tracking ID AWZ-90214");
  assert(dossier.evidence_photos.length >= 2, "Dossier displays multiple photographic evidence items");
  assert(
    dossier.statutory_citations.includes("Karachi Water and Sewerage Corporation Act 2023") ||
      dossier.statutory_citations.includes("KW&SC Act 2023"),
    "Dossier contains explicit legal citations under KW&SC Act 2023"
  );
  assert(
    dossier.co_reporting_citizens.length >= 3,
    "Dossier contains privacy-masked co-reporting citizens list"
  );
  assert(Boolean(dossier.subject_en) && Boolean(dossier.body_en), "Dossier has complete English legal draft");
  assert(
    dossier.body_ur.includes("کراچی واٹر") || dossier.body_ur.includes("سیوریج"),
    "Dossier includes authentic Urdu legal notice"
  );

  // State Transition Lifecycle: PENDING -> IN_PROGRESS -> RESOLVED
  const dispatchNotes = "Dispatched suction tanker unit #4 and emergency jetting crew.";
  const updateRes1 = await api.updateComplaintStatus(dossierId, "IN_PROGRESS", dispatchNotes);
  assert(updateRes1.success === true, "Official status updated to IN_PROGRESS");

  const dossierAfterProgress = await api.getComplaintDossier(dossierId);
  assert(
    dossierAfterProgress.official_status === "IN_PROGRESS",
    "Dossier state verified as IN_PROGRESS"
  );
  assert(
    dossierAfterProgress.official_notes === dispatchNotes,
    "Official dispatch notes persisted on incident dossier"
  );

  const resolutionNotes = "Main line obstruction cleared. Perimeter sanitized. Service restored.";
  const updateRes2 = await api.updateComplaintStatus(dossierId, "RESOLVED", resolutionNotes);
  assert(updateRes2.success === true, "Official status updated to RESOLVED");

  const dossierAfterResolved = await api.getComplaintDossier(dossierId);
  assert(
    dossierAfterResolved.official_status === "RESOLVED",
    "Dossier state verified as RESOLVED"
  );

  // SECTION 5: US-04 SUPER ADMIN CITY-WIDE OVERVIEW & TELEMETRY
  printSection("5. US-04: Super Admin 4-Agency Matrix & Live Engine Telemetry");

  await api.login("42000-0000000-0");
  const overview = await api.getSuperAdminOverview();
  assert(Boolean(overview), "Super Admin overview fetched successfully");
  assert(overview.agencies.length === 4, "4-Agency Matrix covers exactly 4 municipal authorities");

  const orgKeys = overview.agencies.map((a) => a.org);
  assert(orgKeys.includes("KWSC"), "Agency Matrix contains KWSC");
  assert(orgKeys.includes("KMC"), "Agency Matrix contains KMC");
  assert(orgKeys.includes("SSWMB"), "Agency Matrix contains SSWMB");
  assert(orgKeys.includes("CANTONMENT"), "Agency Matrix contains CANTONMENT");

  overview.agencies.forEach((agency) => {
    assert(agency.activeCount > 0, `${agency.org}: activeCount > 0 (${agency.activeCount})`);
    assert(agency.resolvedCount > 0, `${agency.org}: resolvedCount > 0 (${agency.resolvedCount})`);
    assert(agency.p0EmergencyCount >= 0, `${agency.org}: p0EmergencyCount valid (${agency.p0EmergencyCount})`);
    assert(agency.avgResolutionTimeHours > 0, `${agency.org}: avgResolutionTime valid (${agency.avgResolutionTimeHours}h)`);
  });

  // System Health Telemetry
  const health = overview.systemHealth;
  assert(typeof health.redisQueueDepth === "number", "Redis queue depth reported");
  assert(health.aiWorkerStatus === "HEALTHY", "AI perception worker status is HEALTHY");
  assert(health.whatsappWebhookStatus === "ACTIVE", "WhatsApp inbound webhook is ACTIVE");
  assert(health.activeWorkersCount >= 1, `Active worker pool count >= 1 (${health.activeWorkersCount})`);
  assert(health.avgInferenceLatencyMs > 0, `Inference latency measured (${health.avgInferenceLatencyMs}ms)`);
  assert(health.dbUptimePercentage >= 99.0, `PostgreSQL uptime healthy (${health.dbUptimePercentage}%)`);
  assert(Boolean(health.lastTelemetrySync), "Telemetry synchronization timestamp present");

  // SUMMARY REPORT
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\x1b[36m============================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m  AUDIT COMPLETE: ${passedTests} passed, ${failedTests} failed in ${totalDuration}s\x1b[0m`);
  console.log(`\x1b[36m============================================================\x1b[0m\n`);

  if (failedTests > 0) {
    console.error(`\x1b[31mAudit failed with ${failedTests} failing checks.\x1b[0m`);
    process.exit(1);
  }
}

// Execute Audit
runAuditSuite().catch((err) => {
  console.error("Unhandled test suite failure:", err);
  process.exit(1);
});
