import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Compass, LogOut, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForUser } from '../utils/rbacNavigation';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, menus, permissions, isAuthenticated, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const allowedTarget = isAuthenticated
    ? getDefaultRouteForUser(user, menus, permissions)
    : '/login';

  const hasAccessibleDestination =
    isAuthenticated &&
    allowedTarget !== '/unauthorized' &&
    allowedTarget !== '/login';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] transition-colors font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-8 text-center shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000]">
        <div className="inline-flex items-center justify-center p-4 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-2xl mb-4 border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717]">
          <ShieldAlert className="h-10 w-10 stroke-[2.5]" />
        </div>

        <h2 className="text-2xl font-black text-[#161C2D] dark:text-white mb-2">
          Akses Ditolak (403)
        </h2>
        <p className="text-slate-600 dark:text-gray-400 text-xs mb-6 font-semibold leading-relaxed">
          {hasAccessibleDestination
            ? 'Akun Anda tidak memiliki izin (role atau permission) yang diperlukan untuk membuka halaman ini. Anda dapat langsung menuju halaman berizin yang tersedia untuk akun Anda.'
            : isAuthenticated
            ? 'Akun Anda belum memiliki menu atau izin halaman yang dapat diakses. Silakan hubungi administrator sekolah/platform atau keluar untuk berganti akun.'
            : 'Akun Anda tidak memiliki izin (role atau permission) yang diperlukan untuk membuka halaman ini. Hubungi administrator jika Anda merasa ini adalah kekeliruan.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {hasAccessibleDestination && (
            <button
              type="button"
              onClick={() => navigate(allowedTarget, { replace: true })}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#38B1ED] hover:bg-[#209ddb] text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>Ke Halaman Berizin</span>
            </button>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>{loggingOut ? 'Keluar...' : 'Keluar (Logout)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#38B1ED] hover:bg-[#209ddb] text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            >
              <Home className="h-4 w-4" />
              <span>Halaman Utama</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
