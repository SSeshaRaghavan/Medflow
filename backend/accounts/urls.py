from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('social-login/', views.SocialLoginView.as_view(), name='social_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('register/patient/', views.PatientRegisterView.as_view(), name='patient_register'),
    path('register/doctor/', views.DoctorRegisterView.as_view(), name='doctor_register'),
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('profile/patient/', views.PatientProfileView.as_view(), name='patient_profile'),
    path('profile/doctor/', views.DoctorProfileView.as_view(), name='doctor_profile'),
    path('doctor/availability/', views.DoctorAvailabilityView.as_view(), name='doctor_availability'),
    path('doctor/stats/', views.DoctorWorkspaceStatsView.as_view(), name='doctor_stats'),
    path('doctors/', views.PublicDoctorListView.as_view(), name='public_doctors'),
    path('admin/stats/', views.AdminStatsView.as_view(), name='admin_stats'),
    path('admin/users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('admin/users/<uuid:pk>/toggle-status/', views.AdminToggleUserStatusView.as_view(), name='admin_toggle_user_status'),
    path('admin/doctors/', views.AdminDoctorListView.as_view(), name='admin_doctors_list'),
    path('admin/doctors/<int:pk>/verify/', views.AdminVerifyDoctorView.as_view(), name='admin_verify_doctor'),
    path('admin/doctors/<int:pk>/revoke/', views.AdminRevokeDoctorView.as_view(), name='admin_revoke_doctor'),
    path('otp/send/', views.SendOTPView.as_view(), name='otp_send'),
    path('otp/verify/', views.VerifyOTPView.as_view(), name='otp_verify'),
    path('doctor/vacation-mode/', views.DoctorVacationModeView.as_view(), name='doctor_vacation_mode'),
]
