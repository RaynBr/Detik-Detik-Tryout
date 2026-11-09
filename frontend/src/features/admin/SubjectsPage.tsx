import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  BookOpen, 
  Search, 
  Users, 
  UserPlus, 
  UserMinus,
  Eye,
  CheckCircle2,
  XCircle,
  Award
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface MasterJenjang {
  id: number;
  kode_jenjang: string;
  nama_jenjang: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface TeacherSubjectAssignment {
  id: number;
  iduser_bo: string;
  idmapel: number;
  idkelas?: number | null;
  tahun_ajaran: string;
  guru?: {
    iduser_bo: string;
    nama: string;
    login_email: string;
  };
  kelas?: {
    id: number;
    nama_kelas: string;
  };
}

interface Subject {
  id: number;
  kode_mapel: string;
  code?: string;
  nama_mapel: string;
  name?: string;
  idjenjang: number;
  tahun_ajaran?: string;
  jenjang?: MasterJenjang;
  kelompok: string;
  kkm: number;
  deskripsi: string | null;
  status_aktif?: 'Y' | 'N';
  created_at?: string;
  updated_at?: string;
  guru_pengampu?: TeacherSubjectAssignment[];
}

export const SubjectsPage: React.FC = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [jenjangList, setJenjangList] = useState<MasterJenjang[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: number; name: string; is_active: boolean }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Search and Filter
  const [search, setSearch] = useState('');
  const [selectedJenjangFilter, setSelectedJenjangFilter] = useState<string>('all');
  const [selectedKelompokFilter, setSelectedKelompokFilter] = useState<string>('all');
  const [selectedTahunAjaranFilter, setSelectedTahunAjaranFilter] = useState<string>('all');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [teachersModalOpen, setTeachersModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [activeSubjectForTeachers, setActiveSubjectForTeachers] = useState<Subject | null>(null);
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Form states
  const [namaMapel, setNamaMapel] = useState('');
  const [kodeMapel, setKodeMapel] = useState('');
  const [idjenjang, setIdjenjang] = useState<number>(1);
  const [tahunAjaran, setTahunAjaran] = useState<string>('2026/2027');
  const [kelompok, setKelompok] = useState('Wajib');
  const [kkm, setKkm] = useState(75.00);
  const [deskripsi, setDeskripsi] = useState('');
  const [selectedTeacherToAssign, setSelectedTeacherToAssign] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchData = async (page = currentPage) => {
    setLoadingData(true);
    try {
      const params: any = { page };
      if (search) params.search = search;
      if (selectedJenjangFilter !== 'all') params.idjenjang = selectedJenjangFilter;
      if (selectedKelompokFilter !== 'all') params.kelompok = selectedKelompokFilter;
      if (selectedTahunAjaranFilter !== 'all') params.tahun_ajaran = selectedTahunAjaranFilter;

      const [subjectsRes, jenjangRes, teachersRes, yearsRes] = await Promise.all([
        apiClient.get('/admin/subjects', { params }),
        apiClient.get('/admin/jenjang', { params: { all: true } }),
        apiClient.get('/admin/teachers', { params: { all: true } }),
        apiClient.get('/admin/academic-years', { params: { all: true } }).catch(() => ({ data: [] })),
      ]);
      setPaginationFromResponse(subjectsRes.data);
      const list = subjectsRes.data?.data || (Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
      setSubjects(list);
      setJenjangList(jenjangRes.data?.data || (Array.isArray(jenjangRes.data) ? jenjangRes.data : []));
      setTeachers(teachersRes.data?.data || (Array.isArray(teachersRes.data) ? teachersRes.data : []));
      const yList = yearsRes.data?.data || (Array.isArray(yearsRes.data) ? yearsRes.data : []);
      setAcademicYears(yList);
    } catch (err) {
      console.error('Failed to fetch subjects data:', err);
      toast.error('Gagal memuat data mata pelajaran.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, search, selectedJenjangFilter, selectedKelompokFilter, selectedTahunAjaranFilter]);

  const openAddModal = () => {
    setEditingSubject(null);
    setNamaMapel('');
    setKodeMapel('');
    setIdjenjang(jenjangList[0]?.id || 1);
    const activeYear = academicYears.find(y => y.is_active)?.name || academicYears[0]?.name || '2026/2027';
    setTahunAjaran(activeYear);
    setKelompok('Wajib');
    setKkm(75.00);
    setDeskripsi('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSubject(s);
    setNamaMapel(s.nama_mapel || s.name || '');
    setKodeMapel(s.kode_mapel || s.code || '');
    setIdjenjang(s.idjenjang || s.jenjang?.id || 1);
    setTahunAjaran(s.tahun_ajaran || '2026/2027');
    setKelompok(s.kelompok || 'Wajib');
    setKkm(s.kkm || 75.00);
    setDeskripsi(s.deskripsi || '');
    setError(null);
    setModalOpen(true);
  };

  const openTeachersModal = async (s: Subject) => {
    try {
      const res = await apiClient.get(`/admin/subjects/${s.id}`);
      setActiveSubjectForTeachers(res.data);
      setTeachersModalOpen(true);
    } catch (err) {
      toast.error('Gagal memuat data guru pengampu.');
    }
  };

  const openDetailModal = async (s: Subject) => {
    setDetailSubject(s);
    setDetailModalOpen(true);
    try {
      const res = await apiClient.get(`/admin/subjects/${s.id}`);
      setDetailSubject(res.data);
    } catch (err) {
      console.error('Failed to load fresh subject detail:', err);
    }
  };

  const handleToggleStatus = async (s: Subject) => {
    setTogglingStatus(true);
    try {
      const res = await apiClient.patch(`/admin/subjects/${s.id}/toggle-status`);
      toast.success(res.data?.message || 'Status mata pelajaran berhasil diperbarui.');
      const newStatus = s.status_aktif === 'N' ? 'Y' : 'N';
      if (detailSubject && detailSubject.id === s.id) {
        setDetailSubject(prev => prev ? { ...prev, status_aktif: newStatus } : null);
      }
      fetchData(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status mata pelajaran.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      nama_mapel: namaMapel.trim(),
      kode_mapel: kodeMapel.trim().toUpperCase(),
      idjenjang,
      tahun_ajaran: tahunAjaran,
      kelompok,
      kkm,
      deskripsi: deskripsi.trim() || null,
    };

    try {
      if (editingSubject) {
        await apiClient.put(`/admin/subjects/${editingSubject.id}`, payload);
        toast.success(`Mata pelajaran ${namaMapel} berhasil diperbarui.`);
      } else {
        await apiClient.post('/admin/subjects', payload);
        toast.success(`Mata pelajaran ${namaMapel} berhasil dibuat.`);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan mata pelajaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (s: Subject) => {
    if (!window.confirm(`Hapus mata pelajaran ${s.nama_mapel || s.name}?`)) return;

    try {
      await apiClient.delete(`/admin/subjects/${s.id}`);
      toast.success('Mata pelajaran berhasil dihapus.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus mata pelajaran.');
    }
  };

  const handleAssignTeacher = async () => {
    if (!activeSubjectForTeachers || !selectedTeacherToAssign) return;

    try {
      await apiClient.post(`/admin/subjects/${activeSubjectForTeachers.id}/teachers`, {
        iduser_bo: selectedTeacherToAssign,
      });
      toast.success('Guru pengampu berhasil ditugaskan.');
      setSelectedTeacherToAssign('');
      const res = await apiClient.get(`/admin/subjects/${activeSubjectForTeachers.id}`);
      setActiveSubjectForTeachers(res.data);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menugaskan guru.');
    }
  };

  const handleRemoveTeacher = async (iduser_bo: string) => {
    if (!activeSubjectForTeachers) return;
    if (!window.confirm('Hapus penugasan guru ini untuk mata pelajaran ini?')) return;

    try {
      await apiClient.delete(`/admin/subjects/${activeSubjectForTeachers.id}/teachers/${iduser_bo}`);
      toast.success('Penugasan guru berhasil dihapus.');
      const res = await apiClient.get(`/admin/subjects/${activeSubjectForTeachers.id}`);
      setActiveSubjectForTeachers(res.data);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus penugasan guru.');
    }
  };

  const filtered = subjects;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="p-3.5 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-500/20 shadow-md">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Master Mata Pelajaran
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">
              Standar kurikulum, nilai KKM, pengelompokan peminatan, dan penugasan guru pengampu
            </p>
          </div>
        </div>

        <button
          id="btn-add-subject"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-cyan-600/30 transition duration-150 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="search-subjects"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Cari kode atau nama mapel..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedJenjangFilter}
              onChange={(e) => {
                setSelectedJenjangFilter(e.target.value);
                resetPage();
              }}
              className="w-full sm:w-44 px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              <option value="all">Semua Jenjang</option>
              {jenjangList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.kode_jenjang} - {j.nama_jenjang}
                </option>
              ))}
            </select>

            <select
              value={selectedKelompokFilter}
              onChange={(e) => {
                setSelectedKelompokFilter(e.target.value);
                resetPage();
              }}
              className="w-full sm:w-36 px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              <option value="all">Semua Kelompok</option>
              <option value="Wajib">Wajib</option>
              <option value="Peminatan">Peminatan</option>
              <option value="Keahlian">Keahlian</option>
              <option value="Muatan Lokal">Muatan Lokal</option>
            </select>

            <select
              value={selectedTahunAjaranFilter}
              onChange={(e) => {
                setSelectedTahunAjaranFilter(e.target.value);
                resetPage();
              }}
              className="w-full sm:w-36 px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              <option value="all">Semua T.A.</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.name}>
                  T.A. {y.name} {y.is_active ? '★' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
          Total: {paginationMeta.total} Mata Pelajaran
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
              <BookOpen className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
              Belum ada mata pelajaran yang sesuai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-5">Kode</th>
                  <th className="py-4 px-5">Nama Mata Pelajaran</th>
                  <th className="py-4 px-5">Tahun Ajaran</th>
                  <th className="py-4 px-5">Jenjang</th>
                  <th className="py-4 px-5">Kelompok</th>
                  <th className="py-4 px-5">KKM</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Guru Pengampu</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((s) => (
                  <tr 
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition duration-150"
                  >
                    <td className="py-4 px-5">
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5">
                        {s.kode_mapel || s.code}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {s.nama_mapel || s.name}
                        </p>
                        {s.deskripsi && (
                          <p className="text-[11px] text-slate-400 max-w-xs truncate">{s.deskripsi}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20">
                        {s.tahun_ajaran || '2026/2027'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                        {s.jenjang?.kode_jenjang || 'Semua'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.kelompok === 'Wajib'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : s.kelompok === 'Peminatan'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {s.kelompok || 'Wajib'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-black text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                        {s.kkm || 75}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status_aktif !== 'N'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        {s.status_aktif !== 'N' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => openTeachersModal(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-gray-300 hover:text-cyan-600 font-bold text-xs transition border border-slate-200/60 dark:border-white/5"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{s.guru_pengampu?.length || 0} Guru Ditugaskan</span>
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailModal(s)}
                          title="Detail Mata Pelajaran"
                          className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-xl transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openTeachersModal(s)}
                          title="Kelola Guru Pengampu"
                          className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-xl transition"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          title="Edit Mata Pelajaran"
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          title="Hapus Mata Pelajaran"
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

      <Pagination
        currentPage={paginationMeta.currentPage}
        lastPage={paginationMeta.lastPage}
        total={paginationMeta.total}
        perPage={paginationMeta.perPage}
        from={paginationMeta.from}
        to={paginationMeta.to}
        onPageChange={setPage}
      />

      {/* Add / Edit Subject Modal */}
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
              <div className="p-3 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-500/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingSubject ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Konfigurasikan jenjang kurikulum, kode, dan standar nilai KKM
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
                    Kode Mapel
                  </label>
                  <input
                    type="text"
                    required
                    value={kodeMapel}
                    onChange={(e) => setKodeMapel(e.target.value.toUpperCase())}
                    placeholder="MTK-SMA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Nama Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={namaMapel}
                    onChange={(e) => setNamaMapel(e.target.value)}
                    placeholder="Contoh: Matematika Peminatan"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Jenjang
                  </label>
                  <select
                    value={idjenjang}
                    onChange={(e) => setIdjenjang(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/30"
                  >
                    {jenjangList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.kode_jenjang}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Tahun Ajaran
                  </label>
                  <select
                    value={tahunAjaran}
                    onChange={(e) => setTahunAjaran(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/30"
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.name}>
                        {y.name} {y.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Kelompok
                  </label>
                  <select
                    value={kelompok}
                    onChange={(e) => setKelompok(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/30"
                  >
                    <option value="Wajib">Wajib</option>
                    <option value="Peminatan">Peminatan</option>
                    <option value="Keahlian">Keahlian</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    KKM (0 - 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={kkm}
                    onChange={(e) => setKkm(parseFloat(e.target.value) || 75)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Deskripsi / Cakupan Materi
                </label>
                <textarea
                  rows={2}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Keterangan kurikulum atau fokus bahasan materi..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/30"
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
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/30 transition flex items-center gap-2"
                >
                  {loading && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingSubject ? 'Simpan Perubahan' : 'Buat Mapel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Teachers for Subject Modal */}
      {teachersModalOpen && activeSubjectForTeachers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up max-h-[85vh] flex flex-col">
            <button
              onClick={() => setTeachersModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 shrink-0">
              <div className="p-3 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-500/20">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Guru Pengampu: {activeSubjectForTeachers.nama_mapel || activeSubjectForTeachers.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Tugaskan pengajar dari data User BO (Guru / Penilai)
                </p>
              </div>
            </div>

            {/* Assign Teacher Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-center gap-3 mb-4 shrink-0">
              <select
                value={selectedTeacherToAssign}
                onChange={(e) => setSelectedTeacherToAssign(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
              >
                <option value="">-- Pilih Guru dari User BO --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssignTeacher}
                disabled={!selectedTeacherToAssign}
                className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Tugaskan Guru</span>
              </button>
            </div>

            {/* Teachers List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeSubjectForTeachers.guru_pengampu && activeSubjectForTeachers.guru_pengampu.length > 0 ? (
                activeSubjectForTeachers.guru_pengampu.map((gp, index) => (
                  <div
                    key={gp.id || index}
                    className="p-3 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {gp.guru?.nama || gp.iduser_bo}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {gp.guru?.login_email || '-'} • TA: {gp.tahun_ajaran}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveTeacher(gp.iduser_bo)}
                      title="Hapus penugasan"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  Belum ada guru yang ditugaskan untuk mata pelajaran ini.
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/5 flex justify-end shrink-0">
              <button
                onClick={() => setTeachersModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && detailSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-500/20">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Detail Mata Pelajaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                    Kode: {detailSubject.kode_mapel || detailSubject.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status & Overview Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 border ${
                  detailSubject.status_aktif !== 'N'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {detailSubject.status_aktif !== 'N' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Status: Aktif
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      Status: Nonaktif
                    </>
                  )}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Kelompok: {detailSubject.kelompok || 'Wajib'}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 px-3 py-1 rounded-xl border border-cyan-300 font-black text-xs">
                <Award className="h-3.5 w-3.5" />
                KKM: {detailSubject.kkm || 75}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Nama Mata Pelajaran</p>
                <p className="font-black text-slate-900 dark:text-white mt-0.5 text-sm">
                  {detailSubject.nama_mapel || detailSubject.name}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tahun Ajaran</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailSubject.tahun_ajaran || '2026/2027'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Jenjang Pendidikan</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailSubject.jenjang?.nama_jenjang || 'Semua Jenjang'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Standar KKM</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailSubject.kkm || 75} poin (Batas Kelulusan)
                </p>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
              <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Deskripsi & Silabus Singkat</p>
              <p className="text-xs text-slate-700 dark:text-gray-300">
                {detailSubject.deskripsi || 'Tidak ada deskripsi tambahan untuk mata pelajaran ini.'}
              </p>
            </div>

            {/* Guru Pengampu List */}
            <div className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  Guru Pengampu Ditugaskan ({detailSubject.guru_pengampu?.length || 0})
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openTeachersModal(detailSubject);
                  }}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Kelola Guru</span>
                </button>
              </div>

              {detailSubject.guru_pengampu && detailSubject.guru_pengampu.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {detailSubject.guru_pengampu.map((gp, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {gp.guru?.nama || gp.iduser_bo}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          {gp.guru?.login_email}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300">
                        {gp.kelas?.nama_kelas ? `Kelas: ${gp.kelas.nama_kelas}` : `TA: ${gp.tahun_ajaran}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada guru pengampu yang ditugaskan.</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleToggleStatus(detailSubject)}
                disabled={togglingStatus}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  detailSubject.status_aktif !== 'N'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {togglingStatus 
                  ? 'Memproses...' 
                  : detailSubject.status_aktif !== 'N' 
                    ? 'Nonaktifkan Mata Pelajaran' 
                    : 'Aktifkan Mata Pelajaran'}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEditModal(detailSubject);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;
