import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import { usePermission, PermissionInput } from '../shared/hooks/usePermission';
import { getDefaultRouteForUser } from '../shared/utils/rbacNavigation';
import { GraduationCap } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Array<'super_admin' | 'admin' | 'guru' | 'siswa' | 'pengawas'>;
}

const SessionLoader: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#070a13] text-slate-800 dark:text-gray-100 transition-colors duration-200 p-4">
    <div className="text-center space-y-5 max-w-sm w-full p-8 glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-2xl relative overflow-hidden">
      {/* Decorative subtle glows */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-2xl pointer-events-none"></div>

      {/* Animated Brand Icon */}
      <div className="relative flex items-center justify-center mx-auto w-16 h-16">
        <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 dark:bg-indigo-500/30 animate-ping"></div>
        <div className="relative w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
          <GraduationCap className="h-8 w-8 animate-pulse-subtle" />
        </div>
      </div>

      {/* Status Text */}
      <div className="space-y-1.5">
        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
          CBT Ujian Online
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          Memuat dan memverifikasi sesi login Anda...
        </p>
      </div>

      {/* Animated Gradient Progress Line */}
      <div className="w-full max-w-[200px] mx-auto h-1.5 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-400 rounded-full animate-progress-indeterminate"></div>
      </div>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, menus, permissions, permissionsLoaded, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || (isAuthenticated && !permissionsLoaded)) {
    return <SessionLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const target = getDefaultRouteForUser(user, menus, permissions);
    // Prevent redirect loop if target equals current location
    if (target === location.pathname) {
      return <Navigate to="/unauthorized" replace />;
    }
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

interface PermissionRouteProps {
  perm: PermissionInput;
  children?: React.ReactNode;
}

/**
 * Route guard based on dynamic RBAC permissions (OR logic).
 * - Waits until permissionsLoaded === true before making any redirect decision.
 * - Super Admin passes automatically.
 * - If user lacks the required permission, redirects cleanly to /unauthorized (403) without looping.
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({ perm, children }) => {
  const { isLoading, isAuthenticated, permissionsLoaded } = useAuth();
  const { hasPermission } = usePermission();

  if (isLoading || (isAuthenticated && !permissionsLoaded)) {
    return <SessionLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(perm)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const GuestRoute: React.FC = () => {
  const { user, menus, permissions, permissionsLoaded, isAuthenticated, isLoading } = useAuth();

  if (isLoading || (isAuthenticated && !permissionsLoaded)) {
    return <SessionLoader />;
  }

  if (isAuthenticated && user) {
    const target = getDefaultRouteForUser(user, menus, permissions);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};
