from django.contrib import admin

from .models import ComplaintDossier, Incident, JobBuffer, MasterIncident


@admin.register(JobBuffer)
class JobBufferAdmin(admin.ModelAdmin):
    list_display = ("job_id", "source", "status", "inferred_authority", "inferred_severity", "created_at")
    search_fields = ("job_id", "raw_text", "landmark_hint")


@admin.register(MasterIncident)
class MasterIncidentAdmin(admin.ModelAdmin):
    list_display = ("tracking_id", "target_authority", "issue_category", "severity", "official_status", "community_reports_count")
    list_filter = ("target_authority", "severity", "official_status")
    search_fields = ("tracking_id", "landmark", "issue_category")


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ("id", "master_incident", "user", "created_at")


@admin.register(ComplaintDossier)
class ComplaintDossierAdmin(admin.ModelAdmin):
    list_display = ("master_incident", "subject_en", "created_at")
