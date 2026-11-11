from rest_framework.permissions import BasePermission
from .models import User


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.PATIENT


class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.DOCTOR


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsDoctorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [User.Role.DOCTOR, User.Role.ADMIN]


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'patient'):
            return obj.patient == request.user
        return obj == request.user

