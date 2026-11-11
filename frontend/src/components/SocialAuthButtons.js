import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function SocialAuthButtons({ role = 'patient', isSignUp = false }) {
  const { socialLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleSocialClick = async (provider) => {
    setLoadingProvider(provider);
    try {
      const mockEmailMap = {
        google: 'alex.chen@gmail.com',
        apple: 'alex.chen@icloud.com',
        microsoft: 'alex.chen@outlook.com',
      };
      const email = mockEmailMap[provider] || `user.${provider}@medflow.demo`;
      const first_name = 'Alex';
      const last_name = 'Chen';

      const user = await socialLogin({
        provider,
        email,
        first_name,
        last_name,
        role,
      });

      toast.success(`Signed in via ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`);
      const redirectMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
      const from = location.state?.from?.pathname;
      const targetPath = (from && from.startsWith(`/${user.role}`)) ? from : (redirectMap[user.role] || '/');
      navigate(targetPath, { replace: true });
    } catch {
      toast.error(`Could not authenticate with ${provider}.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => handleSocialClick('google')}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          {loadingProvider === 'google' ? (
            <Loader2 size={16} className="animate-spin text-blue-600" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>Google</span>
        </button>

        <button
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => handleSocialClick('apple')}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          {loadingProvider === 'apple' ? (
            <Loader2 size={16} className="animate-spin text-slate-900 dark:text-white" />
          ) : (
            <svg className="w-4 h-4 fill-current text-slate-900 dark:text-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.13.64-2.77 1.39-.57.65-1.06 1.72-.93 2.76 1.07.08 2.07-.53 2.69-1.28" />
            </svg>
          )}
          <span>Apple</span>
        </button>

        <button
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => handleSocialClick('microsoft')}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          {loadingProvider === 'microsoft' ? (
            <Loader2 size={16} className="animate-spin text-blue-500" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#F25022" d="M1 1h10v10H1z" />
              <path fill="#00A4EF" d="M1 13h10v10H1z" />
              <path fill="#7FBA00" d="M13 1h10v10H13z" />
              <path fill="#FFB900" d="M13 13h10v10H13z" />
            </svg>
          )}
          <span>Outlook</span>
        </button>
      </div>
    </div>
  );
}

