import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';
import { Loader2 } from 'lucide-react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const PatientRegisterPage = lazy(() => import('./pages/auth/PatientRegisterPage'));
const DoctorRegisterPage = lazy(() => import('./pages/auth/DoctorRegisterPage'));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const PaymentPage = lazy(() => import('./pages/patient/PaymentPage'));

function PageFallback() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3 transition-colors">
      <Loader2 size={36} className="animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
        Loading MedFlow…
      </p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OfflineBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register/patient" element={<PublicRoute><PatientRegisterPage /></PublicRoute>} />
          <Route path="/register/doctor" element={<PublicRoute><DoctorRegisterPage /></PublicRoute>} />

          <Route
            path="/payment"
            element={
              <ProtectedRoute roles={['patient']}>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient/*"
            element={
              <ProtectedRoute roles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/*"
            element={
              <ProtectedRoute roles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/403" element={<UnauthorizedPage />} />
          <Route path="*" element={<UnauthorizedPage isNotFound={true} />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
