import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  GraduationCap, 
  Search, 
  Users, 
  UserPlus, 
  UserMinus,
  Filter
} from 'lucide-react';

interface MasterJenjang {
  id: number;
  kode_jenjang: string;
  nama_jenjang: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface StudentInClass {
  id: number;
  iduser: string;
  nisn: string | null;
  status: string;
  siswa?: {
    iduser: string;
    nama: string;
    login_email: string;
    telp: string;
  };
}

interface ClassRoom {
  id: number;
  nama_kelas: string;
  name?: string;
  tingkat: number;
  level?: number;
  jurusan: string;
  idjenjang: number;
  jenjang?: MasterJenjang | null;
  wali_kelas_id: string | null;
  wali_kelas?: { nama: string; login_email: string } | null;
  kapasitas: number;
  siswa_count?: number;
  siswa?: StudentInClass[];
}

export const ClassesPage: React.FC = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [jenjangList, setJenjangList] = useState<MasterJenjang[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedJenjangFilter, setSelectedJenjangFilter] = useState<string>('all');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [activeClassForStudents, setActiveClassForStudents] = useState<ClassRoom | null>(null);

  // Form states
  const [namaKelas, setNamaKelas] = useState('');
  const [idjenjang, setIdjenjang] = useState<number>(1);
  const [tingkat, setTingkat] = useState(10);
  const [jurusan, setJurusan] = useState('Umum');
  const [waliKelasId, setWaliKelasId] = useState<string>('');
  const [kapasitas, setKapasitas] = useState(36);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [classesRes, jenjangRes, teachersRes] = await Promise.all([
        apiClient.get('/admin/classes'),
        apiClient.get('/admin/jenjang'),
        apiClient.get('/admin/teachers'),
      ]);
      setClasses(classesRes.data);
      setJenjangList(jenjangRes.data);
      setTeachers(teachersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data kelas.');
      toast.error('Gagal memuat data kelas.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingClass(null);
    setNamaKelas('');
    setIdjenjang(jenjangList[0]?.id || 1);
    setTingkat(10);
    setJurusan('Umum');
    setWaliKelasId('');
    setKapasitas(36);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (c: ClassRoom) => {
    setEditingClass(c);
    setNamaKelas(c.nama_kelas || c.name || '');
    setIdjenjang(c.idjenjang || c.jenjang?.id || 1);
    setTingkat(c.tingkat || c.level || 10);
    setJurusan(c.jurusan || 'Umum');
    setWaliKelasId(c.wali_kelas_id || '');
    setKapasitas(c.kapasitas || 36);
    setError(null);
    setModalOpen(true);
  };

  const openStudentsModal = async (c: ClassRoom) => {
    try {
      const [classDetailsRes, studentsRes] = await Promise.all([
        apiClient.get(`/admin/classes/${c.id}`),
        apiClient.get('/admin/students?per_page=100'),
      ]);
      setActiveClassForStudents(classDetailsRes.data);
      setAllStudents(studentsRes.data.data || []);
      setStudentsModalOpen(true);
    } catch (err) {
      toast.error('Gagal memuat data siswa kelas.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      nama_kelas: namaKelas.trim(),
      idjenjang,
      tingkat,
      jurusan: jurusan.trim(),
      wali_kelas_id: waliKelasId ? waliKelasId : null,
      kapasitas,
    };

    try {
      if (editingClass) {
        await apiClient.put(`/admin/classes/${editingClass.id}`, payload);
        toast.success(`Kelas ${namaKelas} berhasil diperbarui.`);
      } else {
        await apiClient.post('/admin/classes', payload);
        toast.success(`Kelas ${namaKelas} berhasil ditambahkan.`);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan data kelas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (c: ClassRoom) => {
    if (!window.confirm(`Hapus kelas ${c.nama_kelas || c.name}?`)) return;

    try {
      await apiClient.delete(`/admin/classes/${c.id}`);
      toast.success('Kelas berhasil dihapus.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kelas.');
    }
  };

  const handleAddStudentToClass = async () => {
    if (!activeClassForStudents || !selectedStudentToAdd) return;
    try {
      await apiClient.post(`/admin/classes/${activeClassForStudents.id}/students`, {
        iduser: selectedStudentToAdd,
      });
      toast.success('Siswa berhasil ditambahkan ke kelas.');
      setSelectedStudentToAdd('');
      // Refresh modal
      const res = await apiClient.get(`/admin/classes/${activeClassForStudents.id}`);
      setActiveClassForStudents(res.data);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan siswa.');
    }
  };

  const handleRemoveStudentFromClass = async (iduser: string) => {
    if (!activeClassForStudents) return;
    if (!window.confirm('Keluarkan siswa ini dari kelas?')) return;
    try {
      await apiClient.delete(`/admin/classes/${activeClassForStudents.id}/students/${iduser}`);
      toast.success('Siswa dikeluarkan dari kelas.');
      const res = await apiClient.get(`/admin/classes/${activeClassForStudents.id}`);
      setActiveClassForStudents(res.data);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengeluarkan siswa.');
    }
  };

  const filtered = classes.filter((c) => {
    const matchesSearch = 
      (c.nama_kelas || c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.jurusan || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.jenjang?.nama_jenjang || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesJenjang = selectedJenjangFilter === 'all' || String(c.idjenjang) === selectedJenjangFilter;

    return matchesSearch && matchesJenjang;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="p-3.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-md">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Master Kelas & Rombel
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">
              Manajemen rombongan belajar, alokasi wali kelas, dan pembagian siswa per jenjang
            </p>
          </div>
        </div>

        <button
          id="btn-add-class"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition duration-150 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kelas</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="search-classes"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama kelas atau jurusan..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedJenjangFilter}
              onChange={(e) => setSelectedJenjangFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">Semua Jenjang</option>
              {jenjangList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.kode_jenjang} - {j.nama_jenjang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
          Total: {filtered.length} Kelas
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-sm">
        {loadingData ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-full inline-block text-slate-400">
              <GraduationCap className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
              Belum ada kelas yang sesuai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-5">Nama Kelas</th>
                  <th className="py-4 px-5">Jenjang</th>
                  <th className="py-4 px-5">Tingkat</th>
                  <th className="py-4 px-5">Jurusan / Konsentrasi</th>
                  <th className="py-4 px-5">Wali Kelas</th>
                  <th className="py-4 px-5">Siswa Terdaftar</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((c) => (
                  <tr 
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition duration-150"
                  >
                    <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                      {c.nama_kelas || c.name}
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                        {c.jenjang?.kode_jenjang || 'SD/SMP/SMA'}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-600 dark:text-gray-300">
                      Tingkat {c.tingkat || c.level}
                    </td>
                    <td className="py-4 px-5 text-slate-600 dark:text-gray-400 font-medium">
                      {c.jurusan || 'Umum'}
                    </td>
                    <td className="py-4 px-5 font-medium text-slate-700 dark:text-gray-300">
                      {c.wali_kelas?.nama ? (
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {c.wali_kelas.nama}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => openStudentsModal(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-gray-300 hover:text-indigo-600 font-bold text-xs transition border border-slate-200/60 dark:border-white/5"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{c.siswa_count || 0} / {c.kapasitas || 36} Siswa</span>
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openStudentsModal(c)}
                          title="Kelola Siswa Kelas"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Kelas"
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Hapus Kelas"
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

      {/* Add / Edit Class Modal */}
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
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingClass ? 'Ubah Data Kelas' : 'Tambah Kelas Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Tentukan jenjang pendidikan, tingkat kelas, dan wali kelas
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  value={namaKelas}
                  onChange={(e) => setNamaKelas(e.target.value)}
                  placeholder="Contoh: Kelas 10 MIPA 1, Kelas 7-A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Jenjang Pendidikan
                  </label>
                  <select
                    value={idjenjang}
                    onChange={(e) => setIdjenjang(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {jenjangList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.kode_jenjang} - {j.nama_jenjang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Tingkat (1 - 12)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={tingkat}
                    onChange={(e) => setTingkat(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Jurusan / Peminatan
                  </label>
                  <input
                    type="text"
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value)}
                    placeholder="MIPA, IPS, TKJ, atau Umum"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Kapasitas Siswa
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    value={kapasitas}
                    onChange={(e) => setKapasitas(parseInt(e.target.value) || 36)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Wali Kelas (Dari User BO)
                </label>
                <select
                  value={waliKelasId}
                  onChange={(e) => setWaliKelasId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">-- Pilih Guru Wali Kelas (Opsional) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
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
                  <span>{editingClass ? 'Simpan Perubahan' : 'Buat Kelas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Students in Class Modal */}
      {studentsModalOpen && activeClassForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up max-h-[85vh] flex flex-col">
            <button
              onClick={() => setStudentsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 shrink-0">
              <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Kelola Siswa: {activeClassForStudents.nama_kelas || activeClassForStudents.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Daftar siswa terdaftar dalam rombel ini
                </p>
              </div>
            </div>

            {/* Add Student Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-center gap-3 mb-4 shrink-0">
              <select
                value={selectedStudentToAdd}
                onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
              >
                <option value="">-- Pilih Siswa untuk Ditambahkan --</option>
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email || s.username})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddStudentToClass}
                disabled={!selectedStudentToAdd}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Masukkan ke Kelas</span>
              </button>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeClassForStudents.siswa && activeClassForStudents.siswa.length > 0 ? (
                activeClassForStudents.siswa.map((sk, index) => (
                  <div
                    key={sk.id || index}
                    className="p-3 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {sk.siswa?.nama || sk.iduser}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        NISN: {sk.nisn || '-'} • {sk.siswa?.login_email || '-'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveStudentFromClass(sk.iduser)}
                      title="Keluarkan dari kelas"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  Belum ada siswa terdaftar di kelas ini.
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/5 flex justify-end shrink-0">
              <button
                onClick={() => setStudentsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;
