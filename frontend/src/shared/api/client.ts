import axios from 'axios';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

export const API_BASE_URL = getApiBaseUrl();

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
