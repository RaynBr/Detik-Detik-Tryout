import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { apiClient } from '../../shared/api/client';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { BrandLogo } from '../../shared/components/BrandLogo';
import { 
  GraduationCap, 
  ArrowLeft, 
  User, 
  Building, 
  BookOpen, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Users,
  Info,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const profile = user?.profile as any;
  const teachers = profile?.teachers || [];

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('Password baru tidak boleh sama dengan password lama.');
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await apiClient.post('/student/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
      toast.success(res.data?.message || 'Password berhasil diperbarui!');
      setPasswordSuccess('Password akun Anda berhasil diperbarui.');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal mengubah password.';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070a13] text-slate-800 dark:text-gray-100 flex flex-col transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="h-16 glass-panel border-b border-slate-200 dark:border-white/5 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-200/60 dark:hover:bg-white/5 text-slate-600 dark:text-gray-300 transition"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <BrandLogo imgClassName="h-8 w-auto" />
          <div className="hidden sm:block border-l-2 border-slate-200 dark:border-white/10 pl-3">
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Profil Peserta Didik</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle compact />
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition"
          >
            <span>Daftar Ujian</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6">
        
        {/* Breadcrumbs & Title */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 mb-1">
              <span 
                onClick={() => navigate('/student/dashboard')}
                className="hover:underline cursor-pointer"
              >
                Dashboard
              </span>
              <span>/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Profil Siswa</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Informasi Akun Siswa
            </h2>
          </div>
        </div>

        {/* Hero Card: Profile Header */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-white/5 relative overflow-hidden shadow-xl">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-xl shadow-indigo-600/20 shrink-0">
              <div className="w-full h-full bg-white dark:bg-[#0c101d] rounded-[22px] flex items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  {user?.name || 'Siswa CBT'}
                </h3>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Siswa Aktif
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 dark:text-gray-300 font-mono">
                <span>
                  Nomor Induk (NISN): <strong className="text-slate-900 dark:text-white">{profile?.nisn || user?.username || '-'}</strong>
                </span>
                {profile?.nis && (
                  <>
                    <span>•</span>
                    <span>
                      NIS: <strong className="text-slate-900 dark:text-white">{profile.nis}</strong>
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building className="h-3.5 w-3.5 text-indigo-500" />
                  {profile?.institution || 'Sekolah Mitra'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                  Kelas: {profile?.class_name || profile?.class_room?.name || 'Belum Ditentukan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Detail Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Card 1: Data Akademik */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Data Akademik & Kelas</h4>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Instansi / Sekolah</span>
                <span className="text-slate-900 dark:text-white font-bold text-right">{profile?.institution || 'Sekolah Mitra'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Jenjang Pendidikan</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{profile?.jenjang || 'Umum'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Ruang Kelas</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{profile?.class_name || profile?.class_room?.name || 'Belum Ditentukan'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Tingkat Kelas</span>
                <span className="text-slate-900 dark:text-white font-bold">{profile?.class_room?.level ? `Tingkat ${profile.class_room.level}` : '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Status Rombel</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Terdaftar Aktif</span>
              </div>
            </div>
          </div>

          {/* Card 2: Data Kontak & Kredensial */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/5">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-xl">
                <User className="h-4.5 w-4.5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Data Akun & Kontak</h4>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Nomor Induk Siswa (NISN)</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">{profile?.nisn || user?.username || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Nomor Induk Sekolah (NIS)</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">{profile?.nis || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Resmi
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white font-mono font-medium">{user?.email || '-'}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400" title="Email hanya untuk informasi profil, login menggunakan Nomor Induk">
                    Profil Saja
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> No. Telepon / WhatsApp
                </span>
                <span className="text-slate-900 dark:text-white font-medium">{profile?.phone || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> Alamat Domisili
                </span>
                <span className="text-slate-900 dark:text-white font-medium text-right max-w-[200px] truncate">{profile?.address || '-'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Card 3: Guru yang Mengajar (mod-siswa-profile requirement) */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-xl">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Guru yang Mengajar</h4>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">Daftar tenaga pendidik dan guru pengampu mata pelajaran di rombel Anda.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
              {teachers.length} Guru
            </span>
          </div>

          {teachers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-gray-400 space-y-2">
              <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-gray-600" />
              <p className="text-xs font-medium">Belum ada data guru pengampu yang dihubungkan ke kelas ini.</p>
              <p className="text-[11px] text-slate-400 dark:text-gray-500">Guru akan tampil otomatis setelah ditugaskan oleh admin sekolah.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teachers.map((t: any, idx: number) => (
                <div 
                  key={t.id || idx} 
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-2.5 hover:border-purple-300 dark:hover:border-purple-500/30 transition shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-600/30 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                      {t.name ? t.name.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{t.name}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 truncate max-w-full">
                        {t.subject || 'Guru Pengampu'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 space-y-1 text-[11px] text-slate-600 dark:text-gray-400">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">NUPTK</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-gray-300">{t.nuptk || '-'}</span>
                    </div>
                    {t.email && (
                      <div className="flex justify-between items-center truncate">
                        <span className="text-slate-400">Email</span>
                        <span className="font-mono text-[10px] text-slate-600 dark:text-gray-400 truncate max-w-[140px]">{t.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Keamanan & Integritas Sesi Ujian */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Status Keamanan & Sesi CBT</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">Single-Session Lock</span>
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Aktif & Terlindungi
              </p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">Mencegah penggunaan akun di perangkat ganda.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">Sistem Proctoring</span>
              <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Strict Fullscreen
              </p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">Pemantauan otomatis pergantian tab peramban.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">Penyimpanan Jawaban</span>
              <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Real-time Autosave
              </p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">Jawaban tersimpan aman per detik ke server.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-300">
            <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Ketentuan Kredensial:</strong> Email hanya digunakan sebagai informasi profil (tidak digunakan untuk login). Login siswa menggunakan Nomor Induk (NISN/NIS). Password dibuat dan dapat direset oleh Admin Instansi.
            </p>
          </div>
        </div>

        {/* Card 5: Ganti Password Mandiri */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <KeyRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Ganti Password Mandiri</h4>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                Ubah password akun siswa Anda secara mandiri untuk keamanan sesi ujian.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Password Lama <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password Anda saat ini"
                  className="w-full px-4 py-2.5 pr-10 glass-input rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 karakter"
                    className="w-full px-4 py-2.5 pr-10 glass-input rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Konfirmasi Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loadingPassword}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                <span>{loadingPassword ? 'Menyimpan Password...' : 'Simpan Password Baru'}</span>
              </button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
};
