from rest_framework import serializers
from .models import Appointment, ConsultationMessage, MutualRating
from accounts.models import User, DoctorProfile
from accounts.serializers import UserSerializer, DoctorProfileSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)
    doctor = UserSerializer(read_only=True)
    doctor_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'doctor', 'doctor_id', 'queue_number',
            'status', 'chief_complaint', 'notes', 'scheduled_date',
            'time_slot', 'payment_status', 'payment_id', 'consultation_fee',
            'platform_fee', 'doctor_commission', 'is_family_member',
            'family_member_details', 'is_sos', 'refund_amount',
            'refund_status', 'is_follow_up', 'follow_up_discount_days',
            'estimated_wait_minutes', 'consultation_started_at',
            'consultation_ended_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'queue_number', 'status', 'estimated_wait_minutes',
            'consultation_started_at', 'consultation_ended_at',
            'created_at', 'updated_at',
        ]


class BookAppointmentSerializer(serializers.Serializer):
    doctor_id = serializers.UUIDField(required=False)
    chief_complaint = serializers.CharField(required=True, min_length=5)
    scheduled_date = serializers.DateField(required=False)
    time_slot = serializers.CharField(required=False, allow_blank=True, default='')
    payment_id = serializers.CharField(required=False, allow_blank=True, default='')
    is_family_member = serializers.BooleanField(required=False, default=False)
    family_member_details = serializers.JSONField(required=False, default=dict)
    is_sos = serializers.BooleanField(required=False, default=False)
    is_follow_up = serializers.BooleanField(required=False, default=False)


class MutualRatingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)

    class Meta:
        model = MutualRating
        fields = [
            'id', 'appointment', 'patient', 'doctor', 'patient_name', 'doctor_name',
            'patient_star_rating', 'patient_consultation_quality',
            'patient_wait_time_score', 'patient_feedback',
            'doctor_cooperation_score', 'doctor_punctuality_score',
            'doctor_record_completeness', 'doctor_internal_notes',
            'created_at',
        ]
        read_only_fields = ['id', 'patient', 'doctor', 'patient_name', 'doctor_name', 'created_at']



class ConsultationMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = ConsultationMessage
        fields = [
            'id', 'appointment', 'sender', 'sender_name', 'sender_role',
            'message', 'is_encrypted', 'created_at',
        ]
        read_only_fields = ['id', 'sender', 'sender_name', 'sender_role', 'created_at']


class MatchDoctorRequestSerializer(serializers.Serializer):
    specialty = serializers.CharField(required=False, allow_blank=True)
    symptoms = serializers.CharField(required=False, allow_blank=True)
    location_preference = serializers.CharField(required=False, allow_blank=True)


class RankedDoctorSerializer(serializers.Serializer):
    doctor_id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    specialty = serializers.CharField()
    sub_specialty = serializers.CharField()
    years_of_experience = serializers.IntegerField()
    clinic_name = serializers.CharField()
    clinic_address = serializers.CharField()
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    availability_status = serializers.CharField()
    current_queue_count = serializers.IntegerField()
    max_queue_size = serializers.IntegerField()
    estimated_wait_minutes = serializers.IntegerField()
    match_score = serializers.FloatField()
    is_accepting_patients = serializers.BooleanField()

