from django.utils import timezone
from django.db.models import Q
from accounts.models import User, DoctorProfile
from .models import Appointment


def calculate_doctor_wait_time(doctor_user, today=None):
    if today is None:
        today = timezone.localdate()
    profile = getattr(doctor_user, 'doctor_profile', None)
    avg_minutes = profile.avg_consultation_minutes if profile else 15

    waiting_count = Appointment.objects.filter(
        doctor=doctor_user,
        scheduled_date=today,
        status=Appointment.Status.WAITING,
    ).count()

    in_consult_count = Appointment.objects.filter(
        doctor=doctor_user,
        scheduled_date=today,
        status=Appointment.Status.IN_CONSULTATION,
    ).count()

    total_ahead = waiting_count + in_consult_count
    return total_ahead * avg_minutes, waiting_count, in_consult_count


def match_and_rank_doctors(specialty=None, symptoms=None, location=None):
    today = timezone.localdate()

    eligible_doctors = User.objects.filter(
        role=User.Role.DOCTOR,
        is_active=True,
        doctor_profile__is_verified=True,
        doctor_profile__is_accepting_patients=True,
    ).select_related('doctor_profile')

    ranked_results = []
    spec_query = (specialty or '').strip().lower()
    symptoms_query = (symptoms or '').strip().lower()
    loc_query = (location or '').strip().lower()

    for doc in eligible_doctors:
        prof = doc.doctor_profile
        wait_time, waiting_count, in_consult_count = calculate_doctor_wait_time(doc, today)

        total_active_queue = waiting_count + in_consult_count
        if total_active_queue >= prof.max_queue_size:
            continue

        score = 0.0

        if prof.availability_status == DoctorProfile.Availability.AVAILABLE:
            score += 50.0
        elif prof.availability_status == DoctorProfile.Availability.BUSY:
            score += 25.0
        else:
            score += 5.0

        doc_spec = prof.specialty.lower()
        doc_subspec = (prof.sub_specialty or '').lower()
        doc_bio = (prof.bio or '').lower()

        if spec_query:
            if spec_query in doc_spec:
                score += 45.0
            elif spec_query in doc_subspec:
                score += 30.0

        if symptoms_query:
            symptom_tokens = [t.strip() for t in symptoms_query.replace(',', ' ').split() if len(t.strip()) > 2]
            token_matches = 0
            for token in symptom_tokens:
                if token in doc_spec or token in doc_subspec or token in doc_bio:
                    token_matches += 1
            score += min(token_matches * 15.0, 35.0)

        queue_capacity_ratio = total_active_queue / max(prof.max_queue_size, 1)
        score += max(0.0, (1.0 - queue_capacity_ratio) * 25.0)

        score += min(prof.years_of_experience * 1.0, 15.0)

        if loc_query:
            clinic_loc = f'{prof.clinic_name} {prof.clinic_address}'.lower()
            if loc_query in clinic_loc:
                score += 15.0

        ranked_results.append({
            'doctor_id': doc.id,
            'full_name': doc.get_full_name(),
            'email': doc.email,
            'phone': doc.phone,
            'specialty': prof.specialty,
            'sub_specialty': prof.sub_specialty,
            'years_of_experience': prof.years_of_experience,
            'clinic_name': prof.clinic_name,
            'clinic_address': prof.clinic_address,
            'consultation_fee': prof.consultation_fee,
            'availability_status': prof.availability_status,
            'current_queue_count': total_active_queue,
            'max_queue_size': prof.max_queue_size,
            'estimated_wait_minutes': wait_time,
            'match_score': round(score, 1),
            'is_accepting_patients': prof.is_accepting_patients,
        })

    ranked_results.sort(key=lambda x: x['match_score'], reverse=True)
    return ranked_results

