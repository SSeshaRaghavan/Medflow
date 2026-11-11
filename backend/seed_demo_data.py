import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medflow.settings')
django.setup()

from accounts.models import User, DoctorProfile, PatientProfile


def seed():
    print('Seeding demo data...')

    admin_user, _ = User.objects.get_or_create(
        email='admin@medflow.demo',
        defaults={
            'first_name': 'System',
            'last_name': 'Admin',
            'role': User.Role.ADMIN,
            'is_staff': True,
            'is_superuser': True,
        }
    )
    admin_user.set_password('Admin@1234')
    admin_user.save()
    print(f'Admin: {admin_user.email}')

    doctors_data = [
        {
            'email': 'dr.sharma@medflow.demo',
            'first_name': 'Priya',
            'last_name': 'Sharma',
            'phone': '+91-9800000001',
            'profile': {
                'license_number': 'MCI-2024-001',
                'specialty': 'General Physician',
                'years_of_experience': 12,
                'bio': 'Experienced general physician specialising in preventive care.',
                'clinic_name': 'Sharma Clinic',
                'consultation_fee': 500.00,
                'availability_status': DoctorProfile.Availability.AVAILABLE,
                'is_verified': True,
                'avg_consultation_minutes': 15,
            }
        },
        {
            'email': 'dr.patel@medflow.demo',
            'first_name': 'Rajesh',
            'last_name': 'Patel',
            'phone': '+91-9800000002',
            'profile': {
                'license_number': 'MCI-2024-002',
                'specialty': 'Dermatology',
                'years_of_experience': 8,
                'bio': 'Board-certified dermatologist with expertise in skin disorders.',
                'clinic_name': 'Patel Skin Centre',
                'consultation_fee': 800.00,
                'availability_status': DoctorProfile.Availability.AVAILABLE,
                'is_verified': True,
                'avg_consultation_minutes': 20,
            }
        },
        {
            'email': 'dr.iyer@medflow.demo',
            'first_name': 'Meena',
            'last_name': 'Iyer',
            'phone': '+91-9800000003',
            'profile': {
                'license_number': 'MCI-2024-003',
                'specialty': 'Paediatrics',
                'years_of_experience': 15,
                'bio': 'Dedicated paediatrician caring for children from birth to adolescence.',
                'clinic_name': 'Iyer Child Care',
                'consultation_fee': 600.00,
                'availability_status': DoctorProfile.Availability.BUSY,
                'is_verified': True,
                'avg_consultation_minutes': 20,
            }
        },
    ]

    for doc_data in doctors_data:
        profile_data = doc_data.pop('profile')
        user, created = User.objects.get_or_create(email=doc_data['email'], defaults={**doc_data, 'role': User.Role.DOCTOR})
        if created:
            user.set_password('Doctor@1234')
            user.save()
        DoctorProfile.objects.get_or_create(user=user, defaults=profile_data)
        print(f'Doctor: {user.email}')

    patients_data = [
        {
            'email': 'alice@medflow.demo',
            'first_name': 'Alice',
            'last_name': 'Johnson',
            'phone': '+91-9900000001',
            'profile': {'gender': 'Female', 'blood_group': 'O+', 'date_of_birth': '1990-05-15'},
        },
        {
            'email': 'bob@medflow.demo',
            'first_name': 'Bob',
            'last_name': 'Williams',
            'phone': '+91-9900000002',
            'profile': {'gender': 'Male', 'blood_group': 'A+', 'date_of_birth': '1985-08-22'},
        },
    ]

    for pat_data in patients_data:
        profile_data = pat_data.pop('profile')
        user, created = User.objects.get_or_create(email=pat_data['email'], defaults={**pat_data, 'role': User.Role.PATIENT})
        if created:
            user.set_password('Patient@1234')
            user.save()
        PatientProfile.objects.get_or_create(user=user, defaults=profile_data)
        print(f'Patient: {user.email}')

    print('\nDemo seed complete.')
    print('  Admin:   admin@medflow.demo / Admin@1234')
    print('  Doctors: dr.sharma@medflow.demo / Doctor@1234  (and dr.patel, dr.iyer)')
    print('  Patients: alice@medflow.demo / Patient@1234  (and bob)')


if __name__ == '__main__':
    seed()

