import React, { useState } from 'react';
import { 
  GraduationCap, LogIn, CheckCircle2, ArrowRight, Clock,
  Play, BarChart3, Zap, Settings, ShieldCheck,
  Trophy, User, Send
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandLogo } from '../components/BrandLogo';
import { RoleSelectionModal } from '../components/RoleSelectionModal';
import heroStudentImg from '../assets/hero-student.png';
import roleTeacherImg from '../assets/role-teacher.png';
import roleStudentImg from '../assets/role-student.png';

export const LandingPage: React.FC = () => {
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] transition-colors duration-200 relative overflow-x-hidden font-sans">

      {/* =========================================================
          1. NAVBAR (sticky)
          ========================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1A1E22]/95 backdrop-blur-md border-b-2 border-[#161C2D] dark:border-[#32363A] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">

          {/* Kiri: Logo Detik Detik TryOut */}
          <a href="#beranda" className="flex items-center shrink-0">
            <BrandLogo showSubtitle={true} imgClassName="h-9 sm:h-10 w-auto" />
          </a>


          {/* Kanan: Toggle Tema & Tombol "Masuk ke Sistem" */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <ThemeToggle compact />

            <button
              onClick={() => setRoleModalOpen(true)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#38B1ED] hover:bg-[#1394D5] text-white text-xs sm:text-sm font-bold border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <LogIn className="h-4 w-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Masuk ke Sistem</span>
              <span className="sm:hidden">Masuk</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          2. HERO SECTION (2 Kolom: Teks Kiri, Gambar Kanan)
          ========================================================= */}
      <section id="beranda" className="relative pt-8 pb-12 sm:pt-14 sm:pb-16 overflow-hidden">
        {/* Dekoratif lengkungan gradien halus di latar belakang */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 dark:opacity-10 pointer-events-none -z-10">
          <div className="w-full h-full bg-gradient-to-bl from-[#38B1ED]/30 via-indigo-500/20 to-transparent rounded-bl-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

            {/* Kolom Kiri: Teks & Tombol */}
            <div className="lg:col-span-7 space-y-6 text-left">

              {/* Badge Kecil */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border-2 border-[#161C2D] dark:border-[#32363A] text-xs font-bold text-[#0A2540] dark:text-[#38B1ED] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] animate-fade-in">
                <BarChart3 className="h-4 w-4 text-[#38B1ED] stroke-[2.5]" />
                <span>Platform CBT Terintegrasi Database Sertifikasi</span>
              </div>

              {/* Judul Besar 3 Baris */}
              <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black text-[#161C2D] dark:text-white tracking-tight leading-[1.12]">
                Simulasi &amp; Evaluasi{' '}
                <span className="text-[#38B1ED] block">
                  Ujian Online
                </span>
                <span className="relative inline-block mt-1">
                  yang Cepat, Akurat, &amp; Adil
                  {/* Garis lengkung dekoratif di bawah teks */}
                  <svg
                    className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3 sm:h-4 text-[#38B1ED]"
                    viewBox="0 0 300 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 9C60 3 180 3 297 9"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              {/* Paragraf Deskripsi */}
              <p className="text-sm sm:text-base text-[#5D6371] dark:text-gray-300 font-medium leading-relaxed max-w-xl">
                Platform Computer-Based Testing (CBT) modern terpadu. Dilengkapi koleksi ribuan bank soal kurikulum nasional, pengacakan opsi otomatis, penguncian sesi tunggal anti-kecurangan, serta pelaporan statistik nilai terperinci untuk sekolah dan guru.
              </p>

              {/* 2 Tombol Aksi */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  onClick={() => setRoleModalOpen(true)}
                  className="px-6 sm:px-8 py-3.5 rounded-xl bg-[#38B1ED] hover:bg-[#1394D5] text-white text-sm sm:text-base font-bold border-2 border-[#161C2D] dark:border-white/20 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-white stroke-[2]" />
                  <span>Mulai Sekarang / Masuk</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </button>

                <a
                  href="#fitur"
                  className="px-6 py-3.5 rounded-xl bg-white dark:bg-[#1A1E22] hover:bg-slate-50 text-[#161C2D] dark:text-white text-sm font-bold border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 text-[#38B1ED] stroke-[2.5]" />
                  <span>Pelajari Fitur Sistem</span>
                </a>
              </div>

            </div>

            {/* Kolom Kanan: Foto Siswa & 3 Floating Badge */}
            <div className="lg:col-span-5 relative flex justify-center items-center">

              {/* Latar belakang dekoratif */}
              <div className="absolute w-72 h-72 sm:w-88 sm:h-88 bg-gradient-to-tr from-[#38B1ED]/30 to-[#1394D5]/20 rounded-full blur-3xl -z-10" />

              <div className="relative w-full max-w-[400px] sm:max-w-[460px] mx-auto">

                {/* Frame Foto Utama Siswa SMA */}
                <div className="rounded-3xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] overflow-hidden bg-white dark:bg-[#1A1E22] relative">
                  <img
                    src={heroStudentImg}
                    alt="Siswa Berprestasi Ujian Online"
                    className="w-full h-auto object-cover object-top max-h-[460px] select-none pointer-events-none"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>

                {/* Floating Badge a: "Ujian Online Lebih Mudah" (Kiri Atas) */}
                <div className="absolute -top-3.5 -left-3 sm:-left-5 bg-white dark:bg-[#1A1E22] p-2.5 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex items-center gap-2.5 z-20">
                  <div className="p-1.5 rounded-xl bg-blue-100 text-[#38B1ED] border border-[#161C2D]/30">
                    <Clock className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-900 dark:text-white block leading-tight">
                      Ujian Online
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-gray-400 block">
                      Lebih Mudah
                    </span>
                  </div>
                </div>

                {/* Floating Badge b: "Akurat & Terpercaya" (Kanan Atas) */}
                <div className="absolute top-2 -right-3 sm:-right-5 bg-white dark:bg-[#1A1E22] p-2.5 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex items-center gap-2.5 z-20">
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 border border-[#161C2D]/30">
                    <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white block leading-tight">
                      Akurat &amp; Terpercaya
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                      100% Teruji
                    </span>
                  </div>
                </div>

                {/* Floating Badge c: Speech Bubble "Siap Sukses!" (Kanan Tengah) */}
                <div className="absolute top-36 -right-2 sm:-right-4 bg-[#FFC533] text-[#161C2D] px-3.5 py-1.5 rounded-2xl border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717] font-black text-xs sm:text-sm rotate-6 z-20 flex items-center gap-1.5">
                  <span>Siap Sukses!</span>
                  <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-[#FFC533] border-r-[6px] border-r-transparent" />
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          3. STATISTIK STRIP (1 Baris, 4 Item, Dipisah Divider Tipis)
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="glass-panel p-3 sm:p-4 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-white/10">
            
            {/* Item 1: Ikon petir | 4.600+ | Butir Bank Soal Siap Pakai */}
            <div className="flex items-center gap-3.5 p-3 sm:px-4">
              <div className="h-11 w-11 rounded-2xl bg-[#38B1ED] text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
                <Zap className="h-5 w-5 stroke-[2.5] fill-white" />
              </div>
              <div className="text-left">
                <span className="text-lg font-black text-[#161C2D] dark:text-white block leading-tight font-mono">
                  4.600+
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mt-0.5">
                  Butir Bank Soal Siap Pakai
                </span>
              </div>
            </div>

            {/* Item 2: Ikon gear | Otomatis | Acak Opsi Pilihan Jawaban */}
            <div className="flex items-center gap-3.5 p-3 sm:px-4">
              <div className="h-11 w-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
                <Settings className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-black text-[#161C2D] dark:text-white block leading-tight font-mono">
                  Otomatis
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mt-0.5">
                  Acak Opsi Pilihan Jawaban
                </span>
              </div>
            </div>

            {/* Item 3: Ikon perisai | Single Lock | Sesi Ujian Anti-Curangi */}
            <div className="flex items-center gap-3.5 p-3 sm:px-4">
              <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
                <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-black text-[#161C2D] dark:text-white block leading-tight font-mono">
                  Single Lock
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mt-0.5">
                  Sesi Ujian Anti-Curangi
                </span>
              </div>
            </div>

            {/* Item 4: Ikon jam | Real-Time | Rekapitulasi Nilai & Laporan */}
            <div className="flex items-center gap-3.5 p-3 sm:px-4">
              <div className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
                <Clock className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-black text-[#161C2D] dark:text-white block leading-tight font-mono">
                  Real-Time
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block mt-0.5">
                  Rekapitulasi Nilai &amp; Laporan
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          4. SECTION "ALUR TERPADU MULTI-PERAN"
          ========================================================= */}
      <section id="fitur" className="py-16 sm:py-20 bg-slate-100/70 dark:bg-[#070A0D] border-t-2 border-[#161C2D] dark:border-[#32363A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* Header Section dengan Garis di Kiri dan Kanan */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-center gap-3">
              <div className="h-[2px] w-12 bg-slate-300 dark:bg-white/20 rounded-full" />
              <div className="inline-block px-3.5 py-1 bg-[#38B1ED]/15 text-[#0A2540] dark:text-[#38B1ED] border-2 border-[#161C2D] dark:border-[#38B1ED] rounded-full text-xs font-black tracking-wider uppercase shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
                ALUR TERPADU MULTI-PERAN
              </div>
              <div className="h-[2px] w-12 bg-slate-300 dark:bg-white/20 rounded-full" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-[#161C2D] dark:text-white tracking-tight">
              Satu Sistem Untuk Semua Kebutuhan{' '}
              <span className="text-[#38B1ED]">Evaluasi Akademik</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#5D6371] dark:text-gray-400 font-medium">
              Dirancang khusus dengan alur kerja terisolasi dan spesifik untuk setiap tingkatan pengguna.
            </p>
          </div>

          {/* 3 Card Sejajar (Grid 3 Kolom, Ilustrasi di Kiri, Teks & Link di Kanan) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* a. Admin Pusat & Instansi */}
            <div className="glass-panel p-5 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between overflow-hidden group hover:-translate-y-1 transition duration-200">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                
                {/* Ilustrasi Laptop Admin di Kiri */}
                <div className="w-24 sm:w-28 h-24 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/30 border-2 border-[#161C2D] dark:border-[#32363A] flex flex-col items-center justify-center shrink-0 relative overflow-hidden shadow-xs">
                  <div className="w-14 h-10 bg-[#38B1ED] rounded-t-md border-2 border-[#161C2D] relative flex items-center justify-center shadow-xs">
                    <div className="w-5 h-5 rounded-full bg-white text-[#0A2540] flex items-center justify-center">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div className="absolute -top-2 -right-2 p-1 bg-white dark:bg-[#161C2D] rounded-full border border-[#161C2D] text-[#38B1ED]">
                      <Settings className="h-2.5 w-2.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="w-18 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-b-md border-2 border-[#161C2D] -mt-[2px]" />
                </div>

                {/* Konten Judul & Deskripsi di Kanan */}
                <div className="flex-1 space-y-1.5 text-left">
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    Admin Pusat &amp; Instansi
                  </h3>
                  <p className="text-xs text-[#5D6371] dark:text-gray-400 font-medium leading-relaxed">
                    Kelola master data instansi, kelas rombel, penugasan guru &amp; pengampu, serta pantau laporan siswa per kelas dan rekapitulasi nilai ujian lengkap.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setRoleModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-[#38B1ED] hover:underline cursor-pointer group-hover:translate-x-1 transition-transform"
                    >
                      <span>Lihat Detail</span>
                      <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Aksen Lengkungan Garis Biru di Bawah */}
              <div className="h-1.5 w-full bg-[#38B1ED] rounded-full mt-4" />
            </div>

            {/* b. Guru Pengajar */}
            <div className="glass-panel p-5 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between overflow-hidden group hover:-translate-y-1 transition duration-200">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                
                {/* Ilustrasi Foto Guru di Kiri */}
                <div className="w-24 sm:w-28 h-24 sm:h-28 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] overflow-hidden shrink-0 shadow-xs bg-purple-50 dark:bg-purple-950/30">
                  <img
                    src={roleTeacherImg}
                    alt="Guru Pengajar"
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Konten Judul & Deskripsi di Kanan */}
                <div className="flex-1 space-y-1.5 text-left">
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    Guru Pengajar
                  </h3>
                  <p className="text-xs text-[#5D6371] dark:text-gray-400 font-medium leading-relaxed">
                    Susun paket ujian berkualitas, manfaatkan generate 50 soal acak dari Bank Soal, atur jadwal sesi pengerjaan, dan lakukan koreksi secara cerdas.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setRoleModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-purple-600 dark:text-purple-400 hover:underline cursor-pointer group-hover:translate-x-1 transition-transform"
                    >
                      <span>Lihat Detail</span>
                      <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Aksen Lengkungan Garis Ungu di Bawah */}
              <div className="h-1.5 w-full bg-purple-600 rounded-full mt-4" />
            </div>

            {/* c. Siswa Peserta TryOut */}
            <div className="glass-panel p-5 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between overflow-hidden group hover:-translate-y-1 transition duration-200">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                
                {/* Ilustrasi Foto Siswi di Kiri */}
                <div className="w-24 sm:w-28 h-24 sm:h-28 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] overflow-hidden shrink-0 shadow-xs bg-emerald-50 dark:bg-emerald-950/30">
                  <img
                    src={roleStudentImg}
                    alt="Siswa Peserta TryOut"
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Konten Judul & Deskripsi di Kanan */}
                <div className="flex-1 space-y-1.5 text-left">
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    Siswa Peserta TryOut
                  </h3>
                  <p className="text-xs text-[#5D6371] dark:text-gray-400 font-medium leading-relaxed">
                    Pengerjaan ujian berbasis web yang responsif dan nyaman, dilengkapi ragam tips soal (Pilihan Ganda, Benar/Salah, Menjodohkan, dan Essay).
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setRoleModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer group-hover:translate-x-1 transition-transform"
                    >
                      <span>Lihat Detail</span>
                      <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Aksen Lengkungan Garis Hijau di Bawah */}
              <div className="h-1.5 w-full bg-emerald-500 rounded-full mt-4" />
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================
          5. CTA BANNER (Card Lebar Satu Baris)
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[5px_5px_0px_0px_#171717] dark:shadow-[5px_5px_0px_0px_#000000] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-blue-100/50 dark:from-[#1A2333] dark:via-[#161C2D] dark:to-[#1A2333]">

          {/* Ikon Topi Toga Transparan di Belakang */}
          <div className="absolute right-6 -bottom-6 opacity-10 dark:opacity-5 pointer-events-none">
            <GraduationCap className="h-44 w-44" />
          </div>

          {/* Kiri: Ikon Piala Emas */}
          <div className="flex items-center gap-4 text-left z-10">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-[#FFC533] text-[#161C2D] flex items-center justify-center shrink-0 border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717]">
              <Trophy className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2.5]" />
            </div>
            
            {/* Tengah: Judul & Teks */}
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-[#161C2D] dark:text-white leading-tight">
                Tingkatkan Prestasi, Raih Masa Depan!
              </h3>
              <p className="text-xs sm:text-sm text-[#5D6371] dark:text-gray-300 font-medium mt-1">
                Latihan dengan sistem terbaik, persiapkan diri lebih matang menghadapi ujian sesungguhnya.
              </p>
            </div>
          </div>

          {/* Kanan: Tombol "Mulai Sekarang →" */}
          <div className="z-10 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setRoleModalOpen(true)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#38B1ED] hover:bg-[#1394D5] text-white text-sm font-bold border-2 border-[#161C2D] dark:border-white/20 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Mulai Sekarang</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================
          6. FOOTER (Dengan Bentuk Gelombang di Bagian Atas)
          ========================================================= */}
      <footer id="tentang" className="bg-[#0A2540] text-white pt-16 pb-8 border-t-2 border-[#161C2D] relative overflow-hidden">
        
        {/* Bentuk Gelombang di Bagian Atas */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
          <svg
            className="w-full h-8 text-[#F7F9FC] dark:text-[#0B1014] fill-current"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,20 1200,60 L1200,0 L0,0 Z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">

          {/* Baris Atas Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">

            {/* Kiri: Logo Detik Detik TryOut */}
            <div className="flex items-center">
              <BrandLogo forceVariant="dark" showSubtitle={true} imgClassName="h-9 sm:h-10 w-auto" />
            </div>

            {/* Tengah: Link Beranda | Fitur | Keunggulan | Tentang | FAQ */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-300">
              <a href="#beranda" className="hover:text-cyan-300 transition">Beranda</a>
              <span>|</span>
              <a href="#fitur" className="hover:text-cyan-300 transition">Fitur</a>
              <span>|</span>
              <a href="#keunggulan" className="hover:text-cyan-300 transition">Keunggulan</a>
              <span>|</span>
              <a href="#tentang" className="hover:text-cyan-300 transition">Tentang</a>
              <span>|</span>
              <a href="#faq" className="hover:text-cyan-300 transition">FAQ</a>
            </div>

            {/* Kanan: 4 Ikon Sosial Media Bulat (YouTube, Facebook, Instagram, Telegram) */}
            <div className="flex items-center gap-3">
              <a
                href="#youtube"
                aria-label="YouTube"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 inline-flex items-center justify-center border border-white/10"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="#facebook"
                aria-label="Facebook"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 inline-flex items-center justify-center border border-white/10"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="#instagram"
                aria-label="Instagram"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 inline-flex items-center justify-center border border-white/10"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="#telegram"
                aria-label="Telegram"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 inline-flex items-center justify-center border border-white/10"
              >
                <Send className="h-4 w-4" />
              </a>
            </div>

          </div>

          {/* Garis Pemisah & Bawah Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
            <p>&copy; 2026 Detik Detik TryOut. All Rights Reserved.</p>
            <p className="italic text-cyan-200 font-semibold">Belajar Lebih Mudah, Raih Hasil Terbaik</p>
          </div>

        </div>
      </footer>

      {/* Role Selection Modal (Untuk Log In sesuai role) */}
      <RoleSelectionModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />

    </div>
  );
};

export default LandingPage;
