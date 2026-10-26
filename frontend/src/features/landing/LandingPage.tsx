import React, { useState } from 'react';
import { 
  GraduationCap, LogIn, Sparkles, ShieldCheck, 
  BookOpen, CheckCircle2, ArrowRight
} from 'lucide-react';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { RoleSelectionModal } from '../auth/components/RoleSelectionModal';

export const LandingPage: React.FC = () => {
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070a13] text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-60 -right-40 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-[#070a13]/70 border-b border-slate-200/80 dark:border-white/5 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white block">
                Detik Detik TryOut
              </span>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                Sistem CBT & Simulasi Ujian
              </span>
            </div>
          </div>

          {/* Right Navigation & CTA */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle compact />
            
            <button
              onClick={() => setRoleModalOpen(true)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all btn-press"
            >
              <LogIn className="h-4 w-4" />
              <span>Masuk ke Sistem</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Platform CBT Terintegrasi Database Sertidemi</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Simulasi & Evaluasi Ujian Online yang <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">Cepat, Akurat, & Adil</span>
          </h1>

          {/* Subtitle / Description */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-medium leading-relaxed">
            Platform Computer-Based Testing (CBT) modern terpadu. Dilengkapi koleksi ribuan bank soal kurikulum nasional, pengacakan opsi otomatis, penguncian sesi tunggal anti-kecurangan, serta pelaporan statistik nilai terperinci untuk sekolah dan guru.
          </p>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setRoleModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 text-white text-base font-bold shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2.5 group"
            >
              <span>Mulai Sekarang / Masuk</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#fitur"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <BookOpen className="h-4 w-4 text-slate-500 dark:text-gray-400" />
              <span>Pelajari Fitur Sistem</span>
            </a>
          </div>

          {/* Trust Highlights Mini Bar */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 backdrop-blur-sm text-left">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block">4.600+</span>
              <span className="text-xs font-bold text-slate-600 dark:text-gray-400">Butir Bank Soal Siap Pakai</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 backdrop-blur-sm text-left">
              <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 block">Otomatis</span>
              <span className="text-xs font-bold text-slate-600 dark:text-gray-400">Acak Opsi Pilihan Jawaban</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 backdrop-blur-sm text-left">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">Single Lock</span>
              <span className="text-xs font-bold text-slate-600 dark:text-gray-400">Sesi Ujian Anti-Curang</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 backdrop-blur-sm text-left">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block">Real-Time</span>
              <span className="text-xs font-bold text-slate-600 dark:text-gray-400">Rekapitulasi Nilai & Laporan</span>
            </div>
          </div>

        </div>
      </section>

      {/* Roles & Features Section */}
      <section id="fitur" className="py-16 sm:py-24 bg-slate-100/60 dark:bg-black/20 border-t border-slate-200/60 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
              Alur Terpadu Multi-Peran
            </h2>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Satu Sistem Untuk Semua Kebutuhan Evaluasi Akademik
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 font-medium">
              Dirancang khusus dengan alur kerja terisolasi dan spesifik untuk setiap tingkatan pengguna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Admin */}
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-4 hover:border-purple-300 dark:hover:border-purple-500/40 transition group">
              <div className="p-3.5 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 w-fit group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Admin Pusat & Instansi
              </h3>
              <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed font-medium">
                Kelola master data instansi, kelas rombel, penugasan guru pengampu, serta pantau laporan siswa per kelas dan rekapitulasi nilai ujian lengkap.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700 dark:text-gray-300 font-semibold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Impor Guru & Siswa via Excel / CSV</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Laporan Pembagian Guru & Kelas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Statistik & Rekap Nilai Ujian</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Guru */}
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-4 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition group">
              <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 w-fit group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Guru Pengajar
              </h3>
              <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed font-medium">
                Susun paket ujian berkualitas, manfaatkan generate 50 soal acak dari Bank Soal, atur jadwal sesi pengerjaan, dan lakukan koreksi soal uraian.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700 dark:text-gray-300 font-semibold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Generate Paket Soal Instan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Impor Bank Soal (Word, Excel, CSV)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Pengaturan Jadwal & Gelombang Sesi</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Siswa */}
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-4 hover:border-cyan-300 dark:hover:border-cyan-500/40 transition group">
              <div className="p-3.5 rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 w-fit group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Siswa Peserta TryOut
              </h3>
              <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed font-medium">
                Pengerjaan ujian berbasis web yang responsif dan nyaman, dilengkapi ragam tipe soal (Pilihan Ganda, Benar/Salah, Menjodohkan, dan Essay).
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-700 dark:text-gray-300 font-semibold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Antarmuka Bersih & Fokus Ujian</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Penguncian Sesi & Timer Otomatis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Transparansi Skor & Hasil Evaluasi</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200/80 dark:border-white/5 text-center text-xs text-slate-500 dark:text-gray-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-700 dark:text-gray-300">Detik Detik TryOut CBT</span>
            <span>&copy; {new Date().getFullYear()} Hak Cipta Dilindungi.</span>
          </div>
          <p className="text-[11px] font-mono">
            Sistem Ujian Online Terintegrasi Database Sertidemi
          </p>
        </div>
      </footer>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />

    </div>
  );
};

export default LandingPage;
