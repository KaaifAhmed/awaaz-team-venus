import os
import re
import sys
import unittest

from pathlib import Path

# Add project root to sys.path for standalone execution
PROJECT_DIR = Path(__file__).resolve().parent.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

# Ensure Django environment is configured for standalone execution
if "DJANGO_SETTINGS_MODULE" not in os.environ:
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
    os.environ.setdefault("USE_SQLITE", "True")

import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import ComplaintDossier, Incident, JobBuffer, MasterIncident
from users.models import LinkedPhone

User = get_user_model()


class BackendSRSAuditTestSuite(APITestCase):
    """Comprehensive verification suite testing Main Service against SRS specifications."""

    def setUp(self):
        # 1. Citizen user
        self.citizen = User.objects.create_user(
            username="42101-1000001-1",
            cnic="42101-1000001-1",
            full_name="Fatima Zehra",
            primary_phone="+923001000001",
            password="CitizenPassword123!",
            role="CITIZEN",
        )

        # 2. KW&SC Official
        self.kwsc_official = User.objects.create_user(
            username="42201-2000002-2",
            cnic="42201-2000002-2",
            full_name="Engr. Asif KWSC",
            primary_phone="+923002000002",
            password="OfficialPassword123!",
            role="GOVT_OFFICIAL",
            assigned_org="KWSC",
        )

        # 3. KMC Official
        self.kmc_official = User.objects.create_user(
            username="42201-3000003-3",
            cnic="42201-3000003-3",
            full_name="Engr. Bilal KMC",
            primary_phone="+923003000003",
            password="OfficialPassword123!",
            role="GOVT_OFFICIAL",
            assigned_org="KMC",
        )

        # 4. SSWMB Official
        self.sswmb_official = User.objects.create_user(
            username="42201-4000004-4",
            cnic="42201-4000004-4",
            full_name="Inspector Salman SSWMB",
            primary_phone="+923004000004",
            password="OfficialPassword123!",
            role="GOVT_OFFICIAL",
            assigned_org="SSWMB",
        )

        # 5. Cantonment Official
        self.cb_official = User.objects.create_user(
            username="42201-5000005-5",
            cnic="42201-5000005-5",
            full_name="Cantonment Officer Farhan",
            primary_phone="+923005000005",
            password="OfficialPassword123!",
            role="GOVT_OFFICIAL",
            assigned_org="CANTONMENT",
        )

        # 6. Super Admin
        self.super_admin = User.objects.create_user(
            username="42000-0000000-0",
            cnic="42000-0000000-0",
            full_name="Chief Municipal Secretary",
            primary_phone="+923000000000",
            password="SuperAdminPassword123!",
            role="SUPER_ADMIN",
            is_staff=True,
            is_superuser=True,
        )

        # Seed test MasterIncidents for RBAC and deduplication testing
        self.kwsc_incident = MasterIncident.objects.create(
            tracking_id="KHI-CIVIC-10001",
            target_authority="KWSC",
            issue_category="Sewerage Overflow",
            severity="P0",
            official_status="PENDING",
            lat=24.9180,
            lng=67.0971,
            landmark="Disco Bakery, Gulshan-e-Iqbal Block 5",
            community_reports_count=3,
        )
        ComplaintDossier.objects.create(
            master_incident=self.kwsc_incident,
            statutory_citations="KW&SC Act 2023, Section 24; SLGA 2013",
            subject_en="Urgent: Severe Raw Sewage Inundation",
            body_en="Main trunk sewer overflowing onto university road frontage.",
            body_ur="یونیورسٹی روڈ کے قریب مین سیوریج لائن کا گندا پانی سڑک پر جمع ہے۔",
            official_notes="Initial alert logged by system.",
        )

        self.kmc_incident = MasterIncident.objects.create(
            tracking_id="KHI-CIVIC-20002",
            target_authority="KMC",
            issue_category="Major Road / Pothole",
            severity="P1",
            official_status="PENDING",
            lat=24.8600,
            lng=67.0100,
            landmark="M.A. Jinnah Road near Capri Cinema",
            community_reports_count=1,
        )
        ComplaintDossier.objects.create(
            master_incident=self.kmc_incident,
            statutory_citations="Sindh Local Government Act 2013",
            subject_en="Grievance: Hazardous Crater on Main Artery",
            body_en="Large crater on M.A. Jinnah Road causing major traffic congestion.",
            body_ur="ایم اے جناح روڈ پر گہرا گڑھا ٹریفک حادثات کا باعث بن رہا ہے۔",
            official_notes="",
        )

        self.sswmb_incident = MasterIncident.objects.create(
            tracking_id="KHI-CIVIC-30003",
            target_authority="SSWMB",
            issue_category="Solid Waste",
            severity="P2",
            official_status="PENDING",
            lat=24.8800,
            lng=67.0400,
            landmark="Liaquatabad Super Market",
            community_reports_count=2,
        )

        self.cb_incident = MasterIncident.objects.create(
            tracking_id="KHI-CIVIC-40004",
            target_authority="CANTONMENT",
            issue_category="Drainage",
            severity="P1",
            official_status="PENDING",
            lat=24.8450,
            lng=67.0550,
            landmark="Clifton Block 2 Cantonment Boundary",
            community_reports_count=1,
        )

    # =========================================================================
    # FR-01: CNIC Setup, User Account Creation, Multi-Number Binding & Routing
    # =========================================================================

    def test_fr01_valid_cnic_registration_and_contract_shape(self):
        """FR-01: Valid 13-digit Pakistani CNIC creates citizen and returns exact contract."""
        payload = {
            "cnic": "42101-7654321-1",
            "full_name": "Tariq Mehmood",
            "primary_phone": "+923211234567",
            "password": "SecurePassword123!",
        }
        res = self.client.post("/auth/register", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        body = res.json()

        # Contract assertion: envelope format
        self.assertTrue(body["success"])
        self.assertIsNone(body["error"])
        data = body["data"]

        # Contract assertion: field presence and values
        self.assertEqual(data["cnic"], "42101-7654321-1")
        self.assertEqual(data["full_name"], "Tariq Mehmood")
        self.assertEqual(data["primary_phone"], "+923211234567")
        self.assertEqual(data["role"], "CITIZEN")
        self.assertIsNone(data["assigned_org"])
        self.assertEqual(data["dashboard_route"], "/citizen/portal")
        self.assertIn("token", data)
        self.assertIn("user_id", data)

    def test_fr01_invalid_cnic_format_rejected(self):
        """FR-01: Invalid CNIC formats (missing hyphen, incorrect length, alphabetic) rejected with 400."""
        invalid_cnics = [
            "12345",                    # Too short
            "42101-123456-1",           # 6 digits in middle instead of 7
            "42101-12345678-1",         # 8 digits in middle
            "4210112345671",            # Missing hyphens
            "4210A-1234567-1",          # Letters present
            "INVALID_CNIC_HERE",        # Completely invalid
        ]
        for cnic in invalid_cnics:
            payload = {
                "cnic": cnic,
                "full_name": "Invalid Tester",
                "primary_phone": f"+92333000{cnic[:4]}",
                "password": "Password123!",
            }
            res = self.client.post("/auth/register", payload, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, f"Failed to reject invalid CNIC: {cnic}")
            body = res.json()
            self.assertFalse(body["success"])
            self.assertEqual(body["error"]["code"], "INVALID_INPUT")

    def test_fr01_duplicate_cnic_rejected(self):
        """FR-01: Unique constraint on CNIC enforced."""
        payload = {
            "cnic": "42101-1000001-1",  # Already registered for self.citizen
            "full_name": "Duplicate Tester",
            "primary_phone": "+923459998888",
            "password": "Password123!",
        }
        res = self.client.post("/auth/register", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        body = res.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "INVALID_INPUT")

    def test_fr01_multi_phone_linking_and_max_2_enforcement(self):
        """FR-01 & NFR-06: Citizen can link up to 2 secondary phone numbers; 3rd is rejected."""
        self.client.force_authenticate(user=self.citizen)

        # Link 1st phone -> Success
        res1 = self.client.post("/auth/link-phone", {"secondary_phone": "+923111111111"}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertTrue(res1.json()["success"])

        # Link 2nd phone -> Success
        res2 = self.client.post("/auth/link-phone", {"secondary_phone": "+923222222222"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.json()["success"])

        # Check /auth/me reflects both linked numbers
        me_res = self.client.get("/auth/me")
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        linked_list = me_res.json()["data"]["linked_phones"]
        self.assertEqual(len(linked_list), 2)
        self.assertIn("+923111111111", linked_list)
        self.assertIn("+923222222222", linked_list)

        # Link 3rd phone -> Exceeds max 2 -> Rejected with 400
        res3 = self.client.post("/auth/link-phone", {"secondary_phone": "+923333333333"}, format="json")
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        body3 = res3.json()
        self.assertFalse(body3["success"])
        self.assertEqual(body3["error"]["code"], "MAX_PHONES_EXCEEDED")

    def test_fr01_role_based_dashboard_routes_on_login(self):
        """FR-01: Verify role-based dashboard route returned on login for Citizen, Official, Super Admin."""
        # 1. Citizen login
        res_cit = self.client.post("/auth/login", {
            "identifier": "42101-1000001-1",
            "password": "CitizenPassword123!",
        }, format="json")
        self.assertEqual(res_cit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cit.json()["data"]["dashboard_route"], "/citizen/portal")
        self.assertEqual(res_cit.json()["data"]["role"], "CITIZEN")

        # 2. Government Official login
        res_off = self.client.post("/auth/login", {
            "identifier": "42201-2000002-2",
            "password": "OfficialPassword123!",
        }, format="json")
        self.assertEqual(res_off.status_code, status.HTTP_200_OK)
        self.assertEqual(res_off.json()["data"]["dashboard_route"], "/admin/dashboard")
        self.assertEqual(res_off.json()["data"]["role"], "GOVT_OFFICIAL")
        self.assertEqual(res_off.json()["data"]["assigned_org"], "KWSC")

        # 3. Super Admin login
        res_adm = self.client.post("/auth/login", {
            "identifier": "42000-0000000-0",
            "password": "SuperAdminPassword123!",
        }, format="json")
        self.assertEqual(res_adm.status_code, status.HTTP_200_OK)
        self.assertEqual(res_adm.json()["data"]["dashboard_route"], "/admin/super")
        self.assertEqual(res_adm.json()["data"]["role"], "SUPER_ADMIN")

    def test_fr01_login_with_linked_phone(self):
        """FR-01: Citizen can authenticate using any linked phone number."""
        LinkedPhone.objects.create(user=self.citizen, phone_number="+923450001111")
        res = self.client.post("/auth/login", {
            "identifier": "+923450001111",
            "password": "CitizenPassword123!",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.json()["success"])
        self.assertEqual(res.json()["data"]["cnic"], self.citizen.cnic)

    # =========================================================================
    # FR-02 & FR-04: Report Ingestion with Optional GPS vs Landmark Hint
    # =========================================================================

    def test_fr02_fr04_submit_with_gps_coordinates(self):
        """FR-02 & FR-04: Report submission with GPS coordinates returns job_id and queues buffer."""
        payload = {
            "text": "Severe water pressure loss across Block 13-D",
            "lat": 24.9300,
            "lng": 67.0850,
            "landmark": "Near Hassan Square",
        }
        res = self.client.post("/api/reports/submit", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        body = res.json()
        self.assertTrue(body["success"])
        job_id = body["data"]["job_id"]
        self.assertTrue(job_id.startswith("job_"))
        self.assertEqual(body["data"]["status"], "QUEUED")

        # Verify buffer record in DB
        job = JobBuffer.objects.get(job_id=job_id)
        self.assertEqual(job.lat, 24.9300)
        self.assertEqual(job.lng, 67.0850)
        self.assertEqual(job.landmark_hint, "Near Hassan Square")
        self.assertEqual(job.status, "QUEUED")

    def test_fr02_fr04_submit_without_gps_landmark_only(self):
        """FR-04: Flexible location ingestion: GPS is optional; landmark hint is stored."""
        payload = {
            "text": "Overflowing garbage dumpster blocking the lane",
            "landmark": "Behind Empress Market, Saddar",
        }
        res = self.client.post("/api/reports/submit", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        body = res.json()
        self.assertTrue(body["success"])
        job_id = body["data"]["job_id"]

        job = JobBuffer.objects.get(job_id=job_id)
        self.assertIsNone(job.lat)
        self.assertIsNone(job.lng)
        self.assertEqual(job.landmark_hint, "Behind Empress Market, Saddar")

    def test_fr02_internal_job_detail_endpoint_contract(self):
        """FR-02: Worker internal API GET /api/internal/jobs/{job_id} returns exact contract."""
        job = JobBuffer.objects.create(
            job_id="job_audit_internal_01",
            user=self.citizen,
            source="web",
            raw_text="Broken water valve flooding alleyway",
            lat=24.9123,
            lng=67.0456,
            landmark_hint="Golimar Chowrangi",
        )
        res = self.client.get(f"/api/internal/jobs/{job.job_id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertEqual(data["job_id"], job.job_id)
        self.assertEqual(data["citizen_cnic"], self.citizen.cnic)
        self.assertEqual(data["phone"], self.citizen.primary_phone)
        self.assertEqual(data["text"], "Broken water valve flooding alleyway")
        self.assertEqual(data["location"]["lat"], 24.9123)
        self.assertEqual(data["location"]["lng"], 67.0456)
        self.assertEqual(data["landmark_hint"], "Golimar Chowrangi")

    # =========================================================================
    # FR-06: Spatiotemporal Deduplication Query (50m Radius Calculation)
    # =========================================================================

    def test_fr06_spatiotemporal_dedup_within_50m(self):
        """FR-06: Active incidents search matches existing cluster within 50m radius."""
        # self.kwsc_incident is at lat=24.9180, lng=67.0971
        # A point at lat=24.9181, lng=67.0972 is ~15 meters away
        res = self.client.get("/api/internal/active-incidents", {
            "category": "Sewerage Overflow",
            "lat": 24.9181,
            "lng": 67.0972,
            "radius_m": 50,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertIsNotNone(data)
        self.assertEqual(data["matching_master_id"], str(self.kwsc_incident.id))
        self.assertLessEqual(data["distance_meters"], 50.0)
        self.assertEqual(data["current_reports_count"], 3)

    def test_fr06_spatiotemporal_dedup_exceeding_50m_returns_none(self):
        """FR-06: Query at > 50m distance does NOT match the cluster."""
        # A point at lat=24.9200, lng=67.0971 is ~222 meters away
        res = self.client.get("/api/internal/active-incidents", {
            "category": "Sewerage Overflow",
            "lat": 24.9200,
            "lng": 67.0971,
            "radius_m": 50,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertIsNone(body["data"])

    def test_fr06_spatiotemporal_dedup_category_mismatch_returns_none(self):
        """FR-06: Spatial proximity with different category does NOT cluster."""
        # Query at identical coordinates but different category
        res = self.client.get("/api/internal/active-incidents", {
            "category": "Major Road / Pothole",
            "lat": 24.9180,
            "lng": 67.0971,
            "radius_m": 50,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertIsNone(body["data"])

    # =========================================================================
    # FR-10 & FR-11: Report Confirmation, MasterIncident & ComplaintDossier
    # =========================================================================

    def test_fr10_fr11_confirm_report_creates_master_incident_and_dossier(self):
        """FR-10 & FR-11: Citizen confirmation synthesizes KHI-CIVIC-XXXXX and creates ComplaintDossier."""
        job = JobBuffer.objects.create(
            job_id="job_audit_confirm_01",
            user=self.citizen,
            source="web",
            raw_text="Severe water main burst near Safari Park",
            lat=24.9250,
            lng=67.1150,
            landmark_hint="University Road near Safari Park",
            inferred_authority="KWSC",
            inferred_category="Water Infrastructure",
            inferred_severity="P0",
            layman_summary="Major pipeline rupture diagnosed by AI worker.",
            draft_subject_en="Grievance: Severe Pipeline Burst on University Road",
            draft_body_en="A primary supply main ruptured, inundating pedestrian walkways.",
            draft_body_ur="یونیورسٹی روڈ پر مین واٹر سپلائی پائپ پھٹنے سے سڑک پر پانی جمع ہو گیا۔",
            statutory_citations="Karachi Water and Sewerage Corporation Act 2023, Sec 19",
            status="READY_FOR_REVIEW",
        )

        res = self.client.post("/api/reports/confirm", {"job_id": job.job_id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]

        # 1. Assert tracking_id conforms to KHI-CIVIC-XXXXX format
        tracking_id = data["tracking_id"]
        self.assertRegex(tracking_id, r"^KHI-CIVIC-\d{5}$")
        self.assertEqual(data["target_authority"], "KWSC")
        self.assertEqual(data["official_status"], "PENDING")

        # 2. Assert MasterIncident created in DB
        master = MasterIncident.objects.get(tracking_id=tracking_id)
        self.assertEqual(master.target_authority, "KWSC")
        self.assertEqual(master.issue_category, "Water Infrastructure")
        self.assertEqual(master.severity, "P0")
        self.assertEqual(master.official_status, "PENDING")
        self.assertEqual(master.community_reports_count, 1)

        # 3. Assert ComplaintDossier synthesized with dual-language drafts & statutory citations
        dossier = master.dossier
        self.assertIsNotNone(dossier)
        self.assertEqual(dossier.subject_en, "Grievance: Severe Pipeline Burst on University Road")
        self.assertIn("Karachi Water and Sewerage Corporation Act 2023", dossier.statutory_citations)
        self.assertEqual(dossier.body_ur, "یونیورسٹی روڈ پر مین واٹر سپلائی پائپ پھٹنے سے سڑک پر پانی جمع ہو گیا۔")

        # 4. Assert Incident linked to user and job status CONFIRMED
        incident = Incident.objects.get(job_buffer=job)
        self.assertEqual(incident.master_incident, master)
        self.assertEqual(incident.user, self.citizen)
        job.refresh_from_db()
        self.assertEqual(job.status, "CONFIRMED")

    # =========================================================================
    # FR-12: RBAC Isolation Between Government Department Accounts
    # =========================================================================

    def test_fr12_kwsc_officer_cannot_read_kmc_complaints_forbidden_403(self):
        """FR-12: RBAC isolation: KWSC official accessing KMC complaint returns HTTP 403."""
        self.client.force_authenticate(user=self.kwsc_official)
        res = self.client.get(f"/api/admin/dashboard/complaints/{self.kmc_incident.tracking_id}")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        body = res.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "FORBIDDEN")
        self.assertIn("KWSC", body["error"]["message"])

    def test_fr12_kmc_officer_cannot_read_kwsc_complaints_forbidden_403(self):
        """FR-12: RBAC isolation: KMC official accessing KWSC complaint returns HTTP 403."""
        self.client.force_authenticate(user=self.kmc_official)
        res = self.client.get(f"/api/admin/dashboard/complaints/{self.kwsc_incident.tracking_id}")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        body = res.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "FORBIDDEN")
        self.assertIn("KMC", body["error"]["message"])

    def test_fr12_cross_org_status_update_forbidden_403(self):
        """FR-12: RBAC isolation: Official attempting to mutate cross-agency ticket receives 403."""
        self.client.force_authenticate(user=self.kwsc_official)
        res = self.client.patch(
            f"/api/admin/dashboard/complaints/{self.kmc_incident.tracking_id}/status",
            {"official_status": "IN_PROGRESS"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.json()["error"]["code"], "FORBIDDEN")

    def test_fr12_citizen_cannot_access_admin_dashboard_endpoints(self):
        """FR-12: Citizens attempting to access government admin dashboard receive 403."""
        self.client.force_authenticate(user=self.citizen)

        res_overview = self.client.get("/api/admin/dashboard/overview")
        self.assertEqual(res_overview.status_code, status.HTTP_403_FORBIDDEN)

        res_complaints = self.client.get("/api/admin/dashboard/complaints")
        self.assertEqual(res_complaints.status_code, status.HTTP_403_FORBIDDEN)

        res_detail = self.client.get(f"/api/admin/dashboard/complaints/{self.kwsc_incident.tracking_id}")
        self.assertEqual(res_detail.status_code, status.HTTP_403_FORBIDDEN)

    def test_fr12_dashboard_complaints_strictly_scoped_by_agency(self):
        """FR-12: Official complaints feed strictly filtered by assigned agency."""
        # 1. KWSC Official
        self.client.force_authenticate(user=self.kwsc_official)
        res_kwsc = self.client.get("/api/admin/dashboard/complaints")
        self.assertEqual(res_kwsc.status_code, status.HTTP_200_OK)
        kwsc_results = res_kwsc.json()["data"]["results"]
        for item in kwsc_results:
            master = MasterIncident.objects.get(tracking_id=item["tracking_id"])
            self.assertEqual(master.target_authority, "KWSC")

        # 2. KMC Official
        self.client.force_authenticate(user=self.kmc_official)
        res_kmc = self.client.get("/api/admin/dashboard/complaints")
        self.assertEqual(res_kmc.status_code, status.HTTP_200_OK)
        kmc_results = res_kmc.json()["data"]["results"]
        for item in kmc_results:
            master = MasterIncident.objects.get(tracking_id=item["tracking_id"])
            self.assertEqual(master.target_authority, "KMC")

    # =========================================================================
    # FR-13: Status Lifecycle Transitions (PENDING -> IN_PROGRESS -> RESOLVED)
    # =========================================================================

    def test_fr13_status_lifecycle_transitions_with_official_notes(self):
        """FR-13: Official transitions complaint status PENDING -> IN_PROGRESS -> RESOLVED with notes."""
        self.client.force_authenticate(user=self.kwsc_official)
        incident_id = self.kwsc_incident.tracking_id

        # 1. Verify initial status is PENDING
        self.kwsc_incident.refresh_from_db()
        self.assertEqual(self.kwsc_incident.official_status, "PENDING")

        # 2. Transition PENDING -> IN_PROGRESS with dispatch notes
        res_progress = self.client.patch(
            f"/api/admin/dashboard/complaints/{incident_id}/status",
            {
                "official_status": "IN_PROGRESS",
                "official_notes": "Sewer suction truck and repair crew dispatched to Disco Bakery.",
            },
            format="json",
        )
        self.assertEqual(res_progress.status_code, status.HTTP_200_OK)
        self.assertEqual(res_progress.json()["data"]["new_status"], "IN_PROGRESS")

        self.kwsc_incident.refresh_from_db()
        self.assertEqual(self.kwsc_incident.official_status, "IN_PROGRESS")
        self.assertEqual(
            self.kwsc_incident.dossier.official_notes,
            "Sewer suction truck and repair crew dispatched to Disco Bakery.",
        )

        # 3. Transition IN_PROGRESS -> RESOLVED with completion notes
        res_resolved = self.client.patch(
            f"/api/admin/dashboard/complaints/{incident_id}/status",
            {
                "official_status": "RESOLVED",
                "official_notes": "Blockage cleared, pipeline restored, site sanitized.",
            },
            format="json",
        )
        self.assertEqual(res_resolved.status_code, status.HTTP_200_OK)
        self.assertEqual(res_resolved.json()["data"]["new_status"], "RESOLVED")

        self.kwsc_incident.refresh_from_db()
        self.assertEqual(self.kwsc_incident.official_status, "RESOLVED")
        self.assertEqual(
            self.kwsc_incident.dossier.official_notes,
            "Blockage cleared, pipeline restored, site sanitized.",
        )

    def test_fr13_invalid_status_transition_returns_400(self):
        """FR-13: Transitioning to an unknown/invalid status returns 400 Bad Request."""
        self.client.force_authenticate(user=self.kwsc_official)
        res = self.client.patch(
            f"/api/admin/dashboard/complaints/{self.kwsc_incident.tracking_id}/status",
            {"official_status": "CLOSED_WITHOUT_ACTION"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json()["error"]["code"], "INVALID_INPUT")

    # =========================================================================
    # Super Admin Overview: Visibility Across All 4 Municipal Agencies
    # =========================================================================

    def test_super_admin_overview_returns_all_4_agencies(self):
        """Super Admin: GET /api/admin/super/overview returns breakdown across KWSC, KMC, SSWMB, CANTONMENT."""
        self.client.force_authenticate(user=self.super_admin)
        res = self.client.get("/api/admin/super/overview")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]

        # Verify city_breakdown contains all 4 mandatory authorities
        breakdown = data["city_breakdown"]
        required_agencies = ["KWSC", "KMC", "SSWMB", "CANTONMENT"]
        for agency in required_agencies:
            self.assertIn(agency, breakdown, f"Missing agency in super admin overview: {agency}")
            self.assertIn("total_clusters", breakdown[agency])
            self.assertIn("pending", breakdown[agency])
            self.assertIn("in_progress", breakdown[agency])
            self.assertIn("resolved", breakdown[agency])
            self.assertIn("critical_p0", breakdown[agency])

        # Verify queue health
        self.assertIn("queue_health", data)
        self.assertIn("status", data["queue_health"])

    def test_super_admin_overview_forbidden_for_regular_officials(self):
        """Super Admin: Regular officials are blocked from global super admin overview with 403."""
        self.client.force_authenticate(user=self.kwsc_official)
        res = self.client.get("/api/admin/super/overview")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.json()["error"]["code"], "FORBIDDEN")

    # =========================================================================
    # Exact Contract Shapes for Remaining Endpoints
    # =========================================================================

    def test_contract_health_endpoint(self):
        """Health check contract: GET /health returns {success: True, data: {status: 'ok'}, error: None}."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["status"], "ok")
        self.assertIsNone(body["error"])

    def test_contract_spatial_boundaries_endpoint(self):
        """Internal worker contract: GET /api/internal/spatial-boundaries returns GeoJSON FeatureCollection."""
        res = self.client.get("/api/internal/spatial-boundaries")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertIsInstance(data["features"], list)
        self.assertGreater(len(data["features"]), 0)

    def test_contract_ai_config_endpoint(self):
        """Internal worker contract: GET /api/internal/ai-config returns smart/fast tiers & fallback."""
        res = self.client.get("/api/internal/ai-config")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertIn("tiers", data)
        self.assertIn("fast", data["tiers"])
        self.assertIn("smart", data["tiers"])
        self.assertIn("fallback_order", data)

    def test_contract_worker_callback_endpoint(self):
        """Internal worker callback: POST /api/internal/worker-callback populates inferred fields."""
        job = JobBuffer.objects.create(
            job_id="job_audit_cb_01",
            raw_text="Broken streetlight causing accidents",
            status="QUEUED",
        )
        payload = {
            "job_id": job.job_id,
            "classification": {
                "issue_category": "Street Lighting",
                "severity": "P1",
                "target_authority": "KMC",
                "landmark": "Shahrah-e-Faisal near Nursery",
            },
            "review_package": {
                "layman_summary": "Non-functional streetlights identified on major corridor.",
                "subject_en": "Defect: Street Lighting Failure on Shahrah-e-Faisal",
                "body_en": "Multiple streetlights non-operational, hazard for vehicular traffic.",
                "body_ur": "شاہراہ فیصل پر اسٹریٹ لائٹس بند ہیں جس سے حادثات کا خطرہ ہے۔",
                "statutory_citations": "Sindh Local Government Act 2013, KMC Roads & Lighting",
            },
        }
        res = self.client.post("/api/internal/worker-callback", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["data"]["received"])

        job.refresh_from_db()
        self.assertEqual(job.status, "READY_FOR_REVIEW")
        self.assertEqual(job.inferred_authority, "KMC")
        self.assertEqual(job.inferred_category, "Street Lighting")
        self.assertEqual(job.layman_summary, "Non-functional streetlights identified on major corridor.")

    def test_contract_whatsapp_inbound_endpoint(self):
        """WhatsApp intake webhook: POST /api/whatsapp/inbound auto-provisions citizen and queues job."""
        payload = {
            "sender_phone": "+923459998877",
            "senderName": "WhatsApp Citizen Karachi",
            "text": "Open sewer manhole outside school gate",
            "location": {"lat": 24.8900, "lng": 67.0600},
        }
        res = self.client.post("/api/whatsapp/inbound", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertTrue(body["success"])
        job_id = body["data"]["job_id"]
        self.assertTrue(job_id.startswith("job_"))

        job = JobBuffer.objects.get(job_id=job_id)
        self.assertEqual(job.source, "whatsapp")
        self.assertEqual(job.user.primary_phone, "+923459998877")
        self.assertEqual(job.lat, 24.8900)
        self.assertEqual(job.lng, 67.0600)


if __name__ == "__main__":
    from django.test.runner import DiscoverRunner
    runner = DiscoverRunner(verbosity=2)
    failures = runner.run_tests(["tests.audit_srs"])
    sys.exit(bool(failures))
