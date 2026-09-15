export type UserRole = "CITIZEN" | "GOVT_OFFICIAL" | "SUPER_ADMIN" | "AI_AGENT";
export type AuthorityOrg = "KWSC" | "KMC" | "SSWMB" | "CANTONMENT";
export type IncidentSeverity = "P0" | "P1" | "P2";
export type OfficialStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export interface CurrentUser {
  userId: string;
  cnic: string;
  fullName: string;
  role: UserRole;
  assignedOrg: AuthorityOrg | null;
  dashboardRoute: string;
  primaryPhone?: string;
}

export interface RegisterPayload {
  cnic: string;
  full_name: string;
  primary_phone: string;
  password: string;
}

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

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
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
  community_reports_count?: number;
  draft_complaint?: {
    subject_en: string;
    body_en: string;
    body_ur: string;
  };
  landmark?: string;
  coordinates?: { lat: number; lng: number };
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
  target_authority: AuthorityOrg;
  subject_en?: string;
  layman_summary?: string;
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
  co_reporting_citizens?: string[];
  evidence_photos: string[];
  landmark: string;
  coordinates: { lat: number; lng: number };
  first_reported_at: string;
  last_reported_at: string;
  severity: IncidentSeverity;
  issue_category: string;
}

export interface AgencyMetrics {
  org: AuthorityOrg;
  name: string;
  activeCount: number;
  resolvedCount: number;
  p0EmergencyCount: number;
  avgResolutionTimeHours: number;
}

export interface SuperAdminOverview {
  agencies: AgencyMetrics[];
  systemHealth: {
    redisQueueDepth: number;
    aiWorkerStatus: "HEALTHY" | "DEGRADED" | "OFFLINE";
    whatsappWebhookStatus: "ACTIVE" | "INACTIVE";
    activeWorkersCount: number;
    avgInferenceLatencyMs: number;
    dbUptimePercentage: number;
    lastTelemetrySync: string;
  };
}
