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
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] transition-colors duration-200 relative overflow-x-hidden font-sans">
      
      {/* Top Navigation Bar (MyExams Header Style) */}
      <header className="sticky top-0 z-40 bg-[#F7F9FC] dark:bg-[#0B1014] border-b-2 border-[#161C2D] dark:border-[#32363A] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#38B1ED] border-2 border-[#161C2D] dark:border-[#38B1ED] flex items-center justify-center text-white shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]">
              <GraduationCap className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-[#161C2D] dark:text-white block">
                Detik Detik TryOut
              </span>
              <span className="text-[11px] font-bold text-[#38B1ED] tracking-wider uppercase block">
                Platform CBT & Evaluasi Ujian
              </span>
            </div>
          </div>

          {/* Right Navigation & CTA */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle compact />
            
            <button
              onClick={() => setRoleModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#38B1ED] hover:bg-[#1394D5] text-white text-xs sm:text-sm font-bold border-2 border-[#161C2D] dark:border-white/20 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <LogIn className="h-4 w-4 stroke-[2.5]" />
              <span>Masuk ke Sistem</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          {/* Top Pill Badge (MyExams Badge Style) */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] text-[#161C2D] dark:text-white text-xs font-bold animate-fade-in">
            <Sparkles className="h-4 w-4 text-[#38B1ED] stroke-[2.5]" />
            <span>Platform CBT Terintegrasi Database Sertidemi</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black text-[#161C2D] dark:text-white tracking-tight leading-[1.15]">
            Simulasi & Evaluasi Ujian Online yang <span className="text-[#38B1ED] underline decoration-4 underline-offset-8">Cepat, Akurat, & Adil</span>
          </h1>

          {/* Subtitle / Description */}
          <p className="text-base sm:text-lg text-[#5D6371] dark:text-[#9DA2A5] max-w-3xl mx-auto font-medium leading-relaxed">
            Platform Computer-Based Testing (CBT) modern terpadu. Dilengkapi ribuan bank soal kurikulum nasional, pengacakan opsi otomatis, penguncian sesi tunggal anti-kecurangan, serta pelaporan statistik nilai terperinci untuk sekolah dan guru.
          </p>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setRoleModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#38B1ED] hover:bg-[#1394D5] text-white text-base font-bold border-2 border-[#161C2D] dark:border-white/20 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_#171717] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2.5 group"
            >
              <span>Mulai Sekarang / Masuk</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
            </button>
            <a
              href="#fitur"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white dark:bg-[#1A1E22] hover:bg-slate-50 text-[#161C2D] dark:text-white text-sm font-bold border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="h-4 w-4 text-[#5D6371] dark:text-gray-400 stroke-[2.5]" />
              <span>Pelajari Fitur Sistem</span>
            </a>
          </div>

          {/* Trust Highlights Mini Bar (MyExams Hard Shadow Cards) */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] text-left">
              <span className="text-2xl font-black text-[#38B1ED] block">4.600+</span>
              <span className="text-xs font-bold text-[#161C2D] dark:text-gray-300">Butir Bank Soal Siap Pakai</span>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] text-left">
              <span className="text-2xl font-black text-[#0A2540] dark:text-cyan-400 block">Otomatis</span>
              <span className="text-xs font-bold text-[#161C2D] dark:text-gray-300">Acak Opsi Pilihan Jawaban</span>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] text-left">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">Single Lock</span>
              <span className="text-xs font-bold text-[#161C2D] dark:text-gray-300">Sesi Ujian Anti-Curang</span>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] text-left">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block">Real-Time</span>
              <span className="text-xs font-bold text-[#161C2D] dark:text-gray-300">Rekapitulasi Nilai & Laporan</span>
            </div>
          </div>

        </div>
      </section>

      {/* Roles & Features Section (MyExams Clean Grid) */}
      <section id="fitur" className="py-16 sm:py-24 bg-[#F0F2F4] dark:bg-[#070A0D] border-t-2 border-[#161C2D] dark:border-[#32363A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-3 py-1 bg-[#38B1ED]/15 text-[#0A2540] dark:text-[#38B1ED] border-2 border-[#161C2D] dark:border-[#38B1ED] rounded-md text-xs font-black tracking-wider uppercase shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
              Alur Terpadu Multi-Peran
            </div>
            <p className="text-2xl sm:text-4xl font-black text-[#161C2D] dark:text-white tracking-tight">
              Satu Sistem Untuk Semua Kebutuhan Evaluasi Akademik
            </p>
            <p className="text-xs sm:text-sm text-[#5D6371] dark:text-[#9DA2A5] font-medium">
              Dirancang khusus dengan alur kerja terisolasi dan spesifik untuk setiap tingkatan pengguna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Admin */}
            <div className="bg-white dark:bg-[#1A1E22] p-6 sm:p-7 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#171717] space-y-4 transition-all">
              <div className="p-3 rounded-xl bg-purple-100 text-purple-900 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] w-fit">
                <ShieldCheck className="h-6 w-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-[#161C2D] dark:text-white">
                Admin Pusat & Instansi
              </h3>
              <p className="text-xs text-[#5D6371] dark:text-gray-400 leading-relaxed font-medium">
                Kelola master data instansi, kelas rombel, penugasan guru pengampu, serta pantau laporan siswa per kelas dan rekapitulasi nilai ujian lengkap.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#161C2D] dark:text-gray-300 font-semibold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#38B1ED] shrink-0 stroke-[2.5]" />
                  <span>Impor Guru & Siswa via Excel / CSV</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#38B1ED] shrink-0 stroke-[2.5]" />
                  <span>Laporan Pembagian Guru & Kelas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#38B1ED] shrink-0 stroke-[2.5]" />
                  <span>Statistik & Rekap Nilai Ujian</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Guru */}
            <div className="bg-white dark:bg-[#1A1E22] p-6 sm:p-7 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#171717] space-y-4 transition-all">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] w-fit">
                <BookOpen className="h-6 w-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-[#161C2D] dark:text-white">
                Guru Pengajar
              </h3>
              <p className="text-xs text-[#5D6371] dark:text-gray-400 leading-relaxed font-medium">
                Susun paket ujian berkualitas, manfaatkan generate 50 soal acak dari Bank Soal, atur jadwal sesi pengerjaan, dan lakukan koreksi soal uraian.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#161C2D] dark:text-gray-300 font-semibold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#38B1ED] shrink-0 stroke-[2.5]" />
                  <span>Generate Paket Soal Instan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#38B1ED] shrink-0 stroke-[2.5]" />
                  <span>Impor Bank Soal (Word, Excel, CSV)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#38B1ED] shrink-0 stroke-[2.5]" />
                  <span>Pengaturan Jadwal & Gelombang Sesi</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Siswa */}
            <div className="bg-[#38B1ED] text-[#161C2D] p-6 sm:p-7 rounded-xl border-2 border-[#161C2D] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#171717] space-y-4 transition-all">
              <div className="p-3 rounded-xl bg-white text-[#161C2D] border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] w-fit">
                <GraduationCap className="h-6 w-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-[#161C2D]">
                Siswa Peserta TryOut
              </h3>
              <p className="text-xs text-[#0A2540] leading-relaxed font-semibold">
                Pengerjaan ujian berbasis web yang responsif dan nyaman, dilengkapi ragam tipe soal (Pilihan Ganda, Benar/Salah, Menjodohkan, dan Essay).
              </p>
              <ul className="space-y-2 pt-2 text-xs text-[#161C2D] font-bold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white shrink-0 stroke-[2.5]" />
                  <span>Antarmuka Bersih & Fokus Ujian</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white shrink-0 stroke-[2.5]" />
                  <span>Penguncian Sesi & Timer Otomatis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white shrink-0 stroke-[2.5]" />
                  <span>Transparansi Skor & Hasil Evaluasi</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* Footer (MyExams Footer Style) */}
      <footer className="py-8 bg-white dark:bg-[#0B1014] border-t-2 border-[#161C2D] dark:border-[#32363A] text-center text-xs text-[#161C2D] dark:text-gray-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#38B1ED] stroke-[2.5]" />
            <span className="font-extrabold text-[#161C2D] dark:text-white">Detik Detik TryOut CBT</span>
            <span>&copy; {new Date().getFullYear()} Hak Cipta Dilindungi.</span>
          </div>
          <p className="text-[11px] font-mono text-[#5D6371] dark:text-gray-500">
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
