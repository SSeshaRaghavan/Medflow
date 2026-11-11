from django.urls import path
from . import views

urlpatterns = [
    path('', views.MedicalRecordListView.as_view(), name='medical_record_list_create'),
    path('vault/', views.HealthVaultListView.as_view(), name='health_vault_list_create'),
    path('vault/<uuid:pk>/share/', views.HealthVaultShareToggleView.as_view(), name='health_vault_share_toggle'),
    path('<uuid:pk>/', views.MedicalRecordDetailView.as_view(), name='medical_record_detail'),
]
