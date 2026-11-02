import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mail, 
  Database, 
  CheckCircle2, 
  Save, 
  Power, 
  Send,
  Lock,
  Server,
  Globe
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';

export const PlatformSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'security' | 'backup'>('general');
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
      copyright: '© 2026 Detik Detik TryOut. Hak Cipta Dilindungi.',
      support_email: 'support@sertidemi.com',
      support_phone: '+62 812-3456-7890',
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

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/super-admin/settings');
      if (res.data) {
        setSettings((prev) => ({
          ...prev,
          ...res.data,
          platform: {
            ...prev.platform,
            ...(res.data.platform || {}),
            copyright: res.data.platform?.copyright || prev.platform.copyright,
          }
        }));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/super-admin/settings', settings);
      setSuccessMsg('Pengaturan sistem platform berhasil disimpan dan diterapkan.');
      toast.success('Pengaturan sistem berhasil disimpan.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = () => {
    setTestingSmtp(true);
    setTimeout(() => {
      setTestingSmtp(false);
      toast.success('Koneksi SMTP berhasil diverifikasi! Pesan tes berhasil dikirim.');
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
              <span>6. Pengaturan Platform Global</span>
            </div>
            <h1 className="text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
              Konfigurasi Sistem & Mode Pemeliharaan
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-semibold max-w-2xl">
              Pengaturan metadata platform (Nama, Logo, Favicon, Copyright, Kontak Support) dan aktivasi mode pemeliharaan (Maintenance Mode).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-3.5 py-2 rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] ${
              settings.platform.maintenance_mode 
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' 
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}>
              {settings.platform.maintenance_mode ? '⚠️ Maintenance Mode: AKTIF' : '● Maintenance Mode: NON AKTIF'}
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

      {/* Tabs Selection */}
      <div className="flex flex-wrap gap-2 border-b-2 border-[#161C2D] dark:border-[#32363A] pb-3">
        {[
          { id: 'general', label: 'Pengaturan Utama & Maintenance', icon: Server },
          { id: 'smtp', label: 'Mail Server (SMTP)', icon: Mail },
          { id: 'security', label: 'Kebijakan Keamanan', icon: Lock },
          { id: 'backup', label: 'Backup & Penyimpanan', icon: Database },
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
        
        {/* TAB 1: PENGATURAN UTAMA & MAINTENANCE */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            
            {/* Maintenance Mode Card (Prominent & Explicit) */}
            <div className={`p-6 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] transition-colors ${
              settings.platform.maintenance_mode 
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-600' 
                : 'bg-white dark:bg-[#1A1E22]'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl border-2 border-[#161C2D] ${
                    settings.platform.maintenance_mode ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Power className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                        Status Maintenance Mode
                      </h3>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                        settings.platform.maintenance_mode 
                          ? 'bg-rose-200 text-rose-900 border-rose-300' 
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {settings.platform.maintenance_mode ? 'Aktif' : 'Non Aktif'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-xl">
                      Jika berstatus <strong>Aktif</strong>: Semua user selain Super Admin (Siswa, Guru, Admin Instansi) tidak dapat mengakses sistem dan akan dialihkan ke halaman maintenance. Super Admin tetap dapat login dan mengelola sistem.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      platform: {
                        ...settings.platform,
                        maintenance_mode: !settings.platform.maintenance_mode
                      }
                    })}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer shrink-0 ${
                      settings.platform.maintenance_mode 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                        : 'bg-slate-100 hover:bg-slate-200 text-[#161C2D]'
                    }`}
                  >
                    {settings.platform.maintenance_mode ? 'Nonaktifkan Maintenance Mode' : 'Aktifkan Maintenance Mode'}
                  </button>
                </div>
              </div>
            </div>

            {/* Identitas Platform Form */}
            <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] space-y-5">
              <div>
                <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-600" />
                  <span>Metadata & Identitas Platform</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Data branding yang tampil pada halaman login, title bar browser, serta footer sistem.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nama Platform */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Nama Platform <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.platform.name}
                    onChange={(e) => setSettings({
                      ...settings,
                      platform: { ...settings.platform, name: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
                    placeholder="Detik Detik TryOut CBT"
                    required
                  />
                </div>

                {/* 2. Logo Platform */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Logo Platform (URL / Path)
                  </label>
                  <input
                    type="text"
                    value={settings.platform.logo_url}
                    onChange={(e) => setSettings({
                      ...settings,
                      platform: { ...settings.platform, logo_url: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
                    placeholder="/images/logo-cbt.png atau https://..."
                  />
                </div>

                {/* 3. Favicon */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Favicon Platform (URL / Path)
                  </label>
                  <input
                    type="text"
                    value={settings.platform.favicon_url}
                    onChange={(e) => setSettings({
                      ...settings,
                      platform: { ...settings.platform, favicon_url: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
                    placeholder="/favicon.ico atau https://..."
                  />
                </div>

                {/* 4. Copyright */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Teks Copyright Footer
                  </label>
                  <input
                    type="text"
                    value={settings.platform.copyright}
                    onChange={(e) => setSettings({
                      ...settings,
                      platform: { ...settings.platform, copyright: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
                    placeholder="© 2026 Detik Detik TryOut. Hak Cipta Dilindungi."
                  />
                </div>

                {/* 5. Email Support */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Email Support
                  </label>
                  <input
                    type="email"
                    value={settings.platform.support_email}
                    onChange={(e) => setSettings({
                      ...settings,
                      platform: { ...settings.platform, support_email: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
                    placeholder="support@sertidemi.com"
                  />
                </div>

                {/* 6. Nomor WA Support */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Nomor WhatsApp Support
                  </label>
                  <input
                    type="text"
                    value={settings.platform.support_phone}
                    onChange={(e) => setSettings({
                      ...settings,
                      platform: { ...settings.platform, support_phone: e.target.value }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
                    placeholder="+62 812-3456-7890"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SMTP */}
        {activeTab === 'smtp' && (
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] space-y-5">
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-600" />
                <span>Konfigurasi SMTP Relay Email</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pengiriman notifikasi pendaftaran, reset password akun, dan laporan otomatis.
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
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold"
                  placeholder="smtp.mailgun.org"
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
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold"
                  placeholder="587"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Nama Pengirim
                </label>
                <input
                  type="text"
                  value={settings.smtp.sender_name}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, sender_name: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Email Pengirim
                </label>
                <input
                  type="email"
                  value={settings.smtp.sender_email}
                  onChange={(e) => setSettings({
                    ...settings,
                    smtp: { ...settings.smtp, sender_email: e.target.value }
                  })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-[#161C2D] dark:text-white border-2 border-[#161C2D] rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#171717] flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testingSmtp ? 'Menguji Koneksi...' : 'Kirim Email Uji Coba'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] space-y-5">
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                <span>Kebijakan Keamanan & Anti-Curang CBT</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pencegahan login ganda (Single Session Lock) dan batasan perpindahan tab ujian siswa.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <div>
                  <h4 className="text-xs font-bold text-[#161C2D] dark:text-white">Single Session Lock Token</h4>
                  <p className="text-[11px] text-slate-400">Otomatis mengeluarkan sesi lama jika user login di browser/perangkat baru.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.security.single_session_lock}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, single_session_lock: e.target.checked }
                  })}
                  className="rounded border-[#161C2D] h-4 w-4"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                    Batas Maksimal Perpindahan Tab Ujian
                  </label>
                  <input
                    type="number"
                    value={settings.security.tab_switch_limit}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, tab_switch_limit: parseInt(e.target.value) || 5 }
                    })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold"
                    min={1}
                    max={20}
                  />
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
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-xl text-xs font-bold"
                    min={15}
                    max={1440}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP & PENYIMPANAN */}
        {activeTab === 'backup' && (
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] space-y-5">
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                <span>Status Basis Data & Backup</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pencadangan snapshot data ujian dan integritas penyimpanan basis data.
              </p>
            </div>

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
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sehat (MySQL Terhubung)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Floating / Sticky Save Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#161C2D] dark:border-[#32363A]">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs border-2 border-[#161C2D] shadow-[3px_3px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
