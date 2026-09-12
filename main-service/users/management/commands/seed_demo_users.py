from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo users for CWA Ship Karachi 2026 Civic AI Engine"

    def handle(self, *args, **options):
        demo_users = [
            {
                "cnic": "42101-1234567-1",
                "password": "password123",
                "full_name": "Muhammad Ali Citizen",
                "primary_phone": "+923001234567",
                "role": "CITIZEN",
                "assigned_org": None,
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "cnic": "42201-1111111-1",
                "password": "password123",
                "full_name": "Engr. Tariq Aziz (KW&SC Official)",
                "primary_phone": "+923001111111",
                "role": "GOVT_OFFICIAL",
                "assigned_org": "KWSC",
                "is_staff": True,
                "is_superuser": False,
            },
            {
                "cnic": "42201-2222222-2",
                "password": "password123",
                "full_name": "Farhan Siddiqui (KMC Official)",
                "primary_phone": "+923002222222",
                "role": "GOVT_OFFICIAL",
                "assigned_org": "KMC",
                "is_staff": True,
                "is_superuser": False,
            },
            {
                "cnic": "42000-0000000-0",
                "password": "password123",
                "full_name": "Karachi Civic Administrator",
                "primary_phone": "+923000000000",
                "role": "SUPER_ADMIN",
                "assigned_org": None,
                "is_staff": True,
                "is_superuser": True,
            },
        ]

        for u in demo_users:
            user, created = User.objects.get_or_create(
                cnic=u["cnic"],
                defaults={
                    "username": u["cnic"],
                    "full_name": u["full_name"],
                    "primary_phone": u["primary_phone"],
                    "role": u["role"],
                    "assigned_org": u["assigned_org"],
                    "is_staff": u["is_staff"],
                    "is_superuser": u["is_superuser"],
                },
            )
            user.set_password(u["password"])
            user.full_name = u["full_name"]
            user.primary_phone = u["primary_phone"]
            user.role = u["role"]
            user.assigned_org = u["assigned_org"]
            user.is_staff = u["is_staff"]
            user.is_superuser = u["is_superuser"]
            user.save()

            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{status_str} demo user: {user.full_name} ({user.cnic}) - Role: {user.role}"))

        self.stdout.write(self.style.SUCCESS("All demo users successfully seeded."))
