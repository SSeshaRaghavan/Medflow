import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import SocialAuthButtons from '../../components/SocialAuthButtons';
import ThemeToggle from '../../components/ThemeToggle';
import { Heart, Eye, EyeOff, Loader2, Sparkles, Shield, User, Stethoscope, CheckCircle2 } from 'lucide-react';

const schema = yup.object({
  email: yup.string().email('Valid email address required').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPass, setShowPass] = useState(false);
  const from = location.state?.from?.pathname;

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async ({ email, password }) => {
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.first_name}!`);
      const redirectMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
      const targetPath = (from && from.startsWith(`/${user.role}`)) ? from : (redirectMap[user.role] || '/');
      navigate(targetPath, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password. Please verify your credentials.';
      toast.error(msg);
    }
  };

  const handleDemoFill = (email, pass) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors relative overflow-hidden">
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle />
      </div>

      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/20 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/15 to-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        <div className="lg:col-span-5 hidden lg:flex flex-col justify-between p-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-3xl text-white shadow-2xl min-h-[560px]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                <Heart size={22} className="text-white fill-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                MED<span className="text-blue-200">FLOW</span>
              </span>
            </Link>
            <h2 className="text-3xl font-extrabold leading-tight mb-4">
              Care delivery at the speed of intelligence.
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Access real-time patient queue updates, encrypted practitioner consultations, and digital prescriptions.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-blue-100">
                <CheckCircle2 size={16} className="text-teal-300 shrink-0" />
                <span>Instant automated queue matching</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-blue-100">
                <CheckCircle2 size={16} className="text-teal-300 shrink-0" />
                <span>SHA-256 cryptographic PDF verification</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-blue-100">
                <CheckCircle2 size={16} className="text-teal-300 shrink-0" />
                <span>End-to-end encrypted clinical chat</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/15 text-xs text-blue-200 flex items-center gap-2">
            <Shield size={14} className="text-teal-300" />
            <span>256-Bit SSL Encrypted Healthcare Portal</span>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 sm:p-10 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <div className="text-center lg:text-left mb-6">
            <Link to="/" className="lg:hidden inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Heart size={18} fill="white" />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                MED<span className="text-blue-600">FLOW</span>
              </span>
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Sign In to MedFlow
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your social identity or use authorized credentials
            </p>
          </div>

          <SocialAuthButtons role="patient" />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6" noValidate>
            <div>
              <label className="label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                className={`input ${errors.email ? 'input-error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0" htmlFor="password">Password</label>
                <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
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
              {errors.password && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-sm font-semibold tracking-wide mt-2">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {isSubmitting ? 'Authenticating…' : 'Sign in to MedFlow'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <p>
              New patient?{' '}
              <Link to="/register/patient" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                Create patient account
              </Link>
            </p>
            <p>
              Healthcare professional?{' '}
              <Link to="/register/doctor" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Register as doctor
              </Link>
            </p>
          </div>

          <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <Sparkles size={13} className="text-amber-500" />
              <span>One-Click Demo Fill</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoFill('alice@medflow.demo', 'Patient@1234')}
                className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1"
              >
                <User size={12} className="text-blue-500" /> Patient
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('dr.sharma@medflow.demo', 'Doctor@1234')}
                className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1"
              >
                <Stethoscope size={12} className="text-emerald-500" /> Doctor
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('admin@medflow.demo', 'Admin@1234')}
                className="py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1"
              >
                <Shield size={12} className="text-purple-500" /> Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
