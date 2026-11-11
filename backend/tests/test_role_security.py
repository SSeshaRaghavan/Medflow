from django.test import TestCase, Client
from accounts.models import User, DoctorProfile, PatientProfile
from records.models import MedicalRecord


class RoleSecurityTestCase(TestCase):
    def setUp(self):
        self.client = Client()

        self.patient = User.objects.create_user(
            email='pat_sec@medflow.demo',
            password='Password@123',
            first_name='SecPatient',
            last_name='One',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient, gender='Female')

        self.unrelated_patient = User.objects.create_user(
            email='pat_sec2@medflow.demo',
            password='Password@123',
            first_name='SecPatient2',
            last_name='Two',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.unrelated_patient, gender='Male')

        self.doctor = User.objects.create_user(
            email='doc_sec@medflow.demo',
            password='Password@123',
            first_name='SecDoctor',
            last_name='One',
            role=User.Role.DOCTOR,
        )
        DoctorProfile.objects.create(
            user=self.doctor,
            license_number='SEC-DOC-001',
            specialty='Dermatology',
            is_verified=True,
            is_accepting_patients=True,
        )

        self.admin = User.objects.create_user(
            email='admin_sec@medflow.demo',
            password='Password@123',
            first_name='SecAdmin',
            last_name='One',
            role=User.Role.ADMIN,
            is_staff=True,
        )

    def test_unauthenticated_requests_are_denied(self):
        endpoints = [
            ('/api/auth/me/', 'GET'),
            ('/api/auth/profile/patient/', 'GET'),
            ('/api/auth/profile/doctor/', 'GET'),
            ('/api/auth/admin/stats/', 'GET'),
            ('/api/appointments/my/', 'GET'),
            ('/api/appointments/doctor-queue/', 'GET'),
            ('/api/prescriptions/', 'GET'),
            ('/api/records/', 'GET'),
            ('/api/notifications/', 'GET'),
        ]
        for url, method in endpoints:
            if method == 'GET':
                res = self.client.get(url)
            else:
                res = self.client.post(url)
            self.assertEqual(res.status_code, 401, f'Expected 401 for unauthenticated {url}, got {res.status_code}')

    def test_patient_cannot_access_doctor_or_admin_endpoints(self):
        self.client.force_login(self.patient)

        res_doc_profile = self.client.get('/api/auth/profile/doctor/')
        self.assertEqual(res_doc_profile.status_code, 403)

        res_doc_queue = self.client.get('/api/appointments/doctor-queue/')
        self.assertEqual(res_doc_queue.status_code, 403)

        res_doc_stats = self.client.get('/api/auth/doctor/stats/')
        self.assertEqual(res_doc_stats.status_code, 403)

        res_admin_users = self.client.get('/api/auth/admin/users/')
        self.assertEqual(res_admin_users.status_code, 403)

        res_admin_stats = self.client.get('/api/auth/admin/stats/')
        self.assertEqual(res_admin_stats.status_code, 403)

        res_verify_doc = self.client.post('/api/auth/admin/doctors/1/verify/')
        self.assertEqual(res_verify_doc.status_code, 403)

    def test_doctor_cannot_access_patient_or_admin_endpoints(self):
        self.client.force_login(self.doctor)

        res_pat_profile = self.client.get('/api/auth/profile/patient/')
        self.assertEqual(res_pat_profile.status_code, 403)

        res_admin_users = self.client.get('/api/auth/admin/users/')
        self.assertEqual(res_admin_users.status_code, 403)

        res_admin_stats = self.client.get('/api/auth/admin/stats/')
        self.assertEqual(res_admin_stats.status_code, 403)

    def test_doctor_cannot_access_unassigned_patient_records(self):
        MedicalRecord.objects.create(
            patient=self.unrelated_patient,
            chief_complaint='Headache',
            diagnosis='Tension headache',
            clinical_notes='Confidential patient notes',
        )

        self.client.force_login(self.doctor)
        res = self.client.get(f'/api/records/?patient_id={self.unrelated_patient.id}')
        self.assertEqual(res.status_code, 200)
        data = res.json().get('results', res.json())
        self.assertEqual(len(data), 0)

    def test_admin_has_proper_access(self):
        self.client.force_login(self.admin)
        res_users = self.client.get('/api/auth/admin/users/')
        self.assertEqual(res_users.status_code, 200)

        res_stats = self.client.get('/api/auth/admin/stats/')
        self.assertEqual(res_stats.status_code, 200)
        self.assertIn('total_users', res_stats.json())

