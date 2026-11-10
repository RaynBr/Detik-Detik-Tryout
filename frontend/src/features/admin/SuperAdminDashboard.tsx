import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  Package, 
  Layers, 
  Radio, 
  LayoutDashboard, 
  CreditCard, 
  History, 
  ArrowRight,
  RefreshCw,
  Eye,
  Clock,
  Pause,
  Play
} from 'lucide-react';
import { WelcomeBanner } from '../../shared/components/dashboard';

interface DashboardStats {
  total_instansi: number;
  instansi_aktif: number;
  instansi_non_aktif: number;
  instansi_warning?: number;
  instansi_expired?: number;
  total_guru: number;
  total_siswa: number;
  total_admin_instansi: number;
  total_paket_soal: number;
  total_bank_soal: number;
  total_ujian_aktif: number;
  total_user_online: number;
}

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const [stats, setStats] = useState<DashboardStats>({
    total_instansi: 0,
    instansi_aktif: 0,
    instansi_non_aktif: 0,
    instansi_warning: 0,
    instansi_expired: 0,
    total_guru: 0,
    total_siswa: 0,
    total_admin_instansi: 0,
    total_paket_soal: 0,
    total_bank_soal: 0,
    total_ujian_aktif: 0,
    total_user_online: 0,
  });
  const [instansiList, setInstansiList] = useState<any[]>([]);

  const fetchData = async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isManual) setRefreshing(true);

    try {
      const [statsRes, instansiRes] = await Promise.all([
        apiClient.get('/super-admin/dashboard/stats').catch(() => ({ data: {} })),
        apiClient.get('/super-admin/instansi', { params: { per_page: 5 } }).catch(() => ({ data: [] }))
      ]);

      if (statsRes.data) {
        setStats({
          total_instansi: statsRes.data.total_instansi ?? 0,
          instansi_aktif: statsRes.data.instansi_aktif ?? 0,
          instansi_non_aktif: statsRes.data.instansi_non_aktif ?? statsRes.data.instansi_nonaktif ?? 0,
          instansi_warning: statsRes.data.instansi_warning ?? 0,
          instansi_expired: statsRes.data.instansi_expired ?? 0,
          total_guru: statsRes.data.total_guru ?? statsRes.data.total_teachers ?? 0,
          total_siswa: statsRes.data.total_siswa ?? statsRes.data.total_students ?? 0,
          total_admin_instansi: statsRes.data.total_admin_instansi ?? 0,
          total_paket_soal: statsRes.data.total_paket_soal ?? 0,
          total_bank_soal: statsRes.data.total_bank_soal ?? 0,
          total_ujian_aktif: statsRes.data.total_ujian_aktif ?? statsRes.data.total_active_exams ?? 0,
          total_user_online: statsRes.data.total_user_online ?? statsRes.data.users_online ?? 0,
        });
      }

      const raw = instansiRes.data;
      const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
      setInstansiList(list);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();

    if (!autoRefresh) return;

    // Real-time polling every 5 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleToggleInstansiStatus = async (instansi: any) => {
    try {
      setTogglingId(instansi.idkategori);
      const res = await apiClient.post(`/super-admin/instansi/${instansi.idkategori}/toggle-status`);
      toast.success(res.data?.message || `Status instansi ${instansi.nama_kategori} berhasil diubah.`);
      // Refetch immediately to sync all statistics and tables
      await fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status instansi.');
    } finally {
      setTogglingId(null);
    }
  };

  const statCards = [
    // BARIS PERTAMA
    {
      title: 'Total Instansi',
      value: stats.total_instansi,
      unit: 'Mitra',
      icon: Building2,
      color: 'from-blue-600 to-indigo-600',
      textColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      onClick: () => navigate('/super-admin/instansi'),
    },
    {
      title: 'Instansi Aktif',
      value: stats.instansi_aktif,
      unit: 'Aktif',
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      onClick: () => navigate('/super-admin/instansi?status=aktif'),
    },
    {
      title: 'Instansi Non Aktif',
      value: stats.instansi_non_aktif,
      unit: stats.instansi_expired ? `${stats.instansi_expired} Expired` : 'Non Aktif',
      icon: XCircle,
      color: 'from-rose-600 to-red-600',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/30',
      borderColor: 'border-rose-200 dark:border-rose-800',
      onClick: () => navigate('/super-admin/instansi?status=nonaktif'),
    },
    {
      title: 'Instansi Akan Berakhir',
      value: stats.instansi_warning ?? 0,
      unit: 'Instansi',
      badge: '≤ 7 Hari',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700',
      icon: Clock,
      color: 'from-amber-600 to-orange-600',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      onClick: () => navigate('/super-admin/subscriptions?status=warning'),
    },
    {
      title: 'Total Admin Instansi',
      value: stats.total_admin_instansi,
      unit: 'Admin',
      icon: ShieldCheck,
      color: 'from-purple-600 to-violet-600',
      textColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
      onClick: () => navigate('/super-admin/instansi'),
    },

    // BARIS KEDUA
    {
      title: 'Total Siswa',
      value: stats.total_siswa,
      unit: 'Siswa',
      icon: GraduationCap,
      color: 'from-cyan-600 to-blue-600',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
      onClick: () => navigate('/super-admin/instansi'),
    },
    {
      title: 'Total Guru',
      value: stats.total_guru,
      unit: 'Guru',
      icon: UserCheck,
      color: 'from-teal-600 to-emerald-600',
      textColor: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      borderColor: 'border-teal-200 dark:border-teal-800',
      onClick: () => navigate('/super-admin/instansi'),
    },
    {
      title: 'Total Paket Soal',
      value: stats.total_paket_soal,
      unit: 'Paket',
      icon: Package,
      color: 'from-amber-600 to-orange-600',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      onClick: () => navigate('/super-admin/bank-soal'),
    },
    {
      title: 'Total Bank Soal',
      value: stats.total_bank_soal,
      unit: 'Butir Soal',
      icon: Layers,
      color: 'from-indigo-600 to-pink-600',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      onClick: () => navigate('/super-admin/bank-soal'),
    },
    {
      title: 'Total User Online',
      value: stats.total_user_online,
      unit: 'Online',
      icon: Radio,
      color: 'from-green-600 to-emerald-600',
      textColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      onClick: () => navigate('/super-admin/monitoring'),
      badge: 'Live',
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <WelcomeBanner
          title={`Dashboard Platform, ${user?.name || 'Super Admin'} 👋`}
          subtitle="Pantau performa instansi mitra, integritas pengguna, serta metrik ujian se-Indonesia secara real-time."
          roleBadge="Platform Owner Portal"
          metrics={[
            { label: 'Instansi Aktif', value: stats.instansi_aktif },
            { label: 'Total Siswa', value: stats.total_siswa.toLocaleString() },
            { label: 'User Online', value: stats.total_user_online }
          ]}
          icon={LayoutDashboard}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl px-4 py-2.5 shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {autoRefresh && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-gray-600'}`}></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-[#161C2D] dark:text-white">
              {autoRefresh ? 'Real-Time Aktif' : 'Real-Time Dijeda'}
            </span>
          </div>
          <span className="text-slate-300 dark:text-white/20">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>Pembaruan tiap 5 detik</span>
            <span className="hidden md:inline text-slate-400 dark:text-gray-500">
              (Terakhir: {lastUpdated.toLocaleTimeString('id-ID')})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer active:scale-95 ${
              autoRefresh 
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
            }`}
            title={autoRefresh ? 'Jeda sinkronisasi otomatis' : 'Aktifkan sinkronisasi otomatis'}
          >
            {autoRefresh ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{autoRefresh ? 'Jeda Real-Time' : 'Lanjutkan Real-Time'}</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#161C2D] text-white hover:bg-slate-800 dark:bg-white dark:text-[#161C2D] dark:hover:bg-slate-200 border border-transparent shadow-[1px_1px_0px_0px_#000000] cursor-pointer transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* 10 Real Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_#171717] dark:hover:shadow-[5px_5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider truncate">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.bgColor} ${card.borderColor} border`}>
                  <Icon className={`h-4 w-4 ${card.textColor}`} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
                    {loading ? '...' : card.value.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-gray-500">
                    {card.unit}
                  </span>
                </div>

                {card.badge && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${card.badgeColor || 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'}`}>
                    {card.badge === 'Live' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {card.badge}
                  </span>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <span>Lihat Detail</span>
                <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => navigate('/super-admin/instansi')}
          className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Kelola Instansi</h4>
              <p className="text-[10px] text-slate-400">Pusat Manajemen Sekolah & Data</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" />
        </div>

        <div 
          onClick={() => navigate('/super-admin/users')}
          className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Kelola Pengguna</h4>
              <p className="text-[10px] text-slate-400">Akun Super Administrator</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition" />
        </div>

        <div 
          onClick={() => navigate('/super-admin/subscriptions')}
          className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Langganan Platform</h4>
              <p className="text-[10px] text-slate-400">Hak Akses & Kuota</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition" />
        </div>

        <div 
          onClick={() => navigate('/super-admin/monitoring')}
          className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Audit Trail</h4>
              <p className="text-[10px] text-slate-400">Aktivitas & Log Sistem</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition" />
        </div>
      </div>

      {/* Ringkasan Instansi Terbaru */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-[#161C2D] dark:text-white">Daftar Instansi Sekolah Mitra Terbaru</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">Data instansi terdaftar dengan rincian sumber daya terhubung.</p>
          </div>
          <button
            onClick={() => navigate('/super-admin/instansi')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Buka Seluruh Instansi</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Nama Instansi</th>
                <th className="py-3 px-3">Jenis</th>
                <th className="py-3 px-3 text-center">Guru</th>
                <th className="py-3 px-3 text-center">Siswa</th>
                <th className="py-3 px-3 text-center">Kelas</th>
                <th className="py-3 px-3 text-center">Ujian</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="py-6 text-center font-bold text-slate-500">Memuat data instansi...</td></tr>
              ) : instansiList.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center font-bold text-slate-500">Belum ada instansi mitra terdaftar.</td></tr>
              ) : instansiList.map((i: any) => {
                const isExpired = i.status === 'expired' || i.is_expired;
                const isAktif = !isExpired && (i.status === 'aktif' || i.status_aktif === 'Y' || String(i.status_aktif).toLowerCase() === 'aktif');
                const isToggling = togglingId === String(i.idkategori);
                return (
                  <tr key={i.idkategori} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#161C2D] dark:text-white">
                      {i.nama_kategori}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">
                        NPSN: {i.npsn || '-'} | ID: {i.idkategori}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300">
                        {i.jenis_instansi || 'Sekolah'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{i.guru_count ?? i.total_guru ?? 0}</td>
                    <td className="py-3 px-3 text-center font-bold">{i.siswa_count ?? i.total_siswa ?? 0}</td>
                    <td className="py-3 px-3 text-center font-bold">{i.kelas_count ?? i.total_kelas ?? 0}</td>
                    <td className="py-3 px-3 text-center font-bold">{i.ujian_count ?? i.total_ujian ?? 0}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleInstansiStatus(i)}
                        disabled={isToggling}
                        title={`Klik untuk mengubah status menjadi ${isAktif ? 'Non Aktif' : 'Aktif'}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border transition cursor-pointer hover:opacity-80 active:scale-95 disabled:opacity-50 ${
                          isExpired
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                            : isAktif 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700' 
                              : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isExpired ? 'bg-amber-500' : isAktif ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {isToggling ? 'Menyimpan...' : isExpired ? 'Expired' : isAktif ? 'Aktif' : 'Non Aktif'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/super-admin/instansi`)}
                        className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                        title="Buka Detail Instansi"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
