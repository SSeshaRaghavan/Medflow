import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const redirectMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
  const homePath = user ? (redirectMap[user.role] || '/') : '/';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="text-center max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-950/40 rounded-2xl mb-6 shadow-inner">
          <ShieldAlert className="text-rose-500" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
          The requested section requires different permissions or an authorized session.
          {user && (
            <span className="block mt-2 font-medium text-slate-700 dark:text-slate-300">
              Current account role: <span className="capitalize text-blue-600 dark:text-blue-400 font-bold">{user.role}</span>
            </span>
          )}
        </p>
        <div className="flex flex-col gap-3">
          <Link to={homePath} className="btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5">
            <ArrowLeft size={16} /> Return to {user ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard` : 'Home'}
          </Link>
          {!user && (
            <Link to="/login" className="btn-outline w-full inline-flex items-center justify-center gap-2 py-2.5">
              <LogIn size={16} /> Sign In with Existing Account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
