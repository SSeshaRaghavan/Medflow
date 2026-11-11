import api from './client';

export const authApi = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  socialLogin: (payload) => api.post('/auth/social-login/', payload),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  registerPatient: (data) => api.post('/auth/register/patient/', data),
  registerDoctor: (data) => api.post('/auth/register/doctor/', data),
  me: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
  sendOTP: (contact_target, otp_type = 'signup') => api.post('/auth/otp/send/', { contact_target, otp_type }),
  verifyOTP: (contact_target, mobile_code, email_code, otp_type = 'signup') => api.post('/auth/otp/verify/', { contact_target, mobile_code, email_code, otp_type }),
};

export const patientApi = {
  getProfile: () => api.get('/auth/profile/patient/'),
  updateProfile: (data) => api.patch('/auth/profile/patient/', data),
};

export const doctorApi = {
  getProfile: () => api.get('/auth/profile/doctor/'),
  updateProfile: (data) => api.patch('/auth/profile/doctor/', data),
  setAvailability: (status) => api.patch('/auth/doctor/availability/', { availability_status: status }),
  getStats: () => api.get('/auth/doctor/stats/'),
  listPublic: (params) => api.get('/auth/doctors/', { params }),
  toggleVacationMode: (weekly_availability) => api.post('/auth/doctor/vacation-mode/', { weekly_availability }),
};

export const adminApi = {
  getStats: () => api.get('/auth/admin/stats/'),
  listUsers: (params) => api.get('/auth/admin/users/', { params }),
  toggleUserStatus: (id) => api.patch(`/auth/admin/users/${id}/toggle-status/`),
  listDoctors: (params) => api.get('/auth/admin/doctors/', { params }),
  verifyDoctor: (pk) => api.post(`/auth/admin/doctors/${pk}/verify/`),
  revokeDoctor: (pk) => api.post(`/auth/admin/doctors/${pk}/revoke/`),
};

export const appointmentApi = {
  matchDoctors: (data) => api.post('/appointments/match/', data),
  book: (data) => api.post('/appointments/book/', data),
  getAvailableSlots: (doctorId, date) => api.get('/appointments/slots/', { params: { doctor_id: doctorId, date } }),
  processPayment: (payload) => api.post('/appointments/pay/', payload),
  myAppointments: () => api.get('/appointments/my/'),
  doctorQueue: (date) => api.get('/appointments/doctor-queue/', { params: { date } }),
  callNext: (id) => api.patch(`/appointments/${id}/call-next/`),
  complete: (id, notes) => api.patch(`/appointments/${id}/complete/`, { notes }),
  cancel: (id) => api.patch(`/appointments/${id}/cancel/`),
  cancelWithRefund: (id, reason) => api.post(`/appointments/${id}/cancel/`, { reason }),
  submitRating: (id, data) => api.post(`/appointments/${id}/rate/`, data),
  getRating: (id) => api.get(`/appointments/${id}/rate/`),
  getAdminRevenue: () => api.get('/appointments/admin-revenue/'),
  requestDoctorSwitch: (data) => api.post('/appointments/switch-doctor/', data),
  queueStatus: (id) => api.get(`/appointments/${id}/queue-status/`),
  getChatMessages: (appointmentId) => api.get(`/appointments/${appointmentId}/chat/`),
  sendChatMessage: (appointmentId, message) => api.post(`/appointments/${appointmentId}/chat/`, { message }),
};

export const prescriptionApi = {
  list: (params) => api.get('/prescriptions/', { params }),
  get: (id) => api.get(`/prescriptions/${id}/`),
  create: (data) => api.post('/prescriptions/', data),
  update: (id, data) => api.patch(`/prescriptions/${id}/`, data),
  finalize: (id) => api.post(`/prescriptions/${id}/finalize/`),
  downloadPDFUrl: (id) => `/api/prescriptions/${id}/pdf/`,
  downloadPDF: async (id) => {
    const response = await api.get(`/prescriptions/${id}/pdf/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const triggerBlobDownload = (blobData, filename) => {
  const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

export const recordsApi = {
  list: (params) => api.get('/records/', { params }),
  get: (id) => api.get(`/records/${id}/`),
  listVault: (patient_id) => api.get('/records/vault/', { params: { patient_id } }),
  uploadVaultItem: (data) => api.post('/records/vault/', data),
  toggleVaultShare: (id) => api.post(`/records/vault/${id}/share/`),
};

export const notificationApi = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllRead: () => api.patch('/notifications/mark-all-read/'),
};

export const analyticsApi = {
  getWorkload: () => api.get('/appointments/analytics/'),
};
