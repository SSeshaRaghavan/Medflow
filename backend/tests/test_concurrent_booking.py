from django.test import TestCase, Client
from django.utils import timezone
from accounts.models import User, DoctorProfile, PatientProfile
from appointments.models import Appointment


class ConcurrentBookingTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.today = timezone.localdate()

        self.doctor = User.objects.create_user(
            email='doc_book@medflow.demo',
            password='Password@123',
            first_name='QueueDoctor',
            last_name='Sharma',
            role=User.Role.DOCTOR,
        )
        self.doctor_profile = DoctorProfile.objects.create(
            user=self.doctor,
            license_number='DOC-BOOK-001',
            specialty='General Physician',
            max_queue_size=3,
            avg_consultation_minutes=15,
            is_verified=True,
            is_accepting_patients=True,
        )

        self.patient1 = User.objects.create_user(
            email='patient1@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='One',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient1)

        self.patient2 = User.objects.create_user(
            email='patient2@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='Two',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient2)

        self.patient3 = User.objects.create_user(
            email='patient3@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='Three',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient3)

        self.patient4 = User.objects.create_user(
            email='patient4@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='Four',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient4)

    def test_double_booking_prevention(self):
        self.client.force_login(self.patient1)
        res1 = self.client.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'First fever consultation',
        }, content_type='application/json')
        self.assertEqual(res1.status_code, 201)
        self.assertEqual(res1.json()['queue_number'], 1)

        res2 = self.client.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Second attempt to book same day',
        }, content_type='application/json')
        self.assertEqual(res2.status_code, 400)
        self.assertIn('already have an active consultation', res2.json().get('error', ''))

    def test_atomic_queue_ordering_and_max_capacity(self):
        c1 = Client()
        c1.force_login(self.patient1)
        r1 = c1.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Fever and cold',
        }, content_type='application/json')
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r1.json()['queue_number'], 1)

        c2 = Client()
        c2.force_login(self.patient2)
        r2 = c2.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Severe headache',
        }, content_type='application/json')
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(r2.json()['queue_number'], 2)

        c3 = Client()
        c3.force_login(self.patient3)
        r3 = c3.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Skin rash',
        }, content_type='application/json')
        self.assertEqual(r3.status_code, 201)
        self.assertEqual(r3.json()['queue_number'], 3)

        c4 = Client()
        c4.force_login(self.patient4)
        r4 = c4.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Exceeding capacity booking attempt',
        }, content_type='application/json')
        self.assertEqual(r4.status_code, 400)
        self.assertIn('maximum capacity', r4.json().get('error', '').lower())

    def test_unverified_doctor_booking_rejected(self):
        self.doctor_profile.is_verified = False
        self.doctor_profile.save()

        self.client.force_login(self.patient1)
        res = self.client.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Booking unverified doctor',
        }, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('not verified', res.json().get('error', '').lower())

    def test_paused_doctor_booking_rejected(self):
        self.doctor_profile.is_accepting_patients = False
        self.doctor_profile.save()

        self.client.force_login(self.patient1)
        res = self.client.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Booking paused doctor',
        }, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('not accepting', res.json().get('error', '').lower())

