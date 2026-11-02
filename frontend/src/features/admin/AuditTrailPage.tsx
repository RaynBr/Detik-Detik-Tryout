import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import {
  Activity,
  Radio,
  Building2,
  PlayCircle,
  AlertTriangle,
  Search,
  Filter,
  User,
  X,
  RefreshCw,
  History
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface MonitoringStats {
  total_login_today: number;
  total_user_online: number;
  total_instansi_aktif: number;
  total_ujian_berjalan: number;
  total_error_sistem: number;
}

interface AuditLogItem {
  id: number;
  user_name: string;
  user_role: string;
  instansi_name?: string;
  aktivitas: string;
  modul: string;
  target_label?: string;
  ip_address?: string;
  browser?: string;
  waktu: string;
  created_at: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class MonitoringErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Monitoring Component Error:', error, errorInfo);
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl shadow-[4px_4px_0px_0px_#171717] max-w-lg mx-auto my-12 space-y-4 font-sans">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-2xl mx-auto w-fit border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="text-base font-black text-[#161C2D] dark:text-white">
            Monitoring gagal dimuat.
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            {this.state.error?.message || 'Terjadi kesalahan saat memuat tampilan data pemantauan platform.'}
          </p>
          <div className="pt-2">
            <button
              onClick={this.handleRefresh}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AuditTrailPageView: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats>({
    total_login_today: 0,
    total_user_online: 0,
    total_instansi_aktif: 0,
    total_ujian_berjalan: 0,
    total_error_sistem: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [modulesList, setModulesList] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [modulFilter, setModulFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await apiClient.get('/super-admin/monitoring/stats');
      if (res.data) {
        const m = res.data.metrics || res.data;
        if (m && typeof m === 'object') {
          setStats({
            total_login_today: Number(m.total_login_today ?? 0),
            total_user_online: Number(m.total_user_online ?? 0),
            total_instansi_aktif: Number(m.total_instansi_aktif ?? 0),
            total_ujian_berjalan: Number(m.total_ujian_berjalan ?? 0),
            total_error_sistem: Number(m.total_error_sistem ?? 0),
          });
        }
      }
    } catch (err) {
      console.error('Failed to load monitoring stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await apiClient.get('/super-admin/monitoring/modules');
      if (res.data) {
        // Backend returns { modules: [...], actions: [...] } or an array
        const list = Array.isArray(res.data)
          ? res.data
          : (Array.isArray(res.data.modules) ? res.data.modules : []);
        setModulesList(list.filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to load monitoring modules:', err);
      setModulesList([]);
    }
  };

  const fetchLogs = async (page = currentPage) => {
    setLoadingLogs(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (userFilter.trim()) params.user = userFilter.trim();
      if (modulFilter) params.modul = modulFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiClient.get('/super-admin/monitoring/audit-logs', { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setLogs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Gagal memuat log audit aktivitas.');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchModules();
  }, []);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [search, userFilter, modulFilter, dateFrom, dateTo, currentPage]);

  const handleRefresh = () => {
    fetchStats();
    fetchLogs(currentPage);
  };

  const handleResetFilters = () => {
    setSearch('');
    setUserFilter('');
    setModulFilter('');
    setDateFrom('');
    setDateTo('');
    resetPage();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <History className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                5. Monitoring Platform & Audit Trail
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pusat pengawasan operasional langsung (live metrics) dan rekam jejak audit mutasi data sistem.
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Segarkan Pemantauan</span>
          </button>
        </div>
      </div>

      {/* Dashboard Monitoring (5 Minimal Cards) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Dashboard Monitoring Real-Time
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Login Hari Ini */}
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Login Hari Ini</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#161C2D] dark:text-white">
                {loadingStats ? '...' : (stats?.total_login_today ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Sesi</span>
            </div>
          </div>

          {/* 2. Total User Online */}
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Online</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200">
                <Radio className="h-4 w-4 animate-pulse" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {loadingStats ? '...' : (stats?.total_user_online ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Pengguna</span>
            </div>
          </div>

          {/* 3. Total Instansi Aktif */}
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Instansi Aktif</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#161C2D] dark:text-white">
                {loadingStats ? '...' : (stats?.total_instansi_aktif ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Sekolah</span>
            </div>
          </div>

          {/* 4. Total Ujian Berjalan */}
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ujian Berjalan</span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200">
                <PlayCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {loadingStats ? '...' : (stats?.total_ujian_berjalan ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Sesi</span>
            </div>
          </div>

          {/* 5. Total Error Sistem */}
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Error Sistem</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {loadingStats ? '...' : (stats?.total_error_sistem ?? 0)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Insiden</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar for Audit Log */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h4 className="text-xs font-black uppercase text-slate-600 dark:text-gray-300">
              Filter Audit Log
            </h4>
          </div>
          {(search || userFilter || modulFilter || dateFrom || dateTo) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aktivitas / detail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
            />
          </div>

          {/* User filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter nama pengguna..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
            />
          </div>

          {/* Modul filter */}
          <div>
            <select
              value={modulFilter}
              onChange={(e) => setModulFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="">Semua Modul</option>
              {Array.isArray(modulesList) && modulesList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
              title="Dari Tanggal"
            />
          </div>

          {/* Date to */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
              title="Sampai Tanggal"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3">Instansi</th>
                <th className="py-3 px-3">Aktivitas & Modul</th>
                <th className="py-3 px-3">IP Address & Browser</th>
                <th className="py-3 px-3 text-right">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loadingLogs ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Memuat data audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 text-slate-400">
                        <History className="h-8 w-8" />
                      </div>
                      <h4 className="text-sm font-bold text-[#161C2D] dark:text-white">
                        Belum Ada Rekam Jejak Audit
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        Tidak ditemukan catatan aktivitas atau audit log dengan parameter filter saat ini.
                      </p>
                      {(search || userFilter || modulFilter || dateFrom || dateTo) && (
                        <button
                          onClick={handleResetFilters}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition shadow-sm"
                        >
                          Reset Filter Pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log: any, index: number) => {
                  const role = (log.user_role || log.role || 'user').toLowerCase();
                  const roleBadge = 
                    role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                    role === 'admin' ? 'bg-blue-100 text-blue-700' :
                    role === 'guru' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700';

                  const aktivitas = String(log.aktivitas || log.action || '-');
                  const actColor = 
                    aktivitas.includes('Tambah') || aktivitas.includes('Aktivasi') || aktivitas.includes('Aktifkan') ? 'text-emerald-600 dark:text-emerald-400' :
                    aktivitas.includes('Edit') || aktivitas.includes('Ubah') ? 'text-amber-600 dark:text-amber-400' :
                    aktivitas.includes('Hapus') || aktivitas.includes('Nonaktif') ? 'text-rose-600 dark:text-rose-400' :
                    'text-indigo-600 dark:text-indigo-400';

                  const userName = log.user_name || log.user || 'Sistem';
                  const instansiName = log.instansi_name || log.instansi || '-';
                  const modulName = log.modul || log.module || '-';
                  const ipAddress = log.ip_address || log.ip || '-';
                  const browserName = log.browser || log.user_agent || 'Browser Web';
                  const waktuStr = log.waktu || log.created_at || '-';

                  return (
                    <tr key={log.id || `log-${index}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* User & Role */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#161C2D] dark:text-white">
                          {userName}
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase mt-0.5 ${roleBadge}`}>
                          {role}
                        </span>
                      </td>

                      {/* Instansi */}
                      <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-gray-300">
                        {instansiName}
                      </td>

                      {/* Aktivitas & Modul */}
                      <td className="py-3.5 px-3">
                        <div className={`font-bold ${actColor}`}>
                          {aktivitas}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-400">Modul:</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 font-medium">
                            {modulName}
                          </span>
                          {log.target_label && (
                            <span className="truncate max-w-[200px] text-slate-400">
                              • {log.target_label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IP Address & Browser */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[11px] text-slate-700 dark:text-gray-300">
                          {ipAddress}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {browserName}
                        </div>
                      </td>

                      {/* Waktu */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-medium text-slate-700 dark:text-gray-300 block">
                          {waktuStr}
                        </span>
                        {log.created_at && log.created_at !== waktuStr && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.created_at}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <Pagination
            currentPage={currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={paginationMeta.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>

    </div>
  );
};

export const AuditTrailPage: React.FC = () => {
  return (
    <MonitoringErrorBoundary>
      <AuditTrailPageView />
    </MonitoringErrorBoundary>
  );
};

export default AuditTrailPage;
