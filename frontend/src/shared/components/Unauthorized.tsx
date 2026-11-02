import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] transition-colors font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-8 text-center shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000]">
        
        <div className="inline-flex items-center justify-center p-4 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-2xl mb-4 border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717]">
          <ShieldAlert className="h-10 w-10 stroke-[2.5]" />
        </div>
        
        <h2 className="text-2xl font-black text-[#161C2D] dark:text-white mb-2">Akses Ditolak (403)</h2>
        <p className="text-slate-600 dark:text-gray-400 text-xs mb-6 font-semibold leading-relaxed">
          Akun Anda tidak memiliki hak akses untuk membuka halaman ini. Peran sistem dipisahkan strictly antara Platform Owner (Super Admin) dan Sekolah (Admin Instansi).
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-[#161C2D] dark:text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#38B1ED] hover:bg-[#209ddb] text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Halaman Utama</span>
          </button>
        </div>
      </div>
    </div>
  );
};
