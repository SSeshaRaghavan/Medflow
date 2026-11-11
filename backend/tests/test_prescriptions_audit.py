from django.test import TestCase, Client
from django.utils import timezone
from accounts.models import User, DoctorProfile, PatientProfile
from appointments.models import Appointment
from prescriptions.models import Prescription, PrescriptionItem, PrescriptionAmendment
from records.models import MedicalRecord


class PrescriptionAuditTestCase(TestCase):
    def setUp(self):
        self.client = Client()

        self.doctor = User.objects.create_user(
            email='doc_rx_test@medflow.demo',
            password='Password@123',
            first_name='DrAudit',
            last_name='Kumar',
            role=User.Role.DOCTOR,
        )
        DoctorProfile.objects.create(
            user=self.doctor,
            license_number='DOC-AUDIT-001',
            specialty='Internal Medicine',
            is_verified=True,
            is_accepting_patients=True,
        )

        self.patient = User.objects.create_user(
            email='pat_rx_test@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='Audit',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient)

        self.appointment = Appointment.objects.create(
            doctor=self.doctor,
            patient=self.patient,
            queue_number=1,
            chief_complaint='Persistent fever and body ache',
            scheduled_date=timezone.localdate(),
            status=Appointment.Status.IN_CONSULTATION,
        )

    def test_prescription_lifecycle_and_amendment_audit(self):
        c_doc = Client()
        c_doc.force_login(self.doctor)

        res_create = c_doc.post('/api/prescriptions/', {
            'appointment_id': str(self.appointment.id),
            'diagnosis': 'Viral Upper Respiratory Infection',
            'notes': 'Adequate hydration and rest',
            'items': [
                {
                    'medication_name': 'Paracetamol 500mg',
                    'dosage': '1 tablet',
                    'frequency': 'TDS',
                    'duration': '3 days',
                    'instructions': 'Post meals',
                    'quantity': 9,
                }
            ]
        }, content_type='application/json')
        self.assertEqual(res_create.status_code, 201)
        rx_id = res_create.json()['id']

        res_fin = c_doc.post(f'/api/prescriptions/{rx_id}/finalize/')
        self.assertEqual(res_fin.status_code, 200)
        self.assertEqual(res_fin.json()['status'], 'finalized')

        med_rec = MedicalRecord.objects.filter(appointment=self.appointment).first()
        self.assertIsNotNone(med_rec)
        self.assertEqual(med_rec.diagnosis, 'Viral Upper Respiratory Infection')

        res_pdf = c_doc.get(f'/api/prescriptions/{rx_id}/pdf/')
        self.assertEqual(res_pdf.status_code, 200)
        self.assertEqual(res_pdf.headers.get('content-type'), 'application/pdf')

        res_amend = c_doc.patch(f'/api/prescriptions/{rx_id}/', {
            'diagnosis': 'Viral Upper Respiratory Infection with Secondary Bronchitis',
            'amendment_reason': 'Patient reported chest congestion',
            'items': [
                {
                    'medication_name': 'Paracetamol 500mg',
                    'dosage': '1 tablet',
                    'frequency': 'TDS',
                    'duration': '3 days',
                    'instructions': 'Post meals',
                    'quantity': 9,
                },
                {
                    'medication_name': 'Amoxicillin 500mg',
                    'dosage': '1 capsule',
                    'frequency': 'BD',
                    'duration': '5 days',
                    'instructions': 'Post meals',
                    'quantity': 10,
                }
            ]
        }, content_type='application/json')
        self.assertEqual(res_amend.status_code, 200)

        amendments = PrescriptionAmendment.objects.filter(prescription_id=rx_id)
        self.assertEqual(amendments.count(), 1)
        amend_obj = amendments.first()
        self.assertEqual(amend_obj.reason, 'Patient reported chest congestion')
        self.assertEqual(len(amend_obj.snapshot['items']), 1)
        self.assertEqual(amend_obj.snapshot['items'][0]['medication_name'], 'Paracetamol 500mg')

        rx = Prescription.objects.get(pk=rx_id)
        self.assertEqual(rx.items.count(), 2)
        self.assertEqual(rx.status, Prescription.Status.AMENDED)

