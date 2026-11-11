import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const { data: me } = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const socialLogin = useCallback(async ({ provider, email, first_name, last_name, role }) => {
    const { data } = await authApi.socialLogin({ provider, email, first_name, last_name, role });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const { data: me } = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await authApi.logout(refresh);
    } catch {}
    localStorage.clear();
    setUser(null);
    toast.success('Logged out successfully.');
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, socialLogin, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

