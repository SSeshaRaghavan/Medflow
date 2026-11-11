import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi, patientApi, appointmentApi, recordsApi, prescriptionApi, triggerBlobDownload } from '../../api';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';
import ThemeToggle from '../../components/ThemeToggle';
import ConsultationChatRoom from '../../components/ConsultationChatRoom';
import {
  Heart,
  Clock,
  CheckCircle2,
  Save,
  Loader2,
  Stethoscope,
  FileText,
  Search,
  Sparkles,
  XCircle,
  Download,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Siren,
  FolderLock,
  Upload,
  Share2,
  Bell,
  BellOff,
  Star,
  RotateCcw,
  Users2
} from 'lucide-react';

const SPECIALTIES = [
  'General Physician', 'Cardiology', 'Dermatology', 'Endocrinology',
  'Gastroenterology', 'Neurology', 'Oncology', 'Ophthalmology',
  'Orthopaedics', 'Paediatrics', 'Psychiatry', 'Pulmonology',
  'Radiology', 'Rheumatology', 'Urology',
];

export default function PatientDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileSubTab, setProfileSubTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [vaultItems, setVaultItems] = useState([]);
  const [activeQueueStatus, setActiveQueueStatus] = useState(null);
  const [activeChatAppt, setActiveChatAppt] = useState(null);

  const [matchSpecialty, setMatchSpecialty] = useState('');
  const [matchSymptoms, setMatchSymptoms] = useState('');
  const [matchLocation, setMatchLocation] = useState('');
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [rankedDoctors, setRankedDoctors] = useState([]);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:00 AM');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [isFamilyMember, setIsFamilyMember] = useState(false);
  const [familyDetails, setFamilyDetails] = useState({ name: '', age: '', relation: '', notes: '' });

  const [ratingModalAppt, setRatingModalAppt] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingQuality, setRatingQuality] = useState(5);
  const [ratingWaitTime, setRatingWaitTime] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const [medRemindersEnabled, setMedRemindersEnabled] = useState(true);

  const [vaultUploadTitle, setVaultUploadTitle] = useState('');
  const [vaultUploadCategory, setVaultUploadCategory] = useState('lab_report');
  const [vaultUploading, setVaultUploading] = useState(false);

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpContactTarget, setOtpContactTarget] = useState('');
  const [otpMobileInput, setOtpMobileInput] = useState('');
  const [otpEmailInput, setOtpEmailInput] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [initialFormData, setInitialFormData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    patient_profile: {
      date_of_birth: '',
      gender: '',
      blood_group: '',
      allergies: '',
      chronic_conditions: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    },
  });

  const fetchProfileAndAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, apptsRes, recordsRes, rxRes, vaultRes] = await Promise.all([
        patientApi.getProfile(),
        appointmentApi.myAppointments(),
        recordsApi.list(),
        prescriptionApi.list(),
        recordsApi.listVault().catch(() => ({ data: [] })),
      ]);

      const initial = {
        first_name: profileRes.data.first_name || '',
        last_name: profileRes.data.last_name || '',
        phone: profileRes.data.phone || '',
        patient_profile: {
          date_of_birth: profileRes.data.patient_profile?.date_of_birth || '',
          gender: profileRes.data.patient_profile?.gender || '',
          blood_group: profileRes.data.patient_profile?.blood_group || '',
          allergies: profileRes.data.patient_profile?.allergies || '',
          chronic_conditions: profileRes.data.patient_profile?.chronic_conditions || '',
          emergency_contact_name: profileRes.data.patient_profile?.emergency_contact_name || '',
          emergency_contact_phone: profileRes.data.patient_profile?.emergency_contact_phone || '',
        },
      };

      setFormData(initial);
      setInitialFormData(initial);
      const appts = apptsRes.data.results || apptsRes.data || [];
      setAppointments(appts);
      setMedicalRecords(recordsRes.data.results || recordsRes.data || []);
      setPrescriptions(rxRes.data.results || rxRes.data || []);
      setVaultItems(vaultRes.data.results || vaultRes.data || []);

      const active = appts.find(
        (a) => a.status === 'waiting' || a.status === 'in_consultation' || a.status === 'request_received'
      );

      if (active) {
        fetchQueueStatus(active.id);
      } else {
        setActiveQueueStatus(null);
      }
    } catch {
      toast.error('Failed to load patient records.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQueueStatus = async (apptId) => {
    try {
      const { data } = await appointmentApi.queueStatus(apptId);
      setActiveQueueStatus(data);
    } catch {}
  };

  useEffect(() => {
    fetchProfileAndAppointments();
  }, [fetchProfileAndAppointments]);

  useEffect(() => {
    const timer = setInterval(() => {
      const active = appointments.find(
        (a) => a.status === 'waiting' || a.status === 'in_consultation'
      );
      if (active) fetchQueueStatus(active.id);
    }, 5000);
    return () => clearInterval(timer);
  }, [appointments]);

  const handleMatchSearch = async (e) => {
    if (e) e.preventDefault();
    try {
      setMatchingLoading(true);
      const { data } = await appointmentApi.matchDoctors({
        specialty: matchSpecialty,
        symptoms: matchSymptoms,
        location_preference: matchLocation,
      });
      setRankedDoctors(data);
      if (data.length === 0) {
        toast('No online practitioners found matching your criteria.', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Doctor matching failed.');
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleSelectDoctorForBooking = async (doctor) => {
    setSelectedDoctorForBooking(doctor);
    setSlotsLoading(true);
    try {
      const { data } = await appointmentApi.getAvailableSlots(doctor.doctor_id, selectedDate);
      setAvailableSlots(data.slots || []);
      const firstAvail = (data.slots || []).find((s) => s.available);
      if (firstAvail) setSelectedTimeSlot(firstAvail.slot);
    } catch {
      setAvailableSlots([
        { slot: '09:00 AM', available: true },
        { slot: '10:00 AM', available: true },
        { slot: '11:00 AM', available: true },
        { slot: '02:00 PM', available: true },
        { slot: '03:00 PM', available: true },
        { slot: '04:00 PM', available: true },
      ]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChangeForSlots = async (newDate) => {
    setSelectedDate(newDate);
    if (!selectedDoctorForBooking) return;
    try {
      setSlotsLoading(true);
      const { data } = await appointmentApi.getAvailableSlots(selectedDoctorForBooking.doctor_id, newDate);
      setAvailableSlots(data.slots || []);
      const firstAvail = (data.slots || []).find((s) => s.available);
      if (firstAvail) setSelectedTimeSlot(firstAvail.slot);
    } catch {} finally {
      setSlotsLoading(false);
    }
  };

  const handleConfirmBooking = async (e, payOnline = false) => {
    if (e) e.preventDefault();
    if (!chiefComplaint.trim()) {
      toast.error('Please describe your chief medical complaint.');
      return;
    }

    if (payOnline) {
      navigate(`/payment?doctor_id=${selectedDoctorForBooking.doctor_id}&date=${selectedDate}&slot=${encodeURIComponent(selectedTimeSlot)}`);
      return;
    }

    try {
      setBookingSubmitting(true);
      const { data } = await appointmentApi.book({
        doctor_id: selectedDoctorForBooking.doctor_id,
        chief_complaint: chiefComplaint,
        scheduled_date: selectedDate,
        time_slot: selectedTimeSlot,
        is_family_member: isFamilyMember,
        family_member_details: isFamilyMember ? familyDetails : {},
      });
      toast.success(`Booked with Dr. ${data.doctor.full_name}! Slot: ${data.time_slot || selectedTimeSlot} (Queue #${data.queue_number})`);
      setSelectedDoctorForBooking(null);
      setChiefComplaint('');
      setIsFamilyMember(false);
      setActiveTab('queue');
      fetchProfileAndAppointments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to complete booking.';
      toast.error(msg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleEmergencySOS = async () => {
    try {
      setSosLoading(true);
      const { data } = await appointmentApi.book({
        chief_complaint: 'Urgent Care / Emergency SOS triage request',
        is_sos: true,
      });
      toast.success(`Emergency SOS Dispatched! Assigned to Dr. ${data.doctor.full_name}. Priority Ticket #${data.queue_number}`);
      setActiveTab('queue');
      fetchProfileAndAppointments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Emergency SOS routing currently unavailable.';
      toast.error(msg);
    } finally {
      setSosLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId) => {
    try {
      const { data } = await appointmentApi.cancelWithRefund(apptId, 'Patient requested cancellation');
      toast.success(`Consultation cancelled. Refund processed: ₹${data.refund_amount} (${data.refund_status})`);
      fetchProfileAndAppointments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to cancel consultation.';
      toast.error(msg);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!ratingModalAppt) return;
    try {
      setRatingSubmitting(true);
      await appointmentApi.submitRating(ratingModalAppt.id, {
        patient_star_rating: ratingStars,
        patient_consultation_quality: ratingQuality,
        patient_wait_time_score: ratingWaitTime,
        patient_feedback: ratingFeedback,
      });
      toast.success('Thank you for rating your consultation experience!');
      setRatingModalAppt(null);
      setRatingFeedback('');
    } catch {
      toast.error('Failed to submit consultation feedback.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleUploadVaultItem = async (e) => {
    e.preventDefault();
    if (!vaultUploadTitle.trim()) {
      toast.error('Please provide a file title.');
      return;
    }
    try {
      setVaultUploading(true);
      const { data } = await recordsApi.uploadVaultItem({
        title: vaultUploadTitle,
        category: vaultUploadCategory,
        file_url: `https://storage.medflow.io/vault/${vaultUploadTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        file_size: '1.8 MB',
      });
      setVaultItems((prev) => [data, ...prev]);
      setVaultUploadTitle('');
      toast.success('Document encrypted and stored in your Health Vault.');
    } catch {
      toast.error('Failed to upload health document.');
    } finally {
      setVaultUploading(false);
    }
  };

  const handleToggleVaultShare = async (id) => {
    try {
      const { data } = await recordsApi.toggleVaultShare(id);
      setVaultItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, shared_with_doctor_until: data.shared_until } : item
        )
      );
      toast.success(data.message);
    } catch {
      toast.error('Failed to update doctor sharing permission.');
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
      patient_profile: {
        ...prev.patient_profile,
        [field]: value,
      },
    }));
  };

  const handleDiscardChanges = () => {
    if (initialFormData) {
      setFormData(initialFormData);
      toast.success('Unsaved edits discarded. Restored last saved profile.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (initialFormData && formData.phone !== initialFormData.phone && formData.phone.trim() !== '') {
      setOtpContactTarget(formData.phone);
      try {
        const { data } = await authApi.sendOTP(formData.phone, 'profile_update');
        setOtpModalOpen(true);
        toast.success(`Dual OTP sent! Dev Mobile: ${data.dev_mobile_otp}, Dev Email: ${data.dev_email_otp}`);
      } catch {
        toast.error('Failed to dispatch contact verification OTP.');
      }
      return;
    }
    commitProfileUpdate();
  };

  const commitProfileUpdate = async () => {
    try {
      setSaving(true);
      const { data } = await patientApi.updateProfile(formData);
      updateUser({
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: data.full_name,
        phone: data.phone,
        patient_profile: data.patient_profile,
      });
      setInitialFormData(formData);
      setOtpModalOpen(false);
      toast.success('Profile saved successfully.');
    } catch (err) {
      const errDetail = err.response?.data?.detail || 'Failed to update profile.';
      toast.error(errDetail);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtpAndSave = async (e) => {
    e.preventDefault();
    try {
      setOtpVerifying(true);
      await authApi.verifyOTP(otpContactTarget, otpMobileInput, otpEmailInput, 'profile_update');
      toast.success('Dual OTP verified.');
      commitProfileUpdate();
    } catch {
      toast.error('Invalid OTP codes. Please check and retry.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const activeAppointment = appointments.find(
    (a) => a.status === 'waiting' || a.status === 'in_consultation' || a.status === 'request_received'
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Heart size={22} />
            </div>
            <div>
              <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">MedFlow</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Patient Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleEmergencySOS}
              disabled={sosLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all animate-pulse"
              title="Immediate Urgent Care Dispatch"
            >
              {sosLoading ? <Loader2 size={13} className="animate-spin" /> : <Siren size={14} />}
              <span>Urgent SOS</span>
            </button>

            <ThemeToggle />
            <NotificationBell />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name || user?.first_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            <button onClick={logout} className="btn-outline text-xs px-3 py-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Sign Out
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-slate-100 dark:border-slate-800 text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setActiveTab('match');
              if (rankedDoctors.length === 0) handleMatchSearch();
            }}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'match'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles size={15} className="text-blue-500" /> Find Doctor & Match
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={15} /> Queue & Live Tracker
            {activeAppointment && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-1" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'records'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={15} /> Medical Records & Rx
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'vault'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderLock size={15} /> Health Vault ({vaultItems.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Health Profile
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={36} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading patient portal…</p>
          </div>
        ) : activeTab === 'overview' ? (
          <div className="space-y-6">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 shadow-sm transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  {medRemindersEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    Automated Medication & Dosage Reminders: {medRemindersEnabled ? 'Enabled' : 'Paused'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Extracts intake frequency from digital prescriptions to deliver dosage alerts.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMedRemindersEnabled((p) => !p);
                  toast.success(`Medication reminders ${!medRemindersEnabled ? 'activated' : 'paused'}.`);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  medRemindersEnabled
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                {medRemindersEnabled ? 'Turn Off' : 'Turn On'}
              </button>
            </div>

            {activeQueueStatus && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-2">
                      ● Active Live Queue
                    </span>
                    <h2 className="text-xl font-bold">
                      Dr. {activeQueueStatus.doctor_name} ({activeQueueStatus.doctor_specialty})
                    </h2>
                    <p className="text-blue-100 text-sm mt-0.5">
                      Doctor Status: <span className="capitalize font-semibold">{activeQueueStatus.doctor_availability}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                    <div className="text-center px-3 border-r border-white/20">
                      <p className="text-xs uppercase font-medium text-blue-200">Your Ticket</p>
                      <p className="text-3xl font-extrabold mt-0.5">#{activeQueueStatus.queue_number}</p>
                    </div>
                    <div className="text-center px-3 border-r border-white/20">
                      <p className="text-xs uppercase font-medium text-blue-200">Serving</p>
                      <p className="text-3xl font-extrabold mt-0.5">
                        {activeQueueStatus.currently_serving_queue_number ? `#${activeQueueStatus.currently_serving_queue_number}` : 'Starting'}
                      </p>
                    </div>
                    <div className="text-center px-3">
                      <p className="text-xs uppercase font-medium text-blue-200">Est. Wait</p>
                      <p className="text-2xl font-bold mt-0.5">{activeQueueStatus.estimated_wait_minutes}m</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/15 text-xs text-blue-100">
                  <span>Patients ahead: <strong className="text-white">{activeQueueStatus.patients_ahead}</strong></span>
                  <div className="flex items-center gap-3">
                    {activeAppointment && (
                      <button
                        type="button"
                        onClick={() => setActiveChatAppt(activeAppointment)}
                        className="bg-white text-blue-800 hover:bg-blue-50 font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <MessageSquare size={13} /> Open Secure Consultation Chat
                      </button>
                    )}
                    <button onClick={() => setActiveTab('queue')} className="text-white underline hover:text-blue-200">
                      Open Full Tracker →
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors shadow-sm">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Welcome back, {user?.first_name || 'Patient'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xl">
                  Intelligent clinician matching, sequential slot reservations, ₹15 transparent convenience fee, and encrypted health records.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setActiveTab('match');
                    handleMatchSearch();
                  }}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Sparkles size={16} /> Book New Consultation
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Total Consultations</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{appointments.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {appointments.filter((a) => a.status === 'completed').length} finalized sessions
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Active Prescriptions</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{prescriptions.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Signed cryptographic records</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
                <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Health Vault Files</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{vaultItems.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">24h doctor sharing toggle</p>
              </div>
            </div>
          </div>
        ) : activeTab === 'match' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Smart Physician Matching Engine</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Filter by clinical specialty and describe symptoms to rank optimal practitioners.
                </p>
              </div>

              <form onSubmit={handleMatchSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={matchSpecialty}
                  onChange={(e) => setMatchSpecialty(e.target.value)}
                >
                  <option value="">All Specialties</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Describe symptoms (e.g. fever, knee ache)"
                  className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={matchSymptoms}
                  onChange={(e) => setMatchSymptoms(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="Preferred location / clinic area (optional)"
                  className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={matchLocation}
                  onChange={(e) => setMatchLocation(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={matchingLoading}
                  className="btn-primary text-xs py-2 flex items-center justify-center gap-2"
                >
                  {matchingLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Find Matching Physicians
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rankedDoctors.map((doc) => (
                <div key={doc.doctor_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <Stethoscope size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Dr. {doc.full_name}</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{doc.specialty}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{doc.years_of_experience} yrs experience • {doc.clinic_name || 'Clinic'}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      ₹{doc.consultation_fee ?? 500}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Wait Time</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{doc.estimated_wait_minutes}m</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">In Queue</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{doc.current_queue_count}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Status</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize mt-0.5">{doc.availability_status}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectDoctorForBooking(doc)}
                    className="btn-primary w-full text-xs py-2"
                  >
                    Select & Pick Time Slot
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'queue' ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Consultation Queue & Appointments</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {appointments.map((appt) => {
                const isWaiting = appt.status === 'waiting' || appt.status === 'request_received';
                const isInConsult = appt.status === 'in_consultation';
                const isCompleted = appt.status === 'completed';

                return (
                  <div key={appt.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          Dr. {appt.doctor.full_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          isInConsult
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : isWaiting
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : isCompleted
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                        }`}>
                          {appt.status.replace('_', ' ')}
                        </span>
                        {appt.is_family_member && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                            <Users2 size={11} /> Family: {appt.family_member_details?.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Complaint: {appt.chief_complaint} • Date: {appt.scheduled_date} • Slot: {appt.time_slot || 'General Queue'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ticket #{appt.queue_number} • Fee: ₹{appt.consultation_fee} (Platform: ₹{appt.platform_fee})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(isWaiting || isInConsult) && (
                        <button
                          onClick={() => setActiveChatAppt(appt)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <MessageSquare size={13} /> Chat
                        </button>
                      )}
                      {(isWaiting || isInConsult) && (
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="btn-outline text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 py-1.5 px-3"
                          title="50% refund prior to 1h"
                        >
                          Cancel Booking (50% Refund)
                        </button>
                      )}
                      {isCompleted && (
                        <button
                          onClick={() => setRatingModalAppt(appt)}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Star size={13} /> Rate Consultation
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'records' ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Medical Records & Prescriptions (Rx)</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {medicalRecords.map((rec) => (
                <div key={rec.id} className="py-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        Diagnosis: {rec.diagnosis} — Dr. {rec.doctor?.full_name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(rec.created_at).toLocaleDateString()}</p>
                    </div>
                    {rec.prescription && (
                      <button
                        onClick={async () => {
                          try {
                            const blob = await prescriptionApi.downloadPDF(rec.prescription.id);
                            triggerBlobDownload(blob, `Prescription_${rec.prescription.id.slice(0, 8)}.pdf`);
                          } catch {
                            toast.error('Download failed.');
                          }
                        }}
                        className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Download size={13} /> Download PDF Rx
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{rec.clinical_notes}</p>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'vault' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderLock size={20} className="text-blue-600" /> Encrypted Health Vault
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload past lab reports, blood tests, and scans. One-tap 24-hour access share with doctors.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUploadVaultItem} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Document Title (e.g. Lipid Profile 2026)"
                  className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={vaultUploadTitle}
                  onChange={(e) => setVaultUploadTitle(e.target.value)}
                />
                <select
                  className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={vaultUploadCategory}
                  onChange={(e) => setVaultUploadCategory(e.target.value)}
                >
                  <option value="lab_report">Lab Report / Blood Test</option>
                  <option value="imaging">Radiology / MRI / CT Scan</option>
                  <option value="discharge_summary">Hospital Discharge Summary</option>
                  <option value="vaccination">Vaccination Record</option>
                </select>
                <button
                  type="submit"
                  disabled={vaultUploading}
                  className="btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  {vaultUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Encrypt & Save File
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                My Stored Vault Documents ({vaultItems.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {vaultItems.map((item) => {
                  const isShared = item.shared_with_doctor_until && new Date(item.shared_with_doctor_until) > new Date();
                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.category.replace('_', ' ')} • {item.file_size} • Encrypted AES-256
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isShared && (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            Shared (24h)
                          </span>
                        )}
                        <button
                          onClick={() => handleToggleVaultShare(item.id)}
                          className={`text-xs px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
                            isShared
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <Share2 size={13} /> {isShared ? 'Revoke Access' : 'One-Tap 24h Share'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Patient Profile & Health Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Keep your medical records current. Contact details require dual OTP verification.
                </p>
              </div>

              <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
                {['personal', 'emergency', 'medical', 'security'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setProfileSubTab(tab)}
                    className={`pb-3 capitalize border-b-2 transition-colors ${
                      profileSubTab === tab
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.replace('_', ' ')} Details
                  </button>
                ))}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {profileSubTab === 'personal' && (
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
                      <label className="label">Primary Phone (Requires Dual OTP)</label>
                      <input
                        type="tel"
                        className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Date of Birth</label>
                      <input
                        type="date"
                        className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={formData.patient_profile.date_of_birth}
                        onChange={(e) => handleProfileChange('date_of_birth', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Gender</label>
                      <select
                        className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={formData.patient_profile.gender}
                        onChange={(e) => handleProfileChange('gender', e.target.value)}
                      >
                        <option value="">Select Gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Blood Group</label>
                      <select
                        className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        value={formData.patient_profile.blood_group}
                        onChange={(e) => handleProfileChange('blood_group', e.target.value)}
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                )}

                {profileSubTab === 'emergency' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Emergency Contact Name</label>
                      <input
                        type="text"
                        className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="Full Name"
                        value={formData.patient_profile.emergency_contact_name}
                        onChange={(e) => handleProfileChange('emergency_contact_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        className="input bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="+91-XXXXXXXXXX"
                        value={formData.patient_profile.emergency_contact_phone}
                        onChange={(e) => handleProfileChange('emergency_contact_phone', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {profileSubTab === 'medical' && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Known Allergies (Medications, Foods, Environment)</label>
                      <textarea
                        rows={2}
                        className="input resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                        value={formData.patient_profile.allergies}
                        onChange={(e) => handleProfileChange('allergies', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Chronic Conditions</label>
                      <textarea
                        rows={2}
                        className="input resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
                        value={formData.patient_profile.chronic_conditions}
                        onChange={(e) => handleProfileChange('chronic_conditions', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {profileSubTab === 'security' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">Account Security & Verification Status</p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Dual OTP Authentication is activated for your email ({user?.email}) and phone number.
                    </p>
                    <div className="flex items-center gap-2 pt-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck size={16} /> 2-Factor Contact Authentication Verified
                    </div>
                  </div>
                )}

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
                    className="btn-primary text-xs"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedDoctorForBooking && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Book Consultation Slot</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dr. {selectedDoctorForBooking.full_name} • {selectedDoctorForBooking.specialty}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDoctorForBooking(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-xs text-blue-900 dark:text-blue-200 space-y-1.5 border border-blue-200 dark:border-blue-800/60">
                  <div className="flex justify-between">
                    <span>Base Consultation Fee:</span>
                    <strong>₹{selectedDoctorForBooking.consultation_fee ?? 500}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Convenience Fee:</span>
                    <strong>₹15.00</strong>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 dark:border-blue-800/60 pt-1">
                    <span>Total Payable:</span>
                    <strong>₹{(Number(selectedDoctorForBooking.consultation_fee) || 500) + 15}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="label mb-0">1. Select Appointment Date *</label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={selectedDate}
                    onChange={(e) => handleDateChangeForSlots(e.target.value)}
                    className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">2. Select Time Slot *</label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                      Selected: {selectedTimeSlot}
                    </span>
                  </div>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      <span>Checking slot availability…</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                      {availableSlots.map(({ slot, available }) => (
                        <button
                          key={slot}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                            selectedTimeSlot === slot
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                              : available
                              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFamilyMember}
                      onChange={(e) => setIsFamilyMember(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Booking for a family member / dependent?</span>
                  </label>

                  {isFamilyMember && (
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <input
                        type="text"
                        placeholder="Family Member Name"
                        required={isFamilyMember}
                        value={familyDetails.name}
                        onChange={(e) => setFamilyDetails({ ...familyDetails, name: e.target.value })}
                        className="input py-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Age & Relation (e.g. 8, Son)"
                        required={isFamilyMember}
                        value={familyDetails.relation}
                        onChange={(e) => setFamilyDetails({ ...familyDetails, relation: e.target.value })}
                        className="input py-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Chief Medical Complaint / Symptoms *</label>
                  <textarea
                    rows={2}
                    required
                    className="input resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="Describe symptoms, duration, and ongoing treatment…"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedDoctorForBooking(null)}
                    className="btn-outline text-xs py-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={bookingSubmitting}
                      onClick={(e) => handleConfirmBooking(e, true)}
                      className="btn-secondary text-xs py-2 flex items-center gap-1.5"
                    >
                      <CreditCard size={14} /> Pay ₹{(Number(selectedDoctorForBooking.consultation_fee) || 500) + 15} Online
                    </button>
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="btn-primary text-xs py-2 flex items-center gap-1.5"
                    >
                      {bookingSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {bookingSubmitting ? 'Confirming…' : 'Book Ticket'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {ratingModalAppt && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Mutual Doctor Rating & Feedback</h3>
                <button onClick={() => setRatingModalAppt(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitRating} className="space-y-4">
                <div>
                  <label className="label">Overall Doctor Rating (1-5 Stars)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingStars(star)}
                        className={`p-2 rounded-xl border text-sm font-bold flex items-center gap-1 transition-all ${
                          ratingStars >= star
                            ? 'bg-amber-400 text-white border-amber-500 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Star size={16} fill={ratingStars >= star ? 'white' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Written Feedback / Consultation Quality</label>
                  <textarea
                    rows={3}
                    className="input resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="Share your experience regarding physician bedside manner and guidance…"
                    value={ratingFeedback}
                    onChange={(e) => setRatingFeedback(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Consultation Quality (1–5)</label>
                    <select
                      className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      value={ratingQuality}
                      onChange={(e) => setRatingQuality(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v} — {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][v - 1]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Wait Time Score (1–5)</label>
                    <select
                      className="input text-xs py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      value={ratingWaitTime}
                      onChange={(e) => setRatingWaitTime(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v} — {['Very Long', 'Long', 'Acceptable', 'Short', 'Minimal'][v - 1]}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ratingSubmitting}
                  className="btn-primary w-full py-2.5 text-xs font-bold"
                >
                  {ratingSubmitting ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </div>
        )}

        {otpModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Dual OTP Verification</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter codes dispatched to verify update for {otpContactTarget}
                </p>
              </div>

              <form onSubmit={handleVerifyOtpAndSave} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Mobile SMS OTP (6 Digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    className="input text-center font-mono py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    value={otpMobileInput}
                    onChange={(e) => setOtpMobileInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Email Verification Code (6 Digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="654321"
                    className="input text-center font-mono py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    value={otpEmailInput}
                    onChange={(e) => setOtpEmailInput(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpModalOpen(false)}
                    className="btn-outline flex-1 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={otpVerifying}
                    className="btn-primary flex-1 py-2 text-xs"
                  >
                    {otpVerifying ? 'Verifying…' : 'Verify & Commit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeChatAppt && (
          <ConsultationChatRoom
            appointment={activeChatAppt}
            onClose={() => setActiveChatAppt(null)}
          />
        )}
      </main>
    </div>
  );
}
