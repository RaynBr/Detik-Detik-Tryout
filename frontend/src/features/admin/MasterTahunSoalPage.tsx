import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { Calendar, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface TahunSoal {
  id: number;
  tahun: string;
  keterangan: string | null;
  is_active: boolean;
}

export const MasterTahunSoalPage: React.FC = () => {
  const [data, setData] = useState<TahunSoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ tahun: '', keterangan: '' });

  const {
    currentPage,
    setPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/tahun-soal', { params: { page } });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch { toast.error('Gagal memuat data tahun soal.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(currentPage); }, [currentPage]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ tahun: '', keterangan: '' });
    setShowModal(true);
  };

  const openEdit = (item: TahunSoal) => {
    setEditingId(item.id);
    setForm({ tahun: item.tahun, keterangan: item.keterangan || '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await apiClient.put(`/admin/tahun-soal/${editingId}`, form);
        toast.success('Tahun soal berhasil diperbarui!');
      } else {
        await apiClient.post('/admin/tahun-soal', form);
        toast.success('Tahun soal berhasil ditambahkan!');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus tahun soal ini?')) return;
    try {
      await apiClient.delete(`/admin/tahun-soal/${id}`);
      toast.success('Tahun soal berhasil dihapus.');
      fetchData();
    } catch { toast.error('Gagal menghapus data.'); }
  };

  const handleToggleActive = async (item: TahunSoal) => {
    try {
      await apiClient.put(`/admin/tahun-soal/${item.id}`, {
        tahun: item.tahun,
        keterangan: item.keterangan,
        is_active: !item.is_active,
      });
      toast.success(`Tahun soal ${!item.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
      fetchData();
    } catch { toast.error('Gagal mengubah status.'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Master Tahun Soal</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Kelola referensi tahun soal untuk bank soal (contoh: 2024, 2025, 2026/2027)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition">
          <Plus className="h-4 w-4" />
          <span>Tambah Tahun</span>
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/5 text-slate-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-bold bg-slate-50/50 dark:bg-white/[0.02]">
              <th className="py-3.5 px-5">Tahun Soal</th>
              <th className="py-3.5 px-5">Keterangan</th>
              <th className="py-3.5 px-5 text-center">Status</th>
              <th className="py-3.5 px-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-20" /></td>
                  <td className="py-4 px-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-32" /></td>
                  <td className="py-4 px-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-16 mx-auto" /></td>
                  <td className="py-4 px-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <Calendar className="h-12 w-12 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-gray-400">Belum ada data tahun soal</p>
                </td>
              </tr>
            ) : (
              data.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition text-slate-700 dark:text-gray-300">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-black text-slate-900 dark:text-white text-base">{item.tahun}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-sm text-slate-600 dark:text-gray-400">{item.keterangan || '-'}</td>
                  <td className="py-4 px-5 text-center">
                    <button onClick={() => handleToggleActive(item)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border transition ${
                      item.is_active
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 hover:bg-emerald-200'
                        : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 hover:bg-red-200'
                    }`}>
                      {item.is_active ? '✓ Aktif' : '✗ Nonaktif'}
                    </button>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg transition" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg transition" title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 w-full max-w-md space-y-5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingId ? 'Edit Tahun Soal' : 'Tambah Tahun Soal Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Tahun *</label>
                <input type="text" value={form.tahun} onChange={e => setForm({...form, tahun: e.target.value})} placeholder="Contoh: 2024, 2025, 2026/2027" className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Keterangan</label>
                <input type="text" value={form.keterangan} onChange={e => setForm({...form, keterangan: e.target.value})} placeholder="Opsional, contoh: Tahun Ajaran Genap" className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">Batal</button>
              <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition">
                <Check className="h-4 w-4" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MasterTahunSoalPage;
