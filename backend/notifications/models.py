from django.db import models
from accounts.models import User
import uuid


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        QUEUE_UPDATE = 'queue_update', 'Queue Update'
        CONSULTATION_CALLED = 'consultation_called', 'Consultation Called'
        PRESCRIPTION_ISSUED = 'prescription_issued', 'Prescription Issued'
        CAPACITY_ALERT = 'capacity_alert', 'Capacity Alert'
        SYSTEM = 'system', 'System Notice'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30, choices=NotificationType.choices, default=NotificationType.SYSTEM
    )
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} -> {self.recipient.email}'

