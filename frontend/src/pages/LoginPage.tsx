import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandLogo } from '../components/BrandLogo';
import { 
  LogIn, User, ShieldAlert, GraduationCap, Eye, EyeOff, 
  ArrowLeft, ShieldCheck, Building2, BookOpen, RefreshCw 
} from 'lucide-react';
import { RoleSelectionModal } from '../components/RoleSelectionModal';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const roleParam = searchParams.get('role'); // 'super_admin' | 'admin' | 'guru' | 'siswa'
  
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  // Role metadata mapping according to flow rules
  const roleMeta = {
    super_admin: {
      title: 'Portal Super Admin',
      badge: 'Super Admin',
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
      icon: ShieldCheck,
      placeholder: 'Masukkan Username Super Admin',
      label: 'Username Super Admin'
    },
    admin: {
      title: 'Portal Admin Instansi',
      badge: 'Admin Instansi',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
      icon: Building2,
      placeholder: 'Masukkan Username Admin Instansi (mis: pgrislcc)',
      label: 'Username Admin Instansi'
    },
    guru: {
      title: 'Portal Guru Pengajar',
      badge: 'Guru Pengajar',
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      icon: BookOpen,
      placeholder: 'Masukkan Nomor Induk / NUPTK / Username Guru',
      label: 'Nomor Induk / NUPTK Guru'
    },
    siswa: {
      title: 'Portal Siswa Peserta Ujian',
      badge: 'Siswa Peserta',
      color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
      icon: GraduationCap,
      placeholder: 'Masukkan Nomor Induk Siswa (NISN / NIS)',
      label: 'Nomor Induk Siswa (NISN / NIS)'
    }
  };

  const currentRoleConfig = roleParam && (roleMeta as any)[roleParam] ? (roleMeta as any)[roleParam] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(loginInput.trim(), password, roleParam || undefined);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Kredensial yang Anda masukkan salah atau akun dinonaktifkan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] transition-colors duration-200 relative overflow-hidden font-sans">

      {/* Top Controls: Back to Landing + Theme Toggle */}
      <div className="absolute top-5 left-5 z-20">
        <Link
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1A1E22] hover:bg-slate-50 text-xs font-bold text-[#161C2D] dark:text-gray-300 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          <span>Halaman Utama</span>
        </Link>
      </div>

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#1A1E22] rounded-xl shadow-[5px_5px_0px_0px_#171717] dark:shadow-[5px_5px_0px_0px_#000000] p-6 sm:p-8 relative border-2 border-[#161C2D] dark:border-[#32363A]">
        
        {/* Brand Header */}
        <div className="text-center mb-6 relative flex flex-col items-center">
          <BrandLogo showSubtitle={true} imgClassName="h-14 sm:h-16 w-auto" />

          {/* Role Status Badge & Switcher */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {currentRoleConfig ? (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] ${currentRoleConfig.color}`}>
                  <currentRoleConfig.icon className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{currentRoleConfig.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(true)}
                  className="text-xs font-bold text-[#38B1ED] hover:underline transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3 stroke-[2.5]" />
                  <span>Ganti</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRoleModalOpen(true)}
                className="px-3 py-1 rounded-md text-xs font-bold bg-[#F7F9FC] hover:bg-slate-200 dark:bg-white/5 text-[#161C2D] dark:text-gray-300 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Pilih Peran Login</span>
                <RefreshCw className="h-3 w-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* Ketentuan Kredensial Box */}
        <div className="mb-4 p-3.5 bg-[#F0F2F4] dark:bg-[#262A2E] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] rounded-lg text-[11px] text-[#161C2D] dark:text-gray-300 leading-relaxed">
          <p className="font-bold text-[#0A2540] dark:text-[#38B1ED] mb-0.5">Ketentuan Kredensial Login:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-[#5D6371] dark:text-gray-400">
            <li><strong>Email / Username:</strong> Kredensial akun administrator.</li>
            <li><strong>Password:</strong> Masukkan kata sandi akun Anda.</li>
          </ul>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-600 text-rose-900 dark:text-rose-200 shadow-[3px_3px_0px_0px_#e11d48] rounded-lg text-xs font-bold animate-fade-in">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 stroke-[2.5]" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#161C2D] dark:text-gray-300 uppercase tracking-wider mb-2">
              {currentRoleConfig?.label || 'NISN / Username / Email'}
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within:text-[#38B1ED] transition-colors">
                <User className="h-5 w-5 stroke-[2.5]" />
              </span>
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder={currentRoleConfig?.placeholder || 'Masukkan NISN, Username, atau Email'}
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-md text-[#161C2D] dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm font-medium focus:border-[#38B1ED] focus:ring-0 focus:outline-none transition duration-150"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#161C2D] dark:text-gray-300 uppercase tracking-wider mb-2">
              Kata Sandi
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within:text-[#38B1ED] transition-colors">
                <LogIn className="h-5 w-5 stroke-[2.5]" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-white dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-md text-[#161C2D] dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm font-medium focus:border-[#38B1ED] focus:ring-0 focus:outline-none transition duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-800 dark:hover:text-gray-200 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#38B1ED] hover:bg-[#1394D5] text-white font-bold text-sm rounded-xl border-2 border-[#161C2D] dark:border-white/20 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition duration-150 flex items-center justify-center gap-2 mt-6 cursor-pointer"
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



        {/* Helpful Footer Info */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 text-center">
          <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
            Sistem CBT Sertidemi • Single Session Lock Aktif
          </p>
        </div>

      </div>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />

    </div>
  );
};

export default LoginPage;

