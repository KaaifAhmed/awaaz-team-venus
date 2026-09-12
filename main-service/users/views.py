from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import LinkedPhone
from .serializers import (
    LinkPhoneSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


def envelope(data=None, error=None):
    return {"success": error is None, "data": data, "error": error}


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            first_err = next(iter(serializer.errors.values()))
            err_msg = first_err[0] if isinstance(first_err, list) else str(first_err)
            return Response(
                envelope(error={"code": "INVALID_INPUT", "message": err_msg}),
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response(
            envelope(
                data={
                    "user_id": str(user.id),
                    "cnic": user.cnic,
                    "full_name": user.full_name,
                    "primary_phone": user.primary_phone,
                    "role": user.role,
                    "assigned_org": user.assigned_org,
                    "dashboard_route": user.get_dashboard_route(),
                    "token": str(refresh.access_token),
                }
            ),
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            first_err = next(iter(serializer.errors.values()))
            err_msg = first_err[0] if isinstance(first_err, list) else str(first_err)
            return Response(
                envelope(error={"code": "INVALID_CREDENTIALS", "message": err_msg}),
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response(
            envelope(
                data={
                    "user_id": str(user.id),
                    "cnic": user.cnic,
                    "full_name": user.full_name,
                    "role": user.role,
                    "assigned_org": user.assigned_org,
                    "dashboard_route": user.get_dashboard_route(),
                    "token": str(refresh.access_token),
                }
            ),
            status=status.HTTP_200_OK,
        )


class LinkPhoneView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LinkPhoneSerializer(data=request.data)
        if not serializer.is_valid():
            first_err = next(iter(serializer.errors.values()))
            err_msg = first_err[0] if isinstance(first_err, list) else str(first_err)
            return Response(
                envelope(error={"code": "INVALID_INPUT", "message": err_msg}),
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.linked_phones.count() >= 2:
            return Response(
                envelope(error={"code": "MAX_PHONES_EXCEEDED", "message": "A maximum of 2 secondary phone numbers can be linked to an account."}),
                status=status.HTTP_400_BAD_REQUEST,
            )

        phone = serializer.validated_data["secondary_phone"].strip()
        LinkedPhone.objects.create(user=request.user, phone_number=phone)

        return Response(
            envelope(data={"message": "Secondary phone linked successfully"}),
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(envelope(data=UserSerializer(request.user).data), status=status.HTTP_200_OK)

