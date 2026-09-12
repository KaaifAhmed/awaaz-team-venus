from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.staticfiles.views import serve as static_serve
from django.http import JsonResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(request):
    return JsonResponse({"success": True, "data": {"status": "ok"}, "error": None})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health", health),
    path("auth/", include("users.urls")),
    path("api/", include("core.urls")),
    path("schema", SpectacularAPIView.as_view(), name="schema"),
    path("docs", SpectacularSwaggerView.as_view(url_name="schema")),
    re_path(r"^static/(?P<path>.*)$", static_serve, kwargs={"insecure": True}),
]

if getattr(settings, "MEDIA_ROOT", None):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
