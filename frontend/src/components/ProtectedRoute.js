import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  const token = localStorage.getItem('access_token');
  if (!token || token === 'undefined' || token === 'null' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    const redirectMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
    return <Navigate to={redirectMap[user.role] || '/unauthorized'} replace />;
  }
  return children;
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading Medflow…</p>
      </div>
    </div>
  );
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) {
    const redirectMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
    return <Navigate to={redirectMap[user.role] || '/'} replace />;
  }
  return children;
}
