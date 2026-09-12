import axios, { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  AuthResponse,
  ComplaintCard,
  ComplaintDossier,
  CurrentUser,
  OfficialStatus,
  ReviewPackage,
  SubmitReportPayload,
  SuperAdminOverview,
} from "./types";
import {
  DEMO_USERS,
  INITIAL_COMPLAINTS,
  MOCK_DOSSIERS,
  MOCK_SUPER_OVERVIEW,
} from "./mockData";

// Local storage keys
const AUTH_TOKEN_KEY = "authToken";
const CURRENT_USER_KEY = "currentUser";
const MOCK_API_KEY = "mock_api_enabled";
const COMPLAINTS_STORAGE_KEY = "khi_civic_complaints_v1";

// Default Mock Mode is true for seamless offline & demonstration resilience
export const isMockModeEnabled = (): boolean => {
  const saved = localStorage.getItem(MOCK_API_KEY);
  if (saved === null) {
    return true; // Default to true as specified in requirements
  }
  return saved === "true";
};

export const setMockMode = (enabled: boolean): void => {
  localStorage.setItem(MOCK_API_KEY, enabled ? "true" : "false");
};

// Internal mutable storage for mock complaints to support state transitions during demo
const getStoredComplaints = (): ComplaintCard[] => {
  try {
    const raw = localStorage.getItem(COMPLAINTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        COMPLAINTS_STORAGE_KEY,
        JSON.stringify(INITIAL_COMPLAINTS)
      );
      return INITIAL_COMPLAINTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_COMPLAINTS;
  }
};

const saveStoredComplaints = (items: ComplaintCard[]): void => {
  localStorage.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(items));
};

// Create Axios Instance
export const axiosInstance = axios.create({
  baseURL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "http://localhost:8000",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT Bearer Token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Envelope unwrapping { success, data, error }
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const resData = response.data;
    if (resData && typeof resData === "object" && "success" in resData) {
      if (resData.success) {
        return resData.data as any;
      } else {
        const errorMsg = resData.error?.message || "An unexpected civic error occurred.";
        return Promise.reject(new Error(errorMsg));
      }
    }
    return response.data;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.data?.error?.message) {
      return Promise.reject(new Error(error.response.data.error.message));
    }
    return Promise.reject(error);
  }
);

// High-level API Methods with Mock-Mode Fallback & Live Integration
export const api = {
  // Authentication
  login: async (cnic: string, password?: string): Promise<AuthResponse> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Normalize CNIC
      const cleanCnic = cnic.trim();
      const user = DEMO_USERS[cleanCnic];
      if (user) {
        localStorage.setItem(AUTH_TOKEN_KEY, user.token);
        const currentUser: CurrentUser = {
          userId: user.user_id,
          cnic: user.cnic,
          fullName: user.full_name,
          role: user.role,
          assignedOrg: user.assigned_org,
          dashboardRoute: user.dashboard_route,
          primaryPhone: user.primary_phone,
        };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
        return user;
      }
      // Fallback default citizen if any custom CNIC is typed
      const customUser: AuthResponse = {
        user_id: `usr-${Date.now()}`,
        cnic: cleanCnic || "42101-1234567-1",
        full_name: "Karachi Citizen",
        role: "CITIZEN",
        assigned_org: null,
        dashboard_route: "/citizen/portal",
        token: `mock-jwt-${Date.now()}`,
      };
      localStorage.setItem(AUTH_TOKEN_KEY, customUser.token);
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
          userId: customUser.user_id,
          cnic: customUser.cnic,
          fullName: customUser.full_name,
          role: customUser.role,
          assignedOrg: customUser.assigned_org,
          dashboardRoute: customUser.dashboard_route,
        })
      );
      return customUser;
    }

    const resp = await axiosInstance.post<any, AuthResponse>("/auth/login", {
      cnic,
      password,
    });
    localStorage.setItem(AUTH_TOKEN_KEY, resp.token);
    return resp;
  },

  logout: (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): CurrentUser | null => {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  // Citizen Flow: Intake Report Submission
  submitGrievance: async (
    payload: SubmitReportPayload
  ): Promise<{ job_id: string }> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const jobId = `job-${Date.now()}`;
      sessionStorage.setItem(
        `pending_review_${jobId}`,
        JSON.stringify({
          text: payload.text,
          landmark: payload.landmark || "Near Disco Bakery, Gulshan Block 4",
          lat: payload.lat || 24.9284,
          lng: payload.lng || 67.0982,
        })
      );
      return { job_id: jobId };
    }

    const formData = new FormData();
    formData.append("text", payload.text);
    if (payload.landmark) formData.append("landmark", payload.landmark);
    if (payload.lat) formData.append("lat", payload.lat.toString());
    if (payload.lng) formData.append("lng", payload.lng.toString());
    if (payload.image) formData.append("image", payload.image);
    if (payload.audio) formData.append("audio", payload.audio);

    return axiosInstance.post("/api/reports/submit", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Citizen Flow: Polling AI Analysis for Review
  pollReviewPackage: async (jobId: string): Promise<ReviewPackage> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const cached = sessionStorage.getItem(`pending_review_${jobId}`);
      const data = cached ? JSON.parse(cached) : {};

      const textLower = (data.text || "").toLowerCase();
      let targetAuth: "KWSC" | "KMC" | "SSWMB" | "CANTONMENT" = "KWSC";
      let category = "Sewerage Overflow & Contamination";
      let severity: "P0" | "P1" | "P2" = "P0";
      let citations = "KW&SC Act 2023 Sec. 24; Constitution of Pakistan Arts. 9 & 14";

      if (textLower.includes("manhole") || textLower.includes("road") || textLower.includes("sarak")) {
        targetAuth = "KMC";
        category = "Arterial Road Cavity & Open Manhole Hazard";
        citations = "Sindh Local Government Act 2013 (Schedule V); Motor Vehicles Ord. 1965";
      } else if (textLower.includes("kachra") || textLower.includes("garbage") || textLower.includes("trash")) {
        targetAuth = "SSWMB";
        category = "Solid Waste Dump & Nullah Choking";
        severity = "P1";
        citations = "Sindh Solid Waste Management Board Act 2014 Sec. 16";
      } else if (textLower.includes("cantonment") || textLower.includes("clifton") || textLower.includes("faisal")) {
        targetAuth = "CANTONMENT";
        category = "Cantonment Culvert Drainage Failure";
        severity = "P1";
        citations = "Cantonments Act 1924 Sec. 130";
      }

      const review: ReviewPackage = {
        job_id: jobId,
        status: "READY_FOR_REVIEW",
        target_authority: targetAuth,
        issue_category: category,
        severity: severity,
        community_reports_count: 3,
        landmark: data.landmark || "Near Disco Bakery, Block 4, Gulshan-e-Iqbal",
        coordinates: {
          lat: data.lat || 24.9284,
          lng: data.lng || 67.0982,
        },
        layman_summary: `Humne aapki shikayat ka AI jaiza mukammal kar lia hai. Yeh masla ${targetAuth} ke daera-e-ikhtiyar me ata hai. Ilaqay me public hygiene aur salamati ke khatre ki bina par ise ${severity} ke tor par tasdeeq kia gaya hai.`,
        draft_complaint: {
          subject_en: `URGENT STATUTORY COMPLAINT: ${category.toUpperCase()} AT ${data.landmark || "GULSHAN BLOCK 4"}`,
          body_en: `Pursuant to statutory obligations under ${citations}, this notice formally registers an acute civic breakdown requiring emergency departmental intervention within 24 hours.`,
          body_ur: `بخدمت جناب مجاز اتھارٹی (${targetAuth})، نوٹس: موصولہ عوامی شکایات کی رو سے آپ کے متعلقہ دائرہ اختیار میں فوری قانونی کارروائی مطلوب ہے۔`,
        },
      };
      return review;
    }

    return axiosInstance.get(`/api/reports/review/${jobId}`);
  },

  // Citizen Flow: Confirm & File Official Grievance
  confirmGrievance: async (
    jobId: string,
    reviewData?: ReviewPackage
  ): Promise<{ tracking_id: string; official_status: OfficialStatus }> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const trackingId = `KHI-CIVIC-${randomNum}`;

      const complaints = getStoredComplaints();
      const newCard: ComplaintCard = {
        master_incident_id: `inc-${Date.now()}`,
        tracking_id: trackingId,
        target_authority: reviewData?.target_authority || "KWSC",
        issue_category: reviewData?.issue_category || "Civic Infrastructure Breakdown",
        severity: reviewData?.severity || "P0",
        community_reports_count: (reviewData?.community_reports_count || 1) + 1,
        landmark: reviewData?.landmark || "Gulshan-e-Iqbal Block 4",
        coordinates: reviewData?.coordinates || { lat: 24.9284, lng: 67.0982 },
        evidence_photos: [
          "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80",
        ],
        official_status: "PENDING",
        first_reported_at: "Just now",
        last_reported_at: "Just now",
        subject_en: reviewData?.draft_complaint?.subject_en,
        layman_summary: reviewData?.layman_summary,
      };

      saveStoredComplaints([newCard, ...complaints]);
      return { tracking_id: trackingId, official_status: "PENDING" };
    }

    return axiosInstance.post("/api/reports/confirm", { job_id: jobId });
  },

  // Citizen Flow: Get user's submitted grievances
  getMyComplaints: async (): Promise<ComplaintCard[]> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return getStoredComplaints();
    }
    return axiosInstance.get("/api/reports/my-complaints");
  },

  // Official Flow: Get scoped complaints for department
  getOfficialComplaints: async (
    org?: string | null
  ): Promise<ComplaintCard[]> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const all = getStoredComplaints();
      if (!org) return all;
      return all.filter((c) => c.target_authority === org);
    }
    return axiosInstance.get(`/api/admin/dashboard/complaints${org ? `?org=${org}` : ""}`);
  },

  // Official Flow: Get incident full dossier
  getComplaintDossier: async (incidentId: string): Promise<ComplaintDossier> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (MOCK_DOSSIERS[incidentId]) {
        return MOCK_DOSSIERS[incidentId];
      }
      const all = getStoredComplaints();
      const card = all.find((c) => c.master_incident_id === incidentId || c.tracking_id === incidentId);
      return {
        master_incident_id: card?.master_incident_id || incidentId,
        tracking_id: card?.tracking_id || "KHI-CIVIC-90214",
        target_authority: card?.target_authority || "KWSC",
        statutory_citations:
          "Karachi Water and Sewerage Corporation Act 2023 (Sec. 24); Constitution of Pakistan Arts. 9 & 14.",
        subject_en: card?.subject_en || "FORMAL STATUTORY NOTICE OF CIVIC INFRASTRUCTURE FAILURE",
        body_en: `To: Competent Authority, ${card?.target_authority || "KWSC"}.\n\nNotice is hereby served regarding acute failure at ${card?.landmark || "Karachi"}. Immediate dispatch of inspection and remediation teams is mandated under statutory governance regulations.`,
        body_ur: `بخدمت جناب مجاز اتھارٹی ${card?.target_authority || "KWSC"}، موصولہ عوامی شکایت کے تحت قانونی نوٹس ارسال کیا جا رہا ہے۔ فوری تدارک کا حکم دیا جاتا ہے۔`,
        official_status: card?.official_status || "PENDING",
        official_notes: "Awaiting field supervisor on-site log.",
        reporting_citizens_count: card?.community_reports_count || 3,
        co_reporting_citizens: [
          "42101-*******-1 (Farhan A.)",
          "42101-*******-5 (Kashif M.)",
          "42101-*******-8 (Zubair H.)",
        ],
        evidence_photos: card?.evidence_photos || [
          "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80",
        ],
        landmark: card?.landmark || "Gulshan Block 4",
        coordinates: card?.coordinates || { lat: 24.9284, lng: 67.0982 },
        first_reported_at: card?.first_reported_at || "Today 08:30 PKT",
        last_reported_at: card?.last_reported_at || "Today 11:15 PKT",
        severity: card?.severity || "P0",
        issue_category: card?.issue_category || "Sewerage Overflow",
      };
    }

    return axiosInstance.get(`/api/admin/dashboard/complaints/${incidentId}/dossier`);
  },

  // Official Flow: Update status & field notes
  updateComplaintStatus: async (
    incidentId: string,
    status: OfficialStatus,
    notes: string
  ): Promise<{ success: boolean }> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const all = getStoredComplaints();
      const updated = all.map((c) => {
        if (c.master_incident_id === incidentId || c.tracking_id === incidentId) {
          return { ...c, official_status: status };
        }
        return c;
      });
      saveStoredComplaints(updated);

      if (MOCK_DOSSIERS[incidentId]) {
        MOCK_DOSSIERS[incidentId].official_status = status;
        MOCK_DOSSIERS[incidentId].official_notes = notes;
      }
      return { success: true };
    }

    return axiosInstance.patch(`/api/admin/dashboard/complaints/${incidentId}/status`, {
      status,
      notes,
    });
  },

  // Super Admin: City-Wide Overview
  getSuperAdminOverview: async (): Promise<SuperAdminOverview> => {
    if (isMockModeEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return MOCK_SUPER_OVERVIEW;
    }
    return axiosInstance.get("/api/admin/super/overview");
  },
};
