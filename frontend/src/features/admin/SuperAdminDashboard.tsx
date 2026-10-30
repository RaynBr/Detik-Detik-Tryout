import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { 
  Building2, 
  GraduationCap, 
  UserCheck, 
  LayoutDashboard, 
  Layers,
  CreditCard,
  Settings,
  History,
  ArrowRight
} from 'lucide-react';
import { 
  WelcomeBanner, 
  GradientStatCard 
} from '../../shared/components/dashboard';

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { total_instansi: 0, total_students: 0, total_teachers: 0, total_exams: 0, total_bank_soal: 0 },
    instansi: [] as any[]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, instansiRes] = await Promise.all([
          apiClient.get('/super-admin/dashboard/stats').catch(() => ({ data: {} })),
          apiClient.get('/super-admin/instansi').catch(() => ({ data: [] }))
        ]);
        setData({
          stats: statsRes.data,
          instansi: instansiRes.data
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      <WelcomeBanner
        title={`Dashboard Platform, ${user?.name || 'Super Admin'} 👋`}
        subtitle="Pantau operasional seluruh instansi mitra, lisensi kuota, dan kepatuhan audit trail secara terpusat."
        roleBadge="Platform Owner Portal"
        metrics={[
          { label: 'Instansi Mitra', value: data.stats.total_instansi || 0 },
          { label: 'Total Siswa Global', value: data.stats.total_students || 0 },
          { label: 'Total Guru Global', value: data.stats.total_teachers || 0 }
        ]}
        icon={LayoutDashboard}
      />

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GradientStatCard 
          title="Instansi Mitra" 
          value={`${data.stats.total_instansi || 0} Mitra`} 
          icon={Building2} 
          variant="purple" 
          onClick={() => navigate('/super-admin/instansi')} 
        />
        <GradientStatCard 
          title="Total Siswa Global" 
          value={`${(data.stats.total_students || 0).toLocaleString()} Siswa`} 
          icon={GraduationCap} 
          variant="cyan" 
          onClick={() => navigate('/super-admin/users')} 
        />
        <GradientStatCard 
          title="Total Guru Global" 
          value={`${(data.stats.total_teachers || 0).toLocaleString()} Guru`} 
          icon={UserCheck} 
          variant="emerald" 
          onClick={() => navigate('/super-admin/users')} 
        />
        <GradientStatCard 
          title="Master Soal Nasional" 
          value={`${(data.stats.total_bank_soal || 0).toLocaleString()} Butir`} 
          icon={Layers} 
          variant="indigo" 
          onClick={() => navigate('/super-admin/subjects')} 
        />
      </div>

      {/* Quick Action Hub strictly for Platform Owner */}
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
              <p className="text-[10px] text-slate-400">Registrasi & Enkripsi ID</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition" />
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
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Subscription & Kuota</h4>
              <p className="text-[10px] text-slate-400">Alokasi Kapasitas Siswa</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition" />
        </div>

        <div 
          onClick={() => navigate('/super-admin/audit-logs')}
          className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Audit Trail Global</h4>
              <p className="text-[10px] text-slate-400">Log Aktivitas & Mutasi</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition" />
        </div>

        <div 
          onClick={() => navigate('/super-admin/settings')}
          className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-800">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#161C2D] dark:text-white">Pengaturan Platform</h4>
              <p className="text-[10px] text-slate-400">SMTP, Backup & Maintenance</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition" />
        </div>
      </div>

      {/* Daftar Instansi Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-[#161C2D] dark:text-white">Daftar Instansi Sekolah Mitra</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">Data registrasi sekolah yang terhubung ke platform CBT.</p>
          </div>
          <button
            onClick={() => navigate('/super-admin/instansi')}
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
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
                <th className="py-3 px-3 text-center">Admin Sekolah</th>
                <th className="py-3 px-3 text-center">Guru</th>
                <th className="py-3 px-3 text-center">Siswa</th>
                <th className="py-3 px-3 text-center">Kelas</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="py-4 text-center font-bold text-slate-500">Memuat data instansi...</td></tr>
              ) : data.instansi.length === 0 ? (
                <tr><td colSpan={6} className="py-4 text-center font-bold text-slate-500">Belum ada instansi mitra terdaftar.</td></tr>
              ) : data.instansi.slice(0, 10).map((i: any) => (
                <tr key={i.idkategori} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-bold text-[#161C2D] dark:text-white">
                    {i.nama_kategori}
                    <span className="block text-[10px] text-slate-400 font-mono font-normal">ID: {i.idkategori}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold">{i.admin_count}</td>
                  <td className="py-3 px-3 text-center font-bold">{i.guru_count}</td>
                  <td className="py-3 px-3 text-center font-bold">{i.siswa_count}</td>
                  <td className="py-3 px-3 text-center font-bold">{i.kelas_count}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
