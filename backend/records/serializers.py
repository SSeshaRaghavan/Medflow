from rest_framework import serializers
from .models import MedicalRecord, HealthVaultItem
from accounts.serializers import UserSerializer
from appointments.serializers import AppointmentSerializer
from prescriptions.serializers import PrescriptionSerializer


class HealthVaultItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthVaultItem
        fields = [
            'id', 'patient', 'title', 'category', 'file_url',
            'file_size', 'is_encrypted', 'shared_with_doctor_until', 'created_at',
        ]
        read_only_fields = ['id', 'patient', 'created_at']


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient = UserSerializer(read_only=True)
    doctor = UserSerializer(read_only=True)
    appointment = AppointmentSerializer(read_only=True)
    prescription = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'doctor', 'appointment', 'prescription',
            'chief_complaint', 'clinical_notes', 'diagnosis',
            'treatment_plan', 'follow_up_date', 'is_sensitive',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'patient', 'doctor', 'appointment', 'created_at', 'updated_at']

    def get_prescription(self, obj):
        if obj.appointment and hasattr(obj.appointment, 'prescription'):
            return PrescriptionSerializer(obj.appointment.prescription, context=self.context).data
        return None

