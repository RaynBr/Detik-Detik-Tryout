import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
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
  Lock
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
          <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">Detik Detik TryOut</h1>
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

              <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                NISN: <span className="font-bold text-slate-700 dark:text-gray-200">{user?.profile?.nisn || user?.username || '-'}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building className="h-3.5 w-3.5 text-indigo-500" />
                  {user?.profile?.institution || 'Sekolah Mitra'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                  Kelas: {user?.profile?.class_name || user?.profile?.class_room?.name || 'Belum Ditentukan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Detail Cards Grid */}
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
                <span className="text-slate-900 dark:text-white font-bold text-right">{user?.profile?.institution || 'Sekolah Mitra'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Jenjang Pendidikan</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{user?.profile?.jenjang || 'Umum'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Ruang Kelas</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{user?.profile?.class_name || user?.profile?.class_room?.name || 'Belum Ditentukan'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Tingkat Kelas</span>
                <span className="text-slate-900 dark:text-white font-bold">{user?.profile?.class_room?.level ? `Tingkat ${user.profile.class_room.level}` : '-'}</span>
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
                <span className="text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Resmi
                </span>
                <span className="text-slate-900 dark:text-white font-mono font-medium">{user?.email || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Nomor NISN</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">{user?.profile?.nisn || user?.username || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> No. Telepon / WhatsApp
                </span>
                <span className="text-slate-900 dark:text-white font-medium">{(user?.profile as any)?.phone || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> Alamat Domisili
                </span>
                <span className="text-slate-900 dark:text-white font-medium text-right max-w-[200px] truncate">{(user?.profile as any)?.address || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-gray-400 font-medium">Peran Akses</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold uppercase">{user?.role || 'siswa'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Card 3: Keamanan & Integritas Sesi Ujian */}
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
            <Lock className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Catatan Read-Only:</strong> Data profil siswa dikelola secara terpusat oleh pihak sekolah. Jika terdapat kesalahan penulisan nama, NISN, atau kelas, silakan laporkan ke wali kelas atau operator sekolah Anda.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
};
