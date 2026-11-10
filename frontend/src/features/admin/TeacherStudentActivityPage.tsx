import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { 
  History, Download, Search, RefreshCw, 
  UserCheck, GraduationCap
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface ActivityItem {
  id: number;
  user_name: string;
  user_role: 'guru' | 'siswa';
  action: string;
  target_label?: string;
  human_description?: string;
  device_browser?: string;
  ip_address?: string;
  created_at: string;
}

export const TeacherStudentActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'guru' | 'siswa'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchActivities = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (roleFilter !== 'all') params.user_role = roleFilter;
      if (actionFilter !== 'all') params.action = actionFilter;
      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiClient.get('/admin/teacher-student-activities', { params });
      setActivities(res.data?.data || []);
      setPaginationFromResponse(res.data);
    } catch (err: any) {
      toast.error('Gagal memuat log aktivitas Guru dan Siswa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(currentPage);
  }, [currentPage, roleFilter, actionFilter, dateFrom, dateTo]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (roleFilter !== 'all') params.user_role = roleFilter;
      if (actionFilter !== 'all') params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiClient.get('/admin/teacher-student-activities/export', {
        params,
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `aktivitas_guru_siswa_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Berkas riwayat aktivitas berhasil diunduh.');
    } catch (err) {
      toast.error('Gagal mengunduh berkas riwayat aktivitas.');
    } finally {
      setExporting(false);
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Masuk Akun</span>;
    }
    if (act.includes('LOGOUT')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-gray-300">Keluar Akun</span>;
    }
    if (act.includes('START') || act.includes('MULAI')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Mulai Ujian</span>;
    }
    if (act.includes('SUBMIT') || act.includes('SELESAI')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">Kirim Jawaban</span>;
    }
    if (act.includes('SOAL') || act.includes('CREATE') || act.includes('TAMBAH')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Kelola Soal</span>;
    }
    if (act.includes('IMPORT') || act.includes('EXPORT')) {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">Import/Export</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-gray-300">{action}</span>;
  };

  return (
    <div className="space-y-6 pb-12 font-sans animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A1E22] p-6 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <History className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Aktivitas Guru & Siswa
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                Pantau riwayat login, pengerjaan ujian, pembuatan soal, dan interaksi pembelajaran di sekolah Anda
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            <span>{exporting ? 'Mengunduh...' : 'Export Excel / CSV'}</span>
          </button>
          <button
            onClick={() => fetchActivities(currentPage)}
            className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`h-4 w-4 stroke-[2.5] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-slate-200 dark:border-white/10 pb-2">
        <button
          onClick={() => { setRoleFilter('all'); resetPage(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            roleFilter === 'all'
              ? 'bg-[#161C2D] text-white dark:bg-white dark:text-[#161C2D]'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200'
          }`}
        >
          <span>Semua Pengguna</span>
        </button>
        <button
          onClick={() => { setRoleFilter('guru'); resetPage(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            roleFilter === 'guru'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Aktivitas Guru</span>
        </button>
        <button
          onClick={() => { setRoleFilter('siswa'); resetPage(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            roleFilter === 'siswa'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Aktivitas Siswa</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] p-4 rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { resetPage(); fetchActivities(1); } }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#161C2D]"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); resetPage(); }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#161C2D]"
          >
            <option value="all">-- Semua Jenis Aksi --</option>
            <option value="LOGIN">Masuk Akun (Login)</option>
            <option value="LOGOUT">Keluar Akun (Logout)</option>
            <option value="START_EXAM">Memulai Ujian</option>
            <option value="SUBMIT_EXAM">Mengirim Lembar Jawaban</option>
            <option value="CREATE_BANK_SOAL">Membuat Soal</option>
            <option value="EDIT_BANK_SOAL">Mengubah Soal</option>
            <option value="DELETE_BANK_SOAL">Menghapus Soal</option>
            <option value="IMPORT_SOAL">Import Soal</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#161C2D]"
            placeholder="Dari tanggal"
          />
        </div>

        <div>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#161C2D]"
            placeholder="Sampai tanggal"
          />
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white dark:bg-[#1A1E22] rounded-2xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-white/5 border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-800 dark:text-white uppercase font-black tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Waktu</th>
                <th className="px-4 py-3.5">Pengguna</th>
                <th className="px-4 py-3.5">Peran</th>
                <th className="px-4 py-3.5">Aksi</th>
                <th className="px-4 py-3.5">Rincian Aktivitas</th>
                <th className="px-4 py-3.5">Perangkat</th>
                <th className="px-4 py-3.5">Alamat IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-bold">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data aktivitas...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-bold">
                    Tidak ada catatan aktivitas yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                activities.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-gray-400 font-mono">
                      {new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                      {item.user_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        item.user_role === 'guru' 
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {item.user_role === 'guru' ? 'Guru' : 'Siswa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-gray-300 max-w-md">
                      {item.human_description || item.target_label || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400 text-[11px]">
                      {item.device_browser || 'Perangkat Lain'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                      {item.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {paginationMeta.total > 15 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10">
            <Pagination
              currentPage={paginationMeta.currentPage}
              lastPage={paginationMeta.lastPage}
              total={paginationMeta.total}
              perPage={paginationMeta.perPage}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
