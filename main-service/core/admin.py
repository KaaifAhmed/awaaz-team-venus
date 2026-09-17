from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import ComplaintDossier, ConversationSession, Incident, JobBuffer, MasterIncident, SessionAttachment


@admin.register(JobBuffer)
class JobBufferAdmin(admin.ModelAdmin):
    list_display = ("job_id", "source", "status", "inferred_authority", "inferred_severity", "created_at")
    search_fields = ("job_id", "raw_text", "landmark_hint")


class SessionAttachmentInline(admin.TabularInline):
    """Shows every photo the citizen sent, directly inside the MasterIncident admin page."""
    model = SessionAttachment
    extra = 0
    fields = ("image_preview", "extracted_info")
    readonly_fields = ("image_preview", "extracted_info")
    can_delete = False

    def image_preview(self, obj):
        if obj.image_file:
            return format_html('<img src="{}" style="max-height: 250px; max-width: 350px;" />', obj.image_file.url)
        return "(no image)"
    image_preview.short_description = "Photo"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(MasterIncident)
class MasterIncidentAdmin(admin.ModelAdmin):
    list_display = ("tracking_id", "target_authority", "issue_category", "severity", "official_status", "community_reports_count")
    list_filter = ("target_authority", "severity", "official_status")
    search_fields = ("tracking_id", "landmark", "issue_category")
    inlines = [SessionAttachmentInline]


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ("id", "master_incident", "user", "created_at")


@admin.register(ComplaintDossier)
class ComplaintDossierAdmin(admin.ModelAdmin):
    list_display = ("master_incident", "subject_en", "created_at")
    readonly_fields = ("raw_citizen_text_display", "photos_display")
    fields = (
        "master_incident",
        "raw_citizen_text_display",   # what the citizen actually said - shown first, read-only
        "photos_display",             # every photo the citizen sent - shown right after
        "raw_citizen_text",
        "statutory_citations",
        "subject_en",
        "body_en",
        "body_ur",
        "official_notes",
    )

    def raw_citizen_text_display(self, obj):
        return format_html(
            '<div style="white-space: pre-wrap; background:#222; color:#eee; padding:10px; border-radius:6px;">{}</div>',
            obj.raw_citizen_text or "(no text provided)",
        )
    raw_citizen_text_display.short_description = "What the citizen actually reported"

    def photos_display(self, obj):
        photos = obj.master_incident.photos.all() if obj.master_incident_id else []
        if not photos:
            return "(no photos)"
        html = ""
        for photo in photos:
            html += format_html('<img src="{}" style="max-height: 220px; max-width: 300px; margin: 5px;" />', photo.image_file.url)
        return mark_safe(html)
    photos_display.short_description = "Photos the citizen sent"


@admin.register(ConversationSession)
class ConversationSessionAdmin(admin.ModelAdmin):
    """Lets you see full WhatsApp conversation history for any phone number, including discarded/old sessions."""
    list_display = ("phone", "status", "is_active", "landmark_text", "created_at")
    list_filter = ("status", "is_active")
    search_fields = ("phone",)
    readonly_fields = ("phone", "collected_texts", "lat", "lng", "landmark_text", "generated_report", "status", "is_active", "discarded_at")