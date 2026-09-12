import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class UserAccount(AbstractUser):
    ROLE_CHOICES = [
        ("CITIZEN", "Citizen"),
        ("GOVT_OFFICIAL", "Government Official"),
        ("SUPER_ADMIN", "Super Administrator"),
        ("AI_AGENT", "AI Worker Agent"),
    ]

    ORG_CHOICES = [
        ("KWSC", "Karachi Water & Sewerage Corporation"),
        ("KMC", "Karachi Metropolitan Corporation"),
        ("SSWMB", "Sindh Solid Waste Management Board"),
        ("CANTONMENT", "Cantonment Boards"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cnic = models.CharField(max_length=15, unique=True, db_index=True, null=True, blank=True)
    primary_phone = models.CharField(max_length=20, unique=True, db_index=True, null=True, blank=True)
    full_name = models.CharField(max_length=255, blank=True, default="")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="CITIZEN")
    assigned_org = models.CharField(max_length=20, choices=ORG_CHOICES, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.cnic or self.primary_phone or str(self.id)
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

    def get_dashboard_route(self):
        if self.role == "CITIZEN":
            return "/citizen/portal"
        elif self.role == "GOVT_OFFICIAL":
            return "/admin/dashboard"
        elif self.role == "SUPER_ADMIN":
            return "/admin/super"
        return "/citizen/portal"

    def __str__(self):
        return f"{self.full_name or self.username} ({self.role})"


class LinkedPhone(models.Model):
    """Allows linking secondary phone/WhatsApp numbers to a single CNIC UserAccount."""

    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name="linked_phones")
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.phone_number}"
