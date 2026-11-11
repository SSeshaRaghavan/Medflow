from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from appointments.models import Appointment
from .models import MedicalRecord, HealthVaultItem
from .serializers import MedicalRecordSerializer, HealthVaultItemSerializer


class MedicalRecordListView(generics.ListCreateAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return MedicalRecord.objects.filter(patient=user).select_related(
                'doctor', 'doctor__doctor_profile', 'appointment', 'patient'
            )
        elif user.role == User.Role.DOCTOR:
            patient_id = self.request.query_params.get('patient_id')
            if patient_id:
                has_care_assignment = Appointment.objects.filter(
                    doctor=user,
                    patient_id=patient_id,
                ).exists()
                if has_care_assignment:
                    return MedicalRecord.objects.filter(patient_id=patient_id).select_related(
                        'doctor', 'doctor__doctor_profile', 'appointment', 'patient'
                    )
                return MedicalRecord.objects.none()
            return MedicalRecord.objects.filter(doctor=user).select_related(
                'doctor', 'doctor__doctor_profile', 'appointment', 'patient'
            )
        elif user.role == User.Role.ADMIN:
            return MedicalRecord.objects.all().select_related(
                'doctor', 'doctor__doctor_profile', 'appointment', 'patient'
            )
        return MedicalRecord.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.DOCTOR and self.request.user.role != User.Role.ADMIN:
            raise permissions.exceptions.PermissionDenied('Only treating practitioners can record clinical timeline entries.')
        patient_id = self.request.data.get('patient_id')
        patient = User.objects.get(id=patient_id, role=User.Role.PATIENT)
        serializer.save(doctor=self.request.user, patient=patient)


class MedicalRecordDetailView(generics.RetrieveAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        record = generics.get_object_or_404(
            MedicalRecord.objects.select_related('doctor', 'patient', 'appointment'),
            pk=self.kwargs['pk']
        )
        user = self.request.user
        can_access = (
            user == record.patient or
            user == record.doctor or
            user.role == User.Role.ADMIN
        )

        if not can_access and user.role == User.Role.DOCTOR:
            can_access = Appointment.objects.filter(doctor=user, patient=record.patient).exists()

        if not can_access:
            raise permissions.exceptions.PermissionDenied('You do not have authorization to view this medical record.')

        return record


class HealthVaultListView(generics.ListCreateAPIView):
    serializer_class = HealthVaultItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return HealthVaultItem.objects.filter(patient=user)
        elif user.role == User.Role.DOCTOR:
            patient_id = self.request.query_params.get('patient_id')
            if patient_id:
                return HealthVaultItem.objects.filter(
                    patient_id=patient_id,
                    shared_with_doctor_until__gte=timezone.now()
                )
            return HealthVaultItem.objects.none()
        return HealthVaultItem.objects.all()

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)


class HealthVaultShareToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            item = HealthVaultItem.objects.get(pk=pk, patient=request.user)
            if item.shared_with_doctor_until and item.shared_with_doctor_until > timezone.now():
                item.shared_with_doctor_until = None
                is_shared = False
            else:
                item.shared_with_doctor_until = timezone.now() + timedelta(hours=24)
                is_shared = True
            item.save(update_fields=['shared_with_doctor_until'])
            return Response({
                'is_shared': is_shared,
                'shared_until': item.shared_with_doctor_until.isoformat() if item.shared_with_doctor_until else None,
                'message': '24-hour access granted to consulting doctors.' if is_shared else 'Doctor access revoked.'
            })
        except HealthVaultItem.DoesNotExist:
            return Response({'error': 'Health vault item not found.'}, status=status.HTTP_404_NOT_FOUND)


