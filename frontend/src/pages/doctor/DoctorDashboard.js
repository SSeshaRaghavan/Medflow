import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doctorApi, appointmentApi } from '../../api';
import toast from 'react-hot-toast';
import ActiveConsultationWorkspace from '../../components/ActiveConsultationWorkspace';
import NotificationBell from '../../components/NotificationBell';
import {
  Stethoscope,
  Users,
  Clock,
  CheckCircle2,
  Activity,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  PhoneCall,
  RefreshCw,
  FileText,
  MessageSquare,
  Palmtree,
  Calendar,
  RotateCcw,
  Wallet
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import ConsultationChatRoom from '../../components/ConsultationChatRoom';

export default function DoctorDashboard() {
  const { logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  // stats is fetched but used for future earnings analytics; suppress lint with underscore prefix
  const [stats, setStats] = useState(null); // eslint-disable-line no-unused-vars
  const [queueAppointments, setQueueAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [vacationUpdating, setVacationUpdating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [activeWorkspaceAppt, setActiveWorkspaceAppt] = useState(null);
  const [activeChatAppt, setActiveChatAppt] = useState(null);

  const [initialFormData, setInitialFormData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    doctor_profile: {
      license_number: '',
      specialty: '',
      sub_specialty: '',
      years_of_experience: 0,
      bio: '',
      clinic_name: '',
      clinic_address: '',
      consultation_fee: 500,
      availability_status: 'offline',
      is_accepting_patients: true,
      is_vacation_mode: false,
      max_queue_size: 20,
      avg_consultation_minutes: 15,
      is_verified: false,
    },
  });

  const loadDoctorData = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const [profileRes, statsRes, queueRes] = await Promise.all([
        doctorApi.getProfile(),
        doctorApi.getStats(),
        appointmentApi.doctorQueue(),
      ]);

      const prof = profileRes.data.doctor_profile || {};
      const newFormState = {
        first_name: profileRes.data.first_name || '',
        last_name: profileRes.data.last_name || '',
        phone: profileRes.data.phone || '',
        doctor_profile: {
          license_number: prof.license_number || '',
          specialty: prof.specialty || '',
          sub_specialty: prof.sub_specialty || '',
          years_of_experience: prof.years_of_experience ?? 0,
          bio: prof.bio || '',
          clinic_name: prof.clinic_name || '',
          clinic_address: prof.clinic_address || '',
          consultation_fee: prof.consultation_fee ?? 500,
          availability_status: prof.availability_status || 'offline',
          is_accepting_patients: prof.is_accepting_patients ?? true,
          is_vacation_mode: prof.is_vacation_mode ?? false,
          max_queue_size: prof.max_queue_size ?? 20,
          avg_consultation_minutes: prof.avg_consultation_minutes ?? 15,
          is_verified: prof.is_verified ?? false,
        },
      };

      if (!isPolling) {
        setFormData(newFormState);
        setInitialFormData(newFormState);
      }
      setStats(statsRes.data);
      const queueList = queueRes.data || [];
      setQueueAppointments(queueList);

      if (activeWorkspaceAppt) {
        const updated = queueList.find((q) => q.id === activeWorkspaceAppt.id);
        if (updated) setActiveWorkspaceAppt(updated);
      }
    } catch {
      if (!isPolling) toast.error('Failed to load doctor profile.');
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [activeWorkspaceAppt]);

  useEffect(() => {
    loadDoctorData();
  }, [loadDoctorData]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadDoctorData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [loadDoctorData]);

  const handleStatusChange = async (newStatus) => {
    try {
      setStatusUpdating(true);
      const { data } = await doctorApi.setAvailability(newStatus);
      setFormData((prev) => ({
        ...prev,
        doctor_profile: {
          ...prev.doctor_profile,
          availability_status: data.availability_status,
        },
      }));
      setStats((prev) => prev ? { ...prev, availability_status: data.availability_status } : prev);
      toast.success(`Availability changed to ${newStatus.toUpperCase()}`);
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleToggleVacationMode = async () => {
    try {
      setVacationUpdating(true);
      const { data } = await doctorApi.toggleVacationMode();
      setFormData((prev) => ({
        ...prev,
        doctor_profile: {
          ...prev.doctor_profile,
          is_vacation_mode: data.is_vacation_mode,
        },
      }));
      if (data.is_vacation_mode) {
        toast.success('Emergency Pause / Vacation Mode activated. Slot bookings are paused.');
      } else {
        toast.success('Practice resumed. Patients can now book available slots.');
      }
    } catch {
      toast.error('Failed to toggle vacation mode.');
    } finally {
      setVacationUpdating(false);
    }
  };

  const handleCallNext = async (apptId) => {
    try {
      setActionLoadingId(apptId);
      const { data } = await appointmentApi.callNext(apptId);
      toast.success(`Called patient ticket #${data.queue_number}`);
      setActiveWorkspaceAppt(data);
      loadDoctorData(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to call patient.';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProfileChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      doctor_profile: {
        ...prev.doctor_profile,
        [field]: value,
      },
    }));
  };

  const handleDiscardChanges = () => {
    if (initialFormData) {
      setFormData(initialFormData);
      toast.success('Unsaved changes cleared. Restored last saved profile.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        doctor_profile: {
          specialty: formData.doctor_profile.specialty,
          sub_specialty: formData.doctor_profile.sub_specialty,
          years_of_experience: Number(formData.doctor_profile.years_of_experience) || 0,
          bio: formData.doctor_profile.bio,
          clinic_name: formData.doctor_profile.clinic_name,
          clinic_address: formData.doctor_profile.clinic_address,
          consultation_fee: formData.doctor_profile.consultation_fee === '' ? null : Number(formData.doctor_profile.consultation_fee),
          is_accepting_patients: formData.doctor_profile.is_accepting_patients,
          max_queue_size: Number(formData.doctor_profile.max_queue_size) || 20,
          avg_consultation_minutes: Number(formData.doctor_profile.avg_consultation_minutes) || 15,
        },
      };

      const { data } = await doctorApi.updateProfile(payload);
      updateUser({
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: data.full_name,
        phone: data.phone,
        doctor_profile: data.doctor_profile,
      });
      setInitialFormData(formData);
      toast.success('Doctor practice profile updated.');
    } catch (err) {
      const errDetail = err.response?.data?.detail || 'Failed to update profile.';
      toast.error(errDetail);
    } finally {
      setSaving(false);
    }
  };

  const profile = formData.doctor_profile;
  const currentStatus = profile.availability_status;
  const currentActiveConsultation = queueAppointments.find((a) => a.status === 'in_consultation');
  const waitingQueue = queueAppointments.filter((a) => a.status === 'waiting');
  const completedTodayCount = queueAppointments.filter((a) => a.status === 'completed').length;
  const netEarningsToday = completedTodayCount * (Number(profile.consultation_fee) || 500) * 0.90;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Stethoscope size={22} />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">MedFlow</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Doctor Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleToggleVacationMode}
              disabled={vacationUpdating}
              title="Pause booking without clearing availability"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                profile.is_vacation_mode
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palmtree size={14} />
              <span className="hidden sm:inline">{profile.is_vacation_mode ? 'Vacation Active' : 'Vacation Pause'}</span>
            </button>

            <ThemeToggle />
            <NotificationBell />
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700">
              <button
                disabled={statusUpdating}
                onClick={() => handleStatusChange('available')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currentStatus === 'available'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Available
              </button>
              <button
                disabled={statusUpdating}
                onClick={() => handleStatusChange('busy')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currentStatus === 'busy'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Busy
              </button>
              <button
                disabled={statusUpdating}
                onClick={() => handleStatusChange('offline')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currentStatus === 'offline'
                    ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Offline
              </button>
            </div>

            <button onClick={logout} className="btn-outline text-xs px-3 py-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Sign Out
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-slate-100 dark:border-slate-800 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity size={16} /> Workspace & Live Queue
            {waitingQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500 text-white">
                {waitingQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={16} /> Schedule & Availability (1h Lockdown)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Practice & Profile Settings
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={36} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading doctor workspace…</p>
          </div>
        ) : (
          <div className="space-y-6">
            {profile.is_vacation_mode && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Palmtree size={24} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Emergency Pause / Vacation Mode is currently ACTIVE</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      New patient appointments and instant queue routing are temporarily frozen. Existing scheduled patients are maintained.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleVacationMode}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shrink-0"
                >
                  Resume Practice
                </button>
              </div>
            )}

            {!profile.is_verified && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                <ShieldAlert className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-300">Verification Pending Approval</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                    Your medical credentials (License #{profile.license_number}) have been submitted and are pending review by clinic administration.
                  </p>
                </div>
              </div>
            )}

            {currentActiveConsultation && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl shadow-emerald-600/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-2">
                    ● Active In Consultation
                  </span>
                  <h2 className="text-2xl font-bold">
                    Slot #{currentActiveConsultation.queue_number} — {currentActiveConsultation.patient.full_name}
                  </h2>
                  <p className="text-emerald-100 text-xs mt-1">
                    <strong>Chief Complaint:</strong> {currentActiveConsultation.chief_complaint}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveChatAppt(currentActiveConsultation)}
                    className="bg-emerald-950/40 hover:bg-emerald-950/60 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-emerald-300/40 flex items-center gap-2 shadow-sm"
                  >
                    <MessageSquare size={16} /> Open Patient Chat
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceAppt(currentActiveConsultation)}
                    className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
                  >
                    <FileText size={16} /> Open Clinical Editor & Prescribe
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'overview' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/50">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Queue Waiting</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{waitingQueue.length}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50">
                      <Activity size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Consultation</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{currentActiveConsultation ? 1 : 0}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed Today</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                        {completedTodayCount}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/50">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Earnings Today (₹)</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                        ₹{netEarningsToday.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="font-bold text-slate-900 dark:text-white text-lg">Today's Dynamic Queue Board</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Live synchronized patient appointments. Call patients or open clinical prescription editor.
                      </p>
                    </div>
                    <button
                      onClick={() => loadDoctorData(true)}
                      className="btn-ghost p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      title="Refresh Queue"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  {queueAppointments.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <Users size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">No appointments in today's queue</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Patients routed by the matching engine will appear here in real time.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-800/60">
                            <th className="py-3 px-4">Ticket</th>
                            <th className="py-3 px-4">Patient Name</th>
                            <th className="py-3 px-4">Chief Medical Complaint</th>
                            <th className="py-3 px-4">Time Slot</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {queueAppointments.map((appt) => {
                            const isWaiting = appt.status === 'waiting';
                            const isInConsult = appt.status === 'in_consultation';
                            const isCompleted = appt.status === 'completed';
                            const isActionRunning = actionLoadingId === appt.id;

                            const statusBadge = isInConsult
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isWaiting
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : isCompleted
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800';

                            return (
                              <tr
                                key={appt.id}
                                className={`transition-colors ${
                                  isInConsult
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                  #{appt.queue_number}
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-semibold text-slate-900 dark:text-white">{appt.patient.full_name}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{appt.patient.email}</p>
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-xs">
                                  {appt.chief_complaint}
                                </td>
                                <td className="py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {appt.time_slot || 'Regular Queue'}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${statusBadge}`}>
                                    {appt.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {isActionRunning ? (
                                    <Loader2 size={16} className="animate-spin inline text-slate-500" />
                                  ) : isWaiting ? (
                                    <button
                                      onClick={() => handleCallNext(appt.id)}
                                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 ml-auto"
                                    >
                                      <PhoneCall size={13} /> Call Patient
                                    </button>
                                  ) : isInConsult ? (
                                    <button
                                      onClick={() => setActiveWorkspaceAppt(appt)}
                                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 ml-auto"
                                    >
                                      <FileText size={13} /> Consultation Editor
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setActiveWorkspaceAppt(appt)}
                                      className="btn-outline text-xs py-1 px-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-auto"
                                    >
                                      View Rx
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'schedule' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm transition-colors">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Doctor Availability & Slot Lockdown Engine</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage weekly consultation windows and appointment time slot templates.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} /> 1-Hour Slot Editing Lockdown Active
                  </p>
                  <p>
                    Per clinical continuity regulations, practitioners cannot add, edit, or delete time slots within <strong>1 hour</strong> of slot start time once patients have booked tickets.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                    <div key={day} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{day}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold">
                          Active Window: 09:00 AM - 05:00 PM
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'].map((slot) => (
                          <span key={slot} className="px-2 py-1 rounded-md text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Practice & Profile Management</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Configure your clinical credentials, consultation settings, and clinic details.
                    </p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">First Name</label>
                          <input
                            type="text"
                            required
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={formData.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Last Name</label>
                          <input
                            type="text"
                            required
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={formData.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Primary Phone</label>
                          <input
                            type="tel"
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Medical License Number</label>
                          <input
                            type="text"
                            disabled
                            className="input bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            value={formData.doctor_profile.license_number}
                          />
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Verified credential (uneditable)</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                        Clinical Specialty & Practice
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Primary Specialty</label>
                          <input
                            type="text"
                            required
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={formData.doctor_profile.specialty}
                            onChange={(e) => handleProfileChange('specialty', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Sub-specialty / Focus</label>
                          <input
                            type="text"
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            placeholder="e.g. Pediatric Dermatology"
                            value={formData.doctor_profile.sub_specialty}
                            onChange={(e) => handleProfileChange('sub_specialty', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Years of Experience</label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={formData.doctor_profile.years_of_experience}
                            onChange={(e) => handleProfileChange('years_of_experience', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Base Consultation Fee (₹)</label>
                          <input
                            type="number"
                            min={0}
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            placeholder="500"
                            value={formData.doctor_profile.consultation_fee}
                            onChange={(e) => handleProfileChange('consultation_fee', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                        Queue & Patient Capacity
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Max Daily Queue Size</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={formData.doctor_profile.max_queue_size}
                            onChange={(e) => handleProfileChange('max_queue_size', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Avg Consultation Duration (Minutes)</label>
                          <input
                            type="number"
                            min={5}
                            max={120}
                            className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            value={formData.doctor_profile.avg_consultation_minutes}
                            onChange={(e) => handleProfileChange('avg_consultation_minutes', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">Accepting New Patient Requests</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            When paused, patients will not be routed to your queue.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleProfileChange('is_accepting_patients', !formData.doctor_profile.is_accepting_patients)}
                          className="text-emerald-600 focus:outline-none"
                        >
                          {formData.doctor_profile.is_accepting_patients ? (
                            <ToggleRight size={38} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ToggleLeft size={38} className="text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                        Clinic Details & Biography
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Clinic / Hospital Name</label>
                            <input
                              type="text"
                              className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                              value={formData.doctor_profile.clinic_name}
                              onChange={(e) => handleProfileChange('clinic_name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="label">Clinic Address</label>
                            <input
                              type="text"
                              className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                              value={formData.doctor_profile.clinic_address}
                              onChange={(e) => handleProfileChange('clinic_address', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="label">Doctor Bio / Professional Statement</label>
                          <textarea
                            rows={3}
                            className="input resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            placeholder="Provide patients an overview of your medical background and care approach…"
                            value={formData.doctor_profile.bio}
                            onChange={(e) => handleProfileChange('bio', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleDiscardChanges}
                        className="btn-outline flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <RotateCcw size={14} /> Discard Changes
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-secondary text-xs"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving Changes…' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeWorkspaceAppt && (
          <ActiveConsultationWorkspace
            appointment={activeWorkspaceAppt}
            onClose={() => setActiveWorkspaceAppt(null)}
            onConsultationFinished={() => {
              loadDoctorData(true);
            }}
          />
        )}

        {activeChatAppt && (
          <ConsultationChatRoom
            appointment={activeChatAppt}
            onClose={() => setActiveChatAppt(null)}
            onOpenPrescription={() => {
              setActiveWorkspaceAppt(activeChatAppt);
              setActiveChatAppt(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
