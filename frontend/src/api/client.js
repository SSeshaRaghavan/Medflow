import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && token !== 'undefined' && token !== 'null') {
    if (config.headers.set) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh || refresh === 'undefined' || refresh === 'null') {
          throw new Error('No valid refresh token');
        }
        const { data } = await axios.post('/api/auth/token/refresh/', { refresh });
        localStorage.setItem('access_token', data.access);
        if (original.headers.set) {
          original.headers.set('Authorization', `Bearer ${data.access}`);
        } else {
          original.headers['Authorization'] = `Bearer ${data.access}`;
        }
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (!['/login', '/register/patient', '/register/doctor', '/'].includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
