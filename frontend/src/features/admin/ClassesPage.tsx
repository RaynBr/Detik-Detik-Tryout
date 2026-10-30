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
  Filter,
  Eye,
  BookOpen,
  School
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface MasterJenjang {
  id: number;
  kode_jenjang: string;
  nama_jenjang: string;
}

interface MasterMataPelajaran {
  id: number;
  kode_mapel: string;
  nama_mapel: string;
  name?: string;
  code?: string;
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

interface GuruPengampuItem {
  id: number;
  idkelas: number;
  idmapel: number;
  iduser_bo: string;
  tahun_ajaran: string;
  status: string;
  guru?: {
    iduser_bo: string;
    nama: string;
    login_email: string;
    telp?: string;
  };
  mata_pelajaran?: {
    id: number;
    nama_mapel: string;
    kode_mapel: string;
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
  const [subjectsList, setSubjectsList] = useState<MasterMataPelajaran[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedJenjangFilter, setSelectedJenjangFilter] = useState<string>('all');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  // Detail Modal & Tabs ('info' | 'students' | 'teachers')
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'students' | 'teachers'>('info');
  const [activeClassDetail, setActiveClassDetail] = useState<any | null>(null);
  const [subjectTeachers, setSubjectTeachers] = useState<GuruPengampuItem[]>([]);
  const [studentSearchInModal, setStudentSearchInModal] = useState('');

  // Form states for class create/edit
  const [namaKelas, setNamaKelas] = useState('');
  const [idjenjang, setIdjenjang] = useState<number>(1);
  const [tingkat, setTingkat] = useState(10);
  const [jurusan, setJurusan] = useState('Umum');
  const [waliKelasId, setWaliKelasId] = useState<string>('');
  const [kapasitas, setKapasitas] = useState(36);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for Guru Pengampu
  const [showSubjectTeacherForm, setShowSubjectTeacherForm] = useState(false);
  const [editingSubjectTeacherId, setEditingSubjectTeacherId] = useState<number | null>(null);
  const [formMapelId, setFormMapelId] = useState<number | ''>('');
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formTahunAjaran, setFormTahunAjaran] = useState<string>('2026/2027');
  const [formStatus, setFormStatus] = useState<string>('aktif');
  const [savingSubjectTeacher, setSavingSubjectTeacher] = useState(false);

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

      const [classesRes, jenjangRes, teachersRes, subjectsRes] = await Promise.all([
        apiClient.get('/admin/classes', { params }),
        apiClient.get('/admin/jenjang', { params: { all: true } }),
        apiClient.get('/admin/teachers', { params: { all: true } }),
        apiClient.get('/admin/subjects', { params: { all: true } }),
      ]);
      setPaginationFromResponse(classesRes.data);
      const list = classesRes.data?.data || (Array.isArray(classesRes.data) ? classesRes.data : []);
      setClasses(list);
      setJenjangList(jenjangRes.data?.data || (Array.isArray(jenjangRes.data) ? jenjangRes.data : []));
      setTeachers(teachersRes.data?.data || (Array.isArray(teachersRes.data) ? teachersRes.data : []));
      setSubjectsList(subjectsRes.data?.data || (Array.isArray(subjectsRes.data) ? subjectsRes.data : []));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data kelas.');
      toast.error('Gagal memuat data kelas.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, search, selectedJenjangFilter]);

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

  // Open Detail Modal with chosen tab
  const openDetailModal = async (c: ClassRoom, initialTab: 'info' | 'students' | 'teachers' = 'info') => {
    setDetailTab(initialTab);
    setDetailModalOpen(true);
    setShowSubjectTeacherForm(false);
    setEditingSubjectTeacherId(null);
    setStudentSearchInModal('');
    try {
      const [classDetailsRes, studentsRes, subjectTeachersRes] = await Promise.all([
        apiClient.get(`/admin/classes/${c.id}`),
        apiClient.get('/admin/students?per_page=100'),
        apiClient.get(`/admin/classes/${c.id}/subject-teachers`),
      ]);
      setActiveClassDetail(classDetailsRes.data);
      setAllStudents(studentsRes.data?.data || []);
      const teachersList = subjectTeachersRes.data?.data || (Array.isArray(subjectTeachersRes.data) ? subjectTeachersRes.data : []);
      setSubjectTeachers(teachersList);
    } catch (err) {
      toast.error('Gagal memuat detail kelas.');
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

  // Student management in class
  const handleAddStudentToClass = async () => {
    if (!activeClassDetail || !selectedStudentToAdd) return;
    try {
      await apiClient.post(`/admin/classes/${activeClassDetail.id}/students`, {
        iduser: selectedStudentToAdd,
      });
      toast.success('Siswa berhasil ditambahkan ke kelas.');
      setSelectedStudentToAdd('');
      // Refresh modal
      const res = await apiClient.get(`/admin/classes/${activeClassDetail.id}`);
      setActiveClassDetail(res.data);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan siswa.');
    }
  };

  const handleRemoveStudentFromClass = async (iduser: string) => {
    if (!activeClassDetail) return;
    if (!window.confirm('Keluarkan siswa ini dari kelas?')) return;
    try {
      await apiClient.delete(`/admin/classes/${activeClassDetail.id}/students/${iduser}`);
      toast.success('Siswa dikeluarkan dari kelas.');
      const res = await apiClient.get(`/admin/classes/${activeClassDetail.id}`);
      setActiveClassDetail(res.data);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengeluarkan siswa.');
    }
  };

  // Guru Pengampu (Subject Teachers) management
  const handleOpenAddSubjectTeacher = () => {
    setEditingSubjectTeacherId(null);
    setFormMapelId(subjectsList[0]?.id || '');
    setFormTeacherId(teachers[0]?.id || '');
    setFormTahunAjaran('2026/2027');
    setFormStatus('aktif');
    setShowSubjectTeacherForm(true);
  };

  const handleOpenEditSubjectTeacher = (item: GuruPengampuItem) => {
    setEditingSubjectTeacherId(item.id);
    setFormMapelId(item.idmapel);
    setFormTeacherId(item.iduser_bo);
    setFormTahunAjaran(item.tahun_ajaran || '2026/2027');
    setFormStatus(item.status || 'aktif');
    setShowSubjectTeacherForm(true);
  };

  const handleSaveSubjectTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassDetail || !formMapelId || !formTeacherId) {
      toast.warning('Pilih Mata Pelajaran dan Guru Pengampu.');
      return;
    }

    setSavingSubjectTeacher(true);
    try {
      const payload = {
        idmapel: formMapelId,
        iduser_bo: formTeacherId,
        tahun_ajaran: formTahunAjaran || '2026/2027',
        status: formStatus || 'aktif',
      };

      if (editingSubjectTeacherId) {
        await apiClient.put(`/admin/classes/${activeClassDetail.id}/subject-teachers/${editingSubjectTeacherId}`, payload);
        toast.success('Guru Pengampu berhasil diperbarui.');
      } else {
        await apiClient.post(`/admin/classes/${activeClassDetail.id}/subject-teachers`, payload);
        toast.success('Guru Pengampu berhasil ditugaskan ke kelas.');
      }

      // Refresh list
      const res = await apiClient.get(`/admin/classes/${activeClassDetail.id}/subject-teachers`);
      setSubjectTeachers(res.data?.data || []);
      setShowSubjectTeacherForm(false);
      setEditingSubjectTeacherId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan Guru Pengampu.');
    } finally {
      setSavingSubjectTeacher(false);
    }
  };

  const handleDeleteSubjectTeacher = async (item: GuruPengampuItem) => {
    if (!activeClassDetail) return;
    const mapelName = item.mata_pelajaran?.nama_mapel || 'mata pelajaran ini';
    const guruName = item.guru?.nama || 'Guru';
    if (!window.confirm(`Hapus ${guruName} sebagai Guru Pengampu ${mapelName} di kelas ini?`)) return;

    try {
      await apiClient.delete(`/admin/classes/${activeClassDetail.id}/subject-teachers/${item.id}`);
      toast.success('Guru Pengampu berhasil dihapus dari kelas.');
      const res = await apiClient.get(`/admin/classes/${activeClassDetail.id}/subject-teachers`);
      setSubjectTeachers(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus Guru Pengampu.');
    }
  };

  const filtered = classes;

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
              Manajemen rombel, alokasi wali kelas, penempatan guru mata pelajaran, dan pembagian siswa
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
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Cari nama kelas atau jurusan..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedJenjangFilter}
              onChange={(e) => {
                setSelectedJenjangFilter(e.target.value);
                resetPage();
              }}
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
          Total: {paginationMeta.total} Kelas
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
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition duration-150 cursor-pointer"
                    onClick={() => openDetailModal(c, 'info')}
                  >
                    <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="hover:text-indigo-600 transition">{c.nama_kelas || c.name}</span>
                      </div>
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
                    <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDetailModal(c, 'students')}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-gray-300 hover:text-indigo-600 font-bold text-xs transition border border-slate-200/60 dark:border-white/5"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{c.siswa_count || 0} / {c.kapasitas || 36} Siswa</span>
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailModal(c, 'teachers')}
                          title="Guru Pengampu Mata Pelajaran"
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDetailModal(c, 'info')}
                          title="Detail Kelas"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                        >
                          <Eye className="h-4 w-4" />
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

      <Pagination
        currentPage={paginationMeta.currentPage}
        lastPage={paginationMeta.lastPage}
        total={paginationMeta.total}
        perPage={paginationMeta.perPage}
        from={paginationMeta.from}
        to={paginationMeta.to}
        onPageChange={setPage}
      />

      {/* ================= DETAIL KELAS MODAL (3 TABS) ================= */}
      {detailModalOpen && activeClassDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up max-h-[90vh] flex flex-col">
            
            <button
              onClick={() => setDetailModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Detail Kelas: {activeClassDetail.nama_kelas || activeClassDetail.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Jenjang {activeClassDetail.jenjang?.kode_jenjang || 'SD/SMP/SMA'} • Tingkat {activeClassDetail.tingkat} • {activeClassDetail.jurusan || 'Umum'}
                </p>
              </div>
            </div>

            {/* 3 Tabs Header: Informasi, Daftar Siswa, Guru Pengampu */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl gap-1 shrink-0 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                  detailTab === 'info'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <School className="h-4 w-4" />
                <span>Informasi</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('students')}
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                  detailTab === 'students'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Daftar Siswa ({activeClassDetail.siswa?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('teachers')}
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                  detailTab === 'teachers'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Guru Pengampu ({subjectTeachers.length})</span>
              </button>
            </div>

            {/* Modal Body: TAB 1: INFORMASI */}
            {detailTab === 'info' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Nama Kelas</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.nama_kelas || activeClassDetail.name}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Jenjang & Tingkat</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.jenjang?.kode_jenjang} • Tingkat {activeClassDetail.tingkat}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Kapasitas Rombel</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.siswa?.length || 0} / {activeClassDetail.kapasitas || 36} Siswa
                    </span>
                  </div>
                </div>

                {/* Wali Kelas Highlight Card */}
                <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wide">
                        Wali Kelas
                      </span>
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold">
                        (1 Kelas = 1 Wali Kelas)
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {activeClassDetail.wali_kelas?.nama || 'Belum ditentukan'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      {activeClassDetail.wali_kelas?.login_email || 'Wali kelas dapat diatur melalui form edit kelas.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openEditModal(activeClassDetail);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
                  >
                    Ubah Wali Kelas
                  </button>
                </div>

                {/* Explanation Alert */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-start gap-3 text-xs text-slate-600 dark:text-gray-300">
                  <BookOpen className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-gray-200">
                      Penugasan Guru Mata Pelajaran Berbeda dengan Wali Kelas
                    </p>
                    <p className="mt-0.5 text-slate-500 dark:text-gray-400 text-[11px]">
                      Satu kelas memiliki 1 Wali Kelas, tetapi dapat memiliki banyak Guru Mata Pelajaran pengampu (Matematika, Bahasa Indonesia, Fisika, dll.). Kelola guru pengajar pada tab <strong>Guru Pengampu</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body: TAB 2: DAFTAR SISWA */}
            {detailTab === 'students' && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-3">
                {/* Add Student Bar */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
                  <select
                    value={selectedStudentToAdd}
                    onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">-- Pilih Siswa untuk Dimasukkan --</option>
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
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Masukkan ke Kelas</span>
                  </button>
                </div>

                {/* Filter / Search within students */}
                <div className="flex items-center justify-between gap-2 shrink-0 px-1">
                  <span className="text-xs font-bold text-slate-500">
                    Siswa Terdaftar ({activeClassDetail.siswa?.length || 0} / {activeClassDetail.kapasitas || 36})
                  </span>
                  <input
                    type="text"
                    value={studentSearchInModal}
                    onChange={(e) => setStudentSearchInModal(e.target.value)}
                    placeholder="Cari nama / NISN..."
                    className="px-3 py-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white w-48"
                  />
                </div>

                {/* Students List Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {activeClassDetail.siswa && activeClassDetail.siswa.length > 0 ? (
                    activeClassDetail.siswa
                      .filter((sk: StudentInClass) => {
                        if (!studentSearchInModal.trim()) return true;
                        const q = studentSearchInModal.toLowerCase();
                        const name = (sk.siswa?.nama || sk.iduser).toLowerCase();
                        const nisn = (sk.nisn || '').toLowerCase();
                        return name.includes(q) || nisn.includes(q);
                      })
                      .map((sk: StudentInClass, index: number) => (
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
              </div>
            )}

            {/* Modal Body: TAB 3: GURU PENGAMPU MATA PELAJARAN */}
            {detailTab === 'teachers' && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-3">
                
                {/* Header Action: Tambah Guru Pengampu */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="text-xs text-slate-500 font-medium">
                    1 Kelas memiliki banyak Guru Pengampu Mata Pelajaran
                  </div>
                  {!showSubjectTeacherForm && (
                    <button
                      type="button"
                      onClick={handleOpenAddSubjectTeacher}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Guru Pengampu</span>
                    </button>
                  )}
                </div>

                {/* Sub-form: Add / Edit Subject Teacher */}
                {showSubjectTeacherForm && (
                  <form onSubmit={handleSaveSubjectTeacher} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-500/20 space-y-3 shrink-0 animate-scale-up">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        {editingSubjectTeacherId ? 'Ubah / Ganti Guru Pengampu' : 'Tugaskan Guru Mata Pelajaran Baru'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowSubjectTeacherForm(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
                          Mata Pelajaran*
                        </label>
                        <select
                          required
                          value={formMapelId}
                          onChange={(e) => setFormMapelId(parseInt(e.target.value) || '')}
                          className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          <option value="">-- Pilih Mata Pelajaran --</option>
                          {subjectsList.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nama_mapel || m.name} ({m.kode_mapel || m.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
                          Guru Pengampu*
                        </label>
                        <select
                          required
                          value={formTeacherId}
                          onChange={(e) => setFormTeacherId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          <option value="">-- Pilih Guru Pengajar --</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
                          Tahun Ajaran
                        </label>
                        <input
                          type="text"
                          value={formTahunAjaran}
                          onChange={(e) => setFormTahunAjaran(e.target.value)}
                          placeholder="2026/2027"
                          className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
                          Status
                        </label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          <option value="aktif">Aktif</option>
                          <option value="nonaktif">Nonaktif</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSubjectTeacherForm(false)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={savingSubjectTeacher}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                      >
                        {savingSubjectTeacher && <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        <span>{editingSubjectTeacherId ? 'Simpan Perubahan' : 'Tugaskan Guru'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Table Guru Pengampu */}
                <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] sticky top-0 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Mata Pelajaran</th>
                        <th className="py-2.5 px-4">Guru Pengampu</th>
                        <th className="py-2.5 px-3">Tahun Ajaran</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {subjectTeachers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            Belum ada guru pengampu mata pelajaran yang ditugaskan di kelas ini.
                          </td>
                        </tr>
                      ) : (
                        subjectTeachers.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                              {st.mata_pelajaran?.nama_mapel || `Mapel #${st.idmapel}`}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Kode: {st.mata_pelajaran?.kode_mapel || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-800 dark:text-gray-200 font-semibold">
                              {st.guru?.nama || st.iduser_bo}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {st.guru?.login_email || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-gray-300">
                              {st.tahun_ajaran || '2026/2027'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {st.status === 'aktif' || !st.status ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                  Aktif
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-400 font-bold text-[10px]">
                                  Nonaktif
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSubjectTeacher(st)}
                                  title="Ganti / Ubah Guru Pengampu"
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubjectTeacher(st)}
                                  title="Hapus Penugasan Guru"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* Modal Footer */}
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
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Nama Kelas (Format Teks Bebas)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mb-2">
                  Dapat diisi nama kustom untuk sekolah swasta/internasional (Contoh: "X Cambridge A", "7 Al-Farabi", "Toddler Bunga").
                </p>
                <input
                  type="text"
                  required
                  value={namaKelas}
                  onChange={(e) => setNamaKelas(e.target.value)}
                  placeholder="Contoh: 10 Cambridge Science, 7 Al-Farabi, X MIPA 1"
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
                  Wali Kelas (1 Kelas = 1 Wali Kelas)
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
    </div>
  );
};

export default ClassesPage;
