from django.test import TestCase, Client
from django.utils import timezone
from accounts.models import User, DoctorProfile, PatientProfile
from appointments.models import Appointment
from notifications.models import Notification


class RealtimeQueueTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.today = timezone.localdate()

        self.doctor = User.objects.create_user(
            email='doc_rt@medflow.demo',
            password='Password@123',
            first_name='QueueDoc',
            last_name='Meena',
            role=User.Role.DOCTOR,
        )
        DoctorProfile.objects.create(
            user=self.doctor,
            license_number='DOC-RT-001',
            specialty='Paediatrics',
            avg_consultation_minutes=20,
            max_queue_size=10,
            is_verified=True,
            is_accepting_patients=True,
        )

        self.patient1 = User.objects.create_user(
            email='pat_rt1@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='Alpha',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient1)

        self.patient2 = User.objects.create_user(
            email='pat_rt2@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='Beta',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient2)

    def test_lifecycle_and_queue_tracker(self):
        c1 = Client()
        c1.force_login(self.patient1)
        r1 = c1.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Mild ear pain',
        }, content_type='application/json')
        appt1_id = r1.json()['id']

        c2 = Client()
        c2.force_login(self.patient2)
        r2 = c2.post('/api/appointments/book/', {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Seasonal cough',
        }, content_type='application/json')
        appt2_id = r2.json()['id']

        status_res = c2.get(f'/api/appointments/{appt2_id}/queue-status/')
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()['queue_number'], 2)
        self.assertEqual(status_res.json()['patients_ahead'], 1)
        self.assertEqual(status_res.json()['estimated_wait_minutes'], 20)

        c_doc = Client()
        c_doc.force_login(self.doctor)

        call_res = c_doc.patch(f'/api/appointments/{appt1_id}/call-next/')
        self.assertEqual(call_res.status_code, 200)
        self.assertEqual(call_res.json()['status'], 'in_consultation')

        self.assertTrue(Notification.objects.filter(
            recipient=self.patient1,
            notification_type='consultation_called',
        ).exists())

        comp_res = c_doc.patch(f'/api/appointments/{appt1_id}/complete/', {
            'notes': 'Ear drop prescribed',
        }, content_type='application/json')
        self.assertEqual(comp_res.status_code, 200)
        self.assertEqual(comp_res.json()['status'], 'completed')

        call2_res = c_doc.patch(f'/api/appointments/{appt2_id}/call-next/')
        self.assertEqual(call2_res.status_code, 200)
        self.assertEqual(call2_res.json()['status'], 'in_consultation')

        status2_res = c2.get(f'/api/appointments/{appt2_id}/queue-status/')
        self.assertEqual(status2_res.json()['status'], 'in_consultation')
        self.assertEqual(status2_res.json()['patients_ahead'], 0)

