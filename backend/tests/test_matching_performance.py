import time
from django.test import TestCase, Client
from accounts.models import User, DoctorProfile, PatientProfile
from appointments.services import match_and_rank_doctors
from appointments.analytics import get_workload_analytics


class MatchingPerformanceTestCase(TestCase):
    def setUp(self):
        for i in range(15):
            doc = User.objects.create_user(
                email=f'perf_doc_{i}@medflow.demo',
                password='Password@123',
                first_name=f'Doctor{i}',
                last_name='Test',
                role=User.Role.DOCTOR,
            )
            specialty = 'Cardiology' if i < 5 else 'Dermatology' if i < 10 else 'General Physician'
            status = 'available' if i % 2 == 0 else 'busy'
            DoctorProfile.objects.create(
                user=doc,
                license_number=f'PERF-MCI-{i}',
                specialty=specialty,
                years_of_experience=i + 2,
                availability_status=status,
                is_verified=True,
                is_accepting_patients=True,
                max_queue_size=20,
            )

        self.patient = User.objects.create_user(
            email='perf_patient@medflow.demo',
            password='Password@123',
            first_name='PerfPatient',
            last_name='One',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient)

    def test_matching_algorithm_latency(self):
        start_time = time.time()
        results = match_and_rank_doctors(specialty='Cardiology', symptoms='chest discomfort')
        duration = time.time() - start_time

        self.assertLess(duration, 0.200, f'Matching took {duration:.4f}s, exceeding 200ms threshold.')
        self.assertGreater(len(results), 0)
        top_doctor = results[0]
        self.assertEqual(top_doctor['specialty'], 'Cardiology')
        self.assertEqual(top_doctor['availability_status'], 'available')

    def test_analytics_latency(self):
        start_time = time.time()
        analytics = get_workload_analytics()
        duration = time.time() - start_time

        self.assertLess(duration, 0.200, f'Analytics took {duration:.4f}s, exceeding 200ms threshold.')
        self.assertIn('doctor_workloads', analytics)
        self.assertIn('summary', analytics)

