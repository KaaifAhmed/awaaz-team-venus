import uuid

from django.conf import settings
from django.db import models


class JobBuffer(models.Model):
    """Holds unclustered, unreviewed citizen submissions."""

    STATUS_CHOICES = [
        ("QUEUED", "Queued in Redis"),
        ("PROCESSING", "AI Inference in Progress"),
        ("READY_FOR_REVIEW", "Review Package Ready"),
        ("CONFIRMED", "Confirmed by Citizen"),
        ("FAILED", "Processing Failed"),
    ]

    SOURCE_CHOICES = [
        ("web", "Web Portal"),
        ("whatsapp", "WhatsApp"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_id = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="web")
    raw_text = models.TextField(blank=True, default="")
    image_file = models.FileField(upload_to="complaints/images/", null=True, blank=True)
    audio_file = models.FileField(upload_to="complaints/audio/", null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    landmark_hint = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="QUEUED")

    # Inferred data populated by worker callback
    inferred_category = models.CharField(max_length=100, null=True, blank=True)
    inferred_authority = models.CharField(max_length=50, null=True, blank=True)
    inferred_severity = models.CharField(max_length=10, null=True, blank=True)
    layman_summary = models.TextField(null=True, blank=True)
    draft_subject_en = models.CharField(max_length=255, null=True, blank=True)
    draft_body_en = models.TextField(null=True, blank=True)
    draft_body_ur = models.TextField(null=True, blank=True)
    statutory_citations = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.job_id} ({self.status})"


class MasterIncident(models.Model):
    """Clustered, verified civic incident stacking multiple community reports."""

    AUTHORITY_CHOICES = [
        ("KWSC", "KW&SC"),
        ("KMC", "KMC"),
        ("SSWMB", "SSWMB"),
        ("CANTONMENT", "Cantonment"),
    ]

    SEVERITY_CHOICES = [
        ("P0", "P0 - Emergency / Critical Hazard"),
        ("P1", "P1 - Major Disruption"),
        ("P2", "P2 - Routine Maintenance"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending Department Action"),
        ("IN_PROGRESS", "Crews Dispatched / In Progress"),
        ("RESOLVED", "Resolved"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_id = models.CharField(max_length=32, unique=True, db_index=True)
    target_authority = models.CharField(max_length=20, choices=AUTHORITY_CHOICES)
    issue_category = models.CharField(max_length=100)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="P1")
    official_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")

    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    landmark = models.CharField(max_length=255)
    community_reports_count = models.PositiveIntegerField(default=1)

    first_reported_at = models.DateTimeField(auto_now_add=True)
    last_reported_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.tracking_id} [{self.target_authority}] {self.issue_category}"


class Incident(models.Model):
    """Single citizen report linked to a MasterIncident cluster."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    master_incident = models.ForeignKey(MasterIncident, on_delete=models.CASCADE, related_name="reports")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    job_buffer = models.OneToOneField(JobBuffer, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Incident {self.id} -> {self.master_incident.tracking_id}"


class ComplaintDossier(models.Model):
    """Formal statutory complaint document associated with a MasterIncident."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    master_incident = models.OneToOneField(MasterIncident, on_delete=models.CASCADE, related_name="dossier")
    statutory_citations = models.TextField(blank=True, default="")
    subject_en = models.CharField(max_length=255, blank=True, default="")
    body_en = models.TextField(blank=True, default="")
    body_ur = models.TextField(blank=True, default="")
    official_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dossier for {self.master_incident.tracking_id}"
