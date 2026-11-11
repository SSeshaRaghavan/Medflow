from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from accounts.models import DoctorProfile, PatientProfile, OTPVerification
from appointments.models import Appointment, MutualRating
from records.models import HealthVaultItem
from datetime import date, timedelta
from django.utils import timezone

User = get_user_model()


class Phase9FeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            email='patient.test@medflow.io',
            password='Password123!',
            first_name='Ananya',
            last_name='Sharma',
            role=User.Role.PATIENT,
            phone='+919876543210',
        )
        PatientProfile.objects.create(user=self.patient_user)

        self.doctor_user = User.objects.create_user(
            email='doctor.test@medflow.io',
            password='Password123!',
            first_name='Vikram',
            last_name='Mehta',
            role=User.Role.DOCTOR,
            phone='+919876543211',
        )
        self.doctor_profile = DoctorProfile.objects.create(
            user=self.doctor_user,
            license_number='MED-IND-2026-99',
            specialty='Cardiology',
            consultation_fee=600.00,
            is_verified=True,
            is_accepting_patients=True,
            availability_status='available',
            max_queue_size=10,
        )

        self.admin_user = User.objects.create_superuser(
            email='admin.test@medflow.io',
            password='Password123!',
            first_name='Dev',
            last_name='Admin',
        )

    def test_dual_otp_send_and_verify(self):
        res = self.client.post('/api/accounts/otp/send/', {
            'contact_target': 'ananya.sharma@medflow.io',
            'otp_type': 'signup',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        mobile_otp = res.data['dev_mobile_otp']
        email_otp = res.data['dev_email_otp']

        verify_res = self.client.post('/api/accounts/otp/verify/', {
            'contact_target': 'ananya.sharma@medflow.io',
            'mobile_code': mobile_otp,
            'email_code': email_otp,
            'otp_type': 'signup',
        }, format='json')
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.data['verified'])

    def test_fee_split_and_family_booking(self):
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor_user.id),
            'chief_complaint': 'Routine checkup for child',
            'scheduled_date': str(date.today()),
            'time_slot': '11:00 AM',
            'is_family_member': True,
            'family_member_details': {
                'name': 'Rohan Sharma',
                'age': 8,
                'relation': 'Son',
            },
        }, format='json')
        self.assertEqual(res.status_code, 201)
        appt_id = res.data['id']
        appt = Appointment.objects.get(id=appt_id)
        self.assertEqual(float(appt.platform_fee), 15.00)
        self.assertEqual(float(appt.consultation_fee), 600.00)
        self.assertEqual(float(appt.doctor_commission), 60.00)
        self.assertTrue(appt.is_family_member)
        self.assertEqual(appt.family_member_details['name'], 'Rohan Sharma')

    def test_emergency_sos_booking(self):
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.post('/api/appointments/book/', {
            'chief_complaint': 'Acute chest pain and severe shortness of breath emergency',
            'is_sos': True,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        appt = Appointment.objects.get(id=res.data['id'])
        self.assertTrue(appt.is_sos)
        self.assertEqual(appt.doctor, self.doctor_user)
        self.assertEqual(appt.follow_up_discount_days, 7)

    def test_patient_cancellation_50_percent_refund(self):
        appt = Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            scheduled_date=date.today(),
            time_slot='02:00 PM',
            chief_complaint='Knee sprain',
            consultation_fee=600.00,
            platform_fee=15.00,
            doctor_commission=60.00,
        )
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.post(f'/api/appointments/{appt.id}/cancel/', {
            'reason': 'Feeling better today',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        appt.refresh_from_db()
        self.assertEqual(appt.status, Appointment.Status.CANCELLED)
        self.assertEqual(float(appt.refund_amount), 300.00)

    def test_doctor_cancellation_100_percent_refund(self):
        appt = Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            scheduled_date=date.today(),
            time_slot='03:00 PM',
            chief_complaint='Eye irritation',
            consultation_fee=600.00,
            platform_fee=15.00,
            doctor_commission=60.00,
        )
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.post(f'/api/appointments/{appt.id}/cancel/', {
            'reason': 'Emergency ward call',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        appt.refresh_from_db()
        self.assertEqual(appt.status, Appointment.Status.CANCELLED)
        self.assertEqual(float(appt.refund_amount), 615.00)

    def test_mutual_rating_flow(self):
        appt = Appointment.objects.create(
            patient=self.patient_user,
            doctor=self.doctor_user,
            scheduled_date=date.today(),
            status=Appointment.Status.COMPLETED,
            chief_complaint='Fever follow-up',
        )
        self.client.force_authenticate(user=self.patient_user)
        p_res = self.client.post(f'/api/appointments/{appt.id}/rate/', {
            'patient_star_rating': 5,
            'patient_consultation_quality': 5,
            'patient_wait_time_score': 4,
            'patient_feedback': 'Dr. Mehta was extremely patient and reassuring.',
        }, format='json')
        self.assertEqual(p_res.status_code, 200)

        self.client.force_authenticate(user=self.doctor_user)
        d_res = self.client.post(f'/api/appointments/{appt.id}/rate/', {
            'doctor_cooperation_score': 5,
            'doctor_punctuality_score': 5,
            'doctor_record_completeness': 5,
            'doctor_internal_notes': 'Patient brought complete prior lab records.',
        }, format='json')
        self.assertEqual(d_res.status_code, 200)

        rating = MutualRating.objects.get(appointment=appt)
        self.assertEqual(rating.patient_star_rating, 5)
        self.assertEqual(rating.doctor_cooperation_score, 5)

    def test_doctor_vacation_mode_toggle(self):
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.post('/api/accounts/doctor/vacation-mode/', {
            'weekly_availability': {'Monday': ['09:00', '13:00']},
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['is_vacation_mode'])

        self.client.force_authenticate(user=self.patient_user)
        book_res = self.client.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor_user.id),
            'chief_complaint': 'Standard checkup',
            'scheduled_date': str(date.today()),
        }, format='json')
        self.assertEqual(book_res.status_code, 400)
        self.assertIn('vacation mode', book_res.data['error'])

    def test_health_vault_item_and_sharing(self):
        self.client.force_authenticate(user=self.patient_user)
        create_res = self.client.post('/api/records/vault/', {
            'title': 'Lipid Profile Report',
            'category': 'lab_report',
            'file_url': 'https://storage.medflow.io/vault/lipid_profile.pdf',
            'file_size': '2.4 MB',
        }, format='json')
        self.assertEqual(create_res.status_code, 201)
        item_id = create_res.data['id']

        share_res = self.client.post(f'/api/records/vault/{item_id}/share/')
        self.assertEqual(share_res.status_code, 200)
        self.assertTrue(share_res.data['is_shared'])

        self.client.force_authenticate(user=self.doctor_user)
        doc_vault_res = self.client.get(f'/api/records/vault/?patient_id={self.patient_user.id}')
        self.assertEqual(doc_vault_res.status_code, 200)
        items = doc_vault_res.data.get('results', doc_vault_res.data)
        self.assertEqual(len(items), 1)

