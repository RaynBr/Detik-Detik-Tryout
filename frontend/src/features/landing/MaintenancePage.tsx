import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ShieldAlert, Phone, Mail } from 'lucide-react';
import { apiClient } from '../../shared/api/client';

export const MaintenancePage: React.FC = () => {
  const [platformInfo, setPlatformInfo] = useState({
    platform_name: 'Detik Detik TryOut CBT',
    support_email: 'support@sertidemi.com',
    support_phone: '+62 812-3456-7890',
  });

  useEffect(() => {
    apiClient.get('/public/platform-settings')
      .then((res) => {
        if (res.data) {
          setPlatformInfo({
            platform_name: res.data.platform_name || 'Detik Detik TryOut CBT',
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
        
        <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/40 border-2 border-[#161C2D] flex items-center justify-center text-amber-600 shadow-[3px_3px_0px_0px_#171717]">
          <AlertTriangle className="h-8 w-8 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
            Pemeliharaan Server Berkala
          </span>
          <h1 className="text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
            Sistem Sedang Dalam Maintenance
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Platform <strong>{platformInfo.platform_name}</strong> sedang melakukan peningkatan infrastruktur dan optimasi server. Seluruh sesi ujian dan portal pengguna sementara waktu dihentikan demi integritas data.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-left space-y-2 font-medium">
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>Email Bantuan: <strong>{platformInfo.support_email}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
            <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>WhatsApp Support: <strong>{platformInfo.support_phone}</strong></span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] flex items-center justify-center gap-2 cursor-pointer transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Cek Status Kembali</span>
          </button>
          <Link
            to="/login?role=super_admin"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-[#161C2D] dark:text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] flex items-center justify-center gap-2 transition"
          >
            <ShieldAlert className="h-4 w-4 text-purple-600" />
            <span>Login Super Admin</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
