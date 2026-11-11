from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        PATIENT = 'patient', 'Patient'
        DOCTOR = 'doctor', 'Doctor'
        ADMIN = 'admin', 'Admin'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'


class DoctorProfile(models.Model):
    class Availability(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        BUSY = 'busy', 'Busy'
        OFFLINE = 'offline', 'Offline'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    license_number = models.CharField(max_length=100, unique=True)
    specialty = models.CharField(max_length=100)
    sub_specialty = models.CharField(max_length=100, blank=True)
    years_of_experience = models.PositiveIntegerField(default=0)
    bio = models.TextField(blank=True)
    clinic_name = models.CharField(max_length=200, blank=True)
    clinic_address = models.TextField(blank=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    availability_status = models.CharField(
        max_length=20, choices=Availability.choices, default=Availability.OFFLINE
    )
    is_verified = models.BooleanField(default=False)
    is_accepting_patients = models.BooleanField(default=True)
    is_vacation_mode = models.BooleanField(default=False)
    weekly_availability = models.JSONField(default=dict, blank=True)
    max_queue_size = models.PositiveIntegerField(default=20)
    avg_consultation_minutes = models.PositiveIntegerField(default=15)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctor_profiles'

    def __str__(self):
        return f'Dr. {self.user.get_full_name()} — {self.specialty}'


class PatientProfile(models.Model):
    class BloodGroup(models.TextChoices):
        A_POS = 'A+', 'A+'
        A_NEG = 'A-', 'A-'
        B_POS = 'B+', 'B+'
        B_NEG = 'B-', 'B-'
        AB_POS = 'AB+', 'AB+'
        AB_NEG = 'AB-', 'AB-'
        O_POS = 'O+', 'O+'
        O_NEG = 'O-', 'O-'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    blood_group = models.CharField(max_length=5, choices=BloodGroup.choices, blank=True)
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_profiles'

    def __str__(self):
        return f'Patient: {self.user.get_full_name()}'


class OTPVerification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='otp_codes')
    contact_target = models.CharField(max_length=200)
    otp_type = models.CharField(max_length=20, default='signup')
    mobile_code = models.CharField(max_length=6)
    email_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'otp_verifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'OTP for {self.contact_target} ({self.otp_type})'


