import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ChevronLeft, ShieldCheck, Building2, 
  GraduationCap, BookOpen, ArrowRight, Sparkles 
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#070a13]/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-200/80 dark:border-white/10 animate-scale-up">
        {/* Ambient background glows */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-indigo-500/15 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEVEL 1: Pilihan Peran Utama */}
        {level === 'main' ? (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-3 border border-indigo-500/20 shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Pilih Peran Anda
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
                Pilih portal masuk yang sesuai dengan akun akses Anda di sistem CBT.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Admin */}
              <button
                type="button"
                onClick={() => setLevel('admin_sub')}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/80 dark:bg-white/[0.03] dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all text-left flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Administrator
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                      Super Admin Pusat & Admin Instansi / Sekolah
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Option 2: Guru */}
              <button
                type="button"
                onClick={() => handleSelectRole('guru')}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 dark:bg-white/[0.03] dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all text-left flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Guru Pengajar
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                      Buat paket ujian, impor bank soal & pantau penilaian siswa
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Option 3: Siswa */}
              <button
                type="button"
                onClick={() => handleSelectRole('siswa')}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-cyan-50/80 dark:bg-white/[0.03] dark:hover:bg-cyan-950/30 border border-slate-200/80 dark:border-white/5 hover:border-cyan-300 dark:hover:border-cyan-500/40 transition-all text-left flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      Siswa Peserta TryOut
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                      Kerjakan simulasi ujian CBT & lihat evaluasi hasil
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
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
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Kembali</span>
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3.5 bg-purple-600/10 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-2xl mb-3 border border-purple-500/20 shadow-md">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Pilih Tingkat Administrator
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
                Pilih jenis akun administrator yang Anda gunakan untuk masuk.
              </p>
            </div>

            <div className="space-y-3">
              {/* Sub-Option 1: Super Admin */}
              <button
                type="button"
                onClick={() => handleSelectRole('super_admin')}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/80 dark:bg-white/[0.03] dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all text-left flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Super Admin (Pusat / Developer)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                      Akses penuh manajemen multi-instansi, konfigurasi global & master data
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Sub-Option 2: Admin Instansi */}
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/80 dark:bg-white/[0.03] dark:hover:bg-blue-950/30 border border-slate-200/80 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all text-left flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 group-hover:scale-105 transition-transform">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Admin Instansi (Sekolah / Mitra)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                      Kelola guru, siswa, rombel kelas, dan rekap nilai instansi Anda
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-white/5 text-center">
          <p className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">
            Platform CBT TryOut Terintegrasi Sertidemi
          </p>
        </div>
      </div>
    </div>
  );
};
