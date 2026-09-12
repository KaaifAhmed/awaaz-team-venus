from django.urls import path

from .views import (
    ActiveIncidentsSearchView,
    AIConfigView,
    ComplaintDetailView,
    ComplaintStatusUpdateView,
    DashboardComplaintsView,
    DashboardOverviewView,
    InternalJobDetailView,
    MyComplaintsView,
    ReportConfirmView,
    ReportReviewView,
    ReportSubmitView,
    SpatialBoundariesView,
    SuperAdminOverviewView,
    WhatsAppInboundView,
    WorkerCallbackView,
)

urlpatterns = [
    # Citizen Reports
    path("reports/submit", ReportSubmitView.as_view(), name="report_submit"),
    path("reports/review/<str:job_id>", ReportReviewView.as_view(), name="report_review"),
    path("reports/confirm", ReportConfirmView.as_view(), name="report_confirm"),
    path("reports/my-complaints", MyComplaintsView.as_view(), name="my_complaints"),

    # Internal Worker APIs
    path("internal/jobs/<str:job_id>", InternalJobDetailView.as_view(), name="internal_job_detail"),
    path("internal/spatial-boundaries", SpatialBoundariesView.as_view(), name="internal_spatial_boundaries"),
    path("internal/active-incidents", ActiveIncidentsSearchView.as_view(), name="internal_active_incidents"),
    path("internal/ai-config", AIConfigView.as_view(), name="internal_ai_config"),
    path("internal/worker-callback", WorkerCallbackView.as_view(), name="internal_worker_callback"),
    path("internal/worker-result/<str:job_id>", WorkerCallbackView.as_view(), name="internal_worker_result"),

    # Admin Dashboard APIs
    path("admin/dashboard/overview", DashboardOverviewView.as_view(), name="dashboard_overview"),
    path("admin/dashboard/complaints", DashboardComplaintsView.as_view(), name="dashboard_complaints"),
    path("admin/dashboard/complaints/<str:id>", ComplaintDetailView.as_view(), name="complaint_detail"),
    path("admin/dashboard/complaints/<str:id>/status", ComplaintStatusUpdateView.as_view(), name="complaint_status_update"),
    path("admin/super/overview", SuperAdminOverviewView.as_view(), name="super_admin_overview"),

    # WhatsApp Webhook
    path("whatsapp/inbound", WhatsAppInboundView.as_view(), name="whatsapp_inbound"),
]
