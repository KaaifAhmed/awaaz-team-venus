import type {
  AuthResponse,
  ComplaintCard,
  ComplaintDossier,
  SuperAdminOverview,
} from "./types";

export const DEMO_USERS: Record<string, AuthResponse> = {
  "42101-1234567-1": {
    user_id: "usr-citizen-01",
    cnic: "42101-1234567-1",
    full_name: "Farhan Akhtar (Citizen)",
    primary_phone: "0300-1234567",
    role: "CITIZEN",
    assigned_org: null,
    dashboard_route: "/citizen/portal",
    token: "mock-jwt-citizen-farhan",
  },
  "42201-1111111-1": {
    user_id: "usr-kwsc-sdo",
    cnic: "42201-1111111-1",
    full_name: "Engr. Tariq Aziz (SDO District East)",
    primary_phone: "0333-7654321",
    role: "GOVT_OFFICIAL",
    assigned_org: "KWSC",
    dashboard_route: "/admin/dashboard",
    token: "mock-jwt-kwsc-tariq",
  },
  "42201-2222222-2": {
    user_id: "usr-kmc-officer",
    cnic: "42201-2222222-2",
    full_name: "Syed Zafar Abbas (Senior Municipal Officer)",
    primary_phone: "0321-9876543",
    role: "GOVT_OFFICIAL",
    assigned_org: "KMC",
    dashboard_route: "/admin/dashboard",
    token: "mock-jwt-kmc-zafar",
  },
  "42000-0000000-0": {
    user_id: "usr-super-admin",
    cnic: "42000-0000000-0",
    full_name: "Commissioner Karachi HQ (Admin Command)",
    primary_phone: "021-99201234",
    role: "SUPER_ADMIN",
    assigned_org: null,
    dashboard_route: "/admin/super",
    token: "mock-jwt-super-commissioner",
  },
};

// Realistic mock complaints
export const INITIAL_COMPLAINTS: ComplaintCard[] = [
  {
    master_incident_id: "inc-kwsc-90214",
    tracking_id: "KHI-CIVIC-90214",
    target_authority: "KWSC",
    issue_category: "Sewerage Overflow & Health Hazard",
    severity: "P0",
    community_reports_count: 4,
    landmark: "Near Disco Bakery, Block 4, Gulshan-e-Iqbal",
    coordinates: { lat: 24.9284, lng: 67.0982 },
    evidence_photos: [
      "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=600&q=80",
    ],
    official_status: "PENDING",
    first_reported_at: "2026-09-12 08:30 PKT",
    last_reported_at: "2026-09-12 11:15 PKT",
    subject_en: "Critical Sewerage Main Collapse at Gulshan Block 4",
    layman_summary:
      "Humne aapki shikayat ka jaiza lia hai. Yeh masla KW&SC ke daera-e-ikhtiyar me ata hai. Gutter ke gande pani se bimariyan phailne ka shadeed khatra hai, is liye ise P0 Emergency mark kia gaya hai.",
  },
  {
    master_incident_id: "inc-kmc-90215",
    tracking_id: "KHI-CIVIC-90215",
    target_authority: "KMC",
    issue_category: "Uncovered Deep Manhole & Arterial Sinkhole",
    severity: "P0",
    community_reports_count: 6,
    landmark: "Main University Road, Opp. NIPA Chowrangi Bus Stop",
    coordinates: { lat: 24.9192, lng: 67.1009 },
    evidence_photos: [
      "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80",
    ],
    official_status: "PENDING",
    first_reported_at: "2026-09-12 07:45 PKT",
    last_reported_at: "2026-09-12 12:00 PKT",
    subject_en: "Exposed Manhole Void on Primary Arterial Highway (University Road)",
    layman_summary:
      "Main University Road par khula manhole aur sarak ka dhasao KMC ke tehet ata hai. Barish ke bad shadeed hadsaat ka khadsha hai.",
  },
  {
    master_incident_id: "inc-kwsc-90198",
    tracking_id: "KHI-CIVIC-90198",
    target_authority: "KWSC",
    issue_category: "Bulk Potable Water Trunk Line Rupture",
    severity: "P0",
    community_reports_count: 8,
    landmark: "Block 14, Federal B Area, Water Pump Chowrangi",
    coordinates: { lat: 24.9351, lng: 67.0673 },
    evidence_photos: [
      "https://images.unsplash.com/photo-1527066579998-dbbae57f45ce?auto=format&fit=crop&w=600&q=80",
    ],
    official_status: "IN_PROGRESS",
    first_reported_at: "2026-09-11 16:20 PKT",
    last_reported_at: "2026-09-12 09:05 PKT",
    subject_en: "Rupture of 48-inch Potable Feeder Main causing Submersion",
    layman_summary:
      "F.B Area Water Pump par 48-inch drinking water pipe phat chuka hai. KW&SC ki emergency team line isolate kar rahi hai.",
  },
  {
    master_incident_id: "inc-sswmb-90218",
    tracking_id: "KHI-CIVIC-90218",
    target_authority: "SSWMB",
    issue_category: "Stormwater Nullah Solid Waste Choking",
    severity: "P1",
    community_reports_count: 5,
    landmark: "Liaquatabad Super Market, Behind Post Office",
    coordinates: { lat: 24.9088, lng: 67.0423 },
    evidence_photos: [
      "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=600&q=80",
    ],
    official_status: "PENDING",
    first_reported_at: "2026-09-12 06:10 PKT",
    last_reported_at: "2026-09-12 10:40 PKT",
    subject_en: "Massive Solid Waste Blockade in Liaquatabad Primary Drain",
    layman_summary:
      "Liaquatabad Super Market ke qareeb nullah kachre se band ho chuka hai. Sindh Solid Waste Management Board ko dispatch bheja gaya hai.",
  },
  {
    master_incident_id: "inc-cant-90220",
    tracking_id: "KHI-CIVIC-90220",
    target_authority: "CANTONMENT",
    issue_category: "Cantonment Drainage Culvert Ponding",
    severity: "P1",
    community_reports_count: 3,
    landmark: "Shahrah-e-Faisal, Baloch Colony Culvert Boundary",
    coordinates: { lat: 24.8698, lng: 67.0784 },
    evidence_photos: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=600&q=80",
    ],
    official_status: "IN_PROGRESS",
    first_reported_at: "2026-09-11 20:15 PKT",
    last_reported_at: "2026-09-12 08:00 PKT",
    subject_en: "Shahrah-e-Faisal Roadway Submersion along Cantonment Strip",
    layman_summary:
      "Baloch Colony flyover ke qareeb Cantonment Board ki hadood me culvert block hone se traffic ruka hua hai.",
  },
  {
    master_incident_id: "inc-kwsc-90180",
    tracking_id: "KHI-CIVIC-90180",
    target_authority: "KWSC",
    issue_category: "School Gate Sewer Line Backflow",
    severity: "P1",
    community_reports_count: 7,
    landmark: "Outside Govt Girls School, Nazimabad No. 2",
    coordinates: { lat: 24.9142, lng: 67.0315 },
    evidence_photos: [
      "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80",
    ],
    official_status: "RESOLVED",
    first_reported_at: "2026-09-10 11:00 PKT",
    last_reported_at: "2026-09-11 17:30 PKT",
    subject_en: "Rectification of Sewer Backflow at Nazimabad School Compound",
    layman_summary:
      "Nazimabad No. 2 school ke bahir gutter ki blockage KW&SC suction jetting crew ne mukammal saaf kar di hai.",
  },
  {
    master_incident_id: "inc-kmc-90175",
    tracking_id: "KHI-CIVIC-90175",
    target_authority: "KMC",
    issue_category: "Industrial Freight Corridor Crater",
    severity: "P1",
    community_reports_count: 4,
    landmark: "Road 7000, Korangi Industrial Area, Near Vita Chowrangi",
    coordinates: { lat: 24.8327, lng: 67.1265 },
    evidence_photos: [
      "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80",
    ],
    official_status: "IN_PROGRESS",
    first_reported_at: "2026-09-11 13:40 PKT",
    last_reported_at: "2026-09-12 09:20 PKT",
    subject_en: "Heavy Freight Highway Surface Failure at Korangi Road 7000",
    layman_summary:
      "Korangi Industrial corridor par asphalt road patch work KMC road maintenance division ke zariye jaari hai.",
  },
];

export const MOCK_DOSSIERS: Record<string, ComplaintDossier> = {
  "inc-kwsc-90214": {
    master_incident_id: "inc-kwsc-90214",
    tracking_id: "KHI-CIVIC-90214",
    target_authority: "KWSC",
    statutory_citations:
      "Karachi Water and Sewerage Corporation Act 2023 (Sec. 24 & Sec. 31); Sindh Environmental Protection Act 2014 (Sec. 11); Constitution of Pakistan Arts. 9 & 14 (Right to Life & Dignity).",
    subject_en: "STATUTORY DEMAND FOR IMMEDIATE REPAIR OF COLLAPSED SEWERAGE MAIN IN GULSHAN-E-IQBAL BLOCK 4",
    body_en: `To: Managing Director & Chief Engineer (Sewerage),
Karachi Water & Sewerage Corporation (KW&SC), 9th Mile Karsaz, Karachi.

NOTICE OF STATUTORY DEFAULT UNDER SECTION 24 OF KW&SC ACT 2023:
1. TAKE NOTICE that multiple residents of Gulshan-e-Iqbal Block 4 (Vicinity of Disco Bakery) have formally documented an active and uncontrolled outflow of untreated municipal sewage onto public thoroughfares.
2. The failure of the KW&SC East Sewerage Division to maintain line continuity constitutes an ongoing violation of Section 24 of the KW&SC Act 2023, exposing over 1,200 neighborhood residents to acute waterborne epidemic hazards (Typhoid/Gastroenteritis).
3. The Corporation is hereby requisitioned to dispatch a suction jetting unit and structural repair crew within 24 hours to clear line obstruction and remediate the contaminated perimeter.`,
    body_ur: `????? ???? ??? ??????? ???? (??????)? ????? ???? ???? ?????? ????????? (KW&SC)

?????: ?????? ???? ????? ???? ????? ? ????? ???? ???? � ???? ????? ???? ? (???? ?????)

?? ?? ?????? ??? ???? ??? ???? ?? ?? ???? ????? ???? ? ??? ?????? ?? ??? ???? ???? ???? ?? ???? ???? ???? ????? ??? ?????? ????? ?? ??? ??? ?? ??? ???
?? ??????? ????? ???? ???? ?????? ????????? ???? ???? ?? ???? ?? ??? ????? ??????? ?? ?????? ? ?? ??? ?????? ?? ?????? ???? ?? ????? ?????? ???
????? ???? ??? ?? ?????? ????? ?????? ??? ??????? ??? ????? ?? ?? ?? ????? ?? ???? ?? ??? ???? ?? ???? ??? ????? ????? ???? ?????? ???? ???? ?? ?? ????? ???`,
    official_status: "PENDING",
    official_notes: "Awaiting field supervisor site inspection report for Gulshan sub-division East.",
    reporting_citizens_count: 4,
    co_reporting_citizens: [
      "42101-*******-1 (Farhan A.)",
      "42101-*******-5 (Kashif M.)",
      "42101-*******-8 (Zubair H.)",
      "42101-*******-3 (Rehan T.)",
    ],
    evidence_photos: [
      "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80",
    ],
    landmark: "Near Disco Bakery, Block 4, Gulshan-e-Iqbal",
    coordinates: { lat: 24.9284, lng: 67.0982 },
    first_reported_at: "2026-09-12 08:30 PKT",
    last_reported_at: "2026-09-12 11:15 PKT",
    severity: "P0",
    issue_category: "Sewerage Overflow & Health Hazard",
  },
  "inc-kmc-90215": {
    master_incident_id: "inc-kmc-90215",
    tracking_id: "KHI-CIVIC-90215",
    target_authority: "KMC",
    statutory_citations:
      "Sindh Local Government Act 2013 (Schedule V, Part-I, Municipal Functions); Motor Vehicles Ordinance 1965 (Highway Safety Standards); Constitution of Pakistan Art. 9.",
    subject_en: "URGENT COMPLAINT: OPEN ARTERIAL MANHOLE HAZARD ON MAIN UNIVERSITY ROAD",
    body_en: `To: Senior Director Municipal Services / Engineering,
Karachi Metropolitan Corporation (KMC), Civic Centre, Karachi.

NOTICE OF FATAL ROAD HAZARD:
1. An uncovered, deep stormwater/manhole cavity measuring 4ft diameter is currently exposed without safety barricades or illumination opposite NIPA Chowrangi Bus Stop.
2. Under Schedule V of the Sindh Local Government Act 2013, KMC is legally tasked with arterial road structural safety. Failure to cordon and cap this opening exposes commuters to imminent fatal vehicular impacts.
3. KMC Maintenance Division is requested to deploy immediate pre-cast concrete capping and reflective hazard signage.`,
    body_ur: `????? ???? ???????? ??????? ?????? ????? ??????????? ????????? (KMC)

?????: ?????? ????? ????? ???? ??? ??? ? ??? ?? ???? � ??? ????????? ??? ???????? ???? ??????

????????? ??? ?? ???? ?? ????? ?? ???? ???? ???? ?? ???? ??? ??? ????? ??? ???? ???? ????? ?? ??? ??? ???? ???? ?? ??? ???
???? ???? ??????? ???? ???? ?? ??? ??? ???????? ?? ????? KMC ?? ?????? ??? ???? ??? ???? ??? ?? ?????? ??? ??? ??? ???? ??? ?????? ?? ???? ?? ??? ????? ??????? ????? ??????`,
    official_status: "PENDING",
    official_notes: "Patrol team alerted; pre-cast slab requested from Central Store.",
    reporting_citizens_count: 6,
    co_reporting_citizens: [
      "42201-*******-2 (Kamran Q.)",
      "42201-*******-7 (Salman K.)",
      "42101-*******-9 (Danish S.)",
      "42401-*******-4 (Ali Raza)",
      "42201-*******-1 (Naveed M.)",
      "42101-*******-6 (Waseem B.)",
    ],
    evidence_photos: [
      "https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=800&q=80",
    ],
    landmark: "Main University Road, Opp. NIPA Chowrangi Bus Stop",
    coordinates: { lat: 24.9192, lng: 67.1009 },
    first_reported_at: "2026-09-12 07:45 PKT",
    last_reported_at: "2026-09-12 12:00 PKT",
    severity: "P0",
    issue_category: "Uncovered Deep Manhole & Arterial Sinkhole",
  },
};

export const MOCK_SUPER_OVERVIEW: SuperAdminOverview = {
  agencies: [
    {
      org: "KWSC",
      name: "Karachi Water & Sewerage Corporation",
      activeCount: 142,
      resolvedCount: 389,
      p0EmergencyCount: 18,
      avgResolutionTimeHours: 6.4,
    },
    {
      org: "KMC",
      name: "Karachi Metropolitan Corporation",
      activeCount: 89,
      resolvedCount: 245,
      p0EmergencyCount: 11,
      avgResolutionTimeHours: 8.2,
    },
    {
      org: "SSWMB",
      name: "Sindh Solid Waste Management Board",
      activeCount: 114,
      resolvedCount: 520,
      p0EmergencyCount: 7,
      avgResolutionTimeHours: 4.8,
    },
    {
      org: "CANTONMENT",
      name: "Cantonment Boards Administration (CBC/MOC)",
      activeCount: 46,
      resolvedCount: 178,
      p0EmergencyCount: 3,
      avgResolutionTimeHours: 5.1,
    },
  ],
  systemHealth: {
    redisQueueDepth: 12,
    aiWorkerStatus: "HEALTHY",
    whatsappWebhookStatus: "ACTIVE",
    activeWorkersCount: 4,
    avgInferenceLatencyMs: 420,
    dbUptimePercentage: 99.98,
    lastTelemetrySync: "Just now (Live)",
  },
};
