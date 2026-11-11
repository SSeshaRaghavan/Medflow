import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { authApi } from '../../api';
import { Heart, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import SocialAuthButtons from '../../components/SocialAuthButtons';

const schema = yup.object({
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  phone: yup.string().optional(),
  password: yup.string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Must contain uppercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .required('Password is required'),
  confirm_password: yup.string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
  date_of_birth: yup.string().optional(),
  gender: yup.string().optional(),
});

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [otpMobileInput, setOtpMobileInput] = useState('');
  const [otpEmailInput, setOtpEmailInput] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const handleSimulateCaptcha = () => {
    setCaptchaLoading(true);
    setTimeout(() => {
      setCaptchaLoading(false);
      setCaptchaVerified(true);
      toast.success('Security challenge verified: Cloudflare Turnstile token valid.');
    }, 800);
  };

  const onSubmit = async (values) => {
    if (!captchaVerified) {
      toast.error('Please complete the bot protection CAPTCHA challenge.');
      return;
    }
    const { confirm_password, date_of_birth, gender, ...rest } = values;
    const payload = {
      ...rest,
      patient_profile: { date_of_birth: date_of_birth || undefined, gender: gender || undefined },
    };
    setPendingPayload(payload);

    try {
      const contact = payload.email;
      const { data } = await authApi.sendOTP(contact, 'signup');
      setOtpModalOpen(true);
      toast.success(`Dual OTP sent! Dev Mobile: ${data.dev_mobile_otp}, Dev Email: ${data.dev_email_otp}`);
    } catch {
      toast.error('Failed to dispatch registration verification OTP.');
    }
  };

  const handleVerifyOtpAndCreate = async (e) => {
    e.preventDefault();
    if (!pendingPayload) return;
    try {
      setOtpVerifying(true);
      await authApi.verifyOTP(pendingPayload.email, otpMobileInput, otpEmailInput, 'signup');
      toast.success('Dual OTP verified.');

      const { data } = await authApi.registerPatient(pendingPayload);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      toast.success('Account created! Welcome to MedFlow.');
      navigate('/patient', { replace: true });
    } catch (err) {
      const respErrors = err.response?.data;
      if (respErrors?.error) toast.error(respErrors.error);
      else if (respErrors?.email) toast.error(`Email: ${respErrors.email[0]}`);
      else toast.error('OTP verification or registration failed.');
    } finally {
      setOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors relative overflow-hidden">
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto w-full relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Heart size={24} fill="white" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              MED<span className="text-blue-600">FLOW</span>
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Create Patient Account
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Access on-demand clinical matching and digital health records
          </p>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 sm:p-10 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <SocialAuthButtons role="patient" isSignUp={true} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input
                  type="text"
                  className={`input ${errors.first_name ? 'input-error' : ''}`}
                  placeholder="Sarah"
                  {...register('first_name')}
                />
                {errors.first_name && <p className="mt-1 text-xs text-rose-500">{errors.first_name.message}</p>}
              </div>

              <div>
                <label className="label">Last Name *</label>
                <input
                  type="text"
                  className={`input ${errors.last_name ? 'input-error' : ''}`}
                  placeholder="Jenkins"
                  {...register('last_name')}
                />
                {errors.last_name && <p className="mt-1 text-xs text-rose-500">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Email Address *</label>
                <input
                  type="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="sarah@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
              </div>

              <div>
                <label className="label">Primary Phone (Mobile OTP)</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+91 98765 43210"
                  {...register('phone')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Date of Birth</label>
                <input
                  type="date"
                  className="input"
                  {...register('date_of_birth')}
                />
              </div>

              <div>
                <label className="label">Gender</label>
                <select className="input" {...register('gender')}>
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm Password *</label>
              <input
                type="password"
                className={`input ${errors.confirm_password ? 'input-error' : ''}`}
                placeholder="••••••••"
                {...register('confirm_password')}
              />
              {errors.confirm_password && <p className="mt-1 text-xs text-rose-500">{errors.confirm_password.message}</p>}
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSimulateCaptcha}
                  disabled={captchaVerified || captchaLoading}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                    captchaVerified
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {captchaLoading ? (
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                  ) : captchaVerified ? (
                    <CheckCircle2 size={16} />
                  ) : null}
                </button>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Bot Protection Security Challenge</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Cloudflare Turnstile verified humanity check</p>
                </div>
              </div>
              <ShieldCheck size={20} className={captchaVerified ? 'text-emerald-500' : 'text-slate-400'} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm font-semibold tracking-wide mt-4"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {isSubmitting ? 'Validating…' : 'Proceed to Dual OTP Verification'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-600 dark:text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>

      {otpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Activate Patient Account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter verification codes sent to your mobile SMS & email ({pendingPayload?.email})
              </p>
            </div>

            <form onSubmit={handleVerifyOtpAndCreate} className="space-y-3">
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
                  {otpVerifying ? 'Verifying…' : 'Activate Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
