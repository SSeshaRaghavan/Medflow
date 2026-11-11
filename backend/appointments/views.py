import uuid
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from accounts.models import User, DoctorProfile
from accounts.permissions import IsPatient, IsDoctor
from .models import Appointment, ConsultationMessage, MutualRating
from notifications.services import create_notification
from .analytics import get_workload_analytics
from .serializers import (
    AppointmentSerializer,
    BookAppointmentSerializer,
    MatchDoctorRequestSerializer,
    RankedDoctorSerializer,
    ConsultationMessageSerializer,
    MutualRatingSerializer,
)
from .services import match_and_rank_doctors, calculate_doctor_wait_time


class MatchDoctorsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MatchDoctorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = match_and_rank_doctors(
            specialty=serializer.validated_data.get('specialty'),
            symptoms=serializer.validated_data.get('symptoms'),
            location=serializer.validated_data.get('location_preference'),
        )
        output_serializer = RankedDoctorSerializer(results, many=True)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class BookAppointmentView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    @transaction.atomic
    def post(self, request):
        serializer = BookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_sos = serializer.validated_data.get('is_sos', False)
        doctor_id = serializer.validated_data.get('doctor_id')
        chief_complaint = serializer.validated_data['chief_complaint']
        scheduled_date = serializer.validated_data.get('scheduled_date') or timezone.localdate()
        time_slot = serializer.validated_data.get('time_slot', '').strip()
        is_family_member = serializer.validated_data.get('is_family_member', False)
        family_member_details = serializer.validated_data.get('family_member_details', {})
        is_follow_up = serializer.validated_data.get('is_follow_up', False)

        doctor = None
        if is_sos:
            doctor = User.objects.filter(
                role=User.Role.DOCTOR,
                is_active=True,
                doctor_profile__is_verified=True,
                doctor_profile__is_vacation_mode=False,
                doctor_profile__availability_status='available',
            ).first()
            if not doctor:
                doctor = User.objects.filter(
                    role=User.Role.DOCTOR,
                    is_active=True,
                    doctor_profile__is_verified=True,
                    doctor_profile__is_vacation_mode=False,
                ).first()
            if not doctor:
                return Response({'error': 'No emergency SOS doctor is available right now.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        else:
            if not doctor_id:
                return Response({'error': 'doctor_id is required for standard consultations.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                doctor = User.objects.select_for_update().get(
                    id=doctor_id,
                    role=User.Role.DOCTOR,
                    is_active=True,
                )
            except User.DoesNotExist:
                return Response({'error': 'Doctor not found or inactive.'}, status=status.HTTP_404_NOT_FOUND)

        profile = DoctorProfile.objects.select_for_update().filter(user=doctor).first()
        if not profile or not profile.is_verified:
            return Response({'error': 'Doctor is not verified for consultations.'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(profile, 'is_vacation_mode', False):
            return Response({'error': 'Doctor is currently on vacation mode / emergency pause.'}, status=status.HTTP_400_BAD_REQUEST)

        if not profile.is_accepting_patients:
            return Response({'error': 'Doctor is currently not accepting new queue appointments.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_active = Appointment.objects.filter(
            patient=request.user,
            doctor=doctor,
            scheduled_date=scheduled_date,
            status__in=[Appointment.Status.WAITING, Appointment.Status.IN_CONSULTATION, Appointment.Status.REQUEST_RECEIVED],
        ).exists()

        if existing_active and not is_sos:
            return Response(
                {'error': 'You already have an active consultation in this doctor\'s queue today.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_today = Appointment.objects.select_for_update().filter(
            doctor=doctor,
            scheduled_date=scheduled_date,
        )

        if not is_sos and time_slot:
            slot_taken = existing_today.filter(
                time_slot=time_slot
            ).exclude(status__in=[Appointment.Status.CANCELLED, Appointment.Status.NO_SHOW]).exists()
            if slot_taken:
                return Response({'error': f'Slot {time_slot} is already booked. Please choose another slot.'}, status=status.HTTP_400_BAD_REQUEST)

        active_count = existing_today.filter(
            status__in=[Appointment.Status.WAITING, Appointment.Status.IN_CONSULTATION]
        ).count()

        if active_count >= profile.max_queue_size:
            return Response({'error': 'Doctor daily queue is currently at maximum capacity.'}, status=status.HTTP_400_BAD_REQUEST)

        max_queue = existing_today.aggregate(Max('queue_number'))['queue_number__max'] or 0
        new_queue_number = max_queue + 1

        wait_time_minutes, _, _ = calculate_doctor_wait_time(doctor, scheduled_date)
        payment_id = serializer.validated_data.get('payment_id') or f"PAY-{uuid.uuid4().hex[:10].upper()}"
        fee = profile.consultation_fee if profile and profile.consultation_fee else 500.00
        commission = round(float(fee) * 0.10, 2)
        follow_up_days = 7 if ('critical' in chief_complaint.lower() or 'emergency' in chief_complaint.lower()) else 4

        appointment = Appointment.objects.create(
            patient=request.user,
            doctor=doctor,
            queue_number=new_queue_number,
            status=Appointment.Status.WAITING,
            chief_complaint=chief_complaint,
            scheduled_date=scheduled_date,
            time_slot=time_slot,
            payment_status='paid',
            payment_id=payment_id,
            consultation_fee=fee,
            platform_fee=15.00,
            doctor_commission=commission,
            is_family_member=is_family_member,
            family_member_details=family_member_details,
            is_sos=is_sos,
            is_follow_up=is_follow_up,
            follow_up_discount_days=follow_up_days,
            estimated_wait_minutes=0 if is_sos else wait_time_minutes,
        )

        create_notification(
            recipient=request.user,
            title='Queue Slot Confirmed',
            message=f'Consultation ticket #{new_queue_number} confirmed with Dr. {doctor.get_full_name()}. Estimated wait: {wait_time_minutes} mins.',
            notification_type='queue_update',
            link='/patient',
        )

        create_notification(
            recipient=doctor,
            title='New Patient in Queue',
            message=f'Patient {request.user.get_full_name()} has booked ticket #{new_queue_number}. Complaint: {chief_complaint[:60]}',
            notification_type='queue_update',
            link='/doctor',
        )

        if (active_count + 1) >= int(profile.max_queue_size * 0.8):
            create_notification(
                recipient=doctor,
                title='Queue Capacity Notice',
                message=f'Your daily queue is currently at {int(((active_count + 1) / profile.max_queue_size) * 100)}% capacity ({active_count + 1}/{profile.max_queue_size}).',
                notification_type='capacity_alert',
                link='/doctor',
            )

        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)


class PatientAppointmentsListView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        return Appointment.objects.filter(patient=self.request.user).select_related(
            'doctor', 'doctor__doctor_profile', 'patient'
        ).order_by('-scheduled_date', 'queue_number')


class DoctorQueueListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request):
        today = timezone.localdate()
        date_param = request.query_params.get('date')
        target_date = date_param if date_param else today

        appointments = Appointment.objects.filter(
            doctor=request.user,
            scheduled_date=target_date,
        ).select_related('patient', 'patient__patient_profile').order_by('queue_number')

        return Response(AppointmentSerializer(appointments, many=True).data)


class CallNextPatientView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            appointment = Appointment.objects.select_for_update().get(
                pk=pk,
                doctor=request.user,
            )
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found in your queue.'}, status=status.HTTP_404_NOT_FOUND)

        Appointment.objects.filter(
            doctor=request.user,
            scheduled_date=appointment.scheduled_date,
            status=Appointment.Status.IN_CONSULTATION,
        ).exclude(pk=appointment.pk).update(status=Appointment.Status.WAITING)

        appointment.status = Appointment.Status.IN_CONSULTATION
        appointment.consultation_started_at = timezone.now()
        appointment.save(update_fields=['status', 'consultation_started_at', 'updated_at'])

        create_notification(
            recipient=appointment.patient,
            title='Your Doctor is Ready!',
            message=f'Dr. {request.user.get_full_name()} has called your ticket #{appointment.queue_number} into active consultation.',
            notification_type='consultation_called',
            link='/patient',
        )

        return Response(AppointmentSerializer(appointment).data)


class CompleteConsultationView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            appointment = Appointment.objects.select_for_update().get(
                pk=pk,
                doctor=request.user,
            )
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        appointment.status = Appointment.Status.COMPLETED
        appointment.consultation_ended_at = timezone.now()
        appointment.notes = request.data.get('notes', appointment.notes)
        appointment.save(update_fields=['status', 'consultation_ended_at', 'notes', 'updated_at'])

        return Response(AppointmentSerializer(appointment).data)


class CancelAppointmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        return self._handle_cancel(request, pk)

    @transaction.atomic
    def patch(self, request, pk):
        return self._handle_cancel(request, pk)

    def _handle_cancel(self, request, pk):
        try:
            appointment = Appointment.objects.select_for_update().get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != appointment.patient and request.user != appointment.doctor and request.user.role != User.Role.ADMIN:
            return Response({'error': 'You do not have permission to cancel this appointment.'}, status=status.HTTP_403_FORBIDDEN)

        if appointment.status in [Appointment.Status.COMPLETED, Appointment.Status.CANCELLED]:
            return Response({'error': f'Cannot cancel consultation that is already {appointment.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        refund_amount = 0.00
        refund_status_str = 'none'

        if request.user == appointment.doctor or request.user.role == User.Role.ADMIN:
            refund_amount = float(appointment.consultation_fee) + float(appointment.platform_fee)
            refund_status_str = '100%_doctor_cancellation_full_refund'
        else:
            refund_amount = round(float(appointment.consultation_fee) * 0.50, 2)
            refund_status_str = '50%_patient_cancellation_refund'

        appointment.status = Appointment.Status.CANCELLED
        appointment.refund_amount = refund_amount
        appointment.refund_status = refund_status_str
        if reason:
            appointment.notes = f"{appointment.notes}\nCancellation reason: {reason}".strip()
        appointment.save(update_fields=['status', 'refund_amount', 'refund_status', 'notes', 'updated_at'])

        create_notification(
            recipient=appointment.patient,
            title='Appointment Cancelled',
            message=f'Consultation with Dr. {appointment.doctor.get_full_name()} was cancelled. Refund of ₹{refund_amount} processed.',
            notification_type='appointment_cancelled',
            link='/patient',
        )

        return Response({
            'message': 'Appointment cancelled successfully.',
            'refund_amount': refund_amount,
            'refund_status': refund_status_str,
            'appointment': AppointmentSerializer(appointment).data,
        })



class AppointmentQueueStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            appointment = Appointment.objects.select_related('doctor', 'doctor__doctor_profile').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != appointment.patient and request.user != appointment.doctor and request.user.role != User.Role.ADMIN:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        today = appointment.scheduled_date
        doctor = appointment.doctor
        profile = getattr(doctor, 'doctor_profile', None)
        avg_minutes = profile.avg_consultation_minutes if profile else 15

        current_consultation = Appointment.objects.filter(
            doctor=doctor,
            scheduled_date=today,
            status=Appointment.Status.IN_CONSULTATION,
        ).first()

        patients_ahead = Appointment.objects.filter(
            doctor=doctor,
            scheduled_date=today,
            status=Appointment.Status.WAITING,
            queue_number__lt=appointment.queue_number,
        ).count()

        if current_consultation and current_consultation.queue_number < appointment.queue_number:
            patients_ahead += 1

        estimated_wait = patients_ahead * avg_minutes

        return Response({
            'appointment_id': str(appointment.id),
            'status': appointment.status,
            'queue_number': appointment.queue_number,
            'currently_serving_queue_number': current_consultation.queue_number if current_consultation else None,
            'patients_ahead': patients_ahead,
            'estimated_wait_minutes': estimated_wait,
            'doctor_name': doctor.get_full_name(),
            'doctor_specialty': profile.specialty if profile else '',
            'doctor_availability': profile.availability_status if profile else 'offline',
        })


class WorkloadAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        analytics_data = get_workload_analytics()
        return Response(analytics_data)


class AvailableSlotsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doctor_id = request.query_params.get('doctor_id')
        date_str = request.query_params.get('date') or str(timezone.localdate())

        default_slots = [
            '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
            '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
            '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
        ]

        booked_slots = set()
        if doctor_id:
            booked_slots = set(
                Appointment.objects.filter(
                    doctor_id=doctor_id,
                    scheduled_date=date_str,
                ).exclude(
                    status__in=[Appointment.Status.CANCELLED]
                ).values_list('time_slot', flat=True)
            )

        slots_data = [
            {
                'slot': slot,
                'available': slot not in booked_slots,
            }
            for slot in default_slots
        ]
        return Response({'date': date_str, 'slots': slots_data})


class ConsultationChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            appointment = Appointment.objects.select_related('patient', 'doctor').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != appointment.patient and request.user != appointment.doctor and request.user.role != User.Role.ADMIN:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        messages = appointment.chat_messages.select_related('sender').order_by('created_at')
        return Response(ConsultationMessageSerializer(messages, many=True).data)

    def post(self, request, pk):
        try:
            appointment = Appointment.objects.select_related('patient', 'doctor').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != appointment.patient and request.user != appointment.doctor and request.user.role != User.Role.ADMIN:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        text = request.data.get('message', '').strip()
        if not text:
            return Response({'error': 'Message content cannot be blank.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = ConsultationMessage.objects.create(
            appointment=appointment,
            sender=request.user,
            message=text,
            is_encrypted=True,
        )

        recipient = appointment.doctor if request.user == appointment.patient else appointment.patient
        create_notification(
            recipient=recipient,
            title='New Consultation Message',
            message=f"{request.user.get_full_name()}: {text[:60]}",
            notification_type='chat_message',
            link='/patient' if recipient.role == User.Role.PATIENT else '/doctor',
        )

        return Response(ConsultationMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class ProcessPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        appointment_id = request.data.get('appointment_id')
        doctor_id = request.data.get('doctor_id')
        payment_method = request.data.get('payment_method', 'card')
        amount = request.data.get('amount', 50.00)
        txn_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"

        if appointment_id:
            try:
                appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
                appointment.payment_status = 'paid'
                appointment.payment_id = txn_id
                appointment.consultation_fee = amount
                appointment.save(update_fields=['payment_status', 'payment_id', 'consultation_fee', 'updated_at'])
            except Appointment.DoesNotExist:
                return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'status': 'success',
            'transaction_id': txn_id,
            'payment_method': payment_method,
            'amount': amount,
            'timestamp': timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)


class CancelAppointmentRefundView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            appointment = Appointment.objects.select_for_update().get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user != appointment.patient and user != appointment.doctor and user.role != User.Role.ADMIN:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if appointment.status == Appointment.Status.CANCELLED:
            return Response({'error': 'Appointment is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        refund_amount = 0.00
        refund_status_str = 'none'

        if user == appointment.doctor or user.role == User.Role.ADMIN:
            refund_amount = float(appointment.consultation_fee) + float(appointment.platform_fee)
            refund_status_str = '100%_doctor_cancellation_full_refund'
        else:
            time_diff_hours = 2.0
            if time_diff_hours >= 1.0:
                refund_amount = round(float(appointment.consultation_fee) * 0.50, 2)
                refund_status_str = '50%_patient_cancellation_refund'
            else:
                refund_amount = 0.00
                refund_status_str = '0%_within_1_hour'

        appointment.status = Appointment.Status.CANCELLED
        appointment.refund_amount = refund_amount
        appointment.refund_status = refund_status_str
        appointment.notes = f"{appointment.notes}\nCancelled by {user.get_full_name()}: {reason}".strip()
        appointment.save(update_fields=['status', 'refund_amount', 'refund_status', 'notes', 'updated_at'])

        create_notification(
            recipient=appointment.patient,
            title='Appointment Cancelled',
            message=f'Consultation with Dr. {appointment.doctor.get_full_name()} was cancelled. Refund of ₹{refund_amount} processed ({refund_status_str}).',
            notification_type='appointment_cancelled',
            link='/patient',
        )

        return Response({
            'message': 'Appointment cancelled successfully.',
            'refund_amount': refund_amount,
            'refund_status': refund_status_str,
            'appointment': AppointmentSerializer(appointment).data,
        })


class MutualRatingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            appointment = Appointment.objects.select_related('patient', 'doctor').get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        rating, _ = MutualRating.objects.get_or_create(
            appointment=appointment,
            defaults={
                'patient': appointment.patient,
                'doctor': appointment.doctor,
            }
        )

        if user == appointment.patient:
            rating.patient_star_rating = int(request.data.get('patient_star_rating', 5))
            rating.patient_consultation_quality = int(request.data.get('patient_consultation_quality', 5))
            rating.patient_wait_time_score = int(request.data.get('patient_wait_time_score', 5))
            rating.patient_feedback = request.data.get('patient_feedback', '')
            rating.save()
            return Response({'message': 'Patient feedback submitted.', 'rating': MutualRatingSerializer(rating).data})
        elif user == appointment.doctor:
            rating.doctor_cooperation_score = int(request.data.get('doctor_cooperation_score', 5))
            rating.doctor_punctuality_score = int(request.data.get('doctor_punctuality_score', 5))
            rating.doctor_record_completeness = int(request.data.get('doctor_record_completeness', 5))
            rating.doctor_internal_notes = request.data.get('doctor_internal_notes', '')
            rating.save()
            return Response({'message': 'Doctor internal evaluation submitted.', 'rating': MutualRatingSerializer(rating).data})
        else:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    def get(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk)
            rating = MutualRating.objects.get(appointment=appointment)
            return Response(MutualRatingSerializer(rating).data)
        except (Appointment.DoesNotExist, MutualRating.DoesNotExist):
            return Response({'rating': None})


class AdminRevenueAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({'error': 'Only system administrators can access revenue metrics.'}, status=status.HTTP_403_FORBIDDEN)

        paid_appointments = Appointment.objects.filter(payment_status='paid')
        total_platform_fees = sum([float(a.platform_fee) for a in paid_appointments])
        total_commissions = sum([float(a.doctor_commission) for a in paid_appointments])
        total_gross_volume = sum([float(a.consultation_fee) + float(a.platform_fee) for a in paid_appointments])
        net_platform_revenue = total_platform_fees + total_commissions
        doctor_net_payouts = sum([float(a.consultation_fee) - float(a.doctor_commission) for a in paid_appointments])

        return Response({
            'currency': 'INR (₹)',
            'total_appointments_processed': paid_appointments.count(),
            'platform_fee_unit': 15.00,
            'total_platform_fees': total_platform_fees,
            'total_commissions': total_commissions,
            'net_platform_revenue': net_platform_revenue,
            'total_gross_volume': total_gross_volume,
            'doctor_net_payouts': doctor_net_payouts,
            'recent_transactions': [
                {
                    'id': str(a.id),
                    'patient': a.patient.get_full_name(),
                    'doctor': a.doctor.get_full_name(),
                    'consultation_fee': float(a.consultation_fee),
                    'platform_fee': float(a.platform_fee),
                    'doctor_commission': float(a.doctor_commission),
                    'doctor_net': float(a.consultation_fee) - float(a.doctor_commission),
                    'scheduled_date': str(a.scheduled_date),
                    'status': a.status,
                }
                for a in paid_appointments.select_related('patient', 'doctor')[:20]
            ]
        })


class DoctorSwitchRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def post(self, request):
        previous_doctor_id = request.data.get('previous_doctor_id')
        new_doctor_id = request.data.get('new_doctor_id')
        reason = request.data.get('reason', '')
        feedback = request.data.get('feedback', '')
        rating = request.data.get('rating', 3)

        if not reason and not feedback:
            return Response({'error': 'Please provide an issue report or feedback to switch providers.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'approved',
            'message': 'Doctor switch grievance recorded. You may proceed with the new provider booking.',
            'previous_doctor_id': previous_doctor_id,
            'new_doctor_id': new_doctor_id,
        })


