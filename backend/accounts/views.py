from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from django.utils import timezone
from .models import User, DoctorProfile, PatientProfile
from appointments.models import Appointment
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer,
    PatientRegisterSerializer, DoctorRegisterSerializer,
    ChangePasswordSerializer, PatientDetailSerializer,
    DoctorDetailSerializer, PublicDoctorSerializer,
    AdminDoctorSerializer,
)
from .permissions import IsPatient, IsDoctor, IsAdmin


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class SocialLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        provider = request.data.get('provider', 'google')
        email = request.data.get('email', '').strip().lower()
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        role = request.data.get('role', User.Role.PATIENT)

        if not email:
            return Response({'error': 'Email is required for social authentication.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if not user:
            if not first_name:
                first_name = email.split('@')[0].capitalize()
            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name or 'User',
                role=role if role in User.Role.values else User.Role.PATIENT,
            )
            user.set_unusable_password()
            user.save()

            if user.role == User.Role.PATIENT:
                PatientProfile.objects.get_or_create(user=user)
            elif user.role == User.Role.DOCTOR:
                DoctorProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'license_number': f'OAUTH-{provider.upper()[:3]}-{str(user.id)[:6].upper()}',
                        'specialty': 'General Physician',
                        'is_verified': True,
                        'is_accepting_patients': True,
                    }
                )

        if not user.is_active:
            return Response({'error': 'Account is suspended or deactivated.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['full_name'] = user.get_full_name()

        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'provider': provider,
        }, status=status.HTTP_200_OK)


class PatientRegisterView(generics.CreateAPIView):
    serializer_class = PatientRegisterSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['full_name'] = user.get_full_name()
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': 'Patient account created successfully.',
        }, status=status.HTTP_201_CREATED)


class DoctorRegisterView(generics.CreateAPIView):
    serializer_class = DoctorRegisterSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['full_name'] = user.get_full_name()
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': 'Doctor account created. Awaiting admin verification.',
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully.'})


class PatientProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PatientDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_object(self):
        PatientProfile.objects.get_or_create(user=self.request.user)
        return self.request.user


class DoctorProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = DoctorDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_object(self):
        return self.request.user


class DoctorAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def patch(self, request):
        status_value = request.data.get('availability_status')
        valid_choices = [c[0] for c in DoctorProfile.Availability.choices]
        if status_value not in valid_choices:
            return Response({'error': f'Invalid status. Choose from: {valid_choices}'}, status=status.HTTP_400_BAD_REQUEST)
        profile = request.user.doctor_profile
        profile.availability_status = status_value
        profile.save(update_fields=['availability_status'])
        return Response({'availability_status': profile.availability_status})


class DoctorWorkspaceStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request):
        today = timezone.localdate()
        doc_user = request.user
        profile = getattr(doc_user, 'doctor_profile', None)

        waiting_count = Appointment.objects.filter(
            doctor=doc_user,
            scheduled_date=today,
            status=Appointment.Status.WAITING,
        ).count()

        in_consultation_count = Appointment.objects.filter(
            doctor=doc_user,
            scheduled_date=today,
            status=Appointment.Status.IN_CONSULTATION,
        ).count()

        completed_count = Appointment.objects.filter(
            doctor=doc_user,
            scheduled_date=today,
            status=Appointment.Status.COMPLETED,
        ).count()

        total_today = Appointment.objects.filter(
            doctor=doc_user,
            scheduled_date=today,
        ).count()

        return Response({
            'availability_status': profile.availability_status if profile else 'offline',
            'is_verified': profile.is_verified if profile else False,
            'is_accepting_patients': profile.is_accepting_patients if profile else False,
            'waiting_count': waiting_count,
            'in_consultation_count': in_consultation_count,
            'completed_count': completed_count,
            'total_today': total_today,
            'avg_consultation_minutes': profile.avg_consultation_minutes if profile else 15,
            'max_queue_size': profile.max_queue_size if profile else 20,
        })


class PublicDoctorListView(generics.ListAPIView):
    serializer_class = PublicDoctorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'doctor_profile__specialty', 'doctor_profile__clinic_name']
    filterset_fields = ['doctor_profile__specialty', 'doctor_profile__availability_status']

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.DOCTOR,
            is_active=True,
            doctor_profile__is_verified=True,
            doctor_profile__is_accepting_patients=True,
        ).select_related('doctor_profile')


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        total_users = User.objects.count()
        total_patients = User.objects.filter(role=User.Role.PATIENT).count()
        total_doctors = User.objects.filter(role=User.Role.DOCTOR).count()
        pending_verifications = DoctorProfile.objects.filter(is_verified=False).count()
        verified_doctors = DoctorProfile.objects.filter(is_verified=True).count()
        total_appointments = Appointment.objects.count()

        return Response({
            'total_users': total_users,
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'pending_verifications': pending_verifications,
            'verified_doctors': verified_doctors,
            'total_appointments': total_appointments,
        })


class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['date_joined', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.all().select_related('doctor_profile', 'patient_profile')


class AdminToggleUserStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
            if target_user.id == request.user.id:
                return Response({'error': 'Cannot deactivate your own administrator account.'}, status=status.HTTP_400_BAD_REQUEST)
            target_user.is_active = not target_user.is_active
            target_user.save(update_fields=['is_active'])
            return Response({
                'id': str(target_user.id),
                'is_active': target_user.is_active,
                'message': f"Account for {target_user.get_full_name()} is now {'active' if target_user.is_active else 'deactivated'}.",
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminDoctorListView(generics.ListAPIView):
    serializer_class = AdminDoctorSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['email', 'first_name', 'last_name', 'doctor_profile__license_number', 'doctor_profile__specialty']
    ordering = ['-date_joined']

    def get_queryset(self):
        qs = User.objects.filter(role=User.Role.DOCTOR).select_related('doctor_profile')
        verified = self.request.query_params.get('verified')
        if verified == 'true':
            qs = qs.filter(doctor_profile__is_verified=True)
        elif verified == 'false':
            qs = qs.filter(doctor_profile__is_verified=False)
        return qs


class AdminVerifyDoctorView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            profile = DoctorProfile.objects.select_related('user').get(pk=pk)
            profile.is_verified = True
            profile.save(update_fields=['is_verified'])
            return Response({'message': f'Dr. {profile.user.get_full_name()} verified successfully.', 'is_verified': True})
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminRevokeDoctorView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            profile = DoctorProfile.objects.select_related('user').get(pk=pk)
            profile.is_verified = False
            profile.save(update_fields=['is_verified'])
            return Response({'message': f'Dr. {profile.user.get_full_name()} verification revoked.', 'is_verified': False})
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)


class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import random
        contact_target = request.data.get('contact_target', '').strip()
        otp_type = request.data.get('otp_type', 'signup')
        if not contact_target:
            return Response({'error': 'Contact target (phone/email) is required.'}, status=status.HTTP_400_BAD_REQUEST)

        mobile_code = f'{random.randint(100000, 999999)}'
        email_code = f'{random.randint(100000, 999999)}'

        from .models import OTPVerification
        record, _ = OTPVerification.objects.update_or_create(
            contact_target=contact_target,
            otp_type=otp_type,
            defaults={
                'mobile_code': mobile_code,
                'email_code': email_code,
                'is_verified': False,
            }
        )
        return Response({
            'message': 'Dual OTP generated and dispatched.',
            'contact_target': contact_target,
            'otp_type': otp_type,
            'dev_mobile_otp': mobile_code,
            'dev_email_otp': email_code,
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        contact_target = request.data.get('contact_target', '').strip()
        mobile_code = request.data.get('mobile_code', '').strip()
        email_code = request.data.get('email_code', '').strip()
        otp_type = request.data.get('otp_type', 'signup')

        from .models import OTPVerification
        record = OTPVerification.objects.filter(
            contact_target=contact_target,
            otp_type=otp_type,
        ).order_by('-created_at').first()

        if not record:
            return Response({'error': 'No pending OTP verification request found.'}, status=status.HTTP_404_NOT_FOUND)

        if record.mobile_code != mobile_code or record.email_code != email_code:
            return Response({'error': 'Invalid mobile or email verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        record.is_verified = True
        record.save(update_fields=['is_verified'])

        return Response({
            'verified': True,
            'message': 'Dual OTP successfully verified.',
        }, status=status.HTTP_200_OK)


class DoctorVacationModeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def post(self, request):
        try:
            profile = request.user.doctor_profile
            profile.is_vacation_mode = not profile.is_vacation_mode
            if 'weekly_availability' in request.data:
                profile.weekly_availability = request.data['weekly_availability']
            profile.save()
            return Response({
                'is_vacation_mode': profile.is_vacation_mode,
                'weekly_availability': profile.weekly_availability,
                'message': 'Vacation mode updated.'
            })
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_404_NOT_FOUND)

