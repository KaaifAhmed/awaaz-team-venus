from rest_framework import serializers


class ReportSubmitRequestSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, default='')
    landmark = serializers.CharField(required=False, allow_blank=True)
    landmark_hint = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    image = serializers.ImageField(required=False, allow_null=True)
    audio = serializers.FileField(required=False, allow_null=True)


class ReportConfirmRequestSerializer(serializers.Serializer):
    job_id = serializers.CharField(required=True)
    citizen_feedback = serializers.CharField(required=False, allow_blank=True, default='')


class WorkerCallbackRequestSerializer(serializers.Serializer):
    job_id = serializers.CharField(required=True)
    issue_category = serializers.CharField(required=False, default='Civic Complaint')
    severity = serializers.CharField(required=False, default='P1')
    landmark = serializers.CharField(required=False, default='Karachi')
    target_authority = serializers.CharField(required=False, default='KMC')
    layman_summary = serializers.CharField(required=False, default='')
    draft_complaint = serializers.DictField(required=False, default=dict)
    is_clustered = serializers.BooleanField(required=False, default=False)
    master_incident_id = serializers.CharField(required=False, allow_null=True)


class ComplaintStatusUpdateRequestSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['PENDING', 'IN_PROGRESS', 'RESOLVED'])
    official_notes = serializers.CharField(required=False, allow_blank=True, default='')


class WhatsAppInboundRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(required=True)
    body = serializers.CharField(required=False, allow_blank=True, default='')
    media_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    media_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class GenericResponseEnvelopeSerializer(serializers.Serializer):
    success = serializers.BooleanField(default=True)
    data = serializers.DictField(required=False, allow_null=True)
    error = serializers.DictField(required=False, allow_null=True)
