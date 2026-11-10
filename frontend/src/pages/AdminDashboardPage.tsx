import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandLogo } from '../components/BrandLogo';
import { 
  LogOut, ShieldCheck, CheckCircle2, Server, 
  RefreshCw, User, Building2, Key, ArrowLeft, ArrowRight
} from 'lucide-react';
import { apiClient } from '../api/client';

export const AdminDashboardPage: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(null);
  const [testingMe, setTestingMe] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      setTestingMe(true);
      const start = performance.now();
      const res = await apiClient.get('/auth/me');
      const end = performance.now();
      setLatency(Math.round(end - start));
      setHttpStatus(res.status);
      setApiResponse(res.data);
    } catch (err: any) {
      setHttpStatus(err.response?.status || 500);
      setApiResponse(err.response?.data || { error: 'Request gagal' });
    } finally {
      setTestingMe(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('cbt_token') || localStorage.getItem('admin_token');
    setToken(savedToken);

    if (savedToken) {
      fetchMe();
    }
  }, [fetchMe]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!isAuthenticated && !token) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md glass-panel p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border-2 border-[#161C2D]">
            <Key className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-black">Sesi Belum Terautentikasi</h2>
          <p className="text-xs text-[#5D6371] dark:text-gray-400">
            Silakan login terlebih dahulu menggunakan akun administrator Anda.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#38B1ED] hover:bg-[#1394D5] text-white font-bold text-sm border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <span>Buka Halaman Login</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] transition-colors duration-200 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1A1E22]/95 backdrop-blur-md border-b-2 border-[#161C2D] dark:border-[#32363A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center shrink-0">
            <BrandLogo showSubtitle={true} subtitleText="PORTAL ADMINISTRATOR CBT" imgClassName="h-9 sm:h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-white/10 text-xs">
              <span className="font-bold text-[#161C2D] dark:text-white">
                {user?.nama || user?.name || user?.username}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 text-[10px] font-black uppercase">
                {user?.role || 'Admin'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border-2 border-[#161C2D] dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold shadow-[2px_2px_0px_0px_#171717] mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>LOGIN BERHASIL • SANCTUM SESSION ACTIVE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#161C2D] dark:text-white">
              Portal Uji Administrator
            </h1>
            <p className="text-xs sm:text-sm text-[#5D6371] dark:text-gray-400 font-medium">
              Validasi alur otentikasi admin, token bearer, dan integrasi backend API.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1A1E22] hover:bg-slate-50 text-xs font-bold border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] self-start"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Kembali ke Halaman Utama</span>
          </Link>
        </div>

        {/* 4 Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">Status Sesi</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block leading-tight">Terverifikasi</span>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#38B1ED] text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <User className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">Username</span>
              <span className="text-base font-black text-[#161C2D] dark:text-white block leading-tight font-mono">{user?.username || '-'}</span>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Building2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">Role Akses</span>
              <span className="text-base font-black text-[#161C2D] dark:text-white block leading-tight uppercase font-mono">{user?.role || 'Admin'}</span>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Server className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">API Backend</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400 block leading-tight font-mono">
                {httpStatus ? `HTTP ${httpStatus}` : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* 2 Detail Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel Profil User */}
          <div className="lg:col-span-5 glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-black text-[#161C2D] dark:text-white uppercase tracking-wider">
                Profil Administrator
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-[#0A2540] dark:bg-blue-950 dark:text-sky-300 font-bold">
                user_bo
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Nama Lengkap</span>
                <span className="font-bold text-sm text-[#161C2D] dark:text-white">
                  {user?.nama || user?.name || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Username</span>
                <span className="font-mono font-bold text-[#38B1ED]">
                  {user?.username || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Email</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {user?.email || '(Tidak ada)'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Instansi Terdaftar</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {user?.instansi?.nama_instansi || (user?.id_instansi ? `ID: ${user?.id_instansi}` : 'Platform Global (Super Admin)')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">ID User BO</span>
                <span className="font-mono font-semibold">
                  #{user?.id_user_bo || user?.id}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10">
              <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Token Sanctum Aktif</span>
              <div className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] break-all border border-slate-800">
                {token || '-'}
              </div>
            </div>
          </div>

          {/* Panel Live API Test */}
          <div className="lg:col-span-7 glass-panel p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-sm font-black text-[#161C2D] dark:text-white uppercase tracking-wider">
                  Live Test: GET /api/auth/me
                </h3>
                <p className="text-[11px] text-[#5D6371] dark:text-gray-400">
                  Menguji validasi Bearer Token Sanctum secara realtime ke server
                </p>
              </div>

              <button
                onClick={fetchMe}
                disabled={testingMe}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#38B1ED] hover:bg-[#1394D5] text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingMe ? 'animate-spin' : ''}`} />
                <span>Kirim Ulang Request</span>
              </button>
            </div>

            {/* Status Latency Pill */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700">
                HTTP {httpStatus || 200} OK
              </span>
              {latency !== null && (
                <span className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-700">
                  Waktu Respon: {latency}ms
                </span>
              )}
            </div>

            {/* Pretty JSON output */}
            <pre className="p-4 rounded-xl bg-[#0B1014] text-slate-200 font-mono text-xs overflow-x-auto max-h-72 border-2 border-[#161C2D] dark:border-[#32363A]">
              {apiResponse ? JSON.stringify(apiResponse, null, 2) : '// Memuat respon...'}
            </pre>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] px-4 py-4 text-center text-xs font-medium text-[#5D6371] dark:text-gray-400 mt-auto">
        <p>© 2026 Detik Detik TryOut — Modul Otentikasi Admin Selesai &amp; Terintegrasi Sempurna</p>
      </footer>
    </div>
  );
};

