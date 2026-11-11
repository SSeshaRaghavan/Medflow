from django.test import TestCase, Client
from django.utils import timezone
from accounts.models import User, DoctorProfile, PatientProfile
from appointments.models import Appointment, ConsultationMessage
from prescriptions.models import Prescription, PrescriptionItem


class Phase8FeaturesTestCase(TestCase):
    def setUp(self):
        self.client = Client()

        self.patient = User.objects.create_user(
            email='patient_p8@medflow.demo',
            password='Password@123',
            first_name='Patient',
            last_name='P8',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.patient, gender='Male')

        self.doctor = User.objects.create_user(
            email='doctor_p8@medflow.demo',
            password='Password@123',
            first_name='Doctor',
            last_name='P8',
            role=User.Role.DOCTOR,
        )
        DoctorProfile.objects.create(
            user=self.doctor,
            license_number='LIC-P8-100',
            specialty='General Physician',
            is_verified=True,
            is_accepting_patients=True,
            consultation_fee=60.00,
        )

        self.other_user = User.objects.create_user(
            email='other_p8@medflow.demo',
            password='Password@123',
            first_name='Other',
            last_name='User',
            role=User.Role.PATIENT,
        )
        PatientProfile.objects.create(user=self.other_user, gender='Female')

    def test_available_slots_endpoint(self):
        self.client.force_login(self.patient)
        res = self.client.get(f'/api/appointments/slots/?doctor_id={self.doctor.id}&date={timezone.localdate()}')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('slots', data)
        self.assertTrue(len(data['slots']) >= 10)
        self.assertTrue(data['slots'][0]['available'])

    def test_book_with_specific_time_slot_and_payment(self):
        self.client.force_login(self.patient)
        payload = {
            'doctor_id': str(self.doctor.id),
            'chief_complaint': 'Mild headache and persistent cough',
            'time_slot': '10:30 AM',
            'payment_id': 'TXN-TEST-12345',
        }
        res = self.client.post('/api/appointments/book/', payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['time_slot'], '10:30 AM')
        self.assertEqual(data['payment_status'], 'paid')
        self.assertEqual(data['payment_id'], 'TXN-TEST-12345')

    def test_consultation_chat_flow_and_permissions(self):
        appt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            queue_number=1,
            status=Appointment.Status.IN_CONSULTATION,
            chief_complaint='Sore throat',
            scheduled_date=timezone.localdate(),
            time_slot='11:00 AM',
        )

        self.client.force_login(self.other_user)
        unauth_res = self.client.get(f'/api/appointments/{appt.id}/chat/')
        self.assertEqual(unauth_res.status_code, 403)

        self.client.force_login(self.patient)
        msg_payload = {'message': 'Hello Doctor, I have had throat pain since yesterday.'}
        post_res = self.client.post(f'/api/appointments/{appt.id}/chat/', msg_payload, content_type='application/json')
        self.assertEqual(post_res.status_code, 201)
        msg_data = post_res.json()
        self.assertEqual(msg_data['message'], msg_payload['message'])
        self.assertTrue(msg_data['is_encrypted'])

        self.client.force_login(self.doctor)
        doc_msg_payload = {'message': 'Understood. Are you experiencing difficulty swallowing or fever?'}
        doc_res = self.client.post(f'/api/appointments/{appt.id}/chat/', doc_msg_payload, content_type='application/json')
        self.assertEqual(doc_res.status_code, 201)

        get_res = self.client.get(f'/api/appointments/{appt.id}/chat/')
        self.assertEqual(get_res.status_code, 200)
        all_msgs = get_res.json()
        self.assertEqual(len(all_msgs), 2)
        self.assertEqual(all_msgs[0]['sender_role'], 'patient')
        self.assertEqual(all_msgs[1]['sender_role'], 'doctor')

    def test_process_payment_endpoint(self):
        self.client.force_login(self.patient)
        appt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            queue_number=2,
            status=Appointment.Status.WAITING,
            chief_complaint='Knee sprain',
            scheduled_date=timezone.localdate(),
            payment_status='pending',
        )
        pay_payload = {
            'appointment_id': str(appt.id),
            'amount': 60.00,
            'payment_method': 'card',
        }
        res = self.client.post('/api/appointments/pay/', pay_payload, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'success')
        self.assertTrue(data['transaction_id'].startswith('TXN-'))
        appt.refresh_from_db()
        self.assertEqual(appt.payment_status, 'paid')
        self.assertEqual(appt.payment_id, data['transaction_id'])

    def test_prescription_pdf_download_view(self):
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis='Viral Upper Respiratory Infection',
            notes='Rest and fluids recommended',
            status=Prescription.Status.FINALIZED,
            finalized_at=timezone.now(),
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medication_name='Paracetamol 650mg',
            dosage='1 tablet',
            frequency='1-0-1',
            duration='3 days',
            instructions='After food',
            quantity=6,
        )

        self.client.force_login(self.patient)
        res = self.client.get(f'/api/prescriptions/{rx.id}/pdf/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'application/pdf')
        self.assertIn('attachment;', res['Content-Disposition'])

