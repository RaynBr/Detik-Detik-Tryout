import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import { 
  BarChart2, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  RefreshCw, 
  X, 
  Layers,
  CheckCircle
} from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { usePaginationUrl } from '../../../shared/utils/usePaginationUrl';

interface MasterJenjangOption {
  id: number;
  nama_jenjang: string;
  kode_jenjang: string;
}

interface MasterJurusanOption {
  id: number;
  name: string;
  code: string;
  jenjang: string | null;
}

interface MasterTingkatKelasItem {
  id: number;
  tingkat: number;
  nama_tingkat: string;
  idjenjang: number | null;
  idjurusan: number | null;
  keterangan: string | null;
  status_aktif: 'Y' | 'N';
  jenjang?: MasterJenjangOption;
  jurusan?: MasterJurusanOption;
}

export const MasterTingkatKelasPage: React.FC = () => {
  const location = useLocation();
  const isTenantAdmin = location.pathname.startsWith('/admin');
  const apiBase = isTenantAdmin ? '/admin' : '/super-admin';
  const dashboardLink = isTenantAdmin ? '/admin/dashboard' : '/super-admin/dashboard';
  const masterLink = isTenantAdmin ? '/admin/master-akademik/tingkat-kelas' : '/super-admin/master-akademik/tingkat-kelas';

  const [data, setData] = useState<MasterTingkatKelasItem[]>([]);
  const [jenjangList, setJenjangList] = useState<MasterJenjangOption[]>([]);
  const [jurusanList, setJurusanList] = useState<MasterJurusanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterTingkatKelasItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tingkat: 10,
    nama_tingkat: '',
    idjenjang: '' as string | number,
    idjurusan: '' as string | number,
    keterangan: '',
    status_aktif: 'Y' as 'Y' | 'N',
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterTingkatKelasItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchAuxiliaryOptions = async () => {
    try {
      const [resJenjang, resJurusan] = await Promise.all([
        apiClient.get(`${apiBase}/jenjang`, { params: { all: true } }),
        apiClient.get(`${apiBase}/majors`, { params: { all: true } })
      ]);
      setJenjangList(resJenjang.data?.data || (Array.isArray(resJenjang.data) ? resJenjang.data : []));
      setJurusanList(resJurusan.data?.data || (Array.isArray(resJurusan.data) ? resJurusan.data : []));
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (jenjangFilter) params.idjenjang = jenjangFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get(`${apiBase}/tingkat-kelas`, { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch (err: any) {
      console.error('Failed to load tingkat kelas:', err);
      toast.error('Gagal memuat data master tingkat kelas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxiliaryOptions();
  }, []);

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
      tingkat: 10,
      nama_tingkat: '',
      idjenjang: jenjangList.length > 0 ? jenjangList[0].id : '',
      idjurusan: '',
      keterangan: '',
      status_aktif: 'Y',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: MasterTingkatKelasItem) => {
    setEditingItem(item);
    setForm({
      tingkat: Number(item.tingkat),
      nama_tingkat: item.nama_tingkat,
      idjenjang: item.idjenjang || '',
      idjurusan: item.idjurusan || '',
      keterangan: item.keterangan || '',
      status_aktif: item.status_aktif || 'Y',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_tingkat.trim()) {
      toast.error('Nama tingkat wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tingkat: Number(form.tingkat),
        nama_tingkat: form.nama_tingkat.trim(),
        idjenjang: form.idjenjang ? Number(form.idjenjang) : null,
        idjurusan: form.idjurusan ? Number(form.idjurusan) : null,
        keterangan: form.keterangan.trim() || null,
        status_aktif: form.status_aktif,
      };

      if (editingItem) {
        await apiClient.put(`${apiBase}/tingkat-kelas/${editingItem.id}`, payload);
        toast.success(`Tingkat kelas "${payload.nama_tingkat}" berhasil diperbarui.`);
      } else {
        await apiClient.post(`${apiBase}/tingkat-kelas`, payload);
        toast.success(`Tingkat kelas "${payload.nama_tingkat}" berhasil ditambahkan.`);
      }

      setShowModal(false);
      fetchData(currentPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan tingkat kelas.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: MasterTingkatKelasItem) => {
    const nextStatus = item.status_aktif === 'Y' ? 'N' : 'Y';
    try {
      await apiClient.put(`${apiBase}/tingkat-kelas/${item.id}`, {
        tingkat: item.tingkat,
        nama_tingkat: item.nama_tingkat,
        idjenjang: item.idjenjang,
        keterangan: item.keterangan,
        status_aktif: nextStatus,
      });
      toast.success(`Status tingkat "${item.nama_tingkat}" diubah menjadi ${nextStatus === 'Y' ? 'Aktif' : 'Nonaktif'}.`);
      fetchData(currentPage);
    } catch (err: any) {
      toast.error('Gagal memperbarui status tingkat kelas.');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`${apiBase}/tingkat-kelas/${itemToDelete.id}`);
      toast.success(`Tingkat kelas "${itemToDelete.nama_tingkat}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData(currentPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghapus tingkat kelas. Mungkin digunakan oleh rombel kelas.';
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
            <span className="text-slate-800 font-medium">Tingkat Kelas</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-600 shadow-sm">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Tingkat Kelas</h1>
              <p className="text-sm text-slate-500">
                Kelola jenjang grade level (misal Kelas 1-6 SD, Kelas 7-9 SMP, Kelas 10-12 SMA).
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
            <span>Tambah Tingkat</span>
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
              placeholder="Cari nomor tingkat atau nama tingkat..."
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
              {jenjangList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama_jenjang}
                </option>
              ))}
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
              <option value="Y">Aktif Saja</option>
              <option value="N">Nonaktif Saja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat data tingkat kelas...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <BarChart2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Belum Ada Tingkat Kelas</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {search || jenjangFilter || statusFilter
                ? 'Tidak ada tingkat kelas yang cocok dengan filter yang dipilih.'
                : 'Mulai dengan menambahkan tingkat kelas untuk memetakan rombel dan kurikulum.'}
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
                <span>Tambah Tingkat Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4 w-16 text-center">No</th>
                  <th className="px-6 py-4">Nomor Tingkat</th>
                  <th className="px-6 py-4">Nama Tingkat</th>
                  <th className="px-6 py-4">Jenjang</th>
                  <th className="px-6 py-4">Jurusan</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {data.map((item, index) => {
                  const rowNumber = (currentPage - 1) * 15 + index + 1;
                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="px-6 py-4 text-center font-medium text-slate-400 text-xs">
                        {rowNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-700 font-bold text-sm border border-teal-200">
                          {item.tingkat}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.nama_tingkat}
                      </td>
                      <td className="px-6 py-4">
                        {item.jenjang?.nama_jenjang ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Layers className="w-3 h-3" />
                            {item.jenjang.nama_jenjang}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Semua</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.jurusan?.name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {item.jurusan.name} ({item.jurusan.code})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={item.keterangan || ''}>
                        {item.keterangan || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all shadow-xs ${
                            item.status_aktif === 'Y'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status_aktif === 'Y' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {item.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit tingkat"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus tingkat"
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
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">
                  {editingItem ? 'Edit Tingkat Kelas' : 'Tambah Tingkat Kelas Baru'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Tingkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    placeholder="10"
                    value={form.tingkat}
                    onChange={(e) => setForm({ ...form, tingkat: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenjang Terkait
                  </label>
                  <select
                    value={form.idjenjang}
                    onChange={(e) => setForm({ ...form, idjenjang: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="">-- Semua / Umum --</option>
                    {jenjangList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama_jenjang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Jurusan (Nullable / Khusus SMA/SMK)
                </label>
                <select
                  value={form.idjurusan}
                  onChange={(e) => setForm({ ...form, idjurusan: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                >
                  <option value="">-- Tidak Ada / Umum (SD/SMP) --</option>
                  {jurusanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name} ({j.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Tingkat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas 10 (Fase E)"
                  value={form.nama_tingkat}
                  onChange={(e) => setForm({ ...form, nama_tingkat: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan tingkat kelas..."
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
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
                    onClick={() => setForm({ ...form, status_aktif: 'Y' })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                      form.status_aktif === 'Y'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 ${form.status_aktif === 'Y' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>Aktif</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status_aktif: 'N' })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                      form.status_aktif === 'N'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <X className={`w-4 h-4 ${form.status_aktif === 'N' ? 'text-rose-600' : 'text-slate-400'}`} />
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
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambah Tingkat'}</span>
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Tingkat Kelas?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus tingkat kelas{' '}
              <span className="font-semibold text-slate-900">"{itemToDelete.nama_tingkat}"</span>? Tindakan ini tidak dapat dibatalkan.
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

export default MasterTingkatKelasPage;
