import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { 
  Building2, GraduationCap, UserCheck, LayoutDashboard, Sparkles, Layers
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
          apiClient.get('/admin/dashboard/stats').catch(() => ({ data: {} })),
          apiClient.get('/admin/instansi').catch(() => ({ data: [] }))
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
    <div className="space-y-6 pb-12 animate-fade-in">
      <WelcomeBanner
        title={`Dashboard Superadmin, ${user?.name || ''} 👋`}
        subtitle="Pantau performa seluruh instansi mitra, manajemen pengguna, dan status implementasi kurikulum secara terpusat."
        roleBadge="Super Admin Portal"
        metrics={[
          { label: 'Instansi', value: data.stats.total_instansi || 0 },
          { label: 'Siswa', value: data.stats.total_students || 0 },
          { label: 'Guru', value: data.stats.total_teachers || 0 }
        ]}
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GradientStatCard title="Instansi Aktif" value={`${data.stats.total_instansi || 0} Mitra`} icon={Building2} variant="purple" onClick={() => navigate('/admin/instansi')} />
        <GradientStatCard title="Total Siswa" value={`${data.stats.total_students || 0} Peserta`} icon={GraduationCap} variant="cyan" onClick={() => navigate('/admin/students')} />
        <GradientStatCard title="Total Guru" value={`${data.stats.total_teachers || 0} Pengajar`} icon={UserCheck} variant="emerald" onClick={() => navigate('/admin/teachers')} />
        <GradientStatCard title="Bank Soal" value={`${(data.stats.total_bank_soal || 0).toLocaleString()} Soal`} icon={Layers} variant="indigo" onClick={() => navigate('/admin/questions')} />
      </div>

      <div className="glass-panel rounded-3xl p-6 space-y-4 border border-slate-200/80 dark:border-white/5">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          Kesiapan Kurikulum Merdeka (Monitoring Lintas Instansi)
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Statistik implementasi modul P5, KOSP, dan Capaian Pembelajaran lintas instansi sedang disiapkan dalam update fitur mendatang.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 shadow-xl">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">Daftar Instansi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-3">Nama Instansi</th>
                <th className="py-3 px-3 text-center">Admin</th>
                <th className="py-3 px-3 text-center">Guru</th>
                <th className="py-3 px-3 text-center">Siswa</th>
                <th className="py-3 px-3 text-center">Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-4 text-center">Memuat...</td></tr>
              ) : data.instansi.map((i: any) => (
                <tr key={i.idkategori} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{i.nama_kategori}</td>
                  <td className="py-3 px-3 text-center">{i.admin_count}</td>
                  <td className="py-3 px-3 text-center">{i.guru_count}</td>
                  <td className="py-3 px-3 text-center">{i.siswa_count}</td>
                  <td className="py-3 px-3 text-center">{i.kelas_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
