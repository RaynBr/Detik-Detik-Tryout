import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Edit3, 
  X,
  CheckCircle2, 
  RefreshCw,
  ShieldCheck,
  Power,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';

interface SubscriptionInstitution {
  idkategori: string;
  name: string;
  package_id?: string;
  status: string;
  indicator?: 'aktif' | 'warning' | 'expired' | 'nonaktif' | string;
  indicator_label?: string;
  days_remaining?: number | null;
  is_active?: boolean;
  is_expired?: boolean;
  is_warning?: boolean;
  tanggal_aktif?: string;
  tanggal_berakhir?: string;
  keterangan?: string;
  valid_until?: string;
  max_students?: number;
  active_students?: number;
  total_guru?: number;
  total_siswa?: number;
  total_kelas?: number;
}

export const PlatformSubscriptionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<SubscriptionInstitution[]>([]);
  const [summary, setSummary] = useState({
    total_institutions: 0,
    active_subscriptions: 0,
    warning_subscriptions: 0,
    expired_subscriptions: 0,
    inactive_subscriptions: 0,
    total_active_students: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Edit Access Modal
  const [selectedInstansi, setSelectedInstansi] = useState<SubscriptionInstitution | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    status: 'Aktif',
    tanggal_aktif: '',
    tanggal_berakhir: '',
    keterangan: '',
  });

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/super-admin/subscriptions');
      if (res.data) {
        const instList = res.data.institutions || [];
        setInstitutions(instList);

        const backendSummary = res.data.summary || {};
        const activeCount = backendSummary.total_aktif ?? instList.filter((i: any) => i.indicator === 'aktif' || (!i.is_expired && (i.status || '').toLowerCase() === 'aktif')).length;
        const warningCount = backendSummary.total_warning ?? instList.filter((i: any) => i.indicator === 'warning' || i.is_warning).length;
        const expiredCount = backendSummary.total_expired ?? instList.filter((i: any) => i.indicator === 'expired' || i.is_expired).length;
        const inactiveCount = backendSummary.total_nonaktif ?? (instList.length - activeCount);

        setSummary({
          total_institutions: backendSummary.total_instansi || instList.length,
          active_subscriptions: activeCount,
          warning_subscriptions: warningCount,
          expired_subscriptions: expiredCount,
          inactive_subscriptions: inactiveCount,
          total_active_students: res.data.summary?.total_active_students || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load subscriptions', err);
      toast.error('Gagal memuat status akses instansi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenEdit = (instansi: SubscriptionInstitution) => {
    setSelectedInstansi(instansi);
    setEditForm({
      status: instansi.is_expired ? 'Non Aktif' : ((instansi.status || 'aktif').toLowerCase() === 'aktif' ? 'Aktif' : 'Non Aktif'),
      tanggal_aktif: instansi.tanggal_aktif || '',
      tanggal_berakhir: instansi.tanggal_berakhir || instansi.valid_until || '',
      keterangan: instansi.keterangan || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;

    setSubmitting(true);
    try {
      const res = await apiClient.put(`/super-admin/subscriptions/${selectedInstansi.idkategori}`, editForm);
      toast.success(res.data?.message || `Hak akses instansi ${selectedInstansi.name} berhasil diperbarui.`);
      setIsEditModalOpen(false);
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan perubahan akses.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (instansi: SubscriptionInstitution) => {
    try {
      const res = await apiClient.post(`/super-admin/subscriptions/${instansi.idkategori}/toggle`);
      toast.success(res.data?.message || `Status akses instansi ${instansi.name} berhasil diubah.`);
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status akses.');
    }
  };

  const filteredInstitutions = institutions.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (i.keterangan || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const indicator = i.indicator || (i.is_expired ? 'expired' : ((i.status || 'aktif').toLowerCase() === 'aktif' ? 'aktif' : 'nonaktif'));
    
    let matchStatus = true;
    if (statusFilter === 'aktif') {
      matchStatus = indicator === 'aktif';
    } else if (statusFilter === 'warning') {
      matchStatus = indicator === 'warning' || Boolean(i.is_warning);
    } else if (statusFilter === 'expired') {
      matchStatus = indicator === 'expired' || Boolean(i.is_expired);
    } else if (statusFilter === 'nonaktif') {
      matchStatus = indicator === 'nonaktif' || (!i.is_active && !i.is_expired);
    }

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                4. Otorisasi Akses & Subscription Instansi
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pengaturan hak izin operasional instansi sekolah untuk menggunakan sistem CBT Detik Detik TryOut dengan validasi masa aktif otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={fetchSubscriptions}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Segarkan Status</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Instansi</span>
            <span className="text-2xl font-black text-[#161C2D] dark:text-white">
              {summary.total_institutions}
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl border border-blue-200">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Akses Aktif</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.active_subscriptions}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl border border-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Akan Berakhir (≤7 Hari)</span>
            <span className="text-2xl font-black text-amber-500 dark:text-amber-400">
              {summary.warning_subscriptions}
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl border border-amber-200">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Masa Habis (Expired)</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {summary.expired_subscriptions}
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl border border-rose-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama instansi atau keterangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-[#161C2D] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Status Akses</option>
            <option value="aktif">Status: 🟢 Aktif</option>
            <option value="warning">Status: 🟡 Akan Berakhir (≤7 Hari)</option>
            <option value="expired">Status: 🔴 Expired</option>
            <option value="nonaktif">Status: ⚪ Non Aktif</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Nama Instansi</th>
                <th className="py-3 px-3 text-center">Status / Indikator</th>
                <th className="py-3 px-3">Tanggal Aktif</th>
                <th className="py-3 px-3">Tanggal Berakhir</th>
                <th className="py-3 px-3">Keterangan Akses</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-500" />
                    Memuat data otorisasi instansi...
                  </td>
                </tr>
              ) : filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-bold text-slate-500">
                    Tidak ditemukan data instansi.
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((i) => {
                  const indicator = i.indicator || (i.is_expired ? 'expired' : ((i.status || 'aktif').toLowerCase() === 'aktif' ? 'aktif' : 'nonaktif'));
                  const isAktif = indicator === 'aktif' || indicator === 'warning';

                  return (
                    <tr key={i.idkategori} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl border border-[#161C2D]/20 flex items-center justify-center font-black shrink-0 ${
                            indicator === 'expired'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                              : indicator === 'warning'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                              : isAktif
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                              : 'bg-slate-100 text-slate-500 dark:bg-white/10'
                          }`}>
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-bold text-[#161C2D] dark:text-white block">
                              {i.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {i.idkategori}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {indicator === 'expired' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
                              Expired
                            </span>
                          ) : indicator === 'warning' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                              <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping"></span>
                              Akan Berakhir {i.days_remaining !== null && `(${i.days_remaining}h)`}
                            </span>
                          ) : isAktif ? (
                            <button
                              onClick={() => handleToggleStatus(i)}
                              title="Klik untuk menonaktifkan akses"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition cursor-pointer"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                              Aktif
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(i)}
                              title="Klik untuk mengaktifkan akses"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition cursor-pointer"
                            >
                              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                              Non Aktif
                            </button>
                          )}

                          {indicator === 'warning' && (
                            <span className="text-[9px] font-bold text-amber-600">
                              Sisa {i.days_remaining} hari
                            </span>
                          )}
                          {indicator === 'expired' && (
                            <span className="text-[9px] font-bold text-rose-600">
                              Akses Sistem Ditutup
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-gray-300">
                        {i.tanggal_aktif || '-'}
                      </td>

                      <td className="py-3.5 px-3 font-medium">
                        <span className={indicator === 'expired' ? 'text-rose-600 font-bold' : indicator === 'warning' ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-gray-300'}>
                          {i.tanggal_berakhir || i.valid_until || 'Tidak Terbatas'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 dark:text-gray-400">
                        {i.keterangan || 'Izin penggunaan aktif normal'}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(i)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                            title="Atur Masa Aktif & Perpanjang Tanggal Berakhir"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {indicator !== 'expired' && (
                            <button
                              onClick={() => handleToggleStatus(i)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isAktif ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'
                              }`}
                              title={isAktif ? 'Nonaktifkan Akses' : 'Aktifkan Akses'}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Access Modal */}
      {isEditModalOpen && selectedInstansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                Atur Akses {selectedInstansi.name}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccess} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Status Izin Akses Sistem
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                >
                  <option value="Aktif">Aktif (Dapat Login & Ujian)</option>
                  <option value="Non Aktif">Non Aktif (Akses Ditutup)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Bila Non Aktif, admin instansi dan siswa yang login akan menerima pemberitahuan bahwa masa penggunaan telah dinonaktifkan.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Tanggal Mulai Aktif
                </label>
                <input
                  type="date"
                  value={editForm.tanggal_aktif}
                  onChange={(e) => setEditForm({ ...editForm, tanggal_aktif: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Tanggal Berakhir (Masa Berlaku)
                </label>
                <input
                  type="date"
                  value={editForm.tanggal_berakhir}
                  onChange={(e) => setEditForm({ ...editForm, tanggal_berakhir: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                />
                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
                  💡 <strong>Aturan Otomatis:</strong> Memperpanjang tanggal berakhir ke masa depan akan otomatis mengaktifkan kembali status & hak akses instansi. Jika tanggal telah lewat dari hari ini, sistem backend otomatis mengunci akses dengan status Expired.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Keterangan Operasional
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: TryOut Akbar Semester Ganjil 2026/2027"
                  value={editForm.keterangan}
                  onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Izin Akses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
