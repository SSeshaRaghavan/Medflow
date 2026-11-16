import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn, FileQuestion } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function AccessDenied({ isNotFound = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const redirectMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
  const homePath = user ? (redirectMap[user.role] || '/') : '/';

  const is404 = isNotFound || location.pathname === '/404';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="text-center max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-inner ${
          is404 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500'
        }`}>
          {is404 ? <FileQuestion size={40} /> : <ShieldAlert size={40} />}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {is404 ? '404 — Page Not Found' : '403 — Access Restricted'}
        </h1>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          {is404
            ? 'The medical portal page you requested does not exist or may have been relocated.'
            : 'You do not have administrative or role clearance to access this healthcare workspace.'}
          {user && !is404 && (
            <span className="block mt-2 font-medium text-slate-700 dark:text-slate-300">
              Current account role: <span className="capitalize text-blue-600 dark:text-blue-400 font-bold">{user.role}</span>
            </span>
          )}
        </p>

        <div className="flex flex-col gap-3">
          <Link to={homePath} className="btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5">
            <ArrowLeft size={16} /> Return to {user ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal` : 'Home'}
          </Link>
          {!user && (
            <Link to="/login" className="btn-outline w-full inline-flex items-center justify-center gap-2 py-2.5">
              <LogIn size={16} /> Sign In to MedFlow
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

