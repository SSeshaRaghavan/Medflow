import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  Star,
  FileCheck2,
  Lock,
  MessageSquare,
  CreditCard,
  Sparkles,
  ChevronRight,
  Activity,
  Menu,
  X
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const redirectMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
  const dashboardPath = user ? (redirectMap[user.role] || '/login') : '/login';

  const reviews = [
    {
      id: 1,
      name: 'Sarah Jenkins',
      role: 'Verified Patient',
      rating: 5,
      comment: 'Matched with a board-certified dermatologist in under 4 minutes. The prescription PDF was generated instantly with a tamper-proof digital signature that my pharmacy accepted without question.',
      avatar: 'SJ',
      tag: 'Acute Consultation',
    },
    {
      id: 2,
      name: 'Dr. Michael Vance, MD',
      role: 'Chief Medical Officer',
      rating: 5,
      comment: 'MedFlow revolutionized our non-critical triage. The smart workload allocation prevents clinician burnout while ensuring urgent cases receive immediate, audited attention.',
      avatar: 'MV',
      tag: 'Practitioner Review',
    },
    {
      id: 3,
      name: 'Aarav Patel',
      role: 'Family Health Member',
      rating: 5,
      comment: 'The end-to-end encrypted consultation chat and instant receipt payment gave me complete confidence. No waiting rooms, no billing surprises. Super clean interface.',
      avatar: 'AP',
      tag: 'Primary Care',
    },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Doctor Matching',
      description: 'Intelligent triage algorithms instantly analyze symptoms, medical history, and clinical queue density to route you to verified specialists with the shortest wait time.',
      accent: 'from-blue-500 to-indigo-600',
    },
    {
      icon: FileCheck2,
      title: 'Cryptographic Digital Rx',
      description: 'Electronically signed prescriptions embedded with SHA-256 verification stamps and audit trails. Download official, pharmacy-ready PDFs in one click.',
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      icon: MessageSquare,
      title: 'Secure Consultation Chat',
      description: 'Direct, real-time consultation channel with your matched physician for seamless history taking, symptom review, and instant medical inquiries.',
      accent: 'from-violet-500 to-purple-600',
    },
    {
      icon: CreditCard,
      title: 'Frictionless Payment Flow',
      description: 'Transparent upfront consultation pricing with zero hidden fees. Instant digital receipts with support for Cards, UPI, and instant digital wallets.',
      accent: 'from-amber-500 to-orange-600',
    },
    {
      icon: Clock,
      title: 'Dynamic Queue Tracking',
      description: 'Live ticket system providing real-time updates on your queue position and calculated physician availability so you are never left guessing.',
      accent: 'from-cyan-500 to-blue-600',
    },
    {
      icon: Lock,
      title: 'HIPAA-Compliant Security',
      description: 'Enterprise-grade encryption, strict role-based access control, and automated tamper-detection safeguarding patient health information at rest and in transit.',
      accent: 'from-rose-500 to-pink-600',
    },
  ];

  const specialties = [
    'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics',
    'Orthopedics', 'Neurology', 'Psychiatry', 'ENT & Pulmonology',
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors selection:bg-blue-500 selection:text-white">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Heart className="text-white fill-white/20" size={24} />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                MED<span className="text-blue-600 dark:text-blue-400">FLOW</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Non-Critical Care Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How It Works</a>
            <a href="#specialties" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Specialties</a>
            <a href="#reviews" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Testimonials</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Link to={dashboardPath} className="btn-primary text-sm px-5 py-2.5">
                Go to Dashboard
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm font-semibold">
                  Sign In
                </Link>
                <Link to="/register/patient" className="btn-primary text-sm px-5 py-2.5">
                  Get Started
                  <ChevronRight size={16} />
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen((p) => !p)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4">
            <nav className="flex flex-col gap-3 text-sm font-medium">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-700 dark:text-slate-200">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-700 dark:text-slate-200">How It Works</a>
              <a href="#specialties" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-700 dark:text-slate-200">Specialties</a>
              <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-700 dark:text-slate-200">Testimonials</a>
            </nav>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              {user ? (
                <Link to={dashboardPath} className="btn-primary w-full text-center">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-outline w-full text-center">
                    Sign In
                  </Link>
                  <Link to="/register/patient" className="btn-primary w-full text-center">
                    Register as Patient
                  </Link>
                  <Link to="/register/doctor" className="btn-secondary w-full text-center">
                    Register as Doctor
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in">
              <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Next-Gen Non-Critical Care Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
              Instant Doctor Matching & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 bg-clip-text text-transparent">
                Digitally Verified Prescriptions
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-10">
              Skip traditional waiting rooms. MedFlow dynamically matches patients to available specialists in real time, conducts secure consultations, and issues legally binding cryptographic digital prescriptions.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <Link
                to={user ? dashboardPath : '/register/patient'}
                className="btn-primary w-full sm:w-auto text-base px-8 py-3.5 rounded-2xl shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
              >
                Book a Consultation
                <ArrowRight size={18} />
              </Link>
              <Link
                to={user ? dashboardPath : '/register/doctor'}
                className="btn-outline w-full sm:w-auto text-base px-7 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all"
              >
                Join as a Doctor
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="card text-center p-5 rounded-2xl">
                <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">4.2 min</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Avg. Match Time</div>
              </div>
              <div className="card text-center p-5 rounded-2xl">
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">100%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Verified Physicians</div>
              </div>
              <div className="card text-center p-5 rounded-2xl">
                <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">SHA-256</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Rx Cryptographic Stamp</div>
              </div>
              <div className="card text-center p-5 rounded-2xl">
                <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">Zero Wait</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Digital PDF Delivery</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
              Advanced Clinical Capabilities
            </h2>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Engineered for Modern Clinical Care
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Every component of MedFlow was designed to eliminate delays and enhance medical precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="card hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 group rounded-3xl"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.accent} flex items-center justify-center text-white mb-6 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform`}>
                    <IconComp size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
              Streamlined Patient Journey
            </h2>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              From Symptoms to Prescription in 3 Steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="card relative p-8 rounded-3xl border-t-4 border-t-blue-500">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Select Slot & Symptoms
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Describe your condition and pick your exact preferred time slot. Our triage engine ranks available certified doctors and shows clear upfront consultation fees.
              </p>
            </div>

            <div className="card relative p-8 rounded-3xl border-t-4 border-t-emerald-500">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Live Consultation & Chat
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect directly with your physician inside our encrypted clinical chat room. Review symptoms, discuss treatment options, and receive personalized medical advice.
              </p>
            </div>

            <div className="card relative p-8 rounded-3xl border-t-4 border-t-indigo-500">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Download Official PDF Rx
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your physician digitally approves and issues your prescription. Access and download the official signed PDF anytime from your permanent medical record timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="specialties" className="py-16 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Comprehensive Non-Critical Specialties
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Access verified physicians across all primary disciplines on-demand
              </p>
            </div>
            <Link to="/register/patient" className="btn-outline self-start md:self-auto text-xs py-2 px-4">
              View All Doctors <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {specialties.map((spec, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center gap-3 shadow-sm hover:border-blue-500/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Activity size={18} />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{spec}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">
              Clinician & Patient Feedback
            </h2>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Trusted by Thousands of Patients and Doctors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((rev) => (
              <div key={rev.id} className="card rounded-3xl p-7 flex flex-col justify-between hover:shadow-lg transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1 text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={16} fill="currentColor" />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {rev.tag}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic mb-6">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {rev.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{rev.name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{rev.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Experience Non-Critical Care Reimagined
          </h2>
          <p className="text-blue-100 max-w-2xl mx-auto text-base sm:text-lg mb-8 leading-relaxed">
            Join MedFlow today. Get matched with leading practitioners in minutes or manage your patient queue with digital efficiency.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={user ? dashboardPath : '/register/patient'}
              className="w-full sm:w-auto bg-white text-blue-600 font-bold px-8 py-3.5 rounded-2xl shadow-xl hover:bg-blue-50 transition-all text-sm"
            >
              Sign Up as Patient
            </Link>
            <Link
              to={user ? dashboardPath : '/register/doctor'}
              className="w-full sm:w-auto bg-blue-700/60 border border-white/20 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-blue-700 transition-all text-sm"
            >
              Apply as Healthcare Practitioner
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Heart size={20} fill="white" />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                MED<span className="text-blue-600">FLOW</span>
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-left">
              © {new Date().getFullYear()} MedFlow Healthcare Network. All rights reserved. Non-Critical Telehealth & Electronic Prescribing.
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-500" /> HIPAA Compliant
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Lock size={14} className="text-blue-500" /> 256-Bit SSL
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

