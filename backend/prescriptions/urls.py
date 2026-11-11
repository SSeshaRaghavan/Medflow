from django.urls import path
from . import views

urlpatterns = [
    path('', views.PrescriptionListCreateView.as_view(), name='prescription_list_create'),
    path('<uuid:pk>/', views.PrescriptionDetailView.as_view(), name='prescription_detail'),
    path('<uuid:pk>/finalize/', views.PrescriptionFinalizeView.as_view(), name='prescription_finalize'),
    path('<uuid:pk>/pdf/', views.PrescriptionDownloadPDFView.as_view(), name='prescription_pdf'),
]
