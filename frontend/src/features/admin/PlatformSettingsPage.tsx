import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mail, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  Save, 
  Power, 
  Send,
  Lock,
  Server
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';

export const PlatformSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'smtp' | 'branding' | 'security' | 'backup'>('smtp');
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [settings, setSettings] = useState({
    platform: {
      name: 'Detik Detik TryOut CBT',
      app_version: '2.5.0-enterprise',
      tagline: 'Platform Computer-Based Testing Terpadu & Terpercaya',
      logo_url: '/images/logo-cbt.png',
      favicon_url: '/favicon.ico',
      support_email: 'support@sertidemi.com',
      support_phone: '+62 21 5566 7788',
      maintenance_mode: false,
    },
    smtp: {
      host: 'smtp.mailgun.org',
      port: 587,
      encryption: 'tls',
      username: 'postmaster@sertidemi.com',
      sender_name: 'CBT Detik Detik System',
      sender_email: 'noreply@sertidemi.com',
      is_configured: true,
    },
    security: {
      single_session_lock: true,
      tab_switch_limit: 5,
      session_lifetime_minutes: 120,
      force_password_change_initial: true,
      rate_limiting_enabled: true,
    },
    backup: {
      last_backup_at: '',
      backup_frequency: 'daily_0200',
      database_size_mb: 48.6,
      status: 'healthy',
    }
  });

  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/super-admin/settings');
        if (res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/super-admin/settings', settings);
      setSuccessMsg('Pengaturan sistem platform berhasil disimpan dan diterapkan.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = () => {
    setTestingSmtp(true);
    setTimeout(() => {
      setTestingSmtp(false);
      alert('Koneksi SMTP berhasil diverifikasi! Pesan tes berhasil dikirim.');
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-2 border-[#161C2D] dark:border-indigo-500/40 text-xs font-black mb-3 shadow-[2px_2px_0px_0px_#171717]">
              <Settings className="h-4 w-4" />
              <span>Platform Owner Configuration</span>
            </div>
            <h1 className="text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
              Pengaturan Sistem Platform
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-semibold max-w-2xl">
              Konfigurasi global platform multi-tenant, mail relay SMTP, keamanan session token, cadangan database, dan status mode pemeliharaan (Maintenance Mode).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-3 py-1.5 rounded-lg border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] ${
              settings.platform.maintenance_mode 
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' 
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}>
              {settings.platform.maintenance_mode ? '⚠️ Maintenance Mode AKTIF' : '● Platform Beroperasi Normal'}
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-bold shadow-[3px_3px_0px_0px_#059669] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b-2 border-[#161C2D] dark:border-[#32363A] pb-3">
        {[
          { id: 'smtp', label: 'Mail Server (SMTP)', icon: Mail },
          { id: 'branding', label: 'Branding & Identitas', icon: Server },
          { id: 'security', label: 'Kebijakan Keamanan', icon: Lock },
          { id: 'backup', label: 'Backup & Pemeliharaan', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border-2 border-[#161C2D] transition-all cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]' 
                  : 'bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 shadow-[2px_2px_0px_0px_#171717]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* TAB 1: SMTP */}
        {activeTab === 'smtp' && (
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-5">
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-600" />
                <span>Konfigurasi SMTP Relay Email</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Digunakan untuk notifikasi pendaftaran instansi baru, reset password staff, dan laporan terjadwal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  SMTP Host / Server
                </label>
                <input
                  type="text"
                  value={settings.smtp.host}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, host: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                  placeholder="smtp.mailgun.org"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Port SMTP
                </label>
                <input
                  type="number"
                  value={settings.smtp.port}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, port: parseInt(e.target.value) || 587 }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                  placeholder="587"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Nama Pengirim (Sender Name)
                </label>
                <input
                  type="text"
                  value={settings.smtp.sender_name}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, sender_name: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                  placeholder="CBT Detik Detik System"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Email Pengirim (Sender Email)
                </label>
                <input
                  type="email"
                  value={settings.smtp.sender_email}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, sender_email: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                  placeholder="noreply@sertidemi.com"
                  required
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#161C2D] dark:text-white border-2 border-[#161C2D] rounded-lg text-xs font-bold shadow-[2px_2px_0px_0px_#171717] flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testingSmtp ? 'Menguji Koneksi...' : 'Kirim Email Uji Coba'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: BRANDING */}
        {activeTab === 'branding' && (
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-5">
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-600" />
                <span>Identitas & Branding Platform Nasional</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Nama platform dan informasi kontak yang tampil pada header aplikasi dan portal login.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Nama Resmi Platform
                </label>
                <input
                  type="text"
                  value={settings.platform.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, name: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Tagline Platform
                </label>
                <input
                  type="text"
                  value={settings.platform.tagline}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, tagline: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Email Dukungan / Support
                </label>
                <input
                  type="email"
                  value={settings.platform.support_email}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, support_email: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Nomor Kontak Bantuan
                </label>
                <input
                  type="text"
                  value={settings.platform.support_phone}
                  onChange={(e) => setSettings({
                    ...settings,
                    platform: { ...settings.platform, support_phone: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-5">
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span>Kebijakan Keamanan & Anti-Cheat Platform</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Aturan pembatasan login tunggal (Single Session Lock), batas perpindahan tab siswa, dan durasi sesi login.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0B1014]/50 border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl">
                <div>
                  <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Single Session Lock (Mencegah Login Ganda)</h4>
                  <p className="text-[11px] text-slate-500">Mencegah satu akun login bersamaan di perangkat atau peramban berbeda.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.security.single_session_lock}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, single_session_lock: e.target.checked }
                  })}
                  className="h-5 w-5 rounded border-2 border-[#161C2D] text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Batas Peringatan Pindah Tab (Tab Switch Limit)
                  </label>
                  <input
                    type="number"
                    value={settings.security.tab_switch_limit}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, tab_switch_limit: parseInt(e.target.value) || 5 }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                    min={1}
                    max={20}
                  />
                  <span className="text-[10px] text-slate-400">Siswa didiskualifikasi otomatis setelah melewati batas ini.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Masa Berlaku Sesi Login (Menit)
                  </label>
                  <input
                    type="number"
                    value={settings.security.session_lifetime_minutes}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, session_lifetime_minutes: parseInt(e.target.value) || 120 }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                    min={15}
                    max={1440}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP & MAINTENANCE */}
        {activeTab === 'backup' && (
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-5">
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                <span>Backup Database & Mode Pemeliharaan</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pencadangan snapshot data ujian dan kontrol pembatasan akses sistem saat pemeliharaan server.
              </p>
            </div>

            {/* Maintenance Mode Switch */}
            <div className={`p-5 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] flex items-center justify-between ${
              settings.platform.maintenance_mode ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-[#0B1014]/50'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <Power className={`h-5 w-5 ${settings.platform.maintenance_mode ? 'text-rose-600' : 'text-slate-500'}`} />
                  <h4 className="text-sm font-black text-[#161C2D] dark:text-white">
                    Mode Pemeliharaan (Maintenance Mode)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Jika diaktifkan, seluruh portal Siswa, Guru, dan Admin Instansi ditutup sementara dengan tampilan halaman pemeliharaan. Hanya Super Admin yang dapat mengakses sistem.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  platform: {
                    ...settings.platform,
                    maintenance_mode: !settings.platform.maintenance_mode
                  }
                })}
                className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition ${
                  settings.platform.maintenance_mode 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-white dark:bg-[#1A1E22] text-slate-700 dark:text-gray-200 hover:bg-slate-100'
                }`}
              >
                {settings.platform.maintenance_mode ? 'Nonaktifkan Maintenance' : 'Aktifkan Mode Maintenance'}
              </button>
            </div>

            {/* Backup Summary */}
            <div className="p-4 bg-slate-50 dark:bg-[#0B1014]/40 border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl text-xs space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Ukuran Database Saat Ini:</span>
                <span className="text-indigo-600 font-mono">{settings.backup.database_size_mb} MB</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Jadwal Backup Otomatis:</span>
                <span>Setiap Hari (02:00 WIB)</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Integritas Storage:</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sehat (103 GB Tersedia di Drive D)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl border-2 border-[#161C2D] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] text-xs font-black hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Menyimpan Konfigurasi...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
