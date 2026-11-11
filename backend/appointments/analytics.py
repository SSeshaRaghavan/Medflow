from django.db.models import Count, Avg, Q, F
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, DoctorProfile
from .models import Appointment


def get_workload_analytics():
    today = timezone.localdate()
    seven_days_ago = today - timedelta(days=7)

    doctors = User.objects.filter(role=User.Role.DOCTOR, is_active=True).select_related('doctor_profile')
    doctor_workloads = []

    for doc in doctors:
        prof = doc.doctor_profile
        today_appts = Appointment.objects.filter(doctor=doc, scheduled_date=today)
        all_appts = Appointment.objects.filter(doctor=doc, scheduled_date__gte=seven_days_ago)

        today_total = today_appts.count()
        today_completed = today_appts.filter(status=Appointment.Status.COMPLETED).count()
        today_waiting = today_appts.filter(status=Appointment.Status.WAITING).count()
        today_in_consult = today_appts.filter(status=Appointment.Status.IN_CONSULTATION).count()
        today_cancelled = today_appts.filter(status=Appointment.Status.CANCELLED).count()

        completed_durations = []
        for appt in today_appts.filter(status=Appointment.Status.COMPLETED, consultation_started_at__isnull=False, consultation_ended_at__isnull=False):
            diff = (appt.consultation_ended_at - appt.consultation_started_at).total_seconds() / 60.0
            if 1 <= diff <= 180:
                completed_durations.append(diff)

        avg_duration = round(sum(completed_durations) / len(completed_durations), 1) if completed_durations else prof.avg_consultation_minutes

        active_count = today_waiting + today_in_consult
        utilization_rate = round((active_count / max(prof.max_queue_size, 1)) * 100.0, 1)

        predictive_wait_time = int(active_count * avg_duration)

        doctor_workloads.append({
            'doctor_id': str(doc.id),
            'full_name': doc.get_full_name(),
            'specialty': prof.specialty,
            'clinic_name': prof.clinic_name or 'Clinic Practice',
            'availability_status': prof.availability_status,
            'max_queue_size': prof.max_queue_size,
            'today_total': today_total,
            'today_completed': today_completed,
            'today_waiting': today_waiting,
            'today_cancelled': today_cancelled,
            'utilization_rate': min(utilization_rate, 100.0),
            'avg_consultation_minutes': avg_duration,
            'predictive_wait_time_minutes': predictive_wait_time,
            'is_accepting_patients': prof.is_accepting_patients,
        })

    specialty_distribution = {}
    for item in DoctorProfile.objects.values('specialty').annotate(doctor_count=Count('id')):
        spec = item['specialty']
        appt_count = Appointment.objects.filter(doctor__doctor_profile__specialty=spec).count()
        specialty_distribution[spec] = {
            'doctor_count': item['doctor_count'],
            'appointment_count': appt_count,
        }

    total_platform_appts = Appointment.objects.count()
    completed_platform_appts = Appointment.objects.filter(status=Appointment.Status.COMPLETED).count()
    cancelled_platform_appts = Appointment.objects.filter(status=Appointment.Status.CANCELLED).count()

    completion_rate = round((completed_platform_appts / max(total_platform_appts, 1)) * 100.0, 1)
    cancellation_rate = round((cancelled_platform_appts / max(total_platform_appts, 1)) * 100.0, 1)

    return {
        'doctor_workloads': doctor_workloads,
        'specialty_distribution': specialty_distribution,
        'summary': {
            'total_appointments': total_platform_appts,
            'completed_appointments': completed_platform_appts,
            'cancelled_appointments': cancelled_platform_appts,
            'completion_rate_percent': completion_rate,
            'cancellation_rate_percent': cancellation_rate,
            'active_doctors_count': len(doctor_workloads),
        }
    }

