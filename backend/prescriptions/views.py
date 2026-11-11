import os
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import FileResponse, Http404
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from .models import Prescription, PrescriptionItem
from records.models import MedicalRecord
from appointments.models import Appointment
from accounts.models import User
from accounts.permissions import IsDoctor, IsPatient
from .serializers import PrescriptionSerializer, PrescriptionCreateUpdateSerializer
from .pdf_generator import generate_prescription_pdf
from notifications.services import create_notification


class PrescriptionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PrescriptionCreateUpdateSerializer
        return PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Prescription.objects.filter(patient=user).prefetch_related('items', 'amendments').select_related('doctor', 'doctor__doctor_profile')
        elif user.role == User.Role.DOCTOR:
            patient_id = self.request.query_params.get('patient_id')
            if patient_id:
                has_care_rel = Appointment.objects.filter(
                    doctor=user,
                    patient_id=patient_id,
                ).exists()
                if has_care_rel:
                    return Prescription.objects.filter(patient_id=patient_id).prefetch_related('items', 'amendments').select_related('doctor', 'patient')
            return Prescription.objects.filter(doctor=user).prefetch_related('items', 'amendments').select_related('patient', 'doctor')
        elif user.role == User.Role.ADMIN:
            return Prescription.objects.all().prefetch_related('items', 'amendments').select_related('patient', 'doctor')
        return Prescription.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.DOCTOR:
            raise permissions.exceptions.PermissionDenied('Only medical practitioners can issue prescriptions.')
        serializer.save()


class PrescriptionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PrescriptionCreateUpdateSerializer
        return PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Prescription.objects.filter(patient=user).prefetch_related('items', 'amendments')
        elif user.role == User.Role.DOCTOR:
            return Prescription.objects.filter(doctor=user).prefetch_related('items', 'amendments')
        elif user.role == User.Role.ADMIN:
            return Prescription.objects.all().prefetch_related('items', 'amendments')
        return Prescription.objects.none()


class PrescriptionFinalizeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    @transaction.atomic
    def post(self, request, pk):
        try:
            prescription = Prescription.objects.select_for_update().get(pk=pk, doctor=request.user)
        except Prescription.DoesNotExist:
            return Response({'error': 'Prescription not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        if not prescription.diagnosis:
            return Response({'error': 'Cannot finalize prescription without a primary diagnosis.'}, status=status.HTTP_400_BAD_REQUEST)

        if not prescription.items.exists():
            return Response({'error': 'Cannot finalize prescription without at least one medication item.'}, status=status.HTTP_400_BAD_REQUEST)

        prescription.status = Prescription.Status.FINALIZED
        prescription.finalized_at = timezone.now()
        prescription.save(update_fields=['status', 'finalized_at', 'updated_at'])

        generate_prescription_pdf(prescription)

        create_notification(
            recipient=prescription.patient,
            title='Digital Prescription Ready',
            message=f'Dr. {request.user.get_full_name()} has signed and issued your digital prescription. The official PDF is ready in your medical records.',
            notification_type='prescription_issued',
            link='/patient',
        )

        if prescription.appointment:
            appointment = prescription.appointment
            appointment.status = Appointment.Status.COMPLETED
            if not appointment.consultation_ended_at:
                appointment.consultation_ended_at = timezone.now()
            appointment.save(update_fields=['status', 'consultation_ended_at', 'updated_at'])

            MedicalRecord.objects.update_or_create(
                appointment=appointment,
                defaults={
                    'patient': prescription.patient,
                    'doctor': prescription.doctor,
                    'chief_complaint': appointment.chief_complaint,
                    'diagnosis': prescription.diagnosis,
                    'clinical_notes': prescription.notes,
                    'treatment_plan': f"Prescription #{str(prescription.id)[:8]} issued with {prescription.items.count()} medication items.",
                }
            )

        return Response(PrescriptionSerializer(prescription, context={'request': request}).data)


from rest_framework_simplejwt.tokens import AccessToken


class PrescriptionDownloadPDFView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            prescription = Prescription.objects.select_related('doctor', 'patient').get(pk=pk)
        except Prescription.DoesNotExist:
            raise Http404('Prescription not found.')

        user = request.user
        if not user or user.is_anonymous:
            token_str = request.query_params.get('token')
            if token_str:
                try:
                    validated_token = AccessToken(token_str)
                    user_id = validated_token.get('user_id')
                    user = User.objects.get(pk=user_id)
                except Exception:
                    return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_401_UNAUTHORIZED)
            else:
                return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        can_access = (
            user == prescription.patient or
            user == prescription.doctor or
            user.role == User.Role.ADMIN
        )

        if not can_access and user.role == User.Role.DOCTOR:
            can_access = Appointment.objects.filter(doctor=user, patient=prescription.patient).exists()

        if not can_access:
            return Response({'error': 'Unauthorized to access this prescription document.'}, status=status.HTTP_403_FORBIDDEN)

        file_ready = False
        if prescription.pdf_file and prescription.pdf_file.name:
            try:
                file_ready = os.path.exists(prescription.pdf_file.path)
            except (ValueError, FileNotFoundError):
                file_ready = False

        if not file_ready:
            generate_prescription_pdf(prescription)
            prescription.refresh_from_db()

        response = FileResponse(
            open(prescription.pdf_file.path, 'rb'),
            content_type='application/pdf',
            as_attachment=True,
            filename=f'Medflow_Rx_{str(prescription.id)[:8]}.pdf',
        )
        response['Content-Disposition'] = f'attachment; filename="Medflow_Rx_{str(prescription.id)[:8]}.pdf"'
        return response

