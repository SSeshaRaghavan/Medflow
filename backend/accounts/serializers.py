from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, DoctorProfile, PatientProfile


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['full_name'] = self.user.get_full_name()
        data['email'] = self.user.email
        data['user_id'] = str(self.user.id)
        return data


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        exclude = ['user', 'created_at']


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        exclude = ['user', 'created_at']
        read_only_fields = ['is_verified']


class UserSerializer(serializers.ModelSerializer):
    patient_profile = PatientProfileSerializer(read_only=True)
    doctor_profile = DoctorProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'is_active', 'date_joined',
            'patient_profile', 'doctor_profile',
        ]
        read_only_fields = ['id', 'date_joined', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name()


class PatientDetailSerializer(serializers.ModelSerializer):
    patient_profile = PatientProfileSerializer()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'patient_profile',
        ]
        read_only_fields = ['id', 'email']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('patient_profile', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        profile, _ = PatientProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class DoctorDetailSerializer(serializers.ModelSerializer):
    doctor_profile = DoctorProfileSerializer()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'doctor_profile',
        ]
        read_only_fields = ['id', 'email']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('doctor_profile', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        profile = getattr(instance, 'doctor_profile', None)
        if profile:
            for attr, value in profile_data.items():
                if attr != 'is_verified':
                    setattr(profile, attr, value)
            profile.save()
        return instance


class AdminDoctorSerializer(serializers.ModelSerializer):
    doctor_profile = DoctorProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'is_active', 'date_joined', 'doctor_profile',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class PatientRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    patient_profile = PatientProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'first_name', 'last_name', 'phone', 'patient_profile']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop('patient_profile', {})
        user = User.objects.create_user(
            role=User.Role.PATIENT,
            **validated_data
        )
        PatientProfile.objects.create(user=user, **profile_data)
        return user


class DoctorRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    doctor_profile = DoctorProfileSerializer(required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'first_name', 'last_name', 'phone', 'doctor_profile']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop('doctor_profile')
        user = User.objects.create_user(
            role=User.Role.DOCTOR,
            **validated_data
        )
        DoctorProfile.objects.create(user=user, **profile_data)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs.pop('confirm_new_password'):
            raise serializers.ValidationError({'confirm_new_password': 'Passwords do not match.'})
        return attrs


class PublicDoctorSerializer(serializers.ModelSerializer):
    doctor_profile = DoctorProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'doctor_profile']

    def get_full_name(self, obj):
        return obj.get_full_name()
