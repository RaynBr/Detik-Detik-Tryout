import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  Package, 
  Layers, 
  PlayCircle, 
  Radio, 
  LayoutDashboard, 
  CreditCard, 
  History, 
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';
import { WelcomeBanner } from '../../shared/components/dashboard';

interface DashboardStats {
  total_instansi: number;
  instansi_aktif: number;
  instansi_non_aktif: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    total_instansi: 0,
    instansi_aktif: 0,
    instansi_non_aktif: 0,
    total_guru: 0,
    total_siswa: 0,
    total_admin_instansi: 0,
    total_paket_soal: 0,
    total_bank_soal: 0,
    total_ujian_aktif: 0,
    total_user_online: 0,
  });
  const [instansiList, setInstansiList] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [statsRes, instansiRes] = await Promise.all([
        apiClient.get('/super-admin/dashboard/stats').catch(() => ({ data: {} })),
        apiClient.get('/super-admin/instansi', { params: { per_page: 5 } }).catch(() => ({ data: [] }))
      ]);

      if (statsRes.data) {
        setStats({
          total_instansi: statsRes.data.total_instansi ?? 0,
          instansi_aktif: statsRes.data.instansi_aktif ?? 0,
          instansi_non_aktif: statsRes.data.instansi_non_aktif ?? 0,
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
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const statCards = [
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
      unit: 'Non Aktif',
      icon: XCircle,
      color: 'from-rose-600 to-red-600',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/30',
      borderColor: 'border-rose-200 dark:border-rose-800',
      onClick: () => navigate('/super-admin/instansi?status=non_aktif'),
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
      onClick: () => navigate('/super-admin/users?role=guru'),
    },
    {
      title: 'Total Siswa',
      value: stats.total_siswa,
      unit: 'Siswa',
      icon: GraduationCap,
      color: 'from-cyan-600 to-blue-600',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
      onClick: () => navigate('/super-admin/users?role=siswa'),
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
      onClick: () => navigate('/super-admin/users?role=admin'),
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
      onClick: () => navigate('/super-admin/subjects'),
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
      onClick: () => navigate('/super-admin/subjects'),
    },
    {
      title: 'Total Ujian Aktif',
      value: stats.total_ujian_aktif,
      unit: 'Sesi Ujian',
      icon: PlayCircle,
      color: 'from-violet-600 to-fuchsia-600',
      textColor: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      borderColor: 'border-violet-200 dark:border-violet-800',
      onClick: () => navigate('/super-admin/monitoring'),
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Metrik Database Real-Time
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#1A1E22] hover:bg-slate-50 dark:hover:bg-white/5 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] cursor-pointer transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">1. Kelola Instansi</h4>
              <p className="text-[10px] text-slate-400">Registrasi, Status & Statistik</p>
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
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">2. Kelola Pengguna</h4>
              <p className="text-[10px] text-slate-400">Super Admin & Admin Instansi</p>
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
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">4. Subscription Akses</h4>
              <p className="text-[10px] text-slate-400">Hak Akses & Masa Aktif</p>
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
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">5. Monitoring & Audit</h4>
              <p className="text-[10px] text-slate-400">Live Metric & Audit Trail</p>
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
                const isAktif = (i.status_aktif || 'aktif').toLowerCase() === 'aktif';
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isAktif 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700' 
                          : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                      }`}>
                        {isAktif ? 'Aktif' : 'Non Aktif'}
                      </span>
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
