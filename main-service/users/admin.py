from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import LinkedPhone, UserAccount


@admin.register(UserAccount)
class UserAccountAdmin(UserAdmin):
    list_display = ("username", "cnic", "primary_phone", "role", "assigned_org", "is_staff")
    fieldsets = UserAdmin.fieldsets + (
        ("Civic AI Info", {"fields": ("cnic", "primary_phone", "full_name", "role", "assigned_org")}),
    )


@admin.register(LinkedPhone)
class LinkedPhoneAdmin(admin.ModelAdmin):
    list_display = ("user", "phone_number", "created_at")

