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
  Award,
  Eye,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { usePaginationUrl } from '../../../shared/utils/usePaginationUrl';
import { Can } from '../../../shared/components/Can';

interface KurikulumOption {
  id: number;
  nama_kurikulum: string;
  kode_kurikulum: string;
}

interface JenjangOption {
  id: number;
  nama_jenjang: string;
  kode_jenjang: string;
}

interface JurusanOption {
  id: number;
  idjenjang: number | null;
  name: string;
  code: string;
  jenjang: string | null;
}

interface TingkatOption {
  id: number;
  idjenjang: number | null;
  idjurusan: number | null;
  tingkat: number;
  nama_tingkat: string;
}

interface AcademicYearOption {
  id: number;
  name: string;
  tahun_ajaran?: string;
  is_active: boolean | number;
}

interface SemesterOption {
  id: number;
  academic_year_id?: number | null;
  nama_semester: string;
  kode_semester: string;
}

interface MasterMataPelajaranItem {
  id: number;
  nama_mapel: string;
  kode_mapel: string;
  academic_year_id?: number | null;
  semester_id?: number | null;
  idkurikulum: number | null;
  idjenjang: number | null;
  idjurusan: number | null;
  idtingkat: number | null;
  kelompok: string | null;
  kkm: number | null;
  deskripsi: string | null;
  status_aktif: 'Y' | 'N';
  academic_year?: AcademicYearOption;
  semester?: SemesterOption;
  kurikulum?: KurikulumOption;
  jenjang?: JenjangOption;
  jurusan?: JurusanOption;
  tingkat_kelas?: TingkatOption;
}

export const MasterMataPelajaranPage: React.FC = () => {
  const location = useLocation();
  const isTenantAdmin = location.pathname.startsWith('/admin');
  const apiBase = isTenantAdmin ? '/admin' : '/super-admin';
  const dashboardLink = isTenantAdmin ? '/admin/dashboard' : '/super-admin/dashboard';
  const masterLink = isTenantAdmin ? '/admin/master-akademik/mata-pelajaran' : '/super-admin/master-akademik/mata-pelajaran';

  const [data, setData] = useState<MasterMataPelajaranItem[]>([]);
  const [academicYearsList, setAcademicYearsList] = useState<AcademicYearOption[]>([]);
  const [semestersList, setSemestersList] = useState<SemesterOption[]>([]);
  const [kurikulumList, setKurikulumList] = useState<KurikulumOption[]>([]);
  const [jenjangList, setJenjangList] = useState<JenjangOption[]>([]);
  const [jurusanList, setJurusanList] = useState<JurusanOption[]>([]);
  const [tingkatList, setTingkatList] = useState<TingkatOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [kurikulumFilter, setKurikulumFilter] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterMataPelajaranItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    academic_year_id: '' as string | number,
    semester_id: '' as string | number,
    idkurikulum: '' as string | number,
    idjenjang: '' as string | number,
    idjurusan: '' as string | number,
    idtingkat: '' as string | number,
    nama_mapel: '',
    kode_mapel: '',
    kelompok: 'Wajib',
    kkm: 75,
    deskripsi: '',
    status_aktif: 'Y' as 'Y' | 'N',
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterMataPelajaranItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail Modal State
  const [detailItem, setDetailItem] = useState<MasterMataPelajaranItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const handleToggleStatus = async (item: MasterMataPelajaranItem) => {
    setTogglingStatus(true);
    try {
      const res = await apiClient.patch(`${apiBase}/subjects/${item.id}/toggle-status`);
      toast.success(res.data?.message || 'Status mata pelajaran berhasil diperbarui.');
      if (detailItem && detailItem.id === item.id) {
        setDetailItem(prev => prev ? { ...prev, status_aktif: prev.status_aktif === 'Y' ? 'N' : 'Y' } : null);
      }
      fetchData(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status mata pelajaran.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchOptions = async () => {
    try {
      const res = await apiClient.get(`${apiBase}/subjects-options`);
      setKurikulumList(res.data?.kurikulum || []);
      setJenjangList(res.data?.jenjang || []);
      setJurusanList(res.data?.jurusan || []);
      setTingkatList(res.data?.tingkat_kelas || []);
      setAcademicYearsList(res.data?.academic_years || res.data?.tahun_ajaran || []);
      setSemestersList(res.data?.semesters || res.data?.semester || []);
    } catch (err) {
      console.error('Failed to load subject options:', err);
    }
  };

  const fetchData = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (academicYearFilter) params.academic_year_id = academicYearFilter;
      if (semesterFilter) params.semester_id = semesterFilter;
      if (kurikulumFilter) params.idkurikulum = kurikulumFilter;
      if (jenjangFilter) params.idjenjang = jenjangFilter;
      if (tingkatFilter) params.idtingkat = tingkatFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get(`${apiBase}/subjects`, { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setData(list);
    } catch (err: any) {
      console.error('Failed to load mata pelajaran:', err);
      toast.error('Gagal memuat data mata pelajaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, academicYearFilter, semesterFilter, kurikulumFilter, jenjangFilter, tingkatFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetPage();
    fetchData(1);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    const activeYear = academicYearsList.find(y => y.is_active)?.id || academicYearsList[0]?.id || '';
    setForm({
      academic_year_id: activeYear,
      semester_id: semestersList[0]?.id || '',
      idkurikulum: kurikulumList[0]?.id || '',
      idjenjang: jenjangList[0]?.id || '',
      idjurusan: '',
      idtingkat: tingkatList[0]?.id || '',
      nama_mapel: '',
      kode_mapel: '',
      kelompok: 'Wajib',
      kkm: 75,
      deskripsi: '',
      status_aktif: 'Y',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: MasterMataPelajaranItem) => {
    setEditingItem(item);
    setForm({
      academic_year_id: item.academic_year_id || academicYearsList[0]?.id || '',
      semester_id: item.semester_id || semestersList[0]?.id || '',
      idkurikulum: item.idkurikulum || '',
      idjenjang: item.idjenjang || '',
      idjurusan: item.idjurusan || '',
      idtingkat: item.idtingkat || '',
      nama_mapel: item.nama_mapel,
      kode_mapel: item.kode_mapel,
      kelompok: item.kelompok || 'Wajib',
      kkm: item.kkm !== null ? item.kkm : 75,
      deskripsi: item.deskripsi || '',
      status_aktif: item.status_aktif,
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
        academic_year_id: form.academic_year_id ? Number(form.academic_year_id) : null,
        semester_id: form.semester_id ? Number(form.semester_id) : null,
        idkurikulum: form.idkurikulum ? Number(form.idkurikulum) : null,
        idjenjang: form.idjenjang ? Number(form.idjenjang) : null,
        idjurusan: form.idjurusan ? Number(form.idjurusan) : null,
        idtingkat: form.idtingkat ? Number(form.idtingkat) : null,
        nama_mapel: form.nama_mapel.trim(),
        kode_mapel: form.kode_mapel.trim().toUpperCase(),
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
      const msg = err.response?.data?.message || 'Gagal menghapus mata pelajaran.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Filter tingkat based on selected jenjang
  const availableTingkat = form.idjenjang
    ? tingkatList.filter(t => !t.idjenjang || String(t.idjenjang) === String(form.idjenjang))
    : tingkatList;

  // Filter jurusan based on selected jenjang
  const availableJurusan = form.idjenjang
    ? jurusanList.filter(j => !j.idjenjang || String(j.idjenjang) === String(form.idjenjang))
    : jurusanList;

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-gray-400">
        <Link to={dashboardLink} className="hover:text-indigo-600 transition">
          Dashboard
        </Link>
        <span>/</span>
        <Link to={masterLink} className="hover:text-indigo-600 transition">
          Master Akademik
        </Link>
        <span>/</span>
        <span className="text-[#161C2D] dark:text-white font-black">
          Mata Pelajaran
        </span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Master Mata Pelajaran & KKM
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Sumber referensi utama mata pelajaran sekolah untuk Guru, Paket Soal, Jadwal Ujian, KKM, dan Laporan CBT.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchData(currentPage); fetchOptions(); }}
              className="p-2.5 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-[#161C2D] dark:text-white transition cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <Can perm="mapel.manage|master.manage">
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Mata Pelajaran</span>
              </button>
            </Can>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama mapel atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={academicYearFilter}
            onChange={(e) => { setAcademicYearFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Th. Ajaran</option>
            {academicYearsList.map(y => (
              <option key={y.id} value={y.id}>{y.tahun_ajaran || y.name}</option>
            ))}
          </select>

          <select
            value={jenjangFilter}
            onChange={(e) => { setJenjangFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Jenjang</option>
            {jenjangList.map(j => (
              <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
            ))}
          </select>

          <select
            value={tingkatFilter}
            onChange={(e) => { setTingkatFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Tingkat</option>
            {tingkatList.map(t => (
              <option key={t.id} value={t.id}>{t.nama_tingkat}</option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={(e) => { setSemesterFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Semester</option>
            {semestersList.map(s => (
              <option key={s.id} value={s.id}>{s.nama_semester}</option>
            ))}
          </select>

          <select
            value={kurikulumFilter}
            onChange={(e) => { setKurikulumFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Kurikulum</option>
            {kurikulumList.map(k => (
              <option key={k.id} value={k.id}>{k.nama_kurikulum}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="Y">Status: Aktif</option>
            <option value="N">Status: Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Mata Pelajaran</th>
                <th className="py-3 px-3">Kurikulum</th>
                <th className="py-3 px-3">Jenjang</th>
                <th className="py-3 px-3">Jurusan</th>
                <th className="py-3 px-3">Tingkat/Kelas</th>
                <th className="py-3 px-3 text-center">KKM</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data master mata pelajaran...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <BookOpen className="h-10 w-10 text-slate-300" />
                      <p className="font-bold text-slate-600 dark:text-gray-300">Belum Ada Data Mata Pelajaran</p>
                      <p className="text-[11px] text-slate-400">Silakan tambahkan data mata pelajaran untuk instansi Anda.</p>
                      <button
                        onClick={handleOpenAdd}
                        className="mt-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                      >
                        Tambah Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isAktif = item.status_aktif === 'Y';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-sm text-[#161C2D] dark:text-white block">
                          {item.nama_mapel}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {item.kode_mapel}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.kelompok || 'Wajib'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.kurikulum?.nama_kurikulum || '-'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-700 dark:text-gray-300">
                          {item.jenjang?.nama_jenjang || '-'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-slate-600 dark:text-gray-400">
                          {item.jurusan?.name || (item.jenjang?.kode_jenjang === 'SD' || item.jenjang?.kode_jenjang === 'SMP' ? 'Semua (Umum)' : '-')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800 dark:text-gray-200">
                          {item.tingkat_kelas?.nama_tingkat || '-'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <Award className="h-3 w-3" />
                          {item.kkm || 75}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          isAktif 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {isAktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setDetailItem(item); setShowDetailModal(true); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer"
                            title="Detail Mata Pelajaran"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <Can perm="mapel.manage|master.manage">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              title="Edit Mata Pelajaran"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus Mata Pelajaran"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 pt-3 border-t border-[#161C2D]/10 dark:border-white/10">
          <Pagination
            currentPage={paginationMeta.currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={paginationMeta.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-lg w-full shadow-[6px_6px_0px_0px_#171717] space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                {editingItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Tahun Ajaran */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    1. Tahun Ajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.academic_year_id}
                    onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                    required
                  >
                    <option value="">-- Pilih Tahun Ajaran --</option>
                    {academicYearsList.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Jenjang */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    2. Jenjang Pendidikan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.idjenjang}
                    onChange={(e) => setForm({ ...form, idjenjang: e.target.value, idjurusan: '', idtingkat: '' })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                    required
                  >
                    <option value="">-- Pilih Jenjang --</option>
                    {jenjangList.map(j => (
                      <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Tingkat */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    3. Tingkat / Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.idtingkat}
                    onChange={(e) => setForm({ ...form, idtingkat: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                    required
                  >
                    <option value="">-- Pilih Tingkat Kelas --</option>
                    {availableTingkat.map(t => (
                      <option key={t.id} value={t.id}>{t.nama_tingkat} (Tingkat {t.tingkat})</option>
                    ))}
                  </select>
                </div>

                {/* 4. Semester */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    4. Semester <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.semester_id}
                    onChange={(e) => setForm({ ...form, semester_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                    required
                  >
                    <option value="">-- Pilih Semester --</option>
                    {semestersList.map(s => (
                      <option key={s.id} value={s.id}>{s.nama_semester}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Kurikulum */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    5. Kurikulum <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.idkurikulum}
                    onChange={(e) => setForm({ ...form, idkurikulum: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                    required
                  >
                    <option value="">-- Pilih Kurikulum --</option>
                    {kurikulumList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama_kurikulum}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Jurusan */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    6. Jurusan / Peminatan (Opsional)
                  </label>
                  <select
                    value={form.idjurusan}
                    onChange={(e) => setForm({ ...form, idjurusan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-medium"
                  >
                    <option value="">-- Tidak Ada / Umum (SD/SMP) --</option>
                    {availableJurusan.map(j => (
                      <option key={j.id} value={j.id}>{j.name} ({j.code})</option>
                    ))}
                  </select>
                </div>

                {/* 7. Kode & Nama Mapel */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    7. Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: MTK-X"
                    value={form.kode_mapel}
                    onChange={(e) => setForm({ ...form, kode_mapel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    8. Nama Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Matematika Wajib"
                    value={form.nama_mapel}
                    onChange={(e) => setForm({ ...form, nama_mapel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                    required
                  />
                </div>

                {/* 9. Kelompok & KKM */}
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    9. Kelompok Mata Pelajaran
                  </label>
                  <select
                    value={form.kelompok}
                    onChange={(e) => setForm({ ...form, kelompok: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                  >
                    <option value="Wajib">Wajib (Umum)</option>
                    <option value="Peminatan">Peminatan</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    10. KKM (Skor Minimum) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.kkm}
                    onChange={(e) => setForm({ ...form, kkm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-black text-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status_aktif}
                    onChange={(e) => setForm({ ...form, status_aktif: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 font-bold"
                  >
                    <option value="Y">Aktif</option>
                    <option value="N">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan silabus atau kompetensi (opsional)..."
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h3 className="text-base font-black text-rose-600">
              Konfirmasi Hapus Mata Pelajaran
            </h3>
            <p className="text-xs text-slate-600 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus mata pelajaran <strong>{itemToDelete.nama_mapel}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-xl w-full shadow-[6px_6px_0px_0px_#171717] space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl border-2 border-[#161C2D]">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#161C2D] dark:text-white">
                    Detail Mata Pelajaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                    Kode: {detailItem.kode_mapel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status & Overview Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 border ${
                  detailItem.status_aktif === 'Y'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {detailItem.status_aktif === 'Y' ? (
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
                  Kelompok: {detailItem.kelompok || 'Wajib'}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-xl border border-amber-300 font-black text-xs">
                <Award className="h-3.5 w-3.5" />
                KKM: {detailItem.kkm || 75}
              </div>
            </div>

            {/* Detail Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Nama Mata Pelajaran</p>
                <p className="font-black text-slate-900 dark:text-white mt-0.5 text-sm">
                  {detailItem.nama_mapel}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tahun Ajaran</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailItem.academic_year?.name || 'Semua Periode / Global'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Jenjang Pendidikan</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailItem.jenjang?.nama_jenjang || 'Semua Jenjang'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tingkat / Kelas</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailItem.tingkat_kelas?.nama_tingkat || 'Semua Tingkat'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Semester</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailItem.semester?.nama_semester || 'Ganjil & Genap'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Kurikulum</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailItem.kurikulum?.nama_kurikulum || 'Semua Kurikulum'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Jurusan / Program</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailItem.jurusan?.name || 'Semua Jurusan / Umum'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Standar KKM</p>
                <p className="font-bold text-slate-800 dark:text-gray-200 mt-0.5">
                  {detailItem.kkm || 75} poin (Batas Kelulusan)
                </p>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
              <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Deskripsi & Silabus Singkat</p>
              <p className="text-xs text-slate-700 dark:text-gray-300">
                {detailItem.deskripsi || 'Tidak ada deskripsi tambahan untuk mata pelajaran ini.'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleToggleStatus(detailItem)}
                disabled={togglingStatus}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-[#161C2D] ${
                  detailItem.status_aktif === 'Y'
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {togglingStatus 
                  ? 'Memproses...' 
                  : detailItem.status_aktif === 'Y' 
                    ? 'Nonaktifkan Mata Pelajaran' 
                    : 'Aktifkan Mata Pelajaran'}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenEdit(detailItem);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer flex items-center gap-1.5"
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
