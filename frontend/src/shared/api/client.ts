import axios from 'axios';

const getBaseUrl = () => {
  // If VITE_API_URL is explicitly set to an absolute URL other than localhost/8001, use it
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost') && !import.meta.env.VITE_API_URL.includes('127.0.0.1') && import.meta.env.VITE_API_URL !== '/api') {
    return import.meta.env.VITE_API_URL;
  }

  // In browser environment, use relative '/api' so all requests route through Vite's proxy (port 5173).
  // This works identically on desktop (localhost:5173) and mobile phones (e.g. 192.168.x.x:5173),
  // completely bypassing local loopback (127.0.0.1) network isolation and CORS restrictions.
  if (typeof window !== 'undefined') {
    return '/api';
  }

  return 'http://127.0.0.1:8000/api';
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to attach authentication & session tokens
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cbt_token');
    const sessionToken = localStorage.getItem('cbt_session_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (sessionToken) {
      config.headers['X-Session-Token'] = sessionToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

import { toast } from '../context/ToastContext';

// Response interceptor to handle token expiration & session overwrite
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const data = error.response.data;
      
      if (data?.code === 'SESSION_OVERWRITE') {
        toast.error(data.message || 'Sesi Anda telah aktif di perangkat lain. Anda telah dikeluarkan otomatis.', 'Sesi Terputus');
      }
      
      // Clear auth tokens and RBAC cache before reload
      localStorage.removeItem('cbt_token');
      localStorage.removeItem('cbt_session_token');
      localStorage.removeItem('cbt_user');
      localStorage.removeItem('cbt_rbac_meta');
      localStorage.removeItem('cbt_login_time');
      
      // Redirect to login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
