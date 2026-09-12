from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LinkPhoneView, LoginView, MeView, RegisterView

urlpatterns = [
    path("register", RegisterView.as_view(), name="register"),
    path("login", LoginView.as_view(), name="login"),
    path("link-phone", LinkPhoneView.as_view(), name="link_phone"),
    path("me", MeView.as_view(), name="me"),
    path("refresh", TokenRefreshView.as_view(), name="token_refresh"),
]

