import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import { 
  Compass, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  RefreshCw, 
  X, 
  CheckCircle
} from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { usePaginationUrl } from '../../../shared/utils/usePaginationUrl';

interface MasterJurusanItem {
  id: number;
  name: string;
  code: string;
  jenjang: string | null;
  description: string | null;
  is_active: boolean | number;
}

export const MasterJurusanPage: React.FC = () => {
  const location = useLocation();
  const isTenantAdmin = location.pathname.startsWith('/admin');
  const apiBase = isTenantAdmin ? '/admin' : '/super-admin';
  const dashboardLink = isTenantAdmin ? '/admin/dashboard' : '/super-admin/dashboard';
  const masterLink = isTenantAdmin ? '/admin/master-akademik/jurusan' : '/super-admin/master-akademik/jurusan';

  const [data, setData] = useState<MasterJurusanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterJurusanItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    jenjang: 'SMA',
    description: '',
    is_active: true,
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterJurusanItem | null>(null);
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
      if (jenjangFilter) params.jenjang = jenjangFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get(`${apiBase}/majors`, { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch (err: any) {
      console.error('Failed to load jurusan:', err);
      toast.error('Gagal memuat data master jurusan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, jenjangFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetPage();
    fetchData(1);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      name: '',
      code: '',
      jenjang: 'SMA',
      description: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: MasterJurusanItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      code: item.code,
      jenjang: item.jenjang || 'SMA',
      description: item.description || '',
      is_active: Boolean(item.is_active),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama jurusan wajib diisi.');
      return;
    }
    if (!form.code.trim()) {
      toast.error('Kode jurusan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        jenjang: form.jenjang,
        description: form.description.trim() || null,
        is_active: form.is_active ? 1 : 0,
      };

      if (editingItem) {
        await apiClient.put(`${apiBase}/majors/${editingItem.id}`, payload);
        toast.success(`Jurusan "${payload.name}" berhasil diperbarui.`);
      } else {
        await apiClient.post(`${apiBase}/majors`, payload);
        toast.success(`Jurusan "${payload.name}" berhasil ditambahkan.`);
      }

      setShowModal(false);
      fetchData(currentPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan jurusan.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: MasterJurusanItem) => {
    const nextActive = !Boolean(item.is_active);
    try {
      await apiClient.put(`${apiBase}/majors/${item.id}`, {
        name: item.name,
        code: item.code,
        jenjang: item.jenjang,
        is_active: nextActive ? 1 : 0,
      });
      toast.success(`Status jurusan "${item.name}" diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}.`);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error('Gagal memperbarui status jurusan.');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`${apiBase}/majors/${itemToDelete.id}`);
      toast.success(`Jurusan "${itemToDelete.name}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData(currentPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghapus jurusan. Data mungkin terkait dengan kelas/soal.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link to={dashboardLink} className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <Link to={masterLink} className="hover:text-blue-600 transition-colors">
              Master Data Akademik
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Jurusan (SMA/SMK)</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-xl text-purple-600 shadow-sm">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Jurusan & Program Studi</h1>
              <p className="text-sm text-slate-500">
                Kelola peminatan dan bidang keahlian jenjang SMA, MA, atau kejuruan SMK.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchData(currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-60"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jurusan</span>
          </button>
        </div>
      </div>

      {/* Control Panel: Search & Filter */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau kode jurusan..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Jenjang */}
            <select
              value={jenjangFilter}
              onChange={(e) => {
                setJenjangFilter(e.target.value);
                resetPage();
              }}
              className="px-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            >
              <option value="">Semua Jenjang</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
              <option value="MA">MA</option>
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                resetPage();
              }}
              className="px-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif Saja</option>
              <option value="nonaktif">Nonaktif Saja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat data jurusan...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Belum Ada Jurusan</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {search || jenjangFilter || statusFilter
                ? 'Tidak ada jurusan yang cocok dengan filter yang Anda masukkan.'
                : 'Mulai dengan menambahkan program studi atau jurusan pertama.'}
            </p>
            {search || jenjangFilter || statusFilter ? (
              <button
                onClick={() => {
                  setSearch('');
                  setJenjangFilter('');
                  setStatusFilter('');
                  resetPage();
                }}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                Reset Filter
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jurusan Baru</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4 w-16 text-center">No</th>
                  <th className="px-6 py-4">Nama Jurusan</th>
                  <th className="px-6 py-4">Kode</th>
                  <th className="px-6 py-4">Target Jenjang</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {data.map((item, index) => {
                  const rowNumber = (currentPage - 1) * 15 + index + 1;
                  const isActive = Boolean(item.is_active);
                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="px-6 py-4 text-center font-medium text-slate-400 text-xs">
                        {rowNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                            <Compass className="w-4 h-4" />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          {item.jenjang || 'SMA'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={item.description || ''}>
                        {item.description || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-xs ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit jurusan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus jurusan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
          <Pagination
            currentPage={paginationMeta.currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={paginationMeta.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">
                  {editingItem ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Jurusan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika dan Ilmu Pengetahuan Alam (MIPA)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kode Jurusan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MIPA"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenjang
                  </label>
                  <select
                    value={form.jenjang}
                    onChange={(e) => setForm({ ...form, jenjang: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                    <option value="MA">MA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Keterangan / Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi keahlian jurusan..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status Aktif
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: true })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                      form.is_active
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 ${form.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>Aktif</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: false })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                      !form.is_active
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className={`w-4 h-4 ${!form.is_active ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span>Nonaktif</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambah Jurusan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Jurusan?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus jurusan{' '}
              <span className="font-semibold text-slate-900">"{itemToDelete.name}"</span> ({itemToDelete.code})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all disabled:opacity-60"
              >
                {deleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterJurusanPage;
