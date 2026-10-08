import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Layers, 
  Search, 
  BookOpen, 
  GraduationCap, 
  Eye
} from 'lucide-react';

export interface MasterJenjang {
  id: number;
  kode_jenjang: string;
  nama_jenjang: string;
  urutan: number;
  keterangan: string | null;
  status_aktif: 'Y' | 'N';
  kelas_count?: number;
  mata_pelajaran_count?: number;
  kelas?: Array<{
    id: number;
    nama_kelas: string;
    tingkat: number;
    jurusan: string;
    wali_kelas?: { nama: string } | null;
  }>;
  mata_pelajaran?: Array<{
    id: number;
    kode_mapel: string;
    nama_mapel: string;
    kelompok: string;
    kkm: number;
  }>;
}

export const JenjangPage: React.FC = () => {
  const { toast } = useToast();
  const [jenjangList, setJenjangList] = useState<MasterJenjang[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingJenjang, setEditingJenjang] = useState<MasterJenjang | null>(null);
  const [selectedJenjang, setSelectedJenjang] = useState<MasterJenjang | null>(null);

  // Form states
  const [kodeJenjang, setKodeJenjang] = useState('');
  const [namaJenjang, setNamaJenjang] = useState('');
  const [urutan, setUrutan] = useState(1);
  const [keterangan, setKeterangan] = useState('');
  const [statusAktif, setStatusAktif] = useState<'Y' | 'N'>('Y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJenjang = async () => {
    setLoadingData(true);
    try {
      const response = await apiClient.get('/admin/jenjang');
      setJenjangList(response.data);
    } catch (err: any) {
      console.error('Failed to fetch jenjang:', err);
      toast.error('Gagal memuat data master jenjang.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchJenjang();
  }, []);

  const openAddModal = () => {
    setEditingJenjang(null);
    setKodeJenjang('');
    setNamaJenjang('');
    setUrutan(jenjangList.length + 1);
    setKeterangan('');
    setStatusAktif('Y');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: MasterJenjang) => {
    setEditingJenjang(item);
    setKodeJenjang(item.kode_jenjang);
    setNamaJenjang(item.nama_jenjang);
    setUrutan(item.urutan);
    setKeterangan(item.keterangan || '');
    setStatusAktif(item.status_aktif);
    setError(null);
    setModalOpen(true);
  };

  const openDetailModal = async (item: MasterJenjang) => {
    try {
      const res = await apiClient.get(`/admin/jenjang/${item.id}`);
      setSelectedJenjang(res.data);
      setDetailModalOpen(true);
    } catch (err) {
      toast.error('Gagal memuat rincian jenjang.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      kode_jenjang: kodeJenjang.trim(),
      nama_jenjang: namaJenjang.trim(),
      urutan,
      keterangan: keterangan.trim() || null,
      status_aktif: statusAktif,
    };

    try {
      if (editingJenjang) {
        await apiClient.put(`/admin/jenjang/${editingJenjang.id}`, payload);
        toast.success(`Jenjang ${kodeJenjang} berhasil diperbarui.`);
      } else {
        await apiClient.post('/admin/jenjang', payload);
        toast.success(`Jenjang ${kodeJenjang} berhasil ditambahkan.`);
      }
      setModalOpen(false);
      fetchJenjang();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: MasterJenjang) => {
    if (!window.confirm(`Hapus Jenjang ${item.nama_jenjang} (${item.kode_jenjang})?`)) return;

    try {
      await apiClient.delete(`/admin/jenjang/${item.id}`);
      toast.success(`Jenjang ${item.nama_jenjang} berhasil dihapus.`);
      fetchJenjang();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus jenjang.');
    }
  };

  const filtered = jenjangList.filter(j => 
    j.nama_jenjang.toLowerCase().includes(search.toLowerCase()) ||
    j.kode_jenjang.toLowerCase().includes(search.toLowerCase()) ||
    (j.keterangan && j.keterangan.toLowerCase().includes(search.toLowerCase()))
  );

  const getJenjangBadgeColor = (kode: string) => {
    switch (kode.toUpperCase()) {
      case 'SD':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'SMP':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'SMA':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'SMK':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="p-3.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-md">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Master Jenjang Pendidikan
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">
              Kelola tingkatan pendidikan, kelas turunan, dan alokasi mata pelajaran kurikulum
            </p>
          </div>
        </div>

        <button
          id="btn-add-jenjang"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition duration-150 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Jenjang</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {jenjangList.map((j) => (
          <div 
            key={j.id} 
            onClick={() => openDetailModal(j)}
            className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/40 cursor-pointer transition group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${getJenjangBadgeColor(j.kode_jenjang)}`}>
                {j.kode_jenjang}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Urutan #{j.urutan}</span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 transition">
              {j.nama_jenjang}
            </h2>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-gray-400">
              <span className="flex items-center gap-1 font-semibold">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                {j.kelas_count || 0} Kelas
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <BookOpen className="h-3.5 w-3.5 text-cyan-500" />
                {j.mata_pelajaran_count || 0} Mapel
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="search-jenjang"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama jenjang..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
          Total: {filtered.length} Jenjang Terdaftar
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-sm">
        {loadingData ? (
          <div className="p-6">
            <TableSkeleton rows={4} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-full inline-block text-slate-400">
              <Layers className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
              Belum ada data jenjang yang sesuai.
            </p>
            <p className="text-xs text-slate-400">
              Klik tombol "Tambah Jenjang" untuk menambahkan jenjang baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-5">Urutan</th>
                  <th className="py-4 px-5">Kode</th>
                  <th className="py-4 px-5">Nama Jenjang</th>
                  <th className="py-4 px-5">Keterangan</th>
                  <th className="py-4 px-5">Kelas Terkait</th>
                  <th className="py-4 px-5">Mata Pelajaran</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((item) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition duration-150"
                  >
                    <td className="py-4 px-5 font-bold text-slate-400">
                      #{item.urutan}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-lg font-black text-xs border ${getJenjangBadgeColor(item.kode_jenjang)}`}>
                        {item.kode_jenjang}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.nama_jenjang}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-500 dark:text-gray-400 max-w-xs truncate">
                      {item.keterangan || '-'}
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/60 dark:border-indigo-500/20">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {item.kelas_count || 0} Kelas
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-bold text-xs border border-cyan-200/60 dark:border-cyan-500/20">
                        <BookOpen className="h-3.5 w-3.5" />
                        {item.mata_pelajaran_count || 0} Mapel
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status_aktif === 'Y' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                      }`}>
                        {item.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailModal(item)}
                          title="Lihat Detail Kelas & Mapel"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          title="Edit Jenjang"
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          title="Hapus Jenjang"
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingJenjang ? 'Ubah Master Jenjang' : 'Tambah Master Jenjang Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  {editingJenjang ? `Memperbarui jenjang ${editingJenjang.kode_jenjang}` : 'Isi formulir jenjang pendidikan di bawah ini'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Kode Jenjang
                  </label>
                  <input
                    type="text"
                    required
                    value={kodeJenjang}
                    onChange={(e) => setKodeJenjang(e.target.value.toUpperCase())}
                    placeholder="SD/SMA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Nama Jenjang
                  </label>
                  <input
                    type="text"
                    required
                    value={namaJenjang}
                    onChange={(e) => setNamaJenjang(e.target.value)}
                    placeholder="Contoh: Sekolah Menengah Atas (SMA)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Nomor Urut
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={urutan}
                    onChange={(e) => setUrutan(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Status Aktif
                  </label>
                  <select
                    value={statusAktif}
                    onChange={(e) => setStatusAktif(e.target.value as 'Y' | 'N')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="Y">Aktif (Digunakan)</option>
                    <option value="N">Nonaktif (Diarsipkan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Keterangan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Deskripsi singkat kurikulum jenjang ini..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingJenjang ? 'Simpan Perubahan' : 'Buat Jenjang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal: Inspect Kelas & Mapel inside Jenjang */}
      {detailModalOpen && selectedJenjang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up max-h-[85vh] flex flex-col">
            <button
              onClick={() => setDetailModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 shrink-0">
              <span className={`px-3 py-1 rounded-xl text-sm font-black border ${getJenjangBadgeColor(selectedJenjang.kode_jenjang)}`}>
                {selectedJenjang.kode_jenjang}
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedJenjang.nama_jenjang}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Struktur Kelas dan Mata Pelajaran dalam jenjang ini
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Kelas Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-500" />
                    Daftar Kelas ({selectedJenjang.kelas?.length || 0})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedJenjang.kelas && selectedJenjang.kelas.length > 0 ? (
                    selectedJenjang.kelas.map((k) => (
                      <div key={k.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{k.nama_kelas}</p>
                          <p className="text-[10px] text-slate-400">Tingkat {k.tingkat} • {k.jurusan}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg">
                          Wali: {k.wali_kelas?.nama || '-'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic col-span-2">Belum ada kelas terdaftar di jenjang ini.</p>
                  )}
                </div>
              </div>

              {/* Mata Pelajaran Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-cyan-500" />
                    Mata Pelajaran Kurikulum ({selectedJenjang.mata_pelajaran?.length || 0})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedJenjang.mata_pelajaran && selectedJenjang.mata_pelajaran.length > 0 ? (
                    selectedJenjang.mata_pelajaran.map((m) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">[{m.kode_mapel}] {m.nama_mapel}</p>
                          <p className="text-[10px] text-slate-400">Kelompok: {m.kelompok}</p>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded-lg">
                          KKM: {m.kkm}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic col-span-2">Belum ada mata pelajaran terdaftar di jenjang ini.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/5 flex justify-end shrink-0">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JenjangPage;
