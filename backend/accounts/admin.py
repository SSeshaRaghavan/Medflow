from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, DoctorProfile, PatientProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'get_full_name', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )
    readonly_fields = ['date_joined']


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'specialty', 'availability_status', 'is_verified', 'is_accepting_patients']
    list_filter = ['is_verified', 'availability_status', 'specialty']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'license_number']
    actions = ['verify_doctors']

    def verify_doctors(self, request, queryset):
        queryset.update(is_verified=True)
        self.message_user(request, f'{queryset.count()} doctor(s) verified.')
    verify_doctors.short_description = 'Mark selected doctors as verified'


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'gender', 'blood_group', 'date_of_birth']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']

