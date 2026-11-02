import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  RefreshCw, 
  X,
  GraduationCap
} from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { usePaginationUrl } from '../../../shared/utils/usePaginationUrl';

interface MasterJenjangItem {
  id: number;
  nama_jenjang: string;
  kode_jenjang: string;
  urutan: number;
  keterangan: string | null;
  status_aktif: 'Y' | 'N';
  kelas_count?: number;
  mata_pelajaran_count?: number;
}

export const MasterJenjangPage: React.FC = () => {
  const location = useLocation();
  const isTenantAdmin = location.pathname.startsWith('/admin');
  const apiBase = isTenantAdmin ? '/admin' : '/super-admin';
  const dashboardLink = isTenantAdmin ? '/admin/dashboard' : '/super-admin/dashboard';
  const masterLink = isTenantAdmin ? '/admin/master-akademik/jenjang' : '/super-admin/master-akademik/jenjang';

  const [data, setData] = useState<MasterJenjangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterJenjangItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nama_jenjang: '',
    kode_jenjang: '',
    urutan: 1,
    keterangan: '',
    status_aktif: 'Y' as 'Y' | 'N',
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterJenjangItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get(`${apiBase}/jenjang`, { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch (err: any) {
      console.error('Failed to load jenjang:', err);
      toast.error('Gagal memuat data master jenjang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetPage();
    fetchData(1);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      nama_jenjang: '',
      kode_jenjang: '',
      urutan: data.length + 1,
      keterangan: '',
      status_aktif: 'Y',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: MasterJenjangItem) => {
    setEditingItem(item);
    setForm({
      nama_jenjang: item.nama_jenjang,
      kode_jenjang: item.kode_jenjang,
      urutan: item.urutan || 1,
      keterangan: item.keterangan || '',
      status_aktif: item.status_aktif,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_jenjang.trim() || !form.kode_jenjang.trim()) {
      toast.error('Nama dan kode jenjang wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.put(`${apiBase}/jenjang/${editingItem.id}`, form);
        toast.success(`Jenjang ${form.nama_jenjang} berhasil diperbarui.`);
      } else {
        await apiClient.post(`${apiBase}/jenjang`, form);
        toast.success(`Jenjang ${form.nama_jenjang} berhasil ditambahkan.`);
      }
      setShowModal(false);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan jenjang.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: MasterJenjangItem) => {
    const nextStatus = item.status_aktif === 'Y' ? 'N' : 'Y';
    try {
      await apiClient.put(`${apiBase}/jenjang/${item.id}`, {
        ...item,
        status_aktif: nextStatus
      });
      toast.success(`Status jenjang ${item.nama_jenjang} berhasil diubah.`);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error('Gagal mengubah status jenjang.');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`${apiBase}/jenjang/${itemToDelete.id}`);
      toast.success(`Jenjang ${itemToDelete.nama_jenjang} berhasil dihapus.`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus jenjang.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-gray-400">
        <Link to={dashboardLink} className="hover:text-indigo-600 transition">
          Dashboard
        </Link>
        <span>/</span>
        <Link to={masterLink} className="hover:text-indigo-600 transition">
          Master Akademik
        </Link>
        <span>/</span>
        <span className="text-[#161C2D] dark:text-white font-black">
          Jenjang
        </span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Master Jenjang Pendidikan
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Konfigurasi tingkatan jenjang institusi (SD, SMP, SMA, SMK, Perguruan Tinggi).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(currentPage)}
              className="p-2.5 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-[#161C2D] dark:text-white transition cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Jenjang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari jenjang atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="Y">Status: Aktif</option>
            <option value="N">Status: Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Nama Jenjang</th>
                <th className="py-3 px-3">Kode</th>
                <th className="py-3 px-3 text-center">Urutan</th>
                <th className="py-3 px-3">Keterangan</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data master jenjang...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <GraduationCap className="h-10 w-10 text-slate-300" />
                      <p className="font-bold text-slate-600 dark:text-gray-300">Belum Ada Data Jenjang</p>
                      <p className="text-[11px] text-slate-400">Silakan tambahkan data jenjang pendidikan pertama Anda.</p>
                      <button
                        onClick={handleOpenAdd}
                        className="mt-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                      >
                        Tambah Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isAktif = item.status_aktif === 'Y';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-sm text-[#161C2D] dark:text-white block">
                          {item.nama_jenjang}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {item.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-indigo-600">
                        {item.kode_jenjang}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold">
                        {item.urutan}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 dark:text-gray-400">
                        {item.keterangan || '-'}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border transition cursor-pointer ${
                            isAktif 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {isAktif ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Jenjang"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Jenjang"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 pt-3 border-t border-[#161C2D]/10 dark:border-white/10">
          <Pagination
            currentPage={paginationMeta.currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={paginationMeta.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                {editingItem ? 'Edit Jenjang' : 'Tambah Jenjang Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Nama Jenjang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sekolah Menengah Atas (SMA / MA)"
                  value={form.nama_jenjang}
                  onChange={(e) => setForm({ ...form, nama_jenjang: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Kode Jenjang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SMA atau SMK"
                  value={form.kode_jenjang}
                  onChange={(e) => setForm({ ...form, kode_jenjang: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Urutan Tingkat
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.urutan}
                  onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status_aktif}
                  onChange={(e) => setForm({ ...form, status_aktif: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                >
                  <option value="Y">Aktif</option>
                  <option value="N">Nonaktif</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan (opsional)..."
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h3 className="text-base font-black text-rose-600">
              Konfirmasi Hapus Jenjang
            </h3>
            <p className="text-xs text-slate-600 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus jenjang <strong>{itemToDelete.nama_jenjang}</strong>? Semua kelas dan mapel yang terikat ke jenjang ini dapat terdampak.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
