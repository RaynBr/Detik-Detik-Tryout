import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { 
  Plus, Edit2, Trash2, X, Calendar, Check, BookOpen, Users, 
  GraduationCap, Search, Layers, UserPlus, ArrowRight
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';
import { useToast } from '../../shared/context/ToastContext';

interface AcademicYear {
  id: number;
  name: string;
  semester: 'odd' | 'even';
  is_active: boolean;
  subjects_count?: number;
  students_count?: number;
}

export const AcademicYearsPage: React.FC = () => {
  const { toast } = useToast();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Form states for Year CRUD
  const [name, setName] = useState('');
  const [semester, setSemester] = useState<'odd' | 'even'>('odd');
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detail Modal (Kelola Mapel & Siswa Per Tahun Ajaran)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [activeTab, setActiveTab] = useState<'subjects' | 'students'>('subjects');

  // Subjects Tab state
  const [yearSubjects, setYearSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [allMasterSubjects, setAllMasterSubjects] = useState<any[]>([]);
  const [selectedSubjectIdToAttach, setSelectedSubjectIdToAttach] = useState<string>('');

  // Students Tab state
  const [yearStudents, setYearStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [classesList, setClassesList] = useState<any[]>([]);
  const [enrollClassModalOpen, setEnrollClassModalOpen] = useState(false);
  const [selectedClassToEnroll, setSelectedClassToEnroll] = useState<string>('');
  const [enrolling, setEnrolling] = useState(false);

  const {
    currentPage,
    setPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchAcademicYears = async (page = currentPage) => {
    setLoadingData(true);
    try {
      const response = await apiClient.get('/admin/academic-years', { params: { page } });
      setPaginationFromResponse(response.data);
      const list = response.data?.data || (Array.isArray(response.data) ? response.data : []);
      setAcademicYears(list);
    } catch (err) {
      console.error('Failed to fetch academic years:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears(currentPage);
  }, [currentPage]);

  // Load classes for filtering & enrollment
  useEffect(() => {
    apiClient.get('/admin/classes', { params: { all: true } })
      .then(res => setClassesList(res.data?.data || (Array.isArray(res.data) ? res.data : [])))
      .catch(() => {});
  }, []);

  const openAddModal = () => {
    setEditingYear(null);
    setName('');
    setSemester('odd');
    setIsActive(false);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setName(year.name);
    setSemester(year.semester);
    setIsActive(year.is_active);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name,
      semester,
      is_active: isActive
    };

    try {
      if (editingYear) {
        await apiClient.put(`/admin/academic-years/${editingYear.id}`, payload);
        toast.success('Data tahun ajaran berhasil diperbarui!');
      } else {
        await apiClient.post('/admin/academic-years', payload);
        toast.success('Tahun ajaran baru berhasil ditambahkan!');
      }
      fetchAcademicYears();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan data tahun ajaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tahun ajaran ini?')) return;
    try {
      await apiClient.delete(`/admin/academic-years/${id}`);
      toast.success('Tahun ajaran berhasil dihapus!');
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tahun ajaran.');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await apiClient.post(`/admin/academic-years/${id}/activate`);
      toast.success('Tahun ajaran berhasil diaktifkan!');
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengaktifkan tahun ajaran.');
    }
  };

  // ==========================================
  // DETAIL MODAL: MAPEL & SISWA PER TAHUN AJARAN
  // ==========================================
  const openDetailModal = (year: AcademicYear, initialTab: 'subjects' | 'students' = 'subjects') => {
    setSelectedYear(year);
    setActiveTab(initialTab);
    setDetailModalOpen(true);
    setSubjectSearch('');
    setStudentSearch('');
    setSelectedClassFilter('all');
    fetchYearSubjects(year.id);
    fetchYearStudents(year.id);
  };

  const fetchYearSubjects = async (yearId?: number, searchVal = subjectSearch) => {
    const id = yearId || selectedYear?.id;
    if (!id) return;
    setLoadingSubjects(true);
    try {
      const res = await apiClient.get(`/admin/academic-years/${id}/subjects`, {
        params: { search: searchVal || undefined, all: true }
      });
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setYearSubjects(data);
    } catch (err) {
      toast.error('Gagal memuat daftar mata pelajaran tahun ajaran ini.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchYearStudents = async (yearId?: number, searchVal = studentSearch, classVal = selectedClassFilter) => {
    const id = yearId || selectedYear?.id;
    if (!id) return;
    setLoadingStudents(true);
    try {
      const res = await apiClient.get(`/admin/academic-years/${id}/students`, {
        params: {
          search: searchVal || undefined,
          idkelas: classVal !== 'all' ? classVal : undefined,
          per_page: 50
        }
      });
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setYearStudents(data);
    } catch (err) {
      toast.error('Gagal memuat daftar siswa tahun ajaran ini.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const openAddSubjectModal = async () => {
    try {
      const res = await apiClient.get('/admin/subjects', { params: { all: true } });
      const allSub = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      // Filter out subjects already attached to this year
      const attachedIds = new Set(yearSubjects.map(s => s.id));
      const unattached = allSub.filter((s: any) => !attachedIds.has(s.id));
      setAllMasterSubjects(unattached);
      setSelectedSubjectIdToAttach(unattached[0]?.id ? String(unattached[0].id) : '');
      setAddSubjectModalOpen(true);
    } catch {
      toast.error('Gagal memuat master mata pelajaran.');
    }
  };

  const handleAttachSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear || !selectedSubjectIdToAttach) return;

    try {
      await apiClient.post(`/admin/academic-years/${selectedYear.id}/subjects`, {
        idmapel: selectedSubjectIdToAttach
      });
      toast.success('Mata pelajaran berhasil ditambahkan ke tahun ajaran ini.');
      setAddSubjectModalOpen(false);
      fetchYearSubjects(selectedYear.id);
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan mata pelajaran.');
    }
  };

  const handleDetachSubject = async (idmapel: number, mapelName: string) => {
    if (!selectedYear) return;
    if (!window.confirm(`Lepaskan mata pelajaran "${mapelName}" dari tahun ajaran ${selectedYear.name}?`)) return;

    try {
      await apiClient.delete(`/admin/academic-years/${selectedYear.id}/subjects/${idmapel}`);
      toast.success('Mata pelajaran berhasil dilepas.');
      fetchYearSubjects(selectedYear.id);
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal melepas mata pelajaran.');
    }
  };

  const handleEnrollAllActive = async () => {
    if (!selectedYear) return;
    if (!window.confirm(`Daftarkan SEMUA siswa aktif di sekolah ke tahun ajaran ${selectedYear.name}?`)) return;

    setEnrolling(true);
    try {
      const res = await apiClient.post(`/admin/academic-years/${selectedYear.id}/students`, {
        all_active: true
      });
      toast.success(res.data?.message || 'Siswa aktif berhasil didaftarkan ke tahun ajaran ini.');
      fetchYearStudents(selectedYear.id);
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mendaftarkan siswa.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnrollClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear || !selectedClassToEnroll) return;

    setEnrolling(true);
    try {
      const res = await apiClient.post(`/admin/academic-years/${selectedYear.id}/students`, {
        idkelas: selectedClassToEnroll
      });
      toast.success(res.data?.message || 'Siswa dari kelas tersebut berhasil didaftarkan.');
      setEnrollClassModalOpen(false);
      fetchYearStudents(selectedYear.id);
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mendaftarkan kelas.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveStudent = async (iduser: string, studentName: string) => {
    if (!selectedYear) return;
    if (!window.confirm(`Keluarkan siswa "${studentName}" dari tahun ajaran ${selectedYear.name}?`)) return;

    try {
      await apiClient.delete(`/admin/academic-years/${selectedYear.id}/students/${iduser}`);
      toast.success(`Siswa ${studentName} berhasil dikeluarkan dari tahun ajaran ini.`);
      fetchYearStudents(selectedYear.id);
      fetchAcademicYears();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengeluarkan siswa.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
              <Calendar className="h-6 w-6" />
            </div>
            <span>Tahun Ajaran & Semester Sekolah</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Kelola tahun ajaran aktif, semester, daftar mata pelajaran, dan siswa yang belajar pada tiap tahun ajaran.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Tahun Ajaran</span>
        </button>
      </div>

      {/* Main Table */}
      {loadingData ? (
        <TableSkeleton rows={3} columns={5} />
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Tahun Ajaran</th>
                  <th className="px-6 py-4">Semester</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4">Siswa Belajar</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                {academicYears.length > 0 ? (
                  academicYears.map((year) => (
                    <tr key={year.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-base">
                        {year.name}
                      </td>
                      <td className="px-6 py-4 capitalize font-semibold text-slate-800 dark:text-gray-200">
                        {year.semester === 'odd' ? 'Ganjil (Odd)' : 'Genap (Even)'}
                      </td>
                      <td className="px-6 py-4">
                        {year.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-xs font-bold rounded-lg shadow-xs">
                            <Check className="h-3.5 w-3.5" />
                            Aktif (Sedang Berjalan)
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-gray-500 text-xs font-medium">Tidak Aktif</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDetailModal(year, 'subjects')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20 hover:bg-amber-100 transition shadow-xs"
                          title="Klik untuk melihat mata pelajaran di tahun ini"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{year.subjects_count ?? 0} Mapel</span>
                          <ArrowRight className="h-3 w-3 opacity-60" />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDetailModal(year, 'students')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-500/20 hover:bg-cyan-100 transition shadow-xs"
                          title="Klik untuk melihat siswa terdaftar di tahun ini"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>{year.students_count ?? 0} Siswa</span>
                          <ArrowRight className="h-3 w-3 opacity-60" />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button
                          onClick={() => openDetailModal(year, 'subjects')}
                          className="px-3 py-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-xl transition inline-flex items-center gap-1"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          <span>Kelola</span>
                        </button>

                        {!year.is_active && (
                          <button
                            onClick={() => handleActivate(year.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl transition"
                          >
                            Aktifkan
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(year)}
                          className="inline-flex p-2 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-gray-300 rounded-xl transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(year.id)}
                          disabled={year.is_active}
                          className="inline-flex p-2 hover:bg-rose-50 dark:hover:bg-white/5 text-rose-600 dark:text-rose-400 disabled:opacity-30 rounded-xl transition"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 font-medium">
                      Belum ada data tahun ajaran.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        currentPage={paginationMeta.currentPage}
        lastPage={paginationMeta.lastPage}
        total={paginationMeta.total}
        perPage={paginationMeta.perPage}
        from={paginationMeta.from}
        to={paginationMeta.to}
        onPageChange={setPage}
      />

      {/* ========================================== */}
      {/* DETAIL MODAL: MAPEL & SISWA PER TAHUN AJARAN */}
      {/* ========================================== */}
      {detailModalOpen && selectedYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] glass-panel rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative flex flex-col overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20 shrink-0">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      Tahun Ajaran: {selectedYear.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {selectedYear.semester === 'odd' ? 'Semester Ganjil' : 'Semester Genap'}
                    </span>
                    {selectedYear.is_active && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                    Rincian mata pelajaran kurikulum dan data siswa yang terdaftar belajar pada tahun ajaran ini.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex items-center gap-2 pt-4 pb-3 border-b border-slate-200/60 dark:border-white/5">
              <button
                onClick={() => setActiveTab('subjects')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeTab === 'subjects'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200/60'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Mata Pelajaran ({yearSubjects.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeTab === 'students'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>Siswa yang Belajar ({yearStudents.length})</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              
              {/* TAB 1: MATA PELAJARAN */}
              {activeTab === 'subjects' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari mapel atau kode..."
                        value={subjectSearch}
                        onChange={(e) => {
                          setSubjectSearch(e.target.value);
                          fetchYearSubjects(selectedYear.id, e.target.value);
                        }}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>
                    <button
                      onClick={openAddSubjectModal}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Mapel ke Tahun Ini</span>
                    </button>
                  </div>

                  {loadingSubjects ? (
                    <div className="py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent mb-2"></div>
                      <p className="text-xs font-semibold">Memuat mata pelajaran...</p>
                    </div>
                  ) : yearSubjects.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                      <BookOpen className="h-8 w-8 text-slate-400 mx-auto opacity-50" />
                      <p className="text-sm font-bold text-slate-700 dark:text-gray-300">
                        Belum ada mata pelajaran untuk tahun ajaran {selectedYear.name}.
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Klik tombol di atas untuk menambahkan mata pelajaran kurikulum ke tahun ajaran ini.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.01]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">Kode</th>
                            <th className="py-3 px-4">Nama Mata Pelajaran</th>
                            <th className="py-3 px-4">Jenjang</th>
                            <th className="py-3 px-4">Kelompok</th>
                            <th className="py-3 px-4 text-center">KKM</th>
                            <th className="py-3 px-4">Guru Pengampu</th>
                            <th className="py-3 px-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                          {yearSubjects.map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                {sub.kode_mapel}
                              </td>
                              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                                {sub.nama_mapel}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                                  {sub.jenjang?.kode_jenjang || 'Semua'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300">
                                  {sub.kelompok || 'Wajib'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
                                {sub.kkm || 75}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 dark:text-gray-400">
                                {sub.guru_pengampu && sub.guru_pengampu.length > 0 ? (
                                  <span className="text-[11px] font-semibold">
                                    {sub.guru_pengampu.map((g: any) => g.guru?.nama).filter(Boolean).join(', ') || `${sub.guru_pengampu.length} Guru`}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Belum ditugaskan</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => handleDetachSubject(sub.id, sub.nama_mapel)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                  title="Lepas dari Tahun Ajaran Ini"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SISWA YANG BELAJAR */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama, NISN, email..."
                          value={studentSearch}
                          onChange={(e) => {
                            setStudentSearch(e.target.value);
                            fetchYearStudents(selectedYear.id, e.target.value, selectedClassFilter);
                          }}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                      </div>

                      <select
                        value={selectedClassFilter}
                        onChange={(e) => {
                          setSelectedClassFilter(e.target.value);
                          fetchYearStudents(selectedYear.id, studentSearch, e.target.value);
                        }}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      >
                        <option value="all">Semua Kelas</option>
                        {classesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nama_kelas}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleEnrollAllActive}
                        disabled={enrolling}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        title="Daftarkan seluruh siswa aktif di sekolah ke tahun ajaran ini"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Daftarkan Semua Siswa Aktif</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedClassToEnroll(classesList[0]?.id ? String(classesList[0].id) : '');
                          setEnrollClassModalOpen(true);
                        }}
                        className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                        title="Daftarkan seluruh siswa dalam satu kelas ke tahun ajaran ini"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>+ Per Kelas</span>
                      </button>
                    </div>
                  </div>

                  {loadingStudents ? (
                    <div className="py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent mb-2"></div>
                      <p className="text-xs font-semibold">Memuat daftar siswa terdaftar...</p>
                    </div>
                  ) : yearStudents.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                      <GraduationCap className="h-8 w-8 text-slate-400 mx-auto opacity-50" />
                      <p className="text-sm font-bold text-slate-700 dark:text-gray-300">
                        Belum ada siswa terdaftar pada tahun ajaran {selectedYear.name}.
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Gunakan tombol "Daftarkan Semua Siswa Aktif" atau "+ Per Kelas" untuk memasukkan siswa ke tahun ajaran ini.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.01]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">Nama Siswa</th>
                            <th className="py-3 px-4">NISN / Nomor Induk</th>
                            <th className="py-3 px-4">Kelas</th>
                            <th className="py-3 px-4">Email / Telepon</th>
                            <th className="py-3 px-4 text-center">Status Masuk</th>
                            <th className="py-3 px-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                          {yearStudents.map((st: any) => (
                            <tr key={`${st.iduser}-${st.enrollment_id}`} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {st.nama?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                                <span>{st.nama}</span>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-gray-300">
                                {st.nisn || st.nis || '-'}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                                {st.nama_kelas || '-'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 dark:text-gray-400">
                                {st.login_email || st.telp || '-'}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {st.enrollment_status || 'aktif'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => handleRemoveStudent(st.iduser, st.nama)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                  title="Keluarkan dari Tahun Ajaran Ini"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SUB-MODAL: ATTACH EXISTING SUBJECT TO YEAR */}
      {addSubjectModalOpen && selectedYear && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setAddSubjectModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              <span>Tambah Mapel ke {selectedYear.name}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
              Pilih mata pelajaran master yang diajarkan pada kurikulum tahun ajaran ini.
            </p>

            {allMasterSubjects.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-xs text-center text-slate-500">
                Semua mata pelajaran master sudah masuk ke tahun ajaran ini.
              </div>
            ) : (
              <form onSubmit={handleAttachSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Pilih Mata Pelajaran
                  </label>
                  <select
                    value={selectedSubjectIdToAttach}
                    onChange={(e) => setSelectedSubjectIdToAttach(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    {allMasterSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.kode_mapel}] {s.nama_mapel} ({s.kelompok || 'Wajib'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddSubjectModalOpen(false)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Tambahkan Mapel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SUB-MODAL: ENROLL BY CLASS */}
      {enrollClassModalOpen && selectedYear && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setEnrollClassModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-cyan-600" />
              <span>Daftarkan Siswa per Kelas</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
              Semua siswa yang saat ini berada di kelas yang dipilih akan dimasukkan ke tahun ajaran {selectedYear.name}.
            </p>

            <form onSubmit={handleEnrollClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Pilih Kelas / Rombel
                </label>
                <select
                  value={selectedClassToEnroll}
                  onChange={(e) => setSelectedClassToEnroll(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_kelas} ({c.tingkat ? `Tingkat ${c.tingkat}` : 'Umum'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollClassModalOpen(false)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {enrolling ? 'Mendaftarkan...' : 'Daftarkan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT YEAR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              {editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2025/2026, 2026/2027"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium border border-slate-200 dark:border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as 'odd' | 'even')}
                  className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium border border-slate-200 dark:border-white/10"
                >
                  <option value="odd">Ganjil (Odd)</option>
                  <option value="even">Genap (Even)</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="isActiveCheck" className="text-sm font-bold text-slate-800 dark:text-gray-300 cursor-pointer">
                  Set sebagai semester aktif saat ini
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition flex justify-center items-center shadow-lg shadow-indigo-600/30"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYearsPage;
