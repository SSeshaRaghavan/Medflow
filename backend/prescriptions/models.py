from django.db import models
from accounts.models import User
import uuid


class Prescription(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        FINALIZED = 'finalized', 'Finalized'
        AMENDED = 'amended', 'Amended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(
        'appointments.Appointment', on_delete=models.CASCADE, related_name='prescription', null=True, blank=True
    )
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='issued_prescriptions', limit_choices_to={'role': 'doctor'})
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions', limit_choices_to={'role': 'patient'})
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    diagnosis = models.TextField()
    notes = models.TextField(blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    pdf_file = models.FileField(upload_to='prescriptions/pdfs/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'prescriptions'
        ordering = ['-created_at']

    def __str__(self):
        return f'Rx {self.id} — {self.patient.get_full_name()}'


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'prescription_items'

    def __str__(self):
        return f'{self.medication_name} — {self.dosage}'


class PrescriptionAmendment(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='amendments')
    amended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    snapshot = models.JSONField()
    reason = models.TextField()
    amended_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prescription_amendments'
        ordering = ['-amended_at']

