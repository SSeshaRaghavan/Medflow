from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import Prescription, PrescriptionItem, PrescriptionAmendment
from accounts.serializers import UserSerializer
from appointments.models import Appointment


class PrescriptionItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = PrescriptionItem
        fields = ['id', 'medication_name', 'dosage', 'frequency', 'duration', 'instructions', 'quantity']


class PrescriptionAmendmentSerializer(serializers.ModelSerializer):
    amended_by = UserSerializer(read_only=True)

    class Meta:
        model = PrescriptionAmendment
        fields = ['id', 'amended_by', 'snapshot', 'reason', 'amended_at']


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)
    amendments = PrescriptionAmendmentSerializer(many=True, read_only=True)
    doctor = UserSerializer(read_only=True)
    patient = UserSerializer(read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'doctor', 'patient', 'status',
            'diagnosis', 'notes', 'finalized_at', 'pdf_file',
            'pdf_url', 'items', 'amendments', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'finalized_at', 'pdf_file', 'pdf_url', 'created_at', 'updated_at']

    def get_pdf_url(self, obj):
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None


class PrescriptionCreateUpdateSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, required=False)
    appointment_id = serializers.UUIDField(required=False, write_only=True)
    amendment_reason = serializers.CharField(required=False, write_only=True, allow_blank=True)

    class Meta:
        model = Prescription
        fields = ['id', 'appointment_id', 'status', 'diagnosis', 'notes', 'items', 'amendment_reason', 'finalized_at']
        read_only_fields = ['status', 'finalized_at']

    def validate_appointment_id(self, value):
        if value:
            try:
                appt = Appointment.objects.get(pk=value)
                return appt
            except Appointment.DoesNotExist:
                raise serializers.ValidationError('Appointment not found.')
        return None

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        appt = validated_data.pop('appointment_id', None)
        doctor = self.context['request'].user

        if appt:
            patient = appt.patient
            appointment_obj = appt
        else:
            patient_id = self.initial_data.get('patient_id')
            from accounts.models import User
            patient = User.objects.get(id=patient_id, role=User.Role.PATIENT)
            appointment_obj = None

        prescription = Prescription.objects.create(
            doctor=doctor,
            patient=patient,
            appointment=appointment_obj,
            status=Prescription.Status.DRAFT,
            **validated_data
        )

        for item_data in items_data:
            item_data.pop('id', None)
            PrescriptionItem.objects.create(prescription=prescription, **item_data)

        return prescription

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        amendment_reason = validated_data.pop('amendment_reason', '')
        user = self.context['request'].user

        if instance.status in [Prescription.Status.FINALIZED, Prescription.Status.AMENDED]:
            snapshot_items = list(instance.items.values(
                'medication_name', 'dosage', 'frequency', 'duration', 'instructions', 'quantity'
            ))
            snapshot_data = {
                'diagnosis': instance.diagnosis,
                'notes': instance.notes,
                'status': instance.status,
                'finalized_at': instance.finalized_at.isoformat() if instance.finalized_at else None,
                'items': snapshot_items,
            }

            PrescriptionAmendment.objects.create(
                prescription=instance,
                amended_by=user,
                snapshot=snapshot_data,
                reason=amendment_reason or 'Clinical prescription amendment update',
            )
            instance.status = Prescription.Status.AMENDED

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                item_data.pop('id', None)
                PrescriptionItem.objects.create(prescription=instance, **item_data)

        from .pdf_generator import generate_prescription_pdf
        if instance.status in [Prescription.Status.FINALIZED, Prescription.Status.AMENDED]:
            generate_prescription_pdf(instance)

        return instance
