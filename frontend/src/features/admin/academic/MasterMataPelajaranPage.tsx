import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  RefreshCw, 
  X, 
  Layers,
  Award
} from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { usePaginationUrl } from '../../../shared/utils/usePaginationUrl';

interface MasterJenjangOption {
  id: number;
  nama_jenjang: string;
  kode_jenjang: string;
}

interface MasterMataPelajaranItem {
  id: number;
  nama_mapel: string;
  kode_mapel: string;
  idjenjang: number | null;
  kelompok: string | null;
  kkm: number | null;
  deskripsi: string | null;
  status_aktif: 'Y' | 'N';
  jenjang?: MasterJenjangOption;
}

export const MasterMataPelajaranPage: React.FC = () => {
  const location = useLocation();
  const isTenantAdmin = location.pathname.startsWith('/admin');
  const apiBase = isTenantAdmin ? '/admin' : '/super-admin';
  const dashboardLink = isTenantAdmin ? '/admin/dashboard' : '/super-admin/dashboard';
  const masterLink = isTenantAdmin ? '/admin/master-akademik/mata-pelajaran' : '/super-admin/master-akademik/mata-pelajaran';

  const [data, setData] = useState<MasterMataPelajaranItem[]>([]);
  const [jenjangList, setJenjangList] = useState<MasterJenjangOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');
  const [kelompokFilter, setKelompokFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterMataPelajaranItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nama_mapel: '',
    kode_mapel: '',
    idjenjang: '' as string | number,
    kelompok: 'Umum',
    kkm: 75,
    deskripsi: '',
    status_aktif: 'Y' as 'Y' | 'N',
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterMataPelajaranItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchJenjangList = async () => {
    try {
      const res = await apiClient.get(`${apiBase}/jenjang`, { params: { all: true } });
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setJenjangList(list);
    } catch (err) {
      console.error('Failed to load jenjang options:', err);
    }
  };

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (jenjangFilter) params.idjenjang = jenjangFilter;
      if (kelompokFilter) params.kelompok = kelompokFilter;

      const res = await apiClient.get(`${apiBase}/subjects`, { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch (err: any) {
      console.error('Failed to load mata pelajaran:', err);
      toast.error('Gagal memuat data master mata pelajaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJenjangList();
  }, []);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, jenjangFilter, kelompokFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetPage();
    fetchData(1);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      nama_mapel: '',
      kode_mapel: '',
      idjenjang: jenjangList.length > 0 ? jenjangList[0].id : '',
      kelompok: 'Umum',
      kkm: 75,
      deskripsi: '',
      status_aktif: 'Y',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: MasterMataPelajaranItem) => {
    setEditingItem(item);
    setForm({
      nama_mapel: item.nama_mapel,
      kode_mapel: item.kode_mapel,
      idjenjang: item.idjenjang || '',
      kelompok: item.kelompok || 'Umum',
      kkm: item.kkm ?? 75,
      deskripsi: item.deskripsi || '',
      status_aktif: item.status_aktif || 'Y',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_mapel.trim()) {
      toast.error('Nama mata pelajaran wajib diisi.');
      return;
    }
    if (!form.kode_mapel.trim()) {
      toast.error('Kode mata pelajaran wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nama_mapel: form.nama_mapel.trim(),
        kode_mapel: form.kode_mapel.trim().toUpperCase(),
        idjenjang: form.idjenjang ? Number(form.idjenjang) : null,
        kelompok: form.kelompok,
        kkm: Number(form.kkm),
        deskripsi: form.deskripsi.trim() || null,
        status_aktif: form.status_aktif,
      };

      if (editingItem) {
        await apiClient.put(`${apiBase}/subjects/${editingItem.id}`, payload);
        toast.success(`Mata pelajaran "${payload.nama_mapel}" berhasil diperbarui.`);
      } else {
        await apiClient.post(`${apiBase}/subjects`, payload);
        toast.success(`Mata pelajaran "${payload.nama_mapel}" berhasil ditambahkan.`);
      }

      setShowModal(false);
      fetchData(currentPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan mata pelajaran.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`${apiBase}/subjects/${itemToDelete.id}`);
      toast.success(`Mata pelajaran "${itemToDelete.nama_mapel}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData(currentPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghapus mata pelajaran. Mungkin sedang digunakan di bank soal.';
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
            <span className="text-slate-800 font-medium">Mata Pelajaran & KKM</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 border border-sky-100 rounded-xl text-sky-600 shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Mata Pelajaran & KKM</h1>
              <p className="text-sm text-slate-500">
                Kelola daftar mata pelajaran kurikulum dan standar Kriteria Ketuntasan Minimal (KKM).
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
            <span>Tambah Mapel</span>
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
              placeholder="Cari nama mapel atau kode..."
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

            {/* Filter Kelompok */}
            <select
              value={kelompokFilter}
              onChange={(e) => {
                setKelompokFilter(e.target.value);
                resetPage();
              }}
              className="px-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            >
              <option value="">Semua Kelompok</option>
              <option value="Umum">Umum (Wajib)</option>
              <option value="Peminatan">Peminatan</option>
              <option value="Muatan Lokal">Muatan Lokal</option>
              <option value="Kejuruan">Kejuruan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat data mata pelajaran...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Belum Ada Mata Pelajaran</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {search || jenjangFilter || kelompokFilter
                ? 'Tidak ada data mata pelajaran yang cocok dengan filter yang dipilih.'
                : 'Mulai dengan menambahkan mata pelajaran pertama beserta standar KKM-nya.'}
            </p>
            {search || jenjangFilter || kelompokFilter ? (
              <button
                onClick={() => {
                  setSearch('');
                  setJenjangFilter('');
                  setKelompokFilter('');
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
                <span>Tambah Mata Pelajaran</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4 w-16 text-center">No</th>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4">Kode</th>
                  <th className="px-6 py-4">Jenjang</th>
                  <th className="px-6 py-4">Kelompok</th>
                  <th className="px-6 py-4 text-center">KKM Standar</th>
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
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p>{item.nama_mapel}</p>
                            {item.deskripsi && (
                              <p className="text-xs text-slate-400 font-normal line-clamp-1">{item.deskripsi}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.kode_mapel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.jenjang?.nama_jenjang ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Layers className="w-3 h-3" />
                            {item.jenjang.nama_jenjang}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Semua Jenjang</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {item.kelompok || 'Umum'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          {item.kkm ?? 75}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit mata pelajaran"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus mata pelajaran"
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
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">
                  {editingItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
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
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Wajib"
                  value={form.nama_mapel}
                  onChange={(e) => setForm({ ...form, nama_mapel: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MTK-W"
                    value={form.kode_mapel}
                    onChange={(e) => setForm({ ...form, kode_mapel: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenjang Pendidikan
                  </label>
                  <select
                    value={form.idjenjang}
                    onChange={(e) => setForm({ ...form, idjenjang: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="">-- Semua Jenjang --</option>
                    {jenjangList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama_jenjang} ({j.kode_jenjang})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kelompok Mapel
                  </label>
                  <select
                    value={form.kelompok}
                    onChange={(e) => setForm({ ...form, kelompok: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  >
                    <option value="Umum">Umum (Wajib)</option>
                    <option value="Peminatan">Peminatan</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                    <option value="Kejuruan">Kejuruan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    KKM Dinamis (0 - 100) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={form.kkm}
                    onChange={(e) => setForm({ ...form, kkm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-amber-700 bg-amber-50/50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Deskripsi / Cakupan Materi
                </label>
                <textarea
                  rows={2}
                  placeholder="Cakupan materi kurikulum..."
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
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
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambah Mata Pelajaran'}</span>
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Mata Pelajaran?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus mata pelajaran{' '}
              <span className="font-semibold text-slate-900">"{itemToDelete.nama_mapel}"</span> ({itemToDelete.kode_mapel})? Tindakan ini tidak dapat dibatalkan.
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

export default MasterMataPelajaranPage;
