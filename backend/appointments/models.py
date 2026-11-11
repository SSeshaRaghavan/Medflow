from django.db import models
from accounts.models import User, DoctorProfile
import uuid


class Appointment(models.Model):
    class Status(models.TextChoices):
        REQUEST_RECEIVED = 'request_received', 'Request Received'
        WAITING = 'waiting', 'Waiting'
        IN_CONSULTATION = 'in_consultation', 'In Consultation'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
        NO_SHOW = 'no_show', 'No Show'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments', limit_choices_to={'role': 'patient'})
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_appointments', limit_choices_to={'role': 'doctor'})
    queue_number = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.REQUEST_RECEIVED)
    chief_complaint = models.TextField()
    notes = models.TextField(blank=True)
    scheduled_date = models.DateField()
    time_slot = models.CharField(max_length=50, blank=True, default='10:00 AM')
    payment_status = models.CharField(max_length=20, default='paid')
    payment_id = models.CharField(max_length=100, blank=True, default='')
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=15.00)
    doctor_commission = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    is_family_member = models.BooleanField(default=False)
    family_member_details = models.JSONField(default=dict, blank=True)
    is_sos = models.BooleanField(default=False)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    refund_status = models.CharField(max_length=30, default='none')
    is_follow_up = models.BooleanField(default=False)
    follow_up_discount_days = models.PositiveIntegerField(default=4)
    estimated_wait_minutes = models.PositiveIntegerField(null=True, blank=True)
    consultation_started_at = models.DateTimeField(null=True, blank=True)
    consultation_ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['queue_number', 'created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['doctor', 'queue_number', 'scheduled_date'],
                name='unique_queue_slot_per_doctor_per_day',
            )
        ]
        indexes = [
            models.Index(fields=['scheduled_date', 'status'], name='appt_date_status_idx'),
            models.Index(fields=['doctor', 'scheduled_date'], name='appt_doc_date_idx'),
            models.Index(fields=['patient', 'scheduled_date'], name='appt_pat_date_idx'),
            models.Index(fields=['status'], name='appt_status_idx'),
        ]

    def __str__(self):
        return f'Appt #{self.queue_number} — {self.patient.get_full_name()} with Dr. {self.doctor.get_full_name()}'


class ConsultationMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_consultation_messages')
    message = models.TextField()
    is_encrypted = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'consultation_messages'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender.get_full_name()} ({self.created_at})'


class MutualRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='mutual_rating')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_doctor_ratings')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_doctor_ratings')
    patient_star_rating = models.PositiveIntegerField(default=5)
    patient_consultation_quality = models.PositiveIntegerField(default=5)
    patient_wait_time_score = models.PositiveIntegerField(default=5)
    patient_feedback = models.TextField(blank=True)
    doctor_cooperation_score = models.PositiveIntegerField(default=5)
    doctor_punctuality_score = models.PositiveIntegerField(default=5)
    doctor_record_completeness = models.PositiveIntegerField(default=5)
    doctor_internal_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mutual_ratings'
        ordering = ['-created_at']

    def __str__(self):
        return f'Rating for {self.appointment.id}'


