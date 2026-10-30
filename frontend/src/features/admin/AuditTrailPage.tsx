import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import {
  ScrollText, Search, Filter, Calendar, User,
  X, Activity
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface AuditLogItem {
  id: number;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_INSTANSI: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  EDIT_INSTANSI: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  CREATE_SUPER_ADMIN: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  CREATE_ADMIN_INSTANSI: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  CREATE_BANK_SOAL: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
  EDIT_BANK_SOAL: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
  EDIT_PROFIL: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  CHANGE_PASSWORD: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  CREATE_TAHUN_SOAL: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
  EDIT_TAHUN_SOAL: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
  DELETE_TAHUN_SOAL: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE_INSTANSI: 'Buat Instansi',
  EDIT_INSTANSI: 'Edit Instansi',
  CREATE_SUPER_ADMIN: 'Buat Super Admin',
  CREATE_ADMIN_INSTANSI: 'Buat Admin Instansi',
  CREATE_BANK_SOAL: 'Buat Bank Soal',
  EDIT_BANK_SOAL: 'Edit Bank Soal',
  EDIT_PROFIL: 'Edit Profil',
  CHANGE_PASSWORD: 'Ganti Password',
  CREATE_TAHUN_SOAL: 'Buat Tahun Soal',
  EDIT_TAHUN_SOAL: 'Edit Tahun Soal',
  DELETE_TAHUN_SOAL: 'Hapus Tahun Soal',
};

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [summary, setSummary] = useState({ total_logs: 0, today_logs: 0, week_logs: 0 });

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchLogs = async (p = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page: p, per_page: 15 };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiClient.get('/admin/audit-logs', { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setLogs(list);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [actRes, sumRes] = await Promise.all([
        apiClient.get('/admin/audit-logs/actions').catch(() => ({ data: [] })),
        apiClient.get('/admin/audit-logs/summary').catch(() => ({ data: { total_logs: 0, today_logs: 0, week_logs: 0 } })),
      ]);
      setActions(actRes.data || []);
      setSummary(sumRes.data);
    } catch {}
  };

  useEffect(() => { fetchMeta(); }, []);
  useEffect(() => { fetchLogs(currentPage); }, [currentPage, search, actionFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Audit Trail</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Pantau seluruh riwayat aksi dalam sistem secara kronologis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Log', value: summary.total_logs, color: 'from-indigo-500 to-purple-600' },
          { label: 'Hari Ini', value: summary.today_logs, color: 'from-emerald-500 to-teal-600' },
          { label: 'Minggu Ini', value: summary.week_logs, color: 'from-amber-500 to-orange-600' },
        ].map((s, i) => (
          <div key={i} className="glass-panel rounded-2xl p-4 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value.toLocaleString('id-ID')}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              placeholder="Cari nama pengguna, label target, atau aksi..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); resetPage(); }}
              className="px-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            >
              <option value="">Semua Aksi</option>
              {actions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage(); }} className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
            <span className="text-xs text-slate-400">—</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage(); }} className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
          </div>

          {(search || actionFilter || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setActionFilter(''); setDateFrom(''); setDateTo(''); resetPage(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition" title="Reset Filter">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/5 text-slate-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-bold bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Aksi</th>
                <th className="py-3.5 px-4">Target</th>
                <th className="py-3.5 px-4">Detail</th>
                <th className="py-3.5 px-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3.5 px-4"><div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <ScrollText className="h-12 w-12 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 dark:text-gray-400">Belum ada riwayat audit</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition text-slate-700 dark:text-gray-300">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-[11px]">{log.user_name}</p>
                          <p className="text-[9px] text-slate-400 dark:text-gray-500 uppercase font-bold">{log.user_role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg border ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.target_label && (
                        <span className="font-semibold text-slate-800 dark:text-white text-[11px]">{log.target_label}</span>
                      )}
                      {log.target_type && (
                        <p className="text-[9px] text-slate-400 dark:text-gray-500 font-mono">{log.target_type}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      {log.metadata && (
                        <div className="text-[10px] text-slate-500 dark:text-gray-400 space-y-0.5">
                          {Object.entries(log.metadata).slice(0, 3).map(([k, v]) => (
                            <div key={k}><span className="font-semibold">{k}:</span> {String(v)}</div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 dark:text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={paginationMeta.currentPage}
        lastPage={paginationMeta.lastPage}
        total={paginationMeta.total}
        perPage={paginationMeta.perPage}
        from={paginationMeta.from}
        to={paginationMeta.to}
        onPageChange={setPage}
      />
    </div>
  );
};
export default AuditTrailPage;
