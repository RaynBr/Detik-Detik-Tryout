import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ChevronLeft, ShieldCheck, Building2, 
  GraduationCap, BookOpen, ArrowRight 
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<'main' | 'admin_sub'>('main');

  if (!isOpen) return null;

  const handleSelectRole = (role: 'super_admin' | 'admin' | 'guru' | 'siswa') => {
    onClose();
    navigate(`/login?role=${role}`);
  };

  const handleClose = () => {
    setLevel('main');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#070a13]/80 backdrop-blur-xs animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-[#1A1E22] rounded-xl p-6 sm:p-8 shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] relative border-2 border-[#161C2D] dark:border-[#32363A] animate-scale-up">

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-500 hover:text-[#161C2D] dark:hover:text-white border-2 border-transparent hover:border-[#161C2D] hover:shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
        >
          <X className="h-5 w-5 stroke-[2.5]" />
        </button>

        {/* LEVEL 1: Pilihan Peran Utama */}
        {level === 'main' ? (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-2.5 bg-[#38B1ED] rounded-xl mb-3 border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717]">
                <BrandLogo iconOnly forceVariant="dark" imgClassName="h-7 w-auto" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Pilih Peran Anda
              </h2>
              <p className="text-xs sm:text-sm text-[#5D6371] dark:text-gray-400 mt-1 font-medium">
                Pilih portal masuk yang sesuai dengan akun akses Anda di sistem CBT.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Admin */}
              <button
                type="button"
                onClick={() => setLevel('admin_sub')}
                className="w-full p-4 rounded-xl bg-white dark:bg-[#262A2E] hover:bg-[#F7F9FC] dark:hover:bg-[#2f353b] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-purple-100 text-purple-900 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#161C2D] dark:text-white group-hover:text-[#38B1ED] transition-colors">
                      Administrator
                    </h3>
                    <p className="text-[11px] text-[#5D6371] dark:text-gray-400 font-medium">
                      Super Admin Pusat & Admin Instansi / Sekolah
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-[#38B1ED] group-hover:translate-x-1 transition-all stroke-[2.5]" />
              </button>

              {/* Option 2: Guru */}
              <button
                type="button"
                onClick={() => handleSelectRole('guru')}
                className="w-full p-4 rounded-xl bg-white dark:bg-[#262A2E] hover:bg-[#F7F9FC] dark:hover:bg-[#2f353b] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] group-hover:scale-105 transition-transform">
                    <BookOpen className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#161C2D] dark:text-white group-hover:text-emerald-600 transition-colors">
                      Guru Pengajar
                    </h3>
                    <p className="text-[11px] text-[#5D6371] dark:text-gray-400 font-medium">
                      Buat paket ujian, generate 50 soal & pantau penilaian siswa
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all stroke-[2.5]" />
              </button>

              {/* Option 3: Siswa */}
              <button
                type="button"
                onClick={() => handleSelectRole('siswa')}
                className="w-full p-4 rounded-xl bg-[#38B1ED]/10 hover:bg-[#38B1ED]/20 dark:bg-[#38B1ED]/15 border-2 border-[#161C2D] dark:border-[#38B1ED] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-[#38B1ED] text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#161C2D] dark:text-white group-hover:text-[#38B1ED] transition-colors">
                      Siswa Peserta TryOut
                    </h3>
                    <p className="text-[11px] text-[#0A2540] dark:text-gray-300 font-medium">
                      Kerjakan simulasi ujian CBT & lihat evaluasi hasil
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-[#38B1ED] group-hover:translate-x-1 transition-all stroke-[2.5]" />
              </button>
            </div>
          </div>
        ) : (
          /* LEVEL 2: Pilihan Sub-Role Admin */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setLevel('main')}
                className="px-2.5 py-1.5 rounded-lg text-[#161C2D] dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] transition flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                <span>Kembali</span>
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-2.5 bg-purple-600 rounded-xl mb-3 border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717]">
                <BrandLogo iconOnly forceVariant="dark" imgClassName="h-7 w-auto" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Pilih Tingkat Administrator
              </h2>
              <p className="text-xs sm:text-sm text-[#5D6371] dark:text-gray-400 mt-1 font-medium">
                Pilih jenis akun administrator yang Anda gunakan untuk masuk.
              </p>
            </div>

            <div className="space-y-3">
              {/* Sub-Option 1: Super Admin */}
              <button
                type="button"
                onClick={() => handleSelectRole('super_admin')}
                className="w-full p-4 rounded-xl bg-white dark:bg-[#262A2E] hover:bg-[#F7F9FC] dark:hover:bg-[#2f353b] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-purple-100 text-purple-900 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#161C2D] dark:text-white group-hover:text-purple-600 transition-colors">
                      Super Admin (Pusat / Developer)
                    </h3>
                    <p className="text-[11px] text-[#5D6371] dark:text-gray-400 font-medium">
                      Akses penuh manajemen multi-instansi, konfigurasi global & master data
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-purple-600 group-hover:translate-x-1 transition-all stroke-[2.5]" />
              </button>

              {/* Sub-Option 2: Admin Instansi */}
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className="w-full p-4 rounded-xl bg-white dark:bg-[#262A2E] hover:bg-[#F7F9FC] dark:hover:bg-[#2f353b] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-900 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] group-hover:scale-105 transition-transform">
                    <Building2 className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#161C2D] dark:text-white group-hover:text-blue-600 transition-colors">
                      Admin Instansi (Sekolah / Mitra)
                    </h3>
                    <p className="text-[11px] text-[#5D6371] dark:text-gray-400 font-medium">
                      Kelola guru, siswa, rombel kelas, dan rekap nilai instansi Anda
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-600 group-hover:translate-x-1 transition-all stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t-2 border-[#C3CCD8] dark:border-[#32363A] text-center">
          <p className="text-[11px] text-[#5D6371] dark:text-gray-400 font-mono">
            Platform CBT TryOut Terintegrasi Sertidemi
          </p>
        </div>
      </div>
    </div>
  );
};

