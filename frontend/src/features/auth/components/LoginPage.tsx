import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { LogIn, User, ShieldAlert, GraduationCap, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(loginInput.trim(), password);
      
      // Auto-redirect to respective dashboard based on authenticated role
      if (user.role === 'super_admin' || user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'guru') {
        navigate('/teacher/dashboard', { replace: true });
      } else if (user.role === 'siswa') {
        navigate('/student/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Kredensial yang Anda masukkan salah atau akun dinonaktifkan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-100/70 dark:bg-[#070a13] transition-colors duration-300 relative overflow-hidden">
      
      {/* Dynamic Ambient Floating Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-500/15 dark:bg-indigo-600/20 rounded-full blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-3xl animate-float-slow [animation-delay:2s] pointer-events-none" />

      {/* Theme Toggle Top Right */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-md glass-panel rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden border border-slate-200/80 dark:border-white/10 animate-scale-up backdrop-blur-xl">
        
        {/* Decorative subtle corner glows */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-7 relative">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-3xl mb-3 border border-indigo-500/20 shadow-md shadow-indigo-600/10 animate-float-slow">
            <GraduationCap className="h-9 w-9 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Detik Detik TryOut</h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs mt-1 font-medium">
            Platform Simulasi & TryOut Ujian Online Terintegrasi
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium animate-fade-in">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              NISN / Username / Email
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                <User className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Masukkan NISN, Username, atau Email"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Kata Sandi
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                <LogIn className="h-5 w-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-slate-50/80 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 disabled:opacity-50 disabled:pointer-events-none transition duration-150 flex items-center justify-center gap-2 mt-6 btn-press"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <span>Masuk ke Sistem</span>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts Selection */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/5 space-y-3">
          <p className="text-[11px] font-bold text-slate-500 dark:text-gray-400 text-center uppercase tracking-wider">
            Akun Siap Uji (Database Sertidemi)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setLoginInput('adminnyaadmin');
                setPassword('coreofthecore');
              }}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/30 transition text-left"
            >
              👑 Super Admin IP
              <span className="block text-[9px] font-normal opacity-70">adminnyaadmin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginInput('pgrislcc');
                setPassword('12345');
              }}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30 transition text-left"
            >
              🏫 Admin Sekolah
              <span className="block text-[9px] font-normal opacity-70">pgrislcc (PGRI)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginInput('edismulyanta');
                setPassword('12345');
              }}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30 transition text-left"
            >
              👨‍🏫 Guru Pengajar
              <span className="block text-[9px] font-normal opacity-70">edismulyanta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginInput('verinakris@gmail.com');
                setPassword('123456');
              }}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30 transition text-left"
            >
              🎓 Siswa
              <span className="block text-[9px] font-normal opacity-70">verinakris@gmail.com</span>
            </button>
          </div>
        </div>

        {/* Helpful Footer Info */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 text-center">
          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
            Sistem CBT Sertidemi • Single Session Lock Aktif
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
