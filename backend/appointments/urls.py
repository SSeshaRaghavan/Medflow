from django.urls import path
from . import views

urlpatterns = [
    path('match/', views.MatchDoctorsView.as_view(), name='match_doctors'),
    path('book/', views.BookAppointmentView.as_view(), name='book_appointment'),
    path('slots/', views.AvailableSlotsView.as_view(), name='available_slots'),
    path('pay/', views.ProcessPaymentView.as_view(), name='process_payment'),
    path('my/', views.PatientAppointmentsListView.as_view(), name='patient_appointments'),
    path('doctor-queue/', views.DoctorQueueListView.as_view(), name='doctor_queue'),
    path('<uuid:pk>/call-next/', views.CallNextPatientView.as_view(), name='call_next_patient'),
    path('<uuid:pk>/complete/', views.CompleteConsultationView.as_view(), name='complete_consultation'),
    path('<uuid:pk>/cancel/', views.CancelAppointmentView.as_view(), name='cancel_appointment'),
    path('<uuid:pk>/rate/', views.MutualRatingView.as_view(), name='mutual_rating'),
    path('admin-revenue/', views.AdminRevenueAnalyticsView.as_view(), name='admin_revenue_analytics'),
    path('switch-doctor/', views.DoctorSwitchRequestView.as_view(), name='doctor_switch_request'),
    path('<uuid:pk>/queue-status/', views.AppointmentQueueStatusView.as_view(), name='appointment_queue_status'),
    path('<uuid:pk>/chat/', views.ConsultationChatView.as_view(), name='consultation_chat'),
    path('analytics/', views.WorkloadAnalyticsView.as_view(), name='workload_analytics'),
]
