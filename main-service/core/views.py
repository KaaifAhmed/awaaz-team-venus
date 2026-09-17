import json
import math
import random
import uuid

import redis
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ComplaintDossier, Incident, JobBuffer, MasterIncident , ConversationSession, SessionAttachment
from .serializers import (
    ComplaintStatusUpdateRequestSerializer,
    GenericResponseEnvelopeSerializer,
    ReportConfirmRequestSerializer,
    ReportSubmitRequestSerializer,
    WhatsAppInboundRequestSerializer,
    WorkerCallbackRequestSerializer,
)
from .spatial_data import SPATIAL_BOUNDARIES

import logging
import requests
from django.db import transaction

logger = logging.getLogger(__name__)

User = get_user_model()

# Redis client initialization
redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
)


def enqueue_intent_classification_job(session, text):
    enqueue_conversation_job(
        "classify_intent",
        session.id,
        new_text=text,
        collected_texts=session.collected_texts,
        landmark_text=session.landmark_text,
        session_status=session.status,
        has_image=session.attachments.exists(),
    )


def enqueue_conversation_job(job_type, session_id, **extra):
    """Push a small task for the AI worker's conversation graph to pick up."""
    try:
        payload = {"job_type": job_type, "session_id": str(session_id), **extra}
        redis_client.rpush("conversation_queue", json.dumps(payload))
    except Exception:
        pass


def send_whatsapp_message(phone, message):
    """Ask the WhatsApp gateway (whatsapp.ts) to send a text message to the user."""
    try:
        requests.post(
            f"{settings.WHATSAPP_SERVICE_URL}/whatsapp/send",
            json={"to": phone, "message": message},
            timeout=5,
        )
    except Exception as exc:
        logger.warning(f"[WHATSAPP] Failed to send message to {phone}: {exc}")


def get_active_session(phone):
    return ConversationSession.objects.filter(phone=phone, is_active=True).first()


def discard_session(session):
    session.status = "DISCARDED"
    session.is_active = False
    session.discarded_at = timezone.now()
    session.save()


def envelope(data=None, error=None):
    return {
        "success": error is None,
        "data": data,
        "error": error,
    }


def enqueue_ai_job(job_id, created_at_iso=None):
    """Safely pushes job reference to Redis ai_queue without breaking if Redis is offline."""
    try:
        payload = {
            "job_id": job_id,
            "created_at": created_at_iso or timezone.now().isoformat(),
        }
        redis_client.rpush("ai_queue", json.dumps(payload))
    except Exception:
        pass


def haversine(lat1, lon1, lat2, lon2):
    """Calculates distance between two coordinates in meters."""
    R = 6371000  # radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ============================================================================
# 1. Citizen Reports APIs
# ============================================================================

class ReportSubmitView(APIView):
    permission_classes = [AllowAny]
    serializer_class = ReportSubmitRequestSerializer

    def post(self, request):
        data = request.data
        raw_text = data.get("text", "")
        image_file = request.FILES.get("image")
        audio_file = request.FILES.get("audio")
        landmark = data.get("landmark") or data.get("landmark_hint")

        lat = data.get("lat")
        lng = data.get("lng")
        try:
            lat = float(lat) if lat is not None and lat != "" else None
            lng = float(lng) if lng is not None and lng != "" else None
        except (ValueError, TypeError):
            lat = None
            lng = None

        job_id = f"job_{uuid.uuid4().hex[:12]}"
        user = request.user if request.user.is_authenticated else None

        job = JobBuffer.objects.create(
            job_id=job_id,
            user=user,
            source="web",
            raw_text=raw_text,
            image_file=image_file,
            audio_file=audio_file,
            lat=lat,
            lng=lng,
            landmark_hint=landmark,
            status="QUEUED",
        )

        enqueue_ai_job(job_id)

        return Response(
            envelope(
                data={
                    "job_id": job_id,
                    "status": "QUEUED",
                    "message": "Report registered in buffer and enqueued for AI processing",
                }
            ),
            status=status.HTTP_202_ACCEPTED,
        )


class ReportReviewView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request, job_id):
        job = JobBuffer.objects.filter(job_id=job_id).first()
        if not job:
            return Response(
                envelope(error={"code": "NOT_FOUND", "message": "Job not found"}),
                status=status.HTTP_404_NOT_FOUND,
            )

        if job.status in ("QUEUED", "PROCESSING"):
            return Response(
                envelope(
                    data={
                        "job_id": job.job_id,
                        "status": "PROCESSING",
                        "message": "AI analysis in progress",
                    }
                ),
                status=status.HTTP_200_OK,
            )

        return Response(
            envelope(
                data={
                    "job_id": job.job_id,
                    "status": "READY_FOR_REVIEW",
                    "layman_summary": job.layman_summary or "Civic grievance registered.",
                    "target_authority": job.inferred_authority or "KMC",
                    "issue_category": job.inferred_category or "Civic Complaint",
                    "severity": job.inferred_severity or "P1",
                    "draft_complaint": {
                        "subject_en": job.draft_subject_en or "",
                        "body_en": job.draft_body_en or "",
                        "body_ur": job.draft_body_ur or "",
                    },
                }
            ),
            status=status.HTTP_200_OK,
        )


class ReportConfirmView(APIView):
    permission_classes = [AllowAny]
    serializer_class = ReportConfirmRequestSerializer

    def post(self, request):
        job_id = request.data.get("job_id")
        if not job_id:
            return Response(
                envelope(error={"code": "INVALID_INPUT", "message": "job_id is required."}),
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = JobBuffer.objects.filter(job_id=job_id).first()
        if not job:
            return Response(
                envelope(error={"code": "NOT_FOUND", "message": "Job not found"}),
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if already confirmed
        incident = Incident.objects.filter(job_buffer=job).select_related("master_incident").first()
        if incident:
            return Response(
                envelope(
                    data={
                        "tracking_id": incident.master_incident.tracking_id,
                        "target_authority": incident.master_incident.target_authority,
                        "official_status": incident.master_incident.official_status,
                    }
                ),
                status=status.HTTP_200_OK,
            )

        # Generate unique tracking ID
        while True:
            candidate_id = f"AWZ-{random.randint(10000, 99999)}"
            if not MasterIncident.objects.filter(tracking_id=candidate_id).exists():
                tracking_id = candidate_id
                break

        target_authority = job.inferred_authority or "KMC"
        if target_authority not in dict(MasterIncident.AUTHORITY_CHOICES):
            target_authority = "KMC"

        severity = job.inferred_severity or "P1"
        if severity not in dict(MasterIncident.SEVERITY_CHOICES):
            severity = "P1"

        master_incident = MasterIncident.objects.create(
            tracking_id=tracking_id,
            target_authority=target_authority,
            issue_category=job.inferred_category or "Civic Complaint",
            severity=severity,
            official_status="PENDING",
            lat=job.lat,
            lng=job.lng,
            landmark=job.landmark_hint or "Karachi",
            community_reports_count=1,
        )

        user = request.user if request.user.is_authenticated else job.user

        Incident.objects.create(
            master_incident=master_incident,
            user=user,
            job_buffer=job,
        )

        ComplaintDossier.objects.create(
            master_incident=master_incident,
            statutory_citations=job.statutory_citations or "",
            raw_citizen_text=job.raw_text or "(no text provided)",
            subject_en=job.draft_subject_en or f"Civic Grievance - {master_incident.issue_category}",
            body_en=job.draft_body_en or job.raw_text,
            body_ur=job.draft_body_ur or "",
            official_notes="",
        )

        job.status = "CONFIRMED"
        job.save()

        return Response(
            envelope(
                data={
                    "tracking_id": master_incident.tracking_id,
                    "target_authority": master_incident.target_authority,
                    "official_status": master_incident.official_status,
                }
            ),
            status=status.HTTP_200_OK,
        )


class MyComplaintsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request):
        incidents = Incident.objects.filter(user=request.user).select_related("master_incident").order_by("-created_at")
        results = [
            {
                "tracking_id": inc.master_incident.tracking_id,
                "issue_category": inc.master_incident.issue_category,
                "target_authority": inc.master_incident.target_authority,
                "official_status": inc.master_incident.official_status,
                "landmark": inc.master_incident.landmark,
                "community_reports_count": inc.master_incident.community_reports_count,
                "created_at": inc.created_at.isoformat(),
            }
            for inc in incidents
        ]
        return Response(envelope(data=results), status=status.HTTP_200_OK)


# ============================================================================
# 2. Internal Worker APIs
# ============================================================================

class InternalJobDetailView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request, job_id):
        job = JobBuffer.objects.filter(job_id=job_id).select_related("user").first()
        if not job:
            return Response(
                envelope(error={"code": "NOT_FOUND", "message": "Job not found"}),
                status=status.HTTP_404_NOT_FOUND,
            )

        image_url = request.build_absolute_uri(job.image_file.url) if job.image_file else None
        audio_url = request.build_absolute_uri(job.audio_file.url) if job.audio_file else None

        return Response(
            envelope(
                data={
                    "job_id": job.job_id,
                    "user_id": str(job.user.id) if job.user else None,
                    "citizen_cnic": job.user.cnic if job.user else None,
                    "phone": job.user.primary_phone if job.user else None,
                    "source": job.source,
                    "text": job.raw_text,
                    "image_url": image_url,
                    "audio_url": audio_url,
                    "location": {
                        "lat": job.lat,
                        "lng": job.lng,
                    },
                    "landmark_hint": job.landmark_hint,
                }
            ),
            status=status.HTTP_200_OK,
        )


class SpatialBoundariesView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request):
        return Response(envelope(data=SPATIAL_BOUNDARIES), status=status.HTTP_200_OK)


class ActiveIncidentsSearchView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request):
        category = request.query_params.get("category")
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        radius_m = float(request.query_params.get("radius_m", 50))

        qs = MasterIncident.objects.exclude(official_status="RESOLVED")
        if category:
            qs = qs.filter(issue_category__iexact=category)

        if lat is None or lng is None:
            return Response(envelope(data=None), status=status.HTTP_200_OK)

        try:
            target_lat = float(lat)
            target_lng = float(lng)
        except (ValueError, TypeError):
            return Response(envelope(data=None), status=status.HTTP_200_OK)

        closest_match = None
        min_dist = float("inf")

        for inc in qs:
            if inc.lat is not None and inc.lng is not None:
                dist = haversine(target_lat, target_lng, inc.lat, inc.lng)
                if dist <= radius_m and dist < min_dist:
                    min_dist = dist
                    closest_match = inc

        if closest_match:
            return Response(
                envelope(
                    data={
                        "matching_master_id": str(closest_match.id),
                        "distance_meters": round(min_dist, 1),
                        "current_reports_count": closest_match.community_reports_count,
                    }
                ),
                status=status.HTTP_200_OK,
            )

        return Response(envelope(data=None), status=status.HTTP_200_OK)


class AIConfigView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request):
        return Response(
            envelope(
                data={
                    "tiers": {
                        "fast": "gemini-1.5-flash",
                        "smart": "gemini-1.5-pro",
                    },
                    "fallback_order": ["gemini-1.5-pro", "gemini-1.5-flash"],
                }
            ),
            status=status.HTTP_200_OK,
        )


class WorkerCallbackView(APIView):
    permission_classes = [AllowAny]
    serializer_class = WorkerCallbackRequestSerializer

    def post(self, request, job_id=None):
        data = request.data
        resolved_job_id = job_id or data.get("job_id")

        if not resolved_job_id:
            return Response(
                envelope(error={"code": "INVALID_INPUT", "message": "job_id is required."}),
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = JobBuffer.objects.filter(job_id=resolved_job_id).first()
        if not job:
            return Response(
                envelope(error={"code": "NOT_FOUND", "message": f"Job {resolved_job_id} not found."}),
                status=status.HTTP_404_NOT_FOUND,
            )

        classification = data.get("classification") or {}
        review_package = data.get("review_package") or {}
        clustering = data.get("clustering") or {}

        if classification.get("issue_category"):
            job.inferred_category = classification.get("issue_category")
        if classification.get("target_authority"):
            job.inferred_authority = classification.get("target_authority")
        if classification.get("severity"):
            job.inferred_severity = classification.get("severity")
        if classification.get("landmark"):
            job.landmark_hint = classification.get("landmark")

        if review_package.get("layman_summary"):
            job.layman_summary = review_package.get("layman_summary")
        if review_package.get("subject_en"):
            job.draft_subject_en = review_package.get("subject_en")
        if review_package.get("body_en"):
            job.draft_body_en = review_package.get("body_en")
        if review_package.get("body_ur"):
            job.draft_body_ur = review_package.get("body_ur")
        if review_package.get("statutory_citations"):
            job.statutory_citations = review_package.get("statutory_citations")

        job.status = "READY_FOR_REVIEW"
        job.save()

        # If clustering suggests attaching to existing MasterIncident
        master_id = clustering.get("master_incident_id")
        if master_id:
            master = MasterIncident.objects.filter(id=master_id).first()
            if master:
                new_count = clustering.get("community_reports_count")
                if new_count:
                    master.community_reports_count = new_count
                else:
                    master.community_reports_count += 1
                master.save()

        return Response(envelope(data={"received": True}), status=status.HTTP_200_OK)


# ============================================================================
# 3. Government Admin Dashboard APIs (RBAC Enforced)
# ============================================================================

def check_official_or_admin(user):
    return user.is_authenticated and user.role in ("GOVT_OFFICIAL", "SUPER_ADMIN")


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request):
        user = request.user
        if not check_official_or_admin(user):
            return Response(
                envelope(error={"code": "FORBIDDEN", "message": "Access restricted to government officials or administrators."}),
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.role == "GOVT_OFFICIAL":
            org = user.assigned_org
            qs = MasterIncident.objects.filter(target_authority=org)
        else:
            org = request.query_params.get("org") or "ALL"
            qs = MasterIncident.objects.all() if org == "ALL" else MasterIncident.objects.filter(target_authority=org)

        today = timezone.now().date()
        metrics = {
            "total_active_clusters": qs.exclude(official_status="RESOLVED").count(),
            "pending_complaints": qs.filter(official_status="PENDING").count(),
            "in_progress": qs.filter(official_status="IN_PROGRESS").count(),
            "resolved_today": qs.filter(official_status="RESOLVED", last_reported_at__date=today).count(),
            "critical_p0_count": qs.filter(severity="P0").count(),
        }

        return Response(
            envelope(data={"organization": org, "metrics": metrics}),
            status=status.HTTP_200_OK,
        )


class DashboardComplaintsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GenericResponseEnvelopeSerializer

    @extend_schema(operation_id="admin_dashboard_complaints_list")
    def get(self, request):
        user = request.user
        if not check_official_or_admin(user):
            return Response(
                envelope(error={"code": "FORBIDDEN", "message": "Access restricted to government officials or administrators."}),
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.role == "GOVT_OFFICIAL":
            org = user.assigned_org
            qs = MasterIncident.objects.filter(target_authority=org)
        else:
            org = request.query_params.get("org") or "ALL"
            qs = MasterIncident.objects.all() if org == "ALL" else MasterIncident.objects.filter(target_authority=org)

        st = request.query_params.get("status")
        sev = request.query_params.get("severity")
        if st:
            qs = qs.filter(official_status=st)
        if sev:
            qs = qs.filter(severity=sev)

        results = []
        for m in qs.order_by("-last_reported_at"):
            photos = []
            for rep in m.reports.all():
                if rep.job_buffer and rep.job_buffer.image_file:
                    photos.append(request.build_absolute_uri(rep.job_buffer.image_file.url))

            results.append({
                "master_incident_id": str(m.id),
                "tracking_id": m.tracking_id,
                "issue_category": m.issue_category,
                "severity": m.severity,
                "community_reports_count": m.community_reports_count,
                "landmark": m.landmark,
                "coordinates": {"lat": m.lat, "lng": m.lng},
                "evidence_photos": photos,
                "official_status": m.official_status,
                "first_reported_at": m.first_reported_at.isoformat(),
                "last_reported_at": m.last_reported_at.isoformat(),
            })

        return Response(
            envelope(data={"organization": org, "results": results}),
            status=status.HTTP_200_OK,
        )


def get_master_incident(lookup_val):
    if not lookup_val:
        return None
    master = MasterIncident.objects.filter(tracking_id=lookup_val).first()
    if master:
        return master
    try:
        uuid_obj = uuid.UUID(str(lookup_val))
        return MasterIncident.objects.filter(id=uuid_obj).first()
    except (ValueError, TypeError):
        return None


class ComplaintDetailView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GenericResponseEnvelopeSerializer

    @extend_schema(operation_id="admin_dashboard_complaint_detail")
    def get(self, request, id):
        user = request.user
        if not check_official_or_admin(user):
            return Response(
                envelope(error={"code": "FORBIDDEN", "message": "Access restricted to government officials or administrators."}),
                status=status.HTTP_403_FORBIDDEN,
            )

        master = get_master_incident(id)
        if not master:
            return Response(
                envelope(error={"code": "NOT_FOUND", "message": "Complaint incident not found."}),
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.role == "GOVT_OFFICIAL" and master.target_authority != user.assigned_org:
            return Response(
                envelope(error={"code": "FORBIDDEN", "message": f"Access restricted to {user.assigned_org} organization."}),
                status=status.HTTP_403_FORBIDDEN,
            )

        photos = []
        for rep in master.reports.all():
            if rep.job_buffer and rep.job_buffer.image_file:
                photos.append(request.build_absolute_uri(rep.job_buffer.image_file.url))

        dossier = getattr(master, "dossier", None)

        return Response(
            envelope(
                data={
                    "master_incident_id": str(master.id),
                    "tracking_id": master.tracking_id,
                    "target_authority": master.target_authority,
                    "issue_category": master.issue_category,
                    "severity": master.severity,
                    "official_status": master.official_status,
                    "community_reports_count": master.community_reports_count,
                    "landmark": master.landmark,
                    "coordinates": {"lat": master.lat, "lng": master.lng},
                    "evidence_photos": photos,
                    "dossier": {
                        "subject_en": dossier.subject_en if dossier else "",
                        "body_en": dossier.body_en if dossier else "",
                        "body_ur": dossier.body_ur if dossier else "",
                        "statutory_citations": dossier.statutory_citations if dossier else "",
                        "official_notes": dossier.official_notes if dossier else "",
                    } if dossier else None,
                    "first_reported_at": master.first_reported_at.isoformat(),
                    "last_reported_at": master.last_reported_at.isoformat(),
                }
            ),
            status=status.HTTP_200_OK,
        )


class ComplaintStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ComplaintStatusUpdateRequestSerializer

    def patch(self, request, id):
        user = request.user
        if not check_official_or_admin(user):
            return Response(
                envelope(error={"code": "FORBIDDEN", "message": "Access restricted to government officials or administrators."}),
                status=status.HTTP_403_FORBIDDEN,
            )

        master = get_master_incident(id)
        if not master:
            return Response(
                envelope(error={"code": "NOT_FOUND", "message": "Complaint incident not found."}),
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.role == "GOVT_OFFICIAL" and master.target_authority != user.assigned_org:
            return Response(
                envelope(error={"code": "FORBIDDEN", "message": f"Access restricted to {user.assigned_org} organization."}),
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("official_status")
        notes = request.data.get("official_notes")

        if new_status:
            valid_statuses = dict(MasterIncident.STATUS_CHOICES)
            if new_status not in valid_statuses:
                return Response(
                    envelope(error={"code": "INVALID_INPUT", "message": f"Status must be one of {list(valid_statuses.keys())}."}),
                    status=status.HTTP_400_BAD_REQUEST,
                )
            master.official_status = new_status
            master.save()

        if notes is not None:
            dossier, _ = ComplaintDossier.objects.get_or_create(master_incident=master)
            dossier.official_notes = notes
            dossier.save()

        return Response(
            envelope(data={"new_status": master.official_status}),
            status=status.HTTP_200_OK,
        )


class SuperAdminOverviewView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request):
        if request.user.role != "SUPER_ADMIN":
            return Response(
                envelope(error={"code": "FORBIDDEN", "message": "Requires super administrator privileges."}),
                status=status.HTTP_403_FORBIDDEN,
            )

        city_breakdown = {}
        for org, label in MasterIncident.AUTHORITY_CHOICES:
            qs = MasterIncident.objects.filter(target_authority=org)
            city_breakdown[org] = {
                "label": label,
                "total_clusters": qs.count(),
                "pending": qs.filter(official_status="PENDING").count(),
                "in_progress": qs.filter(official_status="IN_PROGRESS").count(),
                "resolved": qs.filter(official_status="RESOLVED").count(),
                "critical_p0": qs.filter(severity="P0").count(),
            }

        redis_health = {"status": "ok", "pending_jobs": 0}
        try:
            redis_health["pending_jobs"] = redis_client.llen("ai_queue")
        except Exception:
            redis_health["status"] = "offline"

        return Response(
            envelope(
                data={
                    "city_breakdown": city_breakdown,
                    "queue_health": redis_health,
                }
            ),
            status=status.HTTP_200_OK,
        )


# ============================================================================
# 4. WhatsApp Inbound Webhook
# ============================================================================
class WhatsAppInboundView(APIView):
    permission_classes = [AllowAny]
    serializer_class = WhatsAppInboundRequestSerializer

    def post(self, request):
        data = request.data
        phone = data.get("sender_phone") or data.get("from") or data.get("phone") or ""
        phone = str(phone).strip()

        if not phone:
            return Response(
                envelope(error={"code": "INVALID_INPUT", "message": "Phone number ('sender_phone' or 'from') is required."}),
                status=status.HTTP_400_BAD_REQUEST,
            )

        text = (data.get("text") or "").strip()
        loc = data.get("location") or {}
        lat = loc.get("lat")
        lng = loc.get("lng")
        try:
            lat = float(lat) if lat is not None and lat != "" else None
            lng = float(lng) if lng is not None and lng != "" else None
        except (ValueError, TypeError):
            lat = None
            lng = None

        # ---- Decode any attached photo (business logic: just saving a file) ----
        media_base64 = data.get("media_base64") or data.get("image_base64")
        media_type = data.get("media_type") or ""
        image_content_file = None

        if media_base64 and "audio" not in media_type:
            import base64
            from django.core.files.base import ContentFile
            try:
                decoded_bytes = base64.b64decode(media_base64)
                ext = "png" if "png" in media_type else "jpg"
                image_content_file = ContentFile(decoded_bytes, name=f"wa_{phone}_{uuid.uuid4().hex[:8]}.{ext}")
            except Exception as b64_err:
                logger.warning(f"[WHATSAPP-INBOUND] Failed to decode image attachment: {b64_err}")

        # ---- Find/create the citizen user (business logic) ----
        user = User.objects.filter(primary_phone=phone).first() or User.objects.filter(username=phone).first()
        if not user:
            from users.models import LinkedPhone
            linked = LinkedPhone.objects.filter(phone_number=phone).first()
            if linked:
                user = linked.user
        if not user:
            user = User.objects.create(
                username=phone,
                primary_phone=phone,
                full_name=data.get("senderName") or "Citizen (WhatsApp)",
                role="CITIZEN",
            )

        # ---- Get or start the active session (business logic, no AI here) ----
        session = get_active_session(phone)
        if session is None:
            session = ConversationSession.objects.create(phone=phone, user=user, status="COLLECTING")

        # ---- Save the non-text parts right away (image, GPS) ----
        if image_content_file:
            attachment = SessionAttachment.objects.create(session=session, image_file=image_content_file)
            image_url = request.build_absolute_uri(attachment.image_file.url)
            enqueue_conversation_job("analyze_image", session.id, attachment_id=str(attachment.id), image_url=image_url)

                # ---- Save GPS location if present ----
        location_just_received = False
        if lat is not None and lng is not None:
            session.lat = lat
            session.lng = lng
            session.save()
            location_just_received = True

        # ---- For text, hand off the "what does this mean" decision to the AI worker ----
        if text:
            enqueue_intent_classification_job(session, text)
        elif image_content_file:
            send_whatsapp_message(phone, "Aapki photo mil gayi hai! Main dekh raha hoon.")
        elif location_just_received:
            # No AI needed here - this is pure business logic (confirming a fact was saved).
            send_whatsapp_message(phone, "📍 Location mil gayi, shukriya!")
            self._advance_conversation(session, control="OTHER", phone=phone, has_new_image=False)

        return Response(envelope(data={"session_id": str(session.id)}), status=status.HTTP_200_OK)
    
    def _advance_conversation(self, session, control, phone, has_new_image):
        has_problem_text = len(session.collected_texts) > 0
        has_image = session.attachments.exists()
        has_location = session.lat is not None or bool(session.landmark_text)
        # We now require BOTH a description AND a photo, plus location, before offering to generate.
        is_complete = has_problem_text and has_image and has_location

        if session.status == "COLLECTING":
            if has_new_image and not is_complete:
                send_whatsapp_message(phone, "Aapki photo mil gayi hai! Main dekh raha hoon.")

            if is_complete:
                if not session.ready_prompt_sent:
                    session.status = "AWAITING_CONFIRM_REPORT"
                    session.ready_prompt_sent = True
                    session.save()
                    recap = self._build_recap(session)
                    send_whatsapp_message(
                        phone,
                        f"{recap}\n\nAgar yeh sahi hai aur report banwani hai to bata dein "
                        "(jese 'generate' ya 'report bnado'), ya aur tafseel/photo bhejte rahein.",
                    )
            elif not has_problem_text:
                send_whatsapp_message(phone, "Please masla bataen ke kya hua hai.")
            elif not has_image:
                send_whatsapp_message(phone, "Please us jagah ki photo bhej dein taake main tasdeeq kar sakoon.")
            elif not has_location:
                send_whatsapp_message(phone, "Please apni location bhejein (current location share karein, ya area ka naam likhein, jese Gulshan Iqbal).")

        elif session.status == "AWAITING_CONFIRM_REPORT":
            if control == "GENERATE":
                send_whatsapp_message(phone, "Aapki report banayi ja rahi hai, thoda intezar karein...")
                enqueue_conversation_job("generate_report", session.id)
            elif control in ("PROBLEM", "LOCATION"):
                pass
            else:
                send_whatsapp_message(phone, "Jab report banwani ho, bata dein (jese 'generate' ya 'report bnado').")

        elif session.status == "AWAITING_SUBMIT":
            if control == "SUBMIT_YES":
                self._submit_session(session, phone)
            elif control == "SUBMIT_NO":
                send_whatsapp_message(phone, "Theek hai, abhi submit nahi karta. Bata dein kya add ya change karna hai.")
            else:
                session.status = "COLLECTING"
                session.ready_prompt_sent = False
                session.save()
                send_whatsapp_message(phone, "Noted, shukriya. Jab report dobara banwani ho to bata dein.")

    def _build_recap(self, session):
        """Repeats back what we understood so far, like a human clerk confirming before writing anything."""
        problem_summary = " ".join(session.collected_texts) if session.collected_texts else "(masla nahi bataya gaya)"
        location = session.landmark_text or f"GPS ({session.lat}, {session.lng})" if session.lat else "(location nahi mili)"
        photo_count = session.attachments.count()
        return (
            "Yeh maine ab tak samjha hai:\n"
            f"📝 Masla: {problem_summary}\n"
            f"📍 Location: {location}\n"
            f"📷 Photos: {photo_count}"
        )

    def _submit_session(self, session, phone):
        report = session.generated_report or {}

        while True:
            candidate_id = f"AWZ-{random.randint(10000, 99999)}"
            if not MasterIncident.objects.filter(tracking_id=candidate_id).exists():
                tracking_id = candidate_id
                break

        target_authority = report.get("target_authority") or "KMC"
        if target_authority not in dict(MasterIncident.AUTHORITY_CHOICES):
            target_authority = "KMC"
        severity = report.get("severity") or "P1"
        if severity not in dict(MasterIncident.SEVERITY_CHOICES):
            severity = "P1"

        master_incident = MasterIncident.objects.create(
            tracking_id=tracking_id,
            target_authority=target_authority,
            issue_category=report.get("issue_category") or "Civic Complaint",
            severity=severity,
            official_status="PENDING",
            lat=session.lat,
            lng=session.lng,
            landmark=session.landmark_text or report.get("landmark") or "Karachi",
            community_reports_count=1,
        )

        # Save exactly what the citizen said, in their own words, so the officer can read it directly.
        raw_citizen_text = "\n".join(session.collected_texts) if session.collected_texts else "(no text provided)"

        ComplaintDossier.objects.create(
            master_incident=master_incident,
            statutory_citations=report.get("statutory_citations", ""),
            raw_citizen_text=raw_citizen_text,
            subject_en=report.get("subject_en", ""),
            body_en=report.get("body_en", ""),
            body_ur=report.get("body_ur", ""),
        )

        # Link every photo the citizen sent in this session to the incident, so it shows up in admin.
        session.attachments.update(master_incident=master_incident)

        session.status = "SUBMITTED"
        session.is_active = False
        session.save()

        send_whatsapp_message(
            phone,
            f"✅ Aapki shikayat submit ho gayi hai!\nTracking ID: {tracking_id}\n"
            f"Department: {target_authority}\nAap kabhi bhi nayi report bhej sakte hain.",
        )

# ============================================================================
# 5. Internal Conversation APIs (used by the AI worker)
# ============================================================================

class ConversationSessionDetailView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def get(self, request, session_id):
        session = ConversationSession.objects.filter(id=session_id).first()
        if not session:
            return Response(envelope(error={"code": "NOT_FOUND", "message": "Session not found"}), status=status.HTTP_404_NOT_FOUND)

        return Response(
            envelope(
                data={
                    "session_id": str(session.id),
                    "phone": session.phone,
                    "status": session.status,
                    "collected_texts": session.collected_texts,
                    "lat": session.lat,
                    "lng": session.lng,
                    "landmark_text": session.landmark_text,
                }
            ),
            status=status.HTTP_200_OK,
        )



class ConversationAttachmentAnalyzedView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def post(self, request, session_id, attachment_id):
        attachment = SessionAttachment.objects.filter(id=attachment_id, session_id=session_id).first()
        if not attachment:
            return Response(envelope(error={"code": "NOT_FOUND", "message": "Attachment not found"}), status=status.HTTP_404_NOT_FOUND)

        extracted_info = request.data.get("extracted_info", "")
        attachment.extracted_info = extracted_info
        attachment.analyzed = True
        attachment.save()

        with transaction.atomic():
            # select_for_update locks this session row so a second, concurrent
            # image-analysis callback has to WAIT here until we're done deciding.
            session = ConversationSession.objects.select_for_update().get(id=session_id)
            if extracted_info:
                session.collected_texts.append(f"[Photo shows]: {extracted_info}")
                session.save()
            WhatsAppInboundView()._advance_conversation(session, control="OTHER", phone=session.phone, has_new_image=False)

        return Response(envelope(data={"received": True}), status=status.HTTP_200_OK)


class ConversationReportGeneratedView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def post(self, request, session_id):
        session = ConversationSession.objects.filter(id=session_id).first()
        if not session:
            return Response(envelope(error={"code": "NOT_FOUND", "message": "Session not found"}), status=status.HTTP_404_NOT_FOUND)

        report = request.data
        session.generated_report = report
        session.status = "AWAITING_SUBMIT"
        session.save()

        summary = report.get("layman_summary", "Your report is ready.")
        send_whatsapp_message(session.phone, f"{summary}\n\nAgar submit karna hai to YES likhein, ya kuch change karna hai to NO.")
        return Response(envelope(data={"received": True}), status=status.HTTP_200_OK)


class ConversationIntentClassifiedView(APIView):
    permission_classes = [AllowAny]
    serializer_class = GenericResponseEnvelopeSerializer

    def post(self, request, session_id):
        session = ConversationSession.objects.filter(id=session_id).first()
        if not session:
            return Response(envelope(error={"code": "NOT_FOUND", "message": "Session not found"}), status=status.HTTP_404_NOT_FOUND)

        intent = request.data.get("intent", "OTHER")
        text = request.data.get("text", "")
        ai_reply = request.data.get("reply")

        if intent == "RESTART":
            discard_session(session)
            new_session = ConversationSession.objects.create(phone=session.phone, user=session.user, status="COLLECTING")
            send_whatsapp_message(session.phone, "Theek hai, nayi report shuru karte hain. Please masla batayein, ya photo bhej dein.")
            return Response(envelope(data={"session_id": str(new_session.id)}), status=status.HTTP_200_OK)

        if intent in ("GREETING", "OTHER"):
            # Let the AI's natural, history-aware reply handle this - no silent drop, no fixed script.
            if ai_reply:
                send_whatsapp_message(session.phone, ai_reply)
            else:
                send_whatsapp_message(session.phone, "Ji, kya masla report karna chahte hain?")
            return Response(envelope(data={"received": True}), status=status.HTTP_200_OK)

        if intent == "LOCATION" and text:
            session.landmark_text = text
            session.save()
        elif intent == "PROBLEM" and text:
            session.collected_texts.append(text)
            session.save()

        WhatsAppInboundView()._advance_conversation(session, intent, session.phone, has_new_image=False)

        return Response(envelope(data={"received": True}), status=status.HTTP_200_OK)