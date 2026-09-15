from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ComplaintDossier, Incident, JobBuffer, MasterIncident

User = get_user_model()


class CoreCivicEngineTests(APITestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            username="42101-1234567-1",
            cnic="42101-1234567-1",
            full_name="Citizen User",
            primary_phone="+923001234567",
            password="password123",
            role="CITIZEN",
        )
        self.kwsc_official = User.objects.create_user(
            username="42201-1111111-1",
            cnic="42201-1111111-1",
            full_name="KWSC Inspector",
            primary_phone="+923001111111",
            password="password123",
            role="GOVT_OFFICIAL",
            assigned_org="KWSC",
        )
        self.kmc_official = User.objects.create_user(
            username="42201-2222222-2",
            cnic="42201-2222222-2",
            full_name="KMC Engineer",
            primary_phone="+923002222222",
            password="password123",
            role="GOVT_OFFICIAL",
            assigned_org="KMC",
        )
        self.super_admin = User.objects.create_user(
            username="42000-0000000-0",
            cnic="42000-0000000-0",
            full_name="Admin",
            primary_phone="+923000000000",
            password="password123",
            role="SUPER_ADMIN",
            is_staff=True,
            is_superuser=True,
        )

        # Pre-seed a KWSC MasterIncident and a KMC MasterIncident
        self.kwsc_incident = MasterIncident.objects.create(
            tracking_id="AWZ-11111",
            target_authority="KWSC",
            issue_category="Sewerage Overflow",
            severity="P0",
            official_status="PENDING",
            lat=24.9180,
            lng=67.0971,
            landmark="Disco Bakery Gulshan",
            community_reports_count=2,
        )
        ComplaintDossier.objects.create(
            master_incident=self.kwsc_incident,
            statutory_citations="KW&SC Act 2023",
            subject_en="Grievance: Severe Sewage Overflow",
            body_en="Sewage overflow blocking street.",
            body_ur="سیوریج کا گندا پانی سڑک پر جمع ہے۔",
            official_notes="Initial inspection pending",
        )

        self.kmc_incident = MasterIncident.objects.create(
            tracking_id="AWZ-22222",
            target_authority="KMC",
            issue_category="Pothole / Road Repair",
            severity="P1",
            official_status="PENDING",
            lat=24.8600,
            lng=67.0100,
            landmark="M.A. Jinnah Road",
            community_reports_count=1,
        )

    # ------------------------------------------------------------------------
    # Citizen Reports API Tests
    # ------------------------------------------------------------------------

    def test_submit_report_registers_job_buffer_and_returns_202(self):
        payload = {
            "text": "Main water line leakage outside house 14-B",
            "lat": 24.9200,
            "lng": 67.0900,
            "landmark": "Near Disco Bakery",
        }
        response = self.client.post("/api/reports/submit", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        res_json = response.json()
        self.assertTrue(res_json["success"])
        self.assertTrue(res_json["data"]["job_id"].startswith("job_"))
        self.assertEqual(res_json["data"]["status"], "QUEUED")

        # Verify record in JobBuffer
        job = JobBuffer.objects.get(job_id=res_json["data"]["job_id"])
        self.assertEqual(job.raw_text, payload["text"])
        self.assertEqual(job.status, "QUEUED")

    def test_review_report_when_processing_and_when_ready(self):
        job = JobBuffer.objects.create(
            job_id="job_test_review_1",
            raw_text="Broken drainage",
            status="QUEUED",
        )
        # 1. While queued/processing
        resp = self.client.get(f"/api/reports/review/{job.job_id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["data"]["status"], "PROCESSING")

        # 2. When ready for review
        job.status = "READY_FOR_REVIEW"
        job.inferred_authority = "KWSC"
        job.inferred_category = "Sewerage"
        job.inferred_severity = "P0"
        job.layman_summary = "Sewage overflow verified"
        job.draft_subject_en = "URGENT: SEWAGE OVERFLOW"
        job.draft_body_en = "Formal complaint..."
        job.save()

        resp_ready = self.client.get(f"/api/reports/review/{job.job_id}")
        self.assertEqual(resp_ready.status_code, status.HTTP_200_OK)
        res_json = resp_ready.json()
        self.assertEqual(res_json["data"]["status"], "READY_FOR_REVIEW")
        self.assertEqual(res_json["data"]["target_authority"], "KWSC")
        self.assertEqual(res_json["data"]["draft_complaint"]["subject_en"], "URGENT: SEWAGE OVERFLOW")

    def test_confirm_report_creates_master_incident_and_dossier(self):
        job = JobBuffer.objects.create(
            job_id="job_test_confirm_1",
            user=self.citizen,
            raw_text="Broken sewer pipe",
            inferred_authority="KWSC",
            inferred_category="Sewerage",
            inferred_severity="P0",
            draft_subject_en="Grievance: Broken Pipe",
            draft_body_en="Water gushing out into market",
            draft_body_ur="پائپ لائن ٹوٹ گئی ہے۔",
            statutory_citations="KW&SC Act 2023 Sec 24",
            status="READY_FOR_REVIEW",
        )
        payload = {"job_id": job.job_id, "action": "SUBMIT"}
        response = self.client.post("/api/reports/confirm", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertTrue(res_json["success"])
        tracking_id = res_json["data"]["tracking_id"]
        self.assertTrue(tracking_id.startswith("AWZ-"))

        # Verify DB artifacts
        job.refresh_from_db()
        self.assertEqual(job.status, "CONFIRMED")
        incident = Incident.objects.get(job_buffer=job)
        self.assertEqual(incident.master_incident.tracking_id, tracking_id)
        self.assertEqual(incident.master_incident.target_authority, "KWSC")
        dossier = incident.master_incident.dossier
        self.assertEqual(dossier.subject_en, "Grievance: Broken Pipe")

    def test_my_complaints_returns_authenticated_citizen_reports(self):
        self.client.force_authenticate(user=self.citizen)
        Incident.objects.create(
            master_incident=self.kwsc_incident,
            user=self.citizen,
            job_buffer=JobBuffer.objects.create(job_id="job_my_1", user=self.citizen),
        )
        response = self.client.get("/api/reports/my-complaints")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertTrue(res_json["success"])
        self.assertEqual(len(res_json["data"]), 1)
        self.assertEqual(res_json["data"][0]["tracking_id"], self.kwsc_incident.tracking_id)

    # ------------------------------------------------------------------------
    # Internal Worker APIs Tests
    # ------------------------------------------------------------------------

    def test_internal_get_job_detail(self):
        job = JobBuffer.objects.create(
            job_id="job_internal_1",
            user=self.citizen,
            source="web",
            raw_text="Dangerous open manhole on street 4",
            lat=24.9150,
            lng=67.0950,
            landmark_hint="Gulshan Block 4",
        )
        response = self.client.get(f"/api/internal/jobs/{job.job_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertEqual(res_json["data"]["job_id"], job.job_id)
        self.assertEqual(res_json["data"]["citizen_cnic"], self.citizen.cnic)
        self.assertEqual(res_json["data"]["location"]["lat"], 24.9150)

    def test_internal_spatial_boundaries_returns_features(self):
        response = self.client.get("/api/internal/spatial-boundaries")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertEqual(res_json["data"]["type"], "FeatureCollection")
        self.assertGreaterEqual(len(res_json["data"]["features"]), 30)

    def test_internal_active_incidents_search_finds_nearby(self):
        # Coordinates very close to self.kwsc_incident (24.9180, 67.0971)
        response = self.client.get("/api/internal/active-incidents?category=Sewerage Overflow&lat=24.9181&lng=67.0972&radius_m=100")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertIsNotNone(res_json["data"])
        self.assertEqual(res_json["data"]["matching_master_id"], str(self.kwsc_incident.id))
        self.assertLess(res_json["data"]["distance_meters"], 50)

    def test_internal_worker_callback_populates_inferred_fields(self):
        job = JobBuffer.objects.create(
            job_id="job_callback_1",
            raw_text="Garbage heap burning",
            status="QUEUED",
        )
        payload = {
            "job_id": job.job_id,
            "classification": {
                "issue_category": "Solid Waste",
                "severity": "P1",
                "target_authority": "SSWMB",
                "landmark": "Near Liaquatabad Flyover",
            },
            "clustering": {
                "is_clustered": False,
            },
            "review_package": {
                "layman_summary": "Uncollected burning trash identified",
                "subject_en": "Formal Grievance: Open Waste Incineration",
                "body_en": "Solid waste burning near residential area.",
                "body_ur": "کچرا جلایا جا رہا ہے۔",
                "statutory_citations": "Sindh Solid Waste Management Board Act 2014",
            },
        }
        response = self.client.post("/api/internal/worker-callback", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["data"]["received"])

        job.refresh_from_db()
        self.assertEqual(job.status, "READY_FOR_REVIEW")
        self.assertEqual(job.inferred_authority, "SSWMB")
        self.assertEqual(job.inferred_category, "Solid Waste")
        self.assertEqual(job.draft_subject_en, "Formal Grievance: Open Waste Incineration")

    # ------------------------------------------------------------------------
    # Admin Dashboard APIs (RBAC Enforced) Tests
    # ------------------------------------------------------------------------

    def test_admin_dashboard_forbidden_for_citizens(self):
        self.client.force_authenticate(user=self.citizen)
        resp_overview = self.client.get("/api/admin/dashboard/overview")
        self.assertEqual(resp_overview.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resp_overview.json()["error"]["code"], "FORBIDDEN")

        resp_complaints = self.client.get("/api/admin/dashboard/complaints")
        self.assertEqual(resp_complaints.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_dashboard_overview_scoped_to_assigned_org(self):
        self.client.force_authenticate(user=self.kwsc_official)
        response = self.client.get("/api/admin/dashboard/overview")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertEqual(res_json["data"]["organization"], "KWSC")
        self.assertEqual(res_json["data"]["metrics"]["total_active_clusters"], 1)
        self.assertEqual(res_json["data"]["metrics"]["critical_p0_count"], 1)

    def test_admin_dashboard_complaints_filtered_by_assigned_org(self):
        self.client.force_authenticate(user=self.kwsc_official)
        response = self.client.get("/api/admin/dashboard/complaints")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        results = res_json["data"]["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["tracking_id"], self.kwsc_incident.tracking_id)

    def test_admin_complaint_detail_cross_org_access_forbidden(self):
        # KWSC official attempts to access KMC incident
        self.client.force_authenticate(user=self.kwsc_official)
        response = self.client.get(f"/api/admin/dashboard/complaints/{self.kmc_incident.tracking_id}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()["error"]["code"], "FORBIDDEN")

    def test_admin_complaint_status_update_success(self):
        self.client.force_authenticate(user=self.kwsc_official)
        payload = {
            "official_status": "IN_PROGRESS",
            "official_notes": "Repair crew dispatched with suction van.",
        }
        response = self.client.patch(f"/api/admin/dashboard/complaints/{self.kwsc_incident.tracking_id}/status", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["data"]["new_status"], "IN_PROGRESS")

        self.kwsc_incident.refresh_from_db()
        self.assertEqual(self.kwsc_incident.official_status, "IN_PROGRESS")
        self.assertEqual(self.kwsc_incident.dossier.official_notes, "Repair crew dispatched with suction van.")

    def test_super_admin_overview_access_and_city_breakdown(self):
        # GOVT official cannot access super admin overview
        self.client.force_authenticate(user=self.kwsc_official)
        forbidden_resp = self.client.get("/api/admin/super/overview")
        self.assertEqual(forbidden_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Super admin has full visibility
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get("/api/admin/super/overview")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertIn("KWSC", res_json["data"]["city_breakdown"])
        self.assertIn("KMC", res_json["data"]["city_breakdown"])
        self.assertIn("queue_health", res_json["data"])

    # ------------------------------------------------------------------------
    # WhatsApp Inbound Webhook Tests
    # ------------------------------------------------------------------------

    def test_whatsapp_inbound_provisions_user_and_queues_job(self):
        payload = {
            "sender_phone": "+923331234567",
            "senderName": "WhatsApp Citizen",
            "text": "Severe water crisis in Orangi Town Sector 11",
            "location": {"lat": 24.9450, "lng": 66.9800},
        }
        response = self.client.post("/api/whatsapp/inbound", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertTrue(res_json["success"])
        job_id = res_json["data"]["job_id"]

        job = JobBuffer.objects.get(job_id=job_id)
        self.assertEqual(job.source, "whatsapp")
        self.assertEqual(job.raw_text, payload["text"])
        self.assertEqual(job.user.primary_phone, "+923331234567")
        self.assertEqual(job.status, "QUEUED")
