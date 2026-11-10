import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id: number;
  id_user_bo?: number;
  name: string;
  nama?: string;
  email: string | null;
  username: string | null;
  role: 'super_admin' | 'admin' | 'guru' | 'siswa';
  idkategori?: number | string | null;
  id_instansi?: number | string | null;
  instansi?: {
    id_instansi: number | string;
    nama_instansi: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginVal: string, passwordVal: string, expectedRole?: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthStorage = () => {
    localStorage.removeItem('cbt_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('cbt_user');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('cbt_token') || localStorage.getItem('admin_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        if (response.data && response.data.user) {
          const userData = {
            id: response.data.user.id_user_bo,
            id_user_bo: response.data.user.id_user_bo,
            name: response.data.user.nama || response.data.user.username,
            nama: response.data.user.nama,
            email: response.data.user.email,
            username: response.data.user.username,
            role: response.data.user.role,
            idkategori: response.data.user.id_instansi,
            id_instansi: response.data.user.id_instansi,
            instansi: response.data.user.instansi,
          } as User;
          setUser(userData);
          localStorage.setItem('cbt_user', JSON.stringify(userData));
        }
      } catch (error) {
        console.error('Authentication verification error:', error);
        clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (loginVal: string, passwordVal: string, _expectedRole?: string): Promise<User> => {
    const response = await apiClient.post('/auth/login', {
      login: loginVal.trim(),
      password: passwordVal.trim(),
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Login gagal.');
    }

    const token = response.data.token;
    const rawUser = response.data.user;

    const userData: User = {
      id: rawUser.id_user_bo,
      id_user_bo: rawUser.id_user_bo,
      name: rawUser.nama || rawUser.username,
      nama: rawUser.nama,
      email: rawUser.email,
      username: rawUser.username,
      role: rawUser.role,
      idkategori: rawUser.id_instansi,
      id_instansi: rawUser.id_instansi,
      instansi: rawUser.instansi,
    };

    localStorage.setItem('cbt_token', token);
    localStorage.setItem('admin_token', token);
    localStorage.setItem('cbt_user', JSON.stringify(userData));
    localStorage.setItem('admin_user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Logout API warning:', e);
    } finally {
      clearAuthStorage();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

