from django.db import models
from accounts.models import User
import uuid


class MedicalRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medical_records', limit_choices_to={'role': 'patient'})
    doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='authored_records', limit_choices_to={'role': 'doctor'})
    appointment = models.OneToOneField('appointments.Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='medical_record')
    chief_complaint = models.TextField()
    clinical_notes = models.TextField()
    diagnosis = models.TextField()
    treatment_plan = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    is_sensitive = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medical_records'
        ordering = ['-created_at']

    def __str__(self):
        return f'Record {self.id} — {self.patient.get_full_name()}'


class HealthVaultItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_vault_items', limit_choices_to={'role': 'patient'})
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, default='lab_report')
    file_url = models.CharField(max_length=500, blank=True)
    file_size = models.CharField(max_length=50, blank=True, default='1.2 MB')
    is_encrypted = models.BooleanField(default=True)
    shared_with_doctor_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'health_vault_items'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.patient.get_full_name()})'


