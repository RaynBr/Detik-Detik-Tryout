import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { toast } from './ToastContext';

export interface UserProfile {
  id: number | string;
  user_id?: number | string;
  nisn?: string;
  nis?: string;
  nip?: string;
  institution?: string;
  idkategori?: number | string | null;
  jenjang?: string;
  class_name?: string;
  class_id?: number;
  major_id?: number;
  class_room?: {
    id: number;
    name: string;
    level: number;
    jenjang?: string;
    institution?: string;
  };
  major?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface DynamicMenuNode {
  id: number | string;
  label: string;
  name?: string;
  icon?: string | null;
  path?: string | null;
  permission_key?: string | null;
  scope?: string;
  sort_order?: number;
  children?: DynamicMenuNode[];
}

export interface User {
  id: number | string;
  name: string;
  email: string | null;
  username: string | null;
  role: 'super_admin' | 'admin' | 'guru' | 'siswa' | 'pengawas';
  idkategori?: number | string | null;
  profile: UserProfile | null;
  roles?: string[];
  permissions?: string[];
  menus?: DynamicMenuNode[];
}

interface AuthContextType {
  user: User | null;
  roles: string[];
  permissions: string[];
  menus: DynamicMenuNode[];
  permissionsLoaded: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginVal: string, passwordVal: string, expectedRole?: string) => Promise<User>;
  logout: (isAutoExpired?: any) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maximum session lifetime: 8 Hours (28,800,000 milliseconds)
export const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [menus, setMenus] = useState<DynamicMenuNode[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applyRbacState = useCallback((data: any) => {
    const resolvedUser: User | null = data?.user ?? null;
    const resolvedRoles: string[] = Array.isArray(data?.roles)
      ? data.roles
      : Array.isArray(resolvedUser?.roles)
      ? resolvedUser.roles
      : [];
    const resolvedPerms: string[] = Array.isArray(data?.permissions)
      ? data.permissions
      : Array.isArray(resolvedUser?.permissions)
      ? resolvedUser.permissions
      : [];
    const resolvedMenus: DynamicMenuNode[] = Array.isArray(data?.menus)
      ? data.menus
      : [];

    setUser(resolvedUser);
    setRoles(resolvedRoles);
    setPermissions(resolvedPerms);
    setMenus(resolvedMenus);
    setPermissionsLoaded(true);

    if (resolvedUser) {
      localStorage.setItem('cbt_user', JSON.stringify(resolvedUser));
    }
    localStorage.setItem(
      'cbt_rbac_meta',
      JSON.stringify({
        user_id: resolvedUser ? String(resolvedUser.id) : null,
        roles: resolvedRoles,
        permissions: resolvedPerms,
        menus: resolvedMenus,
      })
    );

    return {
      user: resolvedUser,
      roles: resolvedRoles,
      permissions: resolvedPerms,
      menus: resolvedMenus,
    };
  }, []);

  // Helper to clear local storage credentials
  const clearAuthStorage = useCallback(() => {
    localStorage.removeItem('cbt_token');
    localStorage.removeItem('cbt_session_token');
    localStorage.removeItem('cbt_user');
    localStorage.removeItem('cbt_rbac_meta');
    localStorage.removeItem('cbt_login_time');
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setMenus([]);
    setPermissionsLoaded(false);
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('cbt_token');
    if (!token) return;
    try {
      const response = await apiClient.get('/auth/me');
      applyRbacState(response.data);
    } catch (error) {
      console.error('Failed to refresh auth/RBAC state:', error);
    }
  }, [applyRbacState]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('cbt_token');
      const loginTimeStr = localStorage.getItem('cbt_login_time');

      if (!token) {
        setIsLoading(false);
        return;
      }

      // Check if session has exceeded 8 hours
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        const elapsed = Date.now() - loginTime;

        if (elapsed >= MAX_SESSION_DURATION_MS) {
          clearAuthStorage();
          toast.warning('Sesi login Anda telah berakhir setelah 8 jam. Silakan login kembali.', 'Sesi Berakhir');
          setIsLoading(false);
          return;
        }
      }

      // Hydrate RBAC meta from localStorage temporarily ONLY if user_id matches cbt_user (prevents stale cross-account cache).
      // permissionsLoaded stays false until fresh /auth/me resolves so PermissionRoute NEVER decides from stale cache.
      try {
        const cachedMeta = localStorage.getItem('cbt_rbac_meta');
        const cachedUserStr = localStorage.getItem('cbt_user');
        if (cachedMeta && cachedUserStr) {
          const parsed = JSON.parse(cachedMeta);
          const parsedUser = JSON.parse(cachedUserStr);
          if (parsed?.user_id && parsedUser?.id && String(parsed.user_id) === String(parsedUser.id)) {
            if (Array.isArray(parsed?.roles)) setRoles(parsed.roles);
            if (Array.isArray(parsed?.permissions)) setPermissions(parsed.permissions);
            if (Array.isArray(parsed?.menus)) setMenus(parsed.menus);
          } else {
            localStorage.removeItem('cbt_rbac_meta');
          }
        } else if (cachedMeta) {
          localStorage.removeItem('cbt_rbac_meta');
        }
      } catch {
        localStorage.removeItem('cbt_rbac_meta');
      }

      try {
        const response = await apiClient.get('/auth/me');
        applyRbacState(response.data);

        // If login_time wasn't recorded, set it now
        if (!loginTimeStr) {
          localStorage.setItem('cbt_login_time', Date.now().toString());
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [applyRbacState, clearAuthStorage]);

  // Background Heartbeat: Periodically monitor 8-hour session lifetime (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const loginTimeStr = localStorage.getItem('cbt_login_time');
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        const elapsed = Date.now() - loginTime;

        if (elapsed >= MAX_SESSION_DURATION_MS) {
          logout(true);
        }
      }
    }, 30000); // 30 seconds check

    return () => clearInterval(interval);
  }, [user]);

  const login = async (loginVal: string, passwordVal: string, expectedRole?: string): Promise<User> => {
    try {
      const payload: any = {
        login: loginVal,
        password: passwordVal,
      };
      if (expectedRole) {
        payload.expected_role = expectedRole;
      }
      const response = await apiClient.post('/auth/login', payload);

      const { token, session_token, user: loggedInUser } = response.data;

      localStorage.removeItem('cbt_rbac_meta');
      localStorage.setItem('cbt_token', token);
      localStorage.setItem('cbt_session_token', session_token);
      localStorage.setItem('cbt_login_time', Date.now().toString());

      const applied = applyRbacState(response.data);
      return {
        ...loggedInUser,
        roles: applied.roles,
        permissions: applied.permissions,
        menus: applied.menus,
      };
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw new Error(error.message || 'Tidak dapat terhubung ke server backend.');
    }
  };

  const logout = async (isAutoExpired?: any) => {
    const isExpired = typeof isAutoExpired === 'boolean' ? isAutoExpired : false;
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearAuthStorage();
      if (isExpired) {
        toast.warning('Sesi login Anda telah mencapai batas maksimal 8 jam. Anda telah dikeluarkan otomatis demi keamanan.', 'Sesi Berakhir');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        menus,
        permissionsLoaded,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
