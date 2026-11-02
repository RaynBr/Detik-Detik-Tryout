import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Phone, Mail } from 'lucide-react';
import { apiClient } from '../../shared/api/client';

export const SubscriptionInactivePage: React.FC = () => {
  const [supportInfo, setSupportInfo] = useState({
    support_email: 'support@sertidemi.com',
    support_phone: '+62 812-3456-7890',
  });

  useEffect(() => {
    apiClient.get('/public/platform-settings')
      .then((res) => {
        if (res.data) {
          setSupportInfo({
            support_email: res.data.support_email || 'support@sertidemi.com',
            support_phone: res.data.support_phone || '+62 812-3456-7890',
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] font-sans">
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-8 max-w-lg w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] text-center space-y-6 animate-fade-in">
        
        <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/40 border-2 border-[#161C2D] flex items-center justify-center text-rose-600 shadow-[3px_3px_0px_0px_#171717]">
          <ShieldX className="h-8 w-8 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300">
            Akses Instansi Dinonaktifkan
          </span>
          <h1 className="text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
            Masa Penggunaan Telah Dinonaktifkan
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Hak operasional sistem CBT untuk instansi Anda saat ini sedang dinonaktifkan oleh administrator platform. Admin instansi, guru, dan siswa tidak dapat mengakses sesi pengujian.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-left space-y-2 font-medium">
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>Email Dukungan: <strong>{supportInfo.support_email}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>WhatsApp Admin Platform: <strong>{supportInfo.support_phone}</strong></span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] flex items-center gap-2 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Halaman Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
