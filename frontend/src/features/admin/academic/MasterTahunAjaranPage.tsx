import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import { 
  CalendarDays, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  RefreshCw, 
  X, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { usePaginationUrl } from '../../../shared/utils/usePaginationUrl';

interface AcademicYearItem {
  id: number;
  name: string;
  semester: 'odd' | 'even';
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export const MasterTahunAjaranPage: React.FC = () => {
  const location = useLocation();
  const isTenantAdmin = location.pathname.startsWith('/admin');
  const apiBase = isTenantAdmin ? '/admin' : '/super-admin';
  const dashboardLink = isTenantAdmin ? '/admin/dashboard' : '/super-admin/dashboard';
  const masterLink = isTenantAdmin ? '/admin/master-akademik/tahun-ajaran' : '/super-admin/master-akademik/tahun-ajaran';

  const [data, setData] = useState<AcademicYearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicYearItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    semester: 'odd' as 'odd' | 'even',
    is_active: false,
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AcademicYearItem | null>(null);
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

      const res = await apiClient.get(`${apiBase}/academic-years`, { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch (err: any) {
      console.error('Failed to load academic years:', err);
      toast.error('Gagal memuat data master tahun ajaran.');
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
      name: '',
      semester: 'odd',
      is_active: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: AcademicYearItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      semester: item.semester,
      is_active: Boolean(item.is_active),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama tahun ajaran wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.put(`${apiBase}/academic-years/${editingItem.id}`, form);
        toast.success(`Tahun ajaran ${form.name} berhasil diperbarui.`);
      } else {
        await apiClient.post(`${apiBase}/academic-years`, form);
        toast.success(`Tahun ajaran ${form.name} berhasil ditambahkan.`);
      }
      setShowModal(false);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan tahun ajaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (item: AcademicYearItem) => {
    try {
      await apiClient.post(`${apiBase}/academic-years/${item.id}/activate`);
      toast.success(`Tahun ajaran ${item.name} berhasil diaktifkan secara global.`);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengaktifkan tahun ajaran.');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`${apiBase}/academic-years/${itemToDelete.id}`);
      toast.success(`Tahun ajaran ${itemToDelete.name} berhasil dihapus.`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tahun ajaran.');
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
          Tahun Ajaran
        </span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Master Tahun Ajaran
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Kelola kalender dan periode tahun akademik platform CBT (Ganjil & Genap).
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
              <span>Tambah Tahun Ajaran</span>
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
            placeholder="Cari tahun ajaran (contoh: 2026/2027)..."
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
            <option value="aktif">Status: Aktif</option>
            <option value="nonaktif">Status: Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Tahun Ajaran</th>
                <th className="py-3 px-3">Semester</th>
                <th className="py-3 px-3 text-center">Status Global</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data master tahun ajaran...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <CalendarDays className="h-10 w-10 text-slate-300" />
                      <p className="font-bold text-slate-600 dark:text-gray-300">Belum Ada Data Tahun Ajaran</p>
                      <p className="text-[11px] text-slate-400">Silakan tambahkan tahun ajaran baru untuk memulai konfigurasi akademik.</p>
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
                  const isActive = Boolean(item.is_active);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl border border-[#161C2D]/20 ${
                            isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#161C2D] dark:text-white block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {item.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-gray-300">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.semester === 'odd' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.semester === 'odd' ? 'Ganjil' : 'Genap'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            Aktif
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivate(item)}
                            title="Klik untuk mengaktifkan tahun ajaran ini secara global"
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-300 transition cursor-pointer"
                          >
                            Set Aktif
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Tahun Ajaran"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Tahun Ajaran"
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
                {editingItem ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
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
                  Nama Tahun Ajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 2026/2027"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Semester
                </label>
                <select
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                >
                  <option value="odd">Semester Ganjil (Odd)</option>
                  <option value="even">Semester Genap (Even)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-2 border-[#161C2D] text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-bold text-slate-700 dark:text-gray-200">
                    Set sebagai Tahun Ajaran Aktif saat ini
                  </span>
                </label>
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
              Konfirmasi Hapus Tahun Ajaran
            </h3>
            <p className="text-xs text-slate-600 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus tahun ajaran <strong>{itemToDelete.name}</strong>? Data yang terhubung mungkin akan terpengaruh.
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
