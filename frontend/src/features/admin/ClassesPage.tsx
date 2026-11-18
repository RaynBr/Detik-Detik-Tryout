import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Search, 
  Users, 
  UserPlus, 
  UserMinus, 
  Eye, 
  BookOpen, 
  School, 
  RotateCcw,
  Upload,
  Power,
  Clock
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';
import { StudentImportModal } from './components/StudentImportModal';
import { Can } from '../../shared/components/Can';

interface AcademicYear {
  id: number;
  name: string;
  is_active: boolean | number;
}

interface MasterSemester {
  id: number;
  academic_year_id: number;
  nama_semester: string;
  kode_semester: string;
  status_aktif: string;
}

interface MasterKurikulum {
  id: number;
  nama_kurikulum: string;
  kode_kurikulum: string;
  tahun?: string;
  status_aktif?: string;
}

interface MasterJenjang {
  id: number;
  kode_jenjang: string;
  nama_jenjang: string;
  status_aktif?: string;
}

interface Major {
  id: number;
  name: string;
  code: string;
  idjenjang?: number;
  status_aktif?: string;
}

interface MasterTingkatKelas {
  id: number;
  nama_tingkat: string;
  tingkat: number;
  idjenjang: number;
  idjurusan?: number | null;
  status_aktif?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  nip?: string;
}

interface MasterMataPelajaran {
  id: number;
  kode_mapel: string;
  nama_mapel: string;
  kkm?: number;
  idkurikulum?: number;
  idjenjang?: number;
  idjurusan?: number | null;
  idtingkat?: number | null;
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
    telp?: string;
  };
}

interface GuruPengampuItem {
  id: number;
  idkelas: number;
  idmapel: number;
  iduser_bo: string;
  academic_year_id?: number;
  semester_id?: number;
  tahun_ajaran: string;
  status: string;
  guru?: {
    iduser_bo: string;
    nama: string;
    login_email: string;
  };
  mata_pelajaran?: {
    id: number;
    nama_mapel: string;
    kode_mapel: string;
    kkm?: number;
  };
  academic_year?: AcademicYear;
  semester?: MasterSemester;
}

interface ClassRoom {
  id: number;
  nama_kelas: string;
  name?: string;
  academic_year_id?: number;
  academic_year?: AcademicYear | null;
  semester_id?: number;
  semester?: MasterSemester | null;
  kurikulum_id?: number;
  kurikulum?: MasterKurikulum | null;
  idjenjang: number;
  jenjang?: MasterJenjang | null;
  idjurusan?: number | null;
  jurusan_relation?: Major | null;
  jurusan: string;
  idtingkat?: number;
  tingkat_kelas?: MasterTingkatKelas | null;
  tingkat: number;
  wali_kelas_id: string | null;
  wali_kelas?: { iduser_bo?: string; nama: string; login_email: string } | null;
  kapasitas: number;
  status_aktif: string;
  siswa_count?: number;
  guru_mata_pelajaran_count?: number;
  siswa?: StudentInClass[];
  guru_mata_pelajaran?: GuruPengampuItem[];
}

export const ClassesPage: React.FC = () => {
  const { toast } = useToast();

  // Data states
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<MasterSemester[]>([]);
  const [kurikulumList, setKurikulumList] = useState<MasterKurikulum[]>([]);
  const [jenjangList, setJenjangList] = useState<MasterJenjang[]>([]);
  const [majorsList, setMajorsList] = useState<Major[]>([]);
  const [tingkatList, setTingkatList] = useState<MasterTingkatKelas[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectsList, setSubjectsList] = useState<MasterMataPelajaran[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterKurikulum, setFilterKurikulum] = useState<string>('all');
  const [filterJenjang, setFilterJenjang] = useState<string>('all');
  const [filterTingkat, setFilterTingkat] = useState<string>('all');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  // Detail Modal & Tabs ('info' | 'students' | 'teachers' | 'history')
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'students' | 'teachers' | 'history'>('info');
  const [activeClassDetail, setActiveClassDetail] = useState<ClassRoom | null>(null);
  const [subjectTeachers, setSubjectTeachers] = useState<GuruPengampuItem[]>([]);
  const [studentSearchInModal, setStudentSearchInModal] = useState('');
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');

  // Student Import Modal for Kelas/Rombel (Requirement 18)
  const [studentImportModalOpen, setStudentImportModalOpen] = useState(false);
  const [targetClassForImport, setTargetClassForImport] = useState<number | undefined>(undefined);
  const [targetAcademicYearForImport, setTargetAcademicYearForImport] = useState<number | undefined>(undefined);

  const handleToggleClassStatus = async (classItem: ClassRoom) => {
    try {
      const res = await apiClient.patch(`/admin/classes/${classItem.id}/toggle-status`);
      toast.success(res.data.message || 'Status kelas berhasil diperbarui');
      if (activeClassDetail && activeClassDetail.id === classItem.id) {
        setActiveClassDetail(prev => prev ? { ...prev, status_aktif: res.data.status_aktif } : null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status kelas');
    }
  };

  // Form states for class create/edit (Foreign keys to Master Akademik)
  const [formAcademicYearId, setFormAcademicYearId] = useState<number | ''>('');
  const [formSemesterId, setFormSemesterId] = useState<number | ''>('');
  const [formKurikulumId, setFormKurikulumId] = useState<number | ''>('');
  const [formJenjangId, setFormJenjangId] = useState<number | ''>('');
  const [formJurusanId, setFormJurusanId] = useState<number | ''>('');
  const [formTingkatId, setFormTingkatId] = useState<number | ''>('');
  const [formNamaKelas, setFormNamaKelas] = useState('');
  const [formKapasitas, setFormKapasitas] = useState(36);
  const [formWaliKelasId, setFormWaliKelasId] = useState<string>('');
  const [formStatusAktif, setFormStatusAktif] = useState<'Y' | 'N'>('Y');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);

  // Form states for Guru Pengampu
  const [showSubjectTeacherForm, setShowSubjectTeacherForm] = useState(false);
  const [editingSubjectTeacherId, setEditingSubjectTeacherId] = useState<number | null>(null);
  const [formMapelId, setFormMapelId] = useState<number | ''>('');
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formTeacherAyId, setFormTeacherAyId] = useState<number | ''>('');
  const [formTeacherSemId, setFormTeacherSemId] = useState<number | ''>('');
  const [formTeacherStatus, setFormTeacherStatus] = useState<string>('aktif');
  const [savingSubjectTeacher, setSavingSubjectTeacher] = useState(false);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  // Load options once on mount
  const loadOptions = async () => {
    try {
      const res = await apiClient.get('/admin/classes-options');
      const data = res.data;
      setAcademicYears(data.academic_years || []);
      setSemesters(data.semesters || []);
      setKurikulumList(data.kurikulum || []);
      setJenjangList(data.jenjang || []);
      setMajorsList(data.majors || []);
      setTingkatList(data.tingkat_kelas || []);
      setTeachers(data.teachers || []);
      setSubjectsList(data.subjects || []);
    } catch (err: any) {
      console.error('Failed to load class options:', err);
    }
  };

  const fetchData = async (page = currentPage) => {
    setLoadingData(true);
    try {
      const params: any = { page };
      if (search) params.search = search;
      if (filterAcademicYear !== 'all') params.academic_year_id = filterAcademicYear;
      if (filterSemester !== 'all') params.semester_id = filterSemester;
      if (filterKurikulum !== 'all') params.kurikulum_id = filterKurikulum;
      if (filterJenjang !== 'all') params.idjenjang = filterJenjang;
      if (filterTingkat !== 'all') params.idtingkat = filterTingkat;

      const classesRes = await apiClient.get('/admin/classes', { params });
      setPaginationFromResponse(classesRes.data);
      const list = classesRes.data?.data || (Array.isArray(classesRes.data) ? classesRes.data : []);
      setClasses(list);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data kelas.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    fetchData(currentPage);
  }, [
    currentPage, 
    search, 
    filterAcademicYear, 
    filterSemester, 
    filterKurikulum, 
    filterJenjang, 
    filterTingkat
  ]);

  // Dependent Semesters for Form
  const availableSemestersForForm = semesters.filter(
    (s) => !formAcademicYearId || Number(s.academic_year_id) === Number(formAcademicYearId)
  );

  // Filter Tingkat by Jenjang in Form
  const availableTingkatForForm = tingkatList.filter(
    (t) => !formJenjangId || Number(t.idjenjang) === Number(formJenjangId)
  );

  // Filter Majors by Jenjang in Form (SMA / SMK)
  const selectedJenjangObj = jenjangList.find((j) => Number(j.id) === Number(formJenjangId));
  const isJenjangNeedsMajor = selectedJenjangObj 
    ? ['SMA', 'SMK', 'MA', 'MAK'].some((code) => selectedJenjangObj.kode_jenjang.toUpperCase().includes(code) || selectedJenjangObj.nama_jenjang.toUpperCase().includes(code))
    : false;

  const availableMajorsForForm = majorsList.filter(
    (m) => !formJenjangId || !m.idjenjang || Number(m.idjenjang) === Number(formJenjangId)
  );

  // Dependent Semesters for Filter Bar
  const availableSemestersForFilter = semesters.filter(
    (s) => filterAcademicYear === 'all' || Number(s.academic_year_id) === Number(filterAcademicYear)
  );

  // Open Modal to Add Class
  const openAddModal = () => {
    setEditingClass(null);
    setFormError(null);

    // Auto-select active academic year
    const activeAy = academicYears.find((ay) => ay.is_active) || academicYears[0];
    const initialAyId = activeAy ? activeAy.id : '';
    setFormAcademicYearId(initialAyId);

    // Auto-select active semester for this year
    const activeSem = semesters.find(
      (s) => Number(s.academic_year_id) === Number(initialAyId) && s.status_aktif === 'Y'
    ) || semesters.find((s) => Number(s.academic_year_id) === Number(initialAyId));
    setFormSemesterId(activeSem ? activeSem.id : '');

    // Active Kurikulum
    const activeKur = kurikulumList.find((k) => k.status_aktif === 'Y') || kurikulumList[0];
    setFormKurikulumId(activeKur ? activeKur.id : '');

    // Default Jenjang
    const defaultJenjang = jenjangList[0];
    const initialJenjangId = defaultJenjang ? defaultJenjang.id : '';
    setFormJenjangId(initialJenjangId);

    // Default Tingkat for this jenjang
    const initialTingkat = tingkatList.find((t) => Number(t.idjenjang) === Number(initialJenjangId));
    setFormTingkatId(initialTingkat ? initialTingkat.id : '');

    setFormJurusanId('');
    setFormNamaKelas('');
    setFormKapasitas(36);
    setFormWaliKelasId('');
    setFormStatusAktif('Y');
    setFormKeterangan('');
    setModalOpen(true);
  };

  // Open Modal to Edit Class
  const openEditModal = (c: ClassRoom) => {
    setEditingClass(c);
    setFormError(null);

    setFormAcademicYearId(c.academic_year_id || c.academic_year?.id || '');
    setFormSemesterId(c.semester_id || c.semester?.id || '');
    setFormKurikulumId(c.kurikulum_id || c.kurikulum?.id || '');
    setFormJenjangId(c.idjenjang || c.jenjang?.id || '');
    setFormJurusanId(c.idjurusan || c.jurusan_relation?.id || '');
    setFormTingkatId(c.idtingkat || c.tingkat_kelas?.id || '');
    setFormNamaKelas(c.nama_kelas || c.name || '');
    setFormKapasitas(c.kapasitas || 36);
    setFormWaliKelasId(c.wali_kelas_id || c.wali_kelas?.iduser_bo || '');
    setFormStatusAktif((c.status_aktif as 'Y' | 'N') || 'Y');
    setFormKeterangan('');
    setModalOpen(true);
  };

  // Handle Academic Year change in Form -> sync Semester
  const handleFormAcademicYearChange = (newAyId: number) => {
    setFormAcademicYearId(newAyId);
    const matchingSem = semesters.find(
      (s) => Number(s.academic_year_id) === Number(newAyId) && s.status_aktif === 'Y'
    ) || semesters.find((s) => Number(s.academic_year_id) === Number(newAyId));
    setFormSemesterId(matchingSem ? matchingSem.id : '');
  };

  // Handle Jenjang change in Form -> sync Tingkat & Jurusan
  const handleFormJenjangChange = (newJenjangId: number) => {
    setFormJenjangId(newJenjangId);
    setFormJurusanId('');
    const matchingTingkat = tingkatList.find((t) => Number(t.idjenjang) === Number(newJenjangId));
    setFormTingkatId(matchingTingkat ? matchingTingkat.id : '');
  };

  // Open Detail Modal
  const openDetailModal = async (c: ClassRoom, initialTab: 'info' | 'students' | 'teachers' | 'history' = 'info') => {
    setDetailTab(initialTab);
    setDetailModalOpen(true);
    setShowSubjectTeacherForm(false);
    setEditingSubjectTeacherId(null);
    setStudentSearchInModal('');
    setSelectedStudentToAdd('');
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

  // Save Class (Create / Update)
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaKelas.trim()) {
      setFormError('Nama Rombel / Nama Kelas wajib diisi.');
      return;
    }
    if (!formAcademicYearId || !formSemesterId) {
      setFormError('Tahun Ajaran dan Semester dari Master Akademik wajib dipilih.');
      return;
    }
    if (!formKurikulumId || !formJenjangId || !formTingkatId) {
      setFormError('Kurikulum, Jenjang, dan Tingkat dari Master Akademik wajib dipilih.');
      return;
    }

    setSavingClass(true);
    setFormError(null);

    const payload = {
      nama_kelas: formNamaKelas.trim(),
      academic_year_id: formAcademicYearId,
      semester_id: formSemesterId,
      kurikulum_id: formKurikulumId,
      idjenjang: formJenjangId,
      idjurusan: formJurusanId ? formJurusanId : null,
      idtingkat: formTingkatId,
      wali_kelas_id: formWaliKelasId ? formWaliKelasId : null,
      kapasitas: formKapasitas,
      status_aktif: formStatusAktif,
      keterangan: formKeterangan || null,
    };

    try {
      if (editingClass) {
        await apiClient.put(`/admin/classes/${editingClass.id}`, payload);
        toast.success(`Kelas ${formNamaKelas} berhasil diperbarui.`);
      } else {
        await apiClient.post('/admin/classes', payload);
        toast.success(`Kelas ${formNamaKelas} berhasil ditambahkan.`);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan data kelas.');
    } finally {
      setSavingClass(false);
    }
  };

  const handleDelete = async (c: ClassRoom) => {
    if (!window.confirm(`Hapus kelas ${c.nama_kelas || c.name}? Seluruh riwayat penugasan guru pengampu dan penempatan siswa akan disesuaikan.`)) return;

    try {
      await apiClient.delete(`/admin/classes/${c.id}`);
      toast.success('Kelas berhasil dihapus.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kelas.');
    }
  };

  // Student management in Class
  const handleAddStudentToClass = async () => {
    if (!activeClassDetail || !selectedStudentToAdd) return;
    try {
      await apiClient.post(`/admin/classes/${activeClassDetail.id}/students`, {
        iduser: selectedStudentToAdd,
      });
      toast.success('Siswa berhasil dimasukkan ke kelas.');
      setSelectedStudentToAdd('');
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
    setFormTeacherAyId(activeClassDetail?.academic_year_id || academicYears[0]?.id || '');
    setFormTeacherSemId(activeClassDetail?.semester_id || semesters[0]?.id || '');
    setFormTeacherStatus('aktif');
    setShowSubjectTeacherForm(true);
  };

  const handleOpenEditSubjectTeacher = (item: GuruPengampuItem) => {
    setEditingSubjectTeacherId(item.id);
    setFormMapelId(item.idmapel);
    setFormTeacherId(item.iduser_bo);
    setFormTeacherAyId(item.academic_year_id || activeClassDetail?.academic_year_id || '');
    setFormTeacherSemId(item.semester_id || activeClassDetail?.semester_id || '');
    setFormTeacherStatus(item.status || 'aktif');
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
        academic_year_id: formTeacherAyId || activeClassDetail.academic_year_id,
        semester_id: formTeacherSemId || activeClassDetail.semester_id,
        status: formTeacherStatus || 'aktif',
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
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menugaskan Guru Pengampu.');
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
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus Guru Pengampu.');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setFilterAcademicYear('all');
    setFilterSemester('all');
    setFilterKurikulum('all');
    setFilterJenjang('all');
    setFilterTingkat('all');
    resetPage();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="p-3.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-md">
            <School className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Kelola Kelas & Rombel
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-500/30">
                Pusat Relasi Akademik
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-1">
              Hub penghubung Tahun Ajaran, Semester, Kurikulum, Jenjang, Jurusan, Tingkat, Wali Kelas, Guru Pengampu, dan Siswa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Can perm="siswa.import|kelas.manage">
            <button
              id="btn-upload-students-class"
              onClick={() => {
                setTargetClassForImport(undefined);
                setTargetAcademicYearForImport(undefined);
                setStudentImportModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-95 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition duration-150 shrink-0"
            >
              <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Upload Siswa ke Rombel</span>
            </button>
          </Can>

          <Can perm="kelas.manage">
            <button
              id="btn-add-class"
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition duration-150 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Kelas & Rombel</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="search-classes"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Cari nama rombel / kelas atau jurusan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            {(filterAcademicYear !== 'all' || filterSemester !== 'all' || filterKurikulum !== 'all' || filterJenjang !== 'all' || filterTingkat !== 'all' || search) && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
            <div className="text-xs text-slate-500 font-bold px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl">
              Total: {paginationMeta.total} Kelas
            </div>
          </div>
        </div>

        {/* Dropdown Filters (Academic References) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
          {/* Filter Tahun Ajaran */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Tahun Ajaran
            </label>
            <select
              value={filterAcademicYear}
              onChange={(e) => {
                setFilterAcademicYear(e.target.value);
                setFilterSemester('all');
                resetPage();
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">Semua Tahun Ajaran</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_active ? '★ Aktif' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Semester */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Semester
            </label>
            <select
              value={filterSemester}
              onChange={(e) => {
                setFilterSemester(e.target.value);
                resetPage();
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">Semua Semester</option>
              {availableSemestersForFilter.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_semester}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kurikulum */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Kurikulum
            </label>
            <select
              value={filterKurikulum}
              onChange={(e) => {
                setFilterKurikulum(e.target.value);
                resetPage();
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">Semua Kurikulum</option>
              {kurikulumList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kurikulum}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Jenjang */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Jenjang
            </label>
            <select
              value={filterJenjang}
              onChange={(e) => {
                setFilterJenjang(e.target.value);
                resetPage();
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">Semua Jenjang</option>
              {jenjangList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.kode_jenjang} - {j.nama_jenjang}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tingkat */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Tingkat Kelas
            </label>
            <select
              value={filterTingkat}
              onChange={(e) => {
                setFilterTingkat(e.target.value);
                resetPage();
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">Semua Tingkat</option>
              {tingkatList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tingkat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-sm">
        {loadingData ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-full inline-block text-slate-400">
              <School className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
              Belum ada kelas & rombel yang sesuai kriteria filter.
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
              Silakan tambahkan kelas baru atau sesuaikan filter pencarian di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-5">Nama Rombel / Kelas</th>
                  <th className="py-4 px-4">Tahun Ajaran & Semester</th>
                  <th className="py-4 px-4">Kurikulum</th>
                  <th className="py-4 px-4">Jenjang & Tingkat</th>
                  <th className="py-4 px-4">Jurusan</th>
                  <th className="py-4 px-4">Wali Kelas</th>
                  <th className="py-4 px-4 text-center">Guru Pengampu</th>
                  <th className="py-4 px-4 text-center">Siswa</th>
                  <th className="py-4 px-3 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {classes.map((c) => (
                  <tr 
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition duration-150 cursor-pointer"
                    onClick={() => openDetailModal(c, 'info')}
                  >
                    {/* Nama Rombel */}
                    <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="hover:text-indigo-600 transition font-black text-sm">
                          {c.nama_kelas || c.name}
                        </span>
                      </div>
                    </td>

                    {/* Tahun Ajaran & Semester */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-800 dark:text-gray-200">
                        {c.academic_year?.name || '-'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.semester?.nama_semester || '-'}
                      </div>
                    </td>

                    {/* Kurikulum */}
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 border border-slate-200/60 dark:border-white/5">
                        {c.kurikulum?.nama_kurikulum || 'Kurikulum Merdeka'}
                      </span>
                    </td>

                    {/* Jenjang & Tingkat */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                          {c.jenjang?.kode_jenjang || 'SD/SMP/SMA'}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300 text-xs">
                          {c.tingkat_kelas?.nama_tingkat || `Tingkat ${c.tingkat}`}
                        </span>
                      </div>
                    </td>

                    {/* Jurusan */}
                    <td className="py-4 px-4 text-slate-600 dark:text-gray-400 font-medium">
                      {c.jurusan_relation?.name || c.jurusan || '-'}
                    </td>

                    {/* Wali Kelas */}
                    <td className="py-4 px-4 font-medium text-slate-700 dark:text-gray-300">
                      {c.wali_kelas?.nama || (c.wali_kelas as any)?.name ? (
                        <div>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 block">
                            {c.wali_kelas?.nama || (c.wali_kelas as any)?.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {c.wali_kelas?.login_email || (c.wali_kelas as any)?.email || ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Belum ditentukan</span>
                      )}
                    </td>

                    {/* Guru Pengampu */}
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDetailModal(c, 'teachers')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition border border-emerald-200/60 dark:border-emerald-500/20 shadow-xs"
                        title="Klik untuk melihat / mengelola Guru Pengampu di kelas ini"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{c.guru_mata_pelajaran_count ?? 0} Guru</span>
                      </button>
                    </td>

                    {/* Siswa */}
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDetailModal(c, 'students')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-gray-300 hover:text-indigo-600 font-bold text-xs transition border border-slate-200/60 dark:border-white/5"
                        title="Klik untuk melihat / mengelola Siswa di kelas ini"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{c.siswa_count ?? 0} / {c.kapasitas || 36}</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-3 text-center">
                      {c.status_aktif === 'Y' || !c.status_aktif ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setTargetClassForImport(c.id);
                            setTargetAcademicYearForImport(c.academic_year_id);
                            setStudentImportModalOpen(true);
                          }}
                          title="Upload Siswa ke Kelas Ini"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDetailModal(c, 'teachers')}
                          title="Kelola Guru Pengampu Mata Pelajaran"
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDetailModal(c, 'info')}
                          title="Detail Lengkap Kelas"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Can perm="kelas.manage">
                          <button
                            onClick={() => handleToggleClassStatus(c)}
                            title={c.status_aktif === 'Y' ? 'Nonaktifkan Kelas' : 'Aktifkan Kelas'}
                            className={`p-2 rounded-xl transition ${
                              c.status_aktif === 'Y' 
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40' 
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            <Power className="h-4 w-4" />
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
                        </Can>
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
                <School className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Detail Rombel: {activeClassDetail.nama_kelas || activeClassDetail.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeClassDetail.status_aktif === 'Y' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {activeClassDetail.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  {activeClassDetail.academic_year?.name || '-'} • {activeClassDetail.semester?.nama_semester || '-'} • {activeClassDetail.kurikulum?.nama_kurikulum || 'Kurikulum Merdeka'}
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
                <span>Informasi Master</span>
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

              <button
                type="button"
                onClick={() => setDetailTab('history')}
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                  detailTab === 'history'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Riwayat & Status</span>
              </button>
            </div>

            {/* TAB 1: INFORMASI */}
            {detailTab === 'info' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Academic Master Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tahun Ajaran</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.academic_year?.name || '-'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Semester</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.semester?.nama_semester || '-'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Kurikulum</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.kurikulum?.nama_kurikulum || 'Kurikulum Merdeka'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Jenjang & Tingkat</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.jenjang?.nama_jenjang} • {activeClassDetail.tingkat_kelas?.nama_tingkat || `Tingkat ${activeClassDetail.tingkat}`}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Jurusan / Konsentrasi</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {activeClassDetail.jurusan_relation?.name || activeClassDetail.jurusan || 'Umum'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
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
                        (1 Rombel = 1 Wali Kelas)
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {activeClassDetail.wali_kelas?.nama || (activeClassDetail.wali_kelas as any)?.name || 'Belum ditentukan'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      {activeClassDetail.wali_kelas?.login_email || (activeClassDetail.wali_kelas as any)?.email || 'Wali kelas dapat diatur melalui form edit kelas.'}
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

                {/* Guru Pengampu Summary Card */}
                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wide">
                        Guru Pengampu
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                        ({subjectTeachers.length} Guru Pengampu Ditugaskan)
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-gray-200 mt-1">
                      {subjectTeachers.length > 0 
                        ? subjectTeachers.map(st => `${st.guru?.nama || st.iduser_bo} (${st.mata_pelajaran?.nama_mapel || 'Mapel'})`).join(', ')
                        : 'Belum ada guru pengampu yang ditugaskan'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                      Guru pengampu mengajar mata pelajaran tertentu di kelas ini dan terhubung ke CBT & Penilaian.
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailTab('teachers')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Kelola Guru Pengampu</span>
                  </button>
                </div>

                {/* Relational Hub Info Alert */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-start gap-3 text-xs text-slate-600 dark:text-gray-300">
                  <BookOpen className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-gray-200">
                      Pusat Relasi CBT & Akademik
                    </p>
                    <p className="mt-0.5 text-slate-500 dark:text-gray-400 text-[11px] leading-relaxed">
                      Seluruh modul evaluasi pembelajaran (Paket Soal, Jadwal Ujian, Monitoring, Rekap Nilai, Analisis Nilai, dan Rapor) menggunakan data rombel ini. Saat guru memilih kelas yang diampu, sistem secara otomatis menghubungkan Tahun Ajaran, Semester, Kurikulum, Guru Pengampu, dan standar KKM mata pelajaran.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DAFTAR SISWA */}
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

            {/* TAB 3: GURU PENGAMPU MATA PELAJARAN */}
            {detailTab === 'teachers' && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-3">
                {/* Header Action: Tambah Guru Pengampu */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="text-xs text-slate-500 font-medium">
                    Setiap rombel dapat memiliki banyak Guru Pengampu Mata Pelajaran dari Master Akademik
                  </div>
                  {!showSubjectTeacherForm && (
                    <button
                      type="button"
                      onClick={handleOpenAddSubjectTeacher}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tugaskan Guru Pengampu</span>
                    </button>
                  )}
                </div>

                {/* Sub-form: Add / Edit Subject Teacher */}
                {showSubjectTeacherForm && (
                  <form onSubmit={handleSaveSubjectTeacher} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-500/20 space-y-3 shrink-0 animate-scale-up">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        {editingSubjectTeacherId ? 'Ubah / Ganti Guru Pengampu' : 'Tugaskan Guru Pengampu Mata Pelajaran Baru'}
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
                      {/* Mata Pelajaran (Strictly Master Akademik) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
                          Mata Pelajaran (Master Akademik)*
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
                              {m.nama_mapel} ({m.kode_mapel}) • KKM: {m.kkm ?? 75}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Guru Pengampu */}
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
                              {t.name} {t.nip ? `(${t.nip})` : ''} {t.email ? `• ${t.email}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tahun Ajaran */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
                          Tahun Ajaran
                        </label>
                        <select
                          value={formTeacherAyId}
                          onChange={(e) => setFormTeacherAyId(parseInt(e.target.value) || '')}
                          className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          {academicYears.map((ay) => (
                            <option key={ay.id} value={ay.id}>
                              {ay.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
                          Status Pengampu
                        </label>
                        <select
                          value={formTeacherStatus}
                          onChange={(e) => setFormTeacherStatus(e.target.value)}
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
                        <th className="py-2.5 px-4">Mata Pelajaran & KKM</th>
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
                            Belum ada guru pengampu mata pelajaran yang ditugaskan di rombel ini.
                          </td>
                        </tr>
                      ) : (
                        subjectTeachers.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <span>{st.mata_pelajaran?.nama_mapel || `Mapel #${st.idmapel}`}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold">
                                  KKM: {st.mata_pelajaran?.kkm ?? 75}
                                </span>
                              </div>
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

            {/* TAB 4: RIWAYAT & STATUS (Requirement 2) */}
            {detailTab === 'history' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span>Informasi Status & Siklus Hidup Rombel</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Status Operasional</span>
                      <span className={`inline-block mt-1 font-bold px-2.5 py-0.5 rounded-full text-xs ${
                        activeClassDetail.status_aktif === 'Y' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {activeClassDetail.status_aktif === 'Y' ? 'Aktif (Dapat digunakan dalam ujian & KBM)' : 'Nonaktif'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Kapasitas Terisi</span>
                      <span className="font-black text-slate-800 dark:text-slate-200 mt-1 block">
                        {activeClassDetail.siswa?.length || 0} dari {activeClassDetail.kapasitas || 36} Siswa ({Math.round(((activeClassDetail.siswa?.length || 0) / (activeClassDetail.kapasitas || 36)) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-500/10 space-y-2">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Catatan Perubahan & Relasi</h4>
                  <p className="text-slate-600 dark:text-gray-400 leading-relaxed">
                    Setiap pembaruan kelas, pergantian wali kelas, atau perubahan alokasi guru pengampu tersimpan otomatis dan diawasi oleh Audit Trail sistem.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-slate-400">ID Referensi Kelas:</span>
                    <span className="font-mono bg-white dark:bg-black/30 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 font-bold">{activeClassDetail.id}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer with Actions (Requirement 2) */}
            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleClassStatus(activeClassDetail)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                    activeClassDetail.status_aktif === 'Y'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-500/20'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-500/20'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{activeClassDetail.status_aktif === 'Y' ? 'Nonaktifkan Kelas' : 'Aktifkan Kelas'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetClassForImport(activeClassDetail.id);
                    setTargetAcademicYearForImport(activeClassDetail.academic_year_id);
                    setStudentImportModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-500/20 text-xs font-bold transition shadow-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Siswa ke Kelas Ini</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEditModal(activeClassDetail);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Data Kelas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= ADD / EDIT CLASS MODAL ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up max-h-[92vh] flex flex-col">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
                <School className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingClass ? 'Ubah Data Kelas & Rombel' : 'Tambah Kelas & Rombel Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Seluruh referensi akademik bersumber langsung dari Master Akademik
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold shrink-0">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveClass} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Row 1: Tahun Ajaran & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Tahun Ajaran*
                  </label>
                  <select
                    required
                    value={formAcademicYearId}
                    onChange={(e) => handleFormAcademicYearChange(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Pilih Tahun Ajaran --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_active ? '★ (Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Semester*
                  </label>
                  <select
                    required
                    value={formSemesterId}
                    onChange={(e) => setFormSemesterId(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Pilih Semester --</option>
                    {availableSemestersForForm.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_semester} ({s.kode_semester.toUpperCase()}) {s.status_aktif === 'Y' ? '★ (Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Kurikulum & Jenjang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Kurikulum*
                  </label>
                  <select
                    required
                    value={formKurikulumId}
                    onChange={(e) => setFormKurikulumId(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Pilih Kurikulum --</option>
                    {kurikulumList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kurikulum} ({k.kode_kurikulum})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Jenjang Pendidikan*
                  </label>
                  <select
                    required
                    value={formJenjangId}
                    onChange={(e) => handleFormJenjangChange(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Pilih Jenjang --</option>
                    {jenjangList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.kode_jenjang} - {j.nama_jenjang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Tingkat & Jurusan (Jurusan optional if SD/SMP) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Tingkat / Kelas*
                  </label>
                  <select
                    required
                    value={formTingkatId}
                    onChange={(e) => setFormTingkatId(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Pilih Tingkat Kelas --</option>
                    {availableTingkatForForm.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama_tingkat} (Tingkat {t.tingkat})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Jurusan / Konsentrasi {isJenjangNeedsMajor ? '*' : '(Opsional)'}
                  </label>
                  <select
                    value={formJurusanId}
                    onChange={(e) => setFormJurusanId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- {isJenjangNeedsMajor ? 'Pilih Jurusan' : 'Umum / Tanpa Jurusan'} --</option>
                    {availableMajorsForForm.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Nama Rombel & Kapasitas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Nama Rombel / Nama Kelas*
                  </label>
                  <input
                    type="text"
                    required
                    value={formNamaKelas}
                    onChange={(e) => setFormNamaKelas(e.target.value)}
                    placeholder="Contoh: X MIPA 1, 7 Al-Farabi, 10 Cambridge Science"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Kapasitas Siswa
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formKapasitas}
                    onChange={(e) => setFormKapasitas(parseInt(e.target.value) || 36)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Row 5: Wali Kelas & Status Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Wali Kelas (1 Rombel = 1 Wali Kelas)
                  </label>
                  <select
                    value={formWaliKelasId}
                    onChange={(e) => setFormWaliKelasId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="">-- Pilih Guru Wali Kelas (Opsional) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.nip ? `(${t.nip})` : ''} {t.email ? `• ${t.email}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Status Rombel
                  </label>
                  <select
                    value={formStatusAktif}
                    onChange={(e) => setFormStatusAktif(e.target.value as 'Y' | 'N')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="Y">Aktif</option>
                    <option value="N">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  {savingClass && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingClass ? 'Simpan Perubahan' : 'Buat Kelas & Rombel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= STUDENT IMPORT MODAL (Requirement 18) ================= */}
      <StudentImportModal
        isOpen={studentImportModalOpen}
        onClose={() => setStudentImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
          if (activeClassDetail) {
            openDetailModal(activeClassDetail, 'students');
          }
        }}
        initialClassId={targetClassForImport}
        initialAcademicYearId={targetAcademicYearForImport}
      />
    </div>
  );
};

export default ClassesPage;
