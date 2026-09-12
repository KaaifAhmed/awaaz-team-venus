from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class UserAuthenticationTests(APITestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            username="42101-1234567-1",
            cnic="42101-1234567-1",
            full_name="Muhammad Ali Citizen",
            primary_phone="+923001234567",
            password="password123",
            role="CITIZEN",
        )
        self.official = User.objects.create_user(
            username="42201-1111111-1",
            cnic="42201-1111111-1",
            full_name="Engr. Tariq Aziz",
            primary_phone="+923001111111",
            password="password123",
            role="GOVT_OFFICIAL",
            assigned_org="KWSC",
        )

    def test_register_with_valid_payload_creates_citizen_and_returns_token(self):
        payload = {
            "cnic": "42101-9999999-9",
            "full_name": "Ayesha Khan",
            "primary_phone": "+923009999999",
            "password": "securepassword123",
        }
        response = self.client.post("/auth/register", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        res_json = response.json()
        self.assertTrue(res_json["success"])
        self.assertEqual(res_json["data"]["cnic"], "42101-9999999-9")
        self.assertEqual(res_json["data"]["role"], "CITIZEN")
        self.assertEqual(res_json["data"]["dashboard_route"], "/citizen/portal")
        self.assertIn("token", res_json["data"])

    def test_register_with_duplicate_cnic_returns_400(self):
        payload = {
            "cnic": "42101-1234567-1",
            "full_name": "Duplicate Person",
            "primary_phone": "+923005555555",
            "password": "securepassword123",
        }
        response = self.client.post("/auth/register", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        res_json = response.json()
        self.assertFalse(res_json["success"])
        self.assertEqual(res_json["error"]["code"], "INVALID_INPUT")

    def test_login_with_valid_cnic_returns_token(self):
        payload = {
            "identifier": "42101-1234567-1",
            "password": "password123",
        }
        response = self.client.post("/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertTrue(res_json["success"])
        self.assertEqual(res_json["data"]["role"], "CITIZEN")
        self.assertIn("token", res_json["data"])

    def test_login_with_valid_phone_returns_token(self):
        payload = {
            "identifier": "+923001234567",
            "password": "password123",
        }
        response = self.client.post("/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertTrue(res_json["success"])
        self.assertEqual(res_json["data"]["cnic"], "42101-1234567-1")

    def test_login_as_official_returns_org_and_admin_route(self):
        payload = {
            "identifier": "42201-1111111-1",
            "password": "password123",
        }
        response = self.client.post("/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_json = response.json()
        self.assertEqual(res_json["data"]["role"], "GOVT_OFFICIAL")
        self.assertEqual(res_json["data"]["assigned_org"], "KWSC")
        self.assertEqual(res_json["data"]["dashboard_route"], "/admin/dashboard")

    def test_login_with_invalid_password_returns_401(self):
        payload = {
            "identifier": "42101-1234567-1",
            "password": "wrongpassword",
        }
        response = self.client.post("/auth/login", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        res_json = response.json()
        self.assertFalse(res_json["success"])
        self.assertEqual(res_json["error"]["code"], "INVALID_CREDENTIALS")

    def test_link_phone_success_and_reflected_in_me(self):
        self.client.force_authenticate(user=self.citizen)
        link_payload = {"secondary_phone": "+923129876543"}
        link_resp = self.client.post("/auth/link-phone", link_payload, format="json")
        self.assertEqual(link_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(link_resp.json()["success"])

        me_resp = self.client.get("/auth/me")
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        me_json = me_resp.json()
        self.assertIn("+923129876543", me_json["data"]["linked_phones"])

    def test_link_phone_duplicate_returns_400(self):
        self.client.force_authenticate(user=self.citizen)
        link_payload = {"secondary_phone": "+923001111111"}  # Already used by official
        response = self.client.post("/auth/link-phone", link_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.json()["success"])
