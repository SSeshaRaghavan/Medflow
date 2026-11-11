import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi, analyticsApi, appointmentApi } from '../../api';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';
import {
  Users,
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Download,
  Wallet
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [doctorVerificationFilter, setDoctorVerificationFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, docsRes, analyticsRes, revRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.listUsers(),
        adminApi.listDoctors(),
        analyticsApi.getWorkload(),
        appointmentApi.getAdminRevenue().catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.results || usersRes.data);
      setDoctors(docsRes.data.results || docsRes.data);
      setAnalytics(analyticsRes.data);
      if (revRes?.data) setRevenueData(revRes.data);
    } catch {
      toast.error('Failed to load administration data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerifyDoctor = async (doctorId, profileId) => {
    try {
      setActionLoadingId(doctorId);
      await adminApi.verifyDoctor(profileId);
      toast.success('Doctor verified successfully.');
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === doctorId
            ? {
                ...doc,
                doctor_profile: { ...doc.doctor_profile, is_verified: true },
              }
            : doc
        )
      );
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending_verifications: Math.max(0, prev.pending_verifications - 1),
              verified_doctors: prev.verified_doctors + 1,
            }
          : prev
      );
    } catch {
      toast.error('Failed to verify doctor.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeDoctor = async (doctorId, profileId) => {
    try {
      setActionLoadingId(doctorId);
      await adminApi.revokeDoctor(profileId);
      toast.success('Doctor verification revoked.');
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === doctorId
            ? {
                ...doc,
                doctor_profile: { ...doc.doctor_profile, is_verified: false },
              }
            : doc
        )
      );
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending_verifications: prev.pending_verifications + 1,
              verified_doctors: Math.max(0, prev.verified_doctors - 1),
            }
          : prev
      );
    } catch {
      toast.error('Failed to revoke verification.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleUserStatus = async (targetUser) => {
    if (targetUser.id === user.id) {
      toast.error('You cannot deactivate your own account.');
      return;
    }
    try {
      setActionLoadingId(targetUser.id);
      const { data } = await adminApi.toggleUserStatus(targetUser.id);
      toast.success(data.message);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: data.is_active } : u))
      );
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to toggle account status.';
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadRevenueCSV = () => {
    if (!revenueData?.recent_transactions) {
      toast.error('No transactions available to export.');
      return;
    }
    const headers = ['Transaction ID', 'Patient', 'Doctor', 'Consultation Fee (INR)', 'Platform Fee (INR)', 'Commission (INR)', 'Doctor Net (INR)', 'Scheduled Date', 'Status'];
    const rows = revenueData.recent_transactions.map((t) => [
      t.id,
      `"${t.patient}"`,
      `"${t.doctor}"`,
      t.consultation_fee,
      t.platform_fee,
      t.doctor_commission,
      t.doctor_net,
      t.scheduled_date,
      t.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medflow_revenue_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Financial report exported.');
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredDoctors = doctors.filter((doc) => {
    if (!doctorVerificationFilter) return true;
    if (doctorVerificationFilter === 'pending') return !doc.doctor_profile?.is_verified;
    if (doctorVerificationFilter === 'verified') return doc.doctor_profile?.is_verified;
    return true;
  });

  const summary = analytics?.summary || {};
  const workloads = analytics?.doctor_workloads || [];
  const specialtyDist = analytics?.specialty_distribution || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">MedFlow</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Administration Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.full_name}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wider">System Administrator</p>
            </div>
            <button onClick={loadData} className="btn-ghost p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white" title="Refresh Data">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={logout} className="btn-outline text-xs px-3 py-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Sign Out
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-slate-100 dark:border-slate-800 text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp size={16} /> Workload Insights & Analytics
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'revenue'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wallet size={16} /> Revenue & Commissions (₹)
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'doctors'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Stethoscope size={16} /> Doctor Verification Queue
            {stats?.pending_verifications > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500 text-white">
                {stats.pending_verifications}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users size={16} /> User Directory & Access Control
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/50">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Registered</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stats?.total_users ?? 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Patients</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stats?.total_patients ?? 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
              <Stethoscope size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verified Doctors</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stats?.verified_doctors ?? 0}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/50">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Review</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{stats?.pending_verifications ?? 0}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-purple-600 dark:text-purple-400" size={36} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading admin operations…</p>
          </div>
        ) : activeTab === 'revenue' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white rounded-2xl p-5 border border-purple-800/50 shadow-sm">
                <span className="text-xs uppercase tracking-wider text-purple-200 font-semibold">Total Platform Fees</span>
                <p className="text-3xl font-extrabold mt-1">₹{revenueData?.total_platform_fees?.toFixed(2) ?? '0.00'}</p>
                <p className="text-xs text-purple-200 mt-2">
                  ₹15 fixed fee across {revenueData?.total_appointments_processed ?? 0} consults
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 border border-blue-800/50 shadow-sm">
                <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">10% Platform Commission</span>
                <p className="text-3xl font-extrabold mt-1">₹{revenueData?.total_commissions?.toFixed(2) ?? '0.00'}</p>
                <p className="text-xs text-blue-200 mt-2">
                  Deducted from practitioner consultation base rates
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 border border-emerald-800/50 shadow-sm">
                <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Net Platform Revenue</span>
                <p className="text-3xl font-extrabold mt-1">₹{revenueData?.net_platform_revenue?.toFixed(2) ?? '0.00'}</p>
                <p className="text-xs text-emerald-200 mt-2">
                  Platform Fees + 10% Commission Revenue
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-sm">
                <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Practitioner Net Payouts</span>
                <p className="text-3xl font-extrabold mt-1">₹{revenueData?.doctor_net_payouts?.toFixed(2) ?? '0.00'}</p>
                <p className="text-xs text-slate-300 mt-2">
                  Disbursed / pending doctor settlement
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Platform Revenue Ledger & Payout Requests</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Transparent transaction settlement logs with ₹15 platform fee split and 10% doctor commission.
                  </p>
                </div>
                <button
                  onClick={handleDownloadRevenueCSV}
                  className="btn-primary text-xs py-2 px-3.5 flex items-center gap-2"
                >
                  <Download size={14} /> Export Financial CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-800/60">
                      <th className="py-2.5 px-3">Transaction</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Doctor</th>
                      <th className="py-2.5 px-3">Consult Fee</th>
                      <th className="py-2.5 px-3">Platform Fee</th>
                      <th className="py-2.5 px-3">10% Cut</th>
                      <th className="py-2.5 px-3">Doctor Net</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {revenueData?.recent_transactions && revenueData.recent_transactions.length > 0 ? (
                      revenueData.recent_transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{t.id.slice(0, 8)}…</td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{t.patient}</td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">Dr. {t.doctor}</td>
                          <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">₹{t.consultation_fee}</td>
                          <td className="py-3 px-3 text-purple-600 dark:text-purple-400 font-semibold">₹{t.platform_fee}</td>
                          <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-semibold">₹{t.doctor_commission}</td>
                          <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">₹{t.doctor_net}</td>
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{t.scheduled_date}</td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white rounded-2xl p-5 border border-purple-800/50 shadow-sm">
                <span className="text-xs uppercase tracking-wider text-purple-200 font-semibold">Consultation Completion Rate</span>
                <p className="text-3xl font-extrabold mt-1">{summary.completion_rate_percent ?? 0}%</p>
                <p className="text-xs text-purple-200 mt-2">
                  {summary.completed_appointments ?? 0} of {summary.total_appointments ?? 0} appointments finalized
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-900 to-teal-900 text-white rounded-2xl p-5 border border-blue-800/50 shadow-sm">
                <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold">Cancellation Rate</span>
                <p className="text-3xl font-extrabold mt-1">{summary.cancellation_rate_percent ?? 0}%</p>
                <p className="text-xs text-teal-200 mt-2">
                  {summary.cancelled_appointments ?? 0} cancelled consultations recorded
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 border border-emerald-800/50 shadow-sm">
                <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Active Care Practitioners</span>
                <p className="text-3xl font-extrabold mt-1">{summary.active_doctors_count ?? 0}</p>
                <p className="text-xs text-emerald-200 mt-2">
                  Verified and accepting patient queues
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Doctor Workload & Queue Velocity Analytics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time operational load, queue utilization %, and predictive wait time estimates per practitioner.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-800/60">
                      <th className="py-2.5 px-3">Practitioner</th>
                      <th className="py-2.5 px-3">Specialty</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Queue Load</th>
                      <th className="py-2.5 px-3">Utilization</th>
                      <th className="py-2.5 px-3">Avg Duration</th>
                      <th className="py-2.5 px-3">Predictive Wait</th>
                      <th className="py-2.5 px-3 text-right">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {workloads.map((doc) => (
                      <tr key={doc.doctor_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Dr. {doc.full_name}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{doc.specialty}</td>
                        <td className="py-3 px-3">
                          <span className={`capitalize font-semibold ${
                            doc.availability_status === 'available' ? 'text-emerald-600 dark:text-emerald-400' : doc.availability_status === 'busy' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                          }`}>
                            ● {doc.availability_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {doc.today_waiting} waiting (Max {doc.max_queue_size})
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  doc.utilization_rate > 80 ? 'bg-rose-500' : doc.utilization_rate > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${doc.utilization_rate}%` }}
                              />
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{doc.utilization_rate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{doc.avg_consultation_minutes} mins</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{doc.predictive_wait_time_minutes} mins</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{doc.today_completed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Specialty Demand Breakdown</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Distribution of patient consultation volume across clinical departments.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(specialtyDist).map(([spec, data]) => (
                  <div key={spec} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{spec}</p>
                    <div className="mt-2 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Available Doctors:</span>
                      <strong className="text-slate-900 dark:text-white">{data.doctor_count}</strong>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Total Consultations:</span>
                      <strong className="text-purple-600 dark:text-purple-400">{data.appointment_count}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'doctors' ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-lg">Doctor Verification Queue</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review medical licenses and qualifications before admitting doctors into matching queues.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="input text-xs py-1.5 w-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={doctorVerificationFilter}
                  onChange={(e) => setDoctorVerificationFilter(e.target.value)}
                >
                  <option value="">All Verification States</option>
                  <option value="pending">Pending Verification Only</option>
                  <option value="verified">Verified Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-800/60">
                    <th className="py-3 px-4">Doctor Practitioner</th>
                    <th className="py-3 px-4">License No.</th>
                    <th className="py-3 px-4">Specialty & Exp</th>
                    <th className="py-3 px-4">Clinic</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        No doctors matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => {
                      const prof = doc.doctor_profile || {};
                      const isVerified = prof.is_verified;
                      const isWorking = actionLoadingId === doc.id;

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 dark:text-white">Dr. {doc.full_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{doc.email}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                            {prof.license_number || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{prof.specialty || 'General'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{prof.years_of_experience || 0} years experience</p>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                            {prof.clinic_name || 'Individual Practice'}
                          </td>
                          <td className="py-3 px-4">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle size={12} /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <ShieldAlert size={12} /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isWorking ? (
                              <Loader2 size={16} className="animate-spin inline text-slate-500" />
                            ) : !isVerified ? (
                              <button
                                onClick={() => handleVerifyDoctor(doc.id, prof.id)}
                                className="btn-secondary text-xs py-1 px-3"
                              >
                                Approve & Verify
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRevokeDoctor(doc.id, prof.id)}
                                className="btn-outline text-xs py-1 px-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900"
                              >
                                Revoke Verification
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-lg">User Directory & Security Policies</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage platform credentials, role assignments, and active account access.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name or email…"
                    className="input text-xs pl-8 py-1.5 w-56 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>

                <select
                  className="input text-xs py-1.5 w-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="patient">Patients</option>
                  <option value="doctor">Doctors</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/80 dark:bg-slate-800/60">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        No users matching search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === user.id;
                      const isWorking = actionLoadingId === u.id;

                      const roleBadge =
                        u.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : u.role === 'doctor'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 dark:text-white">{u.full_name || '—'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                            {u.phone || '—'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {new Date(u.date_joined).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            {u.is_active ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300">
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isSelf ? (
                              <span className="text-xs text-slate-400 italic">Current User</span>
                            ) : isWorking ? (
                              <Loader2 size={16} className="animate-spin inline text-slate-500" />
                            ) : (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`text-xs py-1 px-3 rounded-lg font-medium transition-colors ${
                                  u.is_active
                                    ? 'btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900'
                                    : 'btn-secondary text-xs'
                                }`}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
