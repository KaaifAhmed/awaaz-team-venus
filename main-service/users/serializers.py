from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import LinkedPhone

import re

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(required=True, max_length=255)
    cnic = serializers.CharField(required=True, max_length=20)
    primary_phone = serializers.CharField(required=True, max_length=25)

    class Meta:
        model = User
        fields = ["cnic", "full_name", "primary_phone", "password"]

    def validate_cnic(self, value):
        val = value.strip()
        if not re.match(r"^\d{5}-\d{7}-\d$", val):
            raise serializers.ValidationError("Invalid CNIC format. Expected format is XXXXX-XXXXXXX-X (13 digits).")
        if User.objects.filter(cnic=val).exists():
            raise serializers.ValidationError("A user with this CNIC already exists.")
        return val

    def validate_primary_phone(self, value):
        val = value.strip()
        if User.objects.filter(primary_phone=val).exists() or LinkedPhone.objects.filter(phone_number=val).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return val

    def create(self, validated_data):
        cnic = validated_data["cnic"]
        full_name = validated_data["full_name"]
        primary_phone = validated_data["primary_phone"]
        password = validated_data["password"]

        user = User.objects.create_user(
            username=cnic,
            cnic=cnic,
            full_name=full_name,
            primary_phone=primary_phone,
            password=password,
            role="CITIZEN",
        )
        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        identifier = attrs.get("identifier", "").strip()
        password = attrs.get("password")

        # Attempt to find user by CNIC, primary_phone, linked phone, or username
        user = (
            User.objects.filter(cnic=identifier).first()
            or User.objects.filter(primary_phone=identifier).first()
            or User.objects.filter(username=identifier).first()
        )

        if not user:
            linked = LinkedPhone.objects.filter(phone_number=identifier).first()
            if linked:
                user = linked.user

        if not user or not user.check_password(password):
            raise serializers.ValidationError("Invalid CNIC/phone or password.")

        if not user.is_active:
            raise serializers.ValidationError("This user account is inactive.")

        attrs["user"] = user
        return attrs


class LinkPhoneSerializer(serializers.Serializer):
    secondary_phone = serializers.CharField(required=True, max_length=25)

    def validate_secondary_phone(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Phone number cannot be empty.")
        if User.objects.filter(primary_phone=val).exists() or LinkedPhone.objects.filter(phone_number=val).exists():
            raise serializers.ValidationError("This phone number is already registered or linked to an account.")
        return val


class UserSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="id", read_only=True)
    linked_phones = serializers.SerializerMethodField()
    dashboard_route = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "user_id",
            "cnic",
            "full_name",
            "primary_phone",
            "role",
            "assigned_org",
            "dashboard_route",
            "linked_phones",
        ]

    def get_linked_phones(self, obj):
        return list(obj.linked_phones.values_list("phone_number", flat=True))

    def get_dashboard_route(self, obj):
        return obj.get_dashboard_route()

