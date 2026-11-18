import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { 
  Building2, Plus, Edit2, Trash2, Search, X, 
  Mail, Phone, ShieldCheck,
  GraduationCap, UserCheck, Layers, Package, PlayCircle, 
  RefreshCw, Filter, BookOpen, Calendar, BookMarked,
  KeyRound, History, Activity, Settings
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';
import { Can } from '../../shared/components/Can';

export interface InstansiItem {
  idkategori: string;
  nama_kategori: string;
  jenis_instansi?: string;
  npsn?: string;
  email?: string;
  telp?: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
  status_aktif: string;
  status?: string;
  logo?: string;
  tgl_input?: string;
  created_at?: string;
  guru_count?: number;
  siswa_count?: number;
  kelas_count?: number;
  paket_soal_count?: number;
  ujian_count?: number;
  academic_config?: {
    academic_year_ids?: number[];
    jenjang_ids?: number[];
    tingkat_ids?: number[];
    semester_ids?: number[];
    kurikulum_ids?: number[];
  };
}

export interface MasterOptions {
  academic_years: any[];
  jenjang: any[];
  tingkat_kelas: any[];
  semesters: any[];
  kurikulum: any[];
}

const JENIS_OPTIONS = ['SD', 'SMP', 'SMA', 'SMK', 'Bimbel', 'Perguruan Tinggi', 'Umum'];

export const InstansiPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlStatus = searchParams.get('status');

  const [instansiList, setInstansiList] = useState<InstansiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    if (urlStatus === 'non_aktif' || urlStatus === 'nonaktif') return 'nonaktif';
    if (urlStatus === 'aktif') return 'aktif';
    if (urlStatus === 'expired') return 'expired';
    return '';
  });
  const [jenisFilter, setJenisFilter] = useState('');

  // Master Global Options for Config
  const [masterOptions, setMasterOptions] = useState<MasterOptions>({
    academic_years: [],
    jenjang: [],
    tingkat_kelas: [],
    semesters: [],
    kurikulum: [],
  });

  // Hub Detail Modal state
  const [selectedInstansi, setSelectedInstansi] = useState<InstansiItem | null>(null);
  const [hubDetail, setHubDetail] = useState<any>(null);
  const [loadingHub, setLoadingHub] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'info' | 'admins' | 'gurus' | 'siswas' | 'kelas' | 'mapel' | 'academic_config' | 'stats' | 'audit'
  >('info');

  // Form Modal (Add / Edit Instansi)
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formTab, setFormTab] = useState<'profil' | 'admin' | 'akademik'>('profil');
  const [form, setForm] = useState({
    idkategori: '',
    nama_kategori: '',
    jenis_instansi: 'SMA',
    npsn: '',
    email: '',
    telp: '',
    alamat: '',
    kota: '',
    provinsi: '',
    status_aktif: 'Aktif',
    logo: '',
    // Initial Admin Account
    admin_name: '',
    admin_username: '',
    admin_password: '',
    // Academic Config
    academic_config: {
      academic_year_ids: [] as number[],
      jenjang_ids: [] as number[],
      tingkat_ids: [] as number[],
      semester_ids: [] as number[],
      kurikulum_ids: [] as number[],
    }
  });

  // Sub Modals inside Hub (Admins, Gurus, Siswas, Kelas, Mapel, Reset Password)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [adminForm, setAdminForm] = useState({ nama: '', login_username: '', login_email: '', password: '', telp: '', alamat: '' });

  const [showGuruModal, setShowGuruModal] = useState(false);
  const [editingGuru, setEditingGuru] = useState<any>(null);
  const [guruForm, setGuruForm] = useState({ nama: '', login_username: '', login_email: '', password: '', telp: '', alamat: '' });

  const [showSiswaModal, setShowSiswaModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<any>(null);
  const [siswaForm, setSiswaForm] = useState({ nama: '', nisn: '', login_email: '', password: '', idkelas: '', telp: '' });

  const [showKelasModal, setShowKelasModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState<any>(null);
  const [kelasForm, setKelasForm] = useState({ nama_kelas: '', tingkat: '', idjenjang: '', idtingkat: '', wali_kelas_id: '', kapasitas: 36, academic_year_id: '', semester_id: '', kurikulum_id: '' });

  const [showMapelModal, setShowMapelModal] = useState(false);
  const [editingMapel, setEditingMapel] = useState<any>(null);
  const [mapelForm, setMapelForm] = useState({ nama_mapel: '', kode_mapel: '', kkm: 75, idjenjang: '', idtingkat: '', idkurikulum: '' });

  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Delete / Toggle Status Modal
  const [instansiToToggle, setInstansiToToggle] = useState<InstansiItem | null>(null);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchInstansi = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (jenisFilter) params.jenis = jenisFilter;

      const res = await apiClient.get('/super-admin/instansi', { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setInstansiList(list);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat daftar instansi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterOptions = async () => {
    try {
      const res = await apiClient.get('/super-admin/instansi/master-options');
      if (res.data) {
        setMasterOptions({
          academic_years: res.data.academic_years || [],
          jenjang: res.data.jenjang || [],
          tingkat_kelas: res.data.tingkat_kelas || [],
          semesters: res.data.semesters || [],
          kurikulum: res.data.kurikulum || [],
        });
      }
    } catch (err) {
      console.error('Failed to load master options:', err);
    }
  };

  useEffect(() => {
    fetchMasterOptions();
  }, []);

  useEffect(() => {
    fetchInstansi(currentPage);
  }, [search, statusFilter, jenisFilter, currentPage]);

  // Load School Hub Data
  const loadSchoolHub = async (idkategori: string) => {
    setLoadingHub(true);
    try {
      const res = await apiClient.get(`/super-admin/instansi/${idkategori}`);
      if (res.data) {
        setHubDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load school hub:', err);
      toast.error('Gagal memuat data detail instansi.');
    } finally {
      setLoadingHub(false);
    }
  };

  const handleOpenDetail = (instansi: InstansiItem) => {
    setSelectedInstansi(instansi);
    setActiveTab('info');
    setShowDetailModal(true);
    loadSchoolHub(instansi.idkategori);
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormTab('profil');
    setForm({
      idkategori: '',
      nama_kategori: '',
      jenis_instansi: 'SMA',
      npsn: '',
      email: '',
      telp: '',
      alamat: '',
      kota: '',
      provinsi: '',
      status_aktif: 'Aktif',
      logo: '',
      admin_name: '',
      admin_username: '',
      admin_password: '',
      academic_config: {
        academic_year_ids: masterOptions.academic_years.filter(a => a.is_active).map(a => a.id),
        jenjang_ids: [],
        tingkat_ids: [],
        semester_ids: masterOptions.semesters.map(s => s.id),
        kurikulum_ids: masterOptions.kurikulum.map(k => k.id),
      }
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (instansi: InstansiItem) => {
    setIsEditing(true);
    setFormTab('profil');
    const existingConfig = instansi.academic_config || {};
    setForm({
      idkategori: instansi.idkategori,
      nama_kategori: instansi.nama_kategori,
      jenis_instansi: instansi.jenis_instansi || 'SMA',
      npsn: instansi.npsn || '',
      email: instansi.email || '',
      telp: instansi.telp || '',
      alamat: instansi.alamat || '',
      kota: instansi.kota || '',
      provinsi: instansi.provinsi || '',
      status_aktif: instansi.status_aktif || 'Aktif',
      logo: instansi.logo || '',
      admin_name: '',
      admin_username: '',
      admin_password: '',
      academic_config: {
        academic_year_ids: existingConfig.academic_year_ids || masterOptions.academic_years.filter(a => a.is_active).map(a => a.id),
        jenjang_ids: existingConfig.jenjang_ids || [],
        tingkat_ids: existingConfig.tingkat_ids || [],
        semester_ids: existingConfig.semester_ids || masterOptions.semesters.map(s => s.id),
        kurikulum_ids: existingConfig.kurikulum_ids || masterOptions.kurikulum.map(k => k.id),
      }
    });
    setShowFormModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_kategori.trim()) {
      toast.error('Nama instansi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.put(`/super-admin/instansi/${form.idkategori}`, form);
        toast.success(`Instansi ${form.nama_kategori} berhasil diperbarui.`);
      } else {
        await apiClient.post('/super-admin/instansi', form);
        toast.success(`Instansi ${form.nama_kategori} berhasil ditambahkan.`);
      }
      setShowFormModal(false);
      fetchInstansi();
      if (selectedInstansi && selectedInstansi.idkategori === form.idkategori) {
        loadSchoolHub(form.idkategori);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan data instansi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (instansi: InstansiItem) => {
    try {
      const res = await apiClient.post(`/super-admin/instansi/${instansi.idkategori}/toggle-status`);
      const newStatus = res.data?.status || (instansi.status === 'aktif' || instansi.status_aktif === 'Y' ? 'nonaktif' : 'aktif');
      const newStatusAktif = res.data?.status_aktif || (newStatus === 'aktif' ? 'Y' : 'N');

      setInstansiList(prev => prev.map(item => {
        if (item.idkategori === instansi.idkategori) {
          return { ...item, status: newStatus, status_aktif: newStatusAktif };
        }
        return item;
      }));

      if (selectedInstansi && selectedInstansi.idkategori === instansi.idkategori) {
        setSelectedInstansi(prev => prev ? { ...prev, status: newStatus, status_aktif: newStatusAktif } : null);
        loadSchoolHub(instansi.idkategori);
      }

      toast.success(res.data?.message || `Status instansi ${instansi.nama_kategori} berhasil diperbarui.`);
      setInstansiToToggle(null);
      fetchInstansi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status instansi.');
    }
  };

  // Helper checkbox toggle for academic config
  const toggleConfigItem = (field: keyof typeof form.academic_config, id: number) => {
    setForm(prev => {
      const current = prev.academic_config[field] || [];
      const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return {
        ...prev,
        academic_config: {
          ...prev.academic_config,
          [field]: updated
        }
      };
    });
  };

  // Quick update academic config directly from Hub Tab
  const handleSaveAcademicConfigDirect = async () => {
    if (!selectedInstansi) return;
    try {
      await apiClient.put(`/super-admin/instansi/${selectedInstansi.idkategori}/academic-config`, {
        academic_config: form.academic_config
      });
      toast.success('Konfigurasi Master Global berhasil diperbarui!');
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui konfigurasi akademik.');
    }
  };

  // ==========================================
  // HANDLERS FOR SUB-RESOURCES IN HUB
  // ==========================================

  // 1. Admin Instansi Handlers
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;
    try {
      if (editingAdmin) {
        await apiClient.put(`/super-admin/instansi/${selectedInstansi.idkategori}/admins/${editingAdmin.iduser_bo}`, adminForm);
        toast.success('Data Admin Instansi berhasil diperbarui.');
      } else {
        await apiClient.post(`/super-admin/instansi/${selectedInstansi.idkategori}/admins`, adminForm);
        toast.success('Admin Instansi berhasil ditambahkan.');
      }
      setShowAdminModal(false);
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data Admin.');
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!selectedInstansi || !window.confirm('Yakin ingin menghapus Admin Instansi ini?')) return;
    try {
      await apiClient.delete(`/super-admin/instansi/${selectedInstansi.idkategori}/admins/${adminId}`);
      toast.success('Admin Instansi berhasil dihapus.');
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus Admin.');
    }
  };

  // 2. Guru Handlers
  const handleSaveGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;
    try {
      if (editingGuru) {
        await apiClient.put(`/super-admin/instansi/${selectedInstansi.idkategori}/gurus/${editingGuru.iduser_bo}`, guruForm);
        toast.success('Data Guru berhasil diperbarui.');
      } else {
        await apiClient.post(`/super-admin/instansi/${selectedInstansi.idkategori}/gurus`, guruForm);
        toast.success('Guru berhasil ditambahkan.');
      }
      setShowGuruModal(false);
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data Guru.');
    }
  };

  const handleDeleteGuru = async (guruId: string) => {
    if (!selectedInstansi || !window.confirm('Yakin ingin menghapus Guru ini?')) return;
    try {
      await apiClient.delete(`/super-admin/instansi/${selectedInstansi.idkategori}/gurus/${guruId}`);
      toast.success('Guru berhasil dihapus.');
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus Guru.');
    }
  };

  // 3. Siswa Handlers
  const handleSaveSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;
    try {
      if (editingSiswa) {
        await apiClient.put(`/super-admin/instansi/${selectedInstansi.idkategori}/siswas/${editingSiswa.iduser}`, siswaForm);
        toast.success('Data Siswa berhasil diperbarui.');
      } else {
        await apiClient.post(`/super-admin/instansi/${selectedInstansi.idkategori}/siswas`, siswaForm);
        toast.success('Siswa berhasil ditambahkan.');
      }
      setShowSiswaModal(false);
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data Siswa.');
    }
  };

  const handleDeleteSiswa = async (siswaId: string) => {
    if (!selectedInstansi || !window.confirm('Yakin ingin menonaktifkan Siswa ini?')) return;
    try {
      await apiClient.delete(`/super-admin/instansi/${selectedInstansi.idkategori}/siswas/${siswaId}`);
      toast.success('Siswa berhasil dinonaktifkan.');
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menonaktifkan Siswa.');
    }
  };

  // 4. Kelas Handlers
  const handleSaveKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;
    try {
      if (editingKelas) {
        await apiClient.put(`/super-admin/instansi/${selectedInstansi.idkategori}/kelas/${editingKelas.id}`, kelasForm);
        toast.success('Data Kelas berhasil diperbarui.');
      } else {
        await apiClient.post(`/super-admin/instansi/${selectedInstansi.idkategori}/kelas`, kelasForm);
        toast.success('Kelas berhasil ditambahkan.');
      }
      setShowKelasModal(false);
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data Kelas.');
    }
  };

  const handleDeleteKelas = async (kelasId: number) => {
    if (!selectedInstansi || !window.confirm('Yakin ingin menghapus Kelas ini?')) return;
    try {
      await apiClient.delete(`/super-admin/instansi/${selectedInstansi.idkategori}/kelas/${kelasId}`);
      toast.success('Kelas berhasil dihapus.');
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus Kelas.');
    }
  };

  // 5. Mapel Handlers
  const handleSaveMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;
    try {
      if (editingMapel) {
        await apiClient.put(`/super-admin/instansi/${selectedInstansi.idkategori}/mata-pelajaran/${editingMapel.id}`, mapelForm);
        toast.success('Mata Pelajaran berhasil diperbarui.');
      } else {
        await apiClient.post(`/super-admin/instansi/${selectedInstansi.idkategori}/mata-pelajaran`, mapelForm);
        toast.success('Mata Pelajaran berhasil ditambahkan.');
      }
      setShowMapelModal(false);
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan Mata Pelajaran.');
    }
  };

  const handleDeleteMapel = async (mapelId: number) => {
    if (!selectedInstansi || !window.confirm('Yakin ingin menghapus Mata Pelajaran ini?')) return;
    try {
      await apiClient.delete(`/super-admin/instansi/${selectedInstansi.idkategori}/mata-pelajaran/${mapelId}`);
      toast.success('Mata Pelajaran berhasil dihapus.');
      loadSchoolHub(selectedInstansi.idkategori);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus Mapel.');
    }
  };

  // 6. Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset) return;
    try {
      const res = await apiClient.post(`/super-admin/users/${userToReset.id}/reset-password`, {
        password: newPassword.trim() || undefined
      });
      toast.success(res.data?.message || `Password untuk ${userToReset.nama} berhasil direset!`);
      setShowResetModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Kelola Instansi (Pusat Manajemen Sekolah)
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pusat seluruh data sekolah: Admin Instansi, Guru, Siswa, Kelas & Rombel, Mata Pelajaran, Konfigurasi Master Global, dan Audit.
              </p>
            </div>
          </div>
          <Can perm="instansi.create">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Instansi Baru</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama instansi, NPSN, kota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-gray-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Status: Aktif</option>
            <option value="nonaktif">Status: Non Aktif</option>
            <option value="expired">Status: Expired</option>
          </select>

          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Jenjang / Jenis</option>
            {JENIS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {(search || statusFilter || jenisFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setJenisFilter(''); resetPage(); }}
              className="p-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
              title="Reset Filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Instansi & Kontak</th>
                <th className="py-3 px-3">Jenis & NPSN</th>
                <th className="py-3 px-3">Lokasi</th>
                <th className="py-3 px-3 text-center">Admin</th>
                <th className="py-3 px-3 text-center">Guru</th>
                <th className="py-3 px-3 text-center">Siswa</th>
                <th className="py-3 px-3 text-center">Kelas</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Kelola Data Sekolah</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data instansi...
                  </td>
                </tr>
              ) : instansiList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center font-bold text-slate-500">
                    Tidak ditemukan data instansi yang cocok.
                  </td>
                </tr>
              ) : (
                instansiList.map((instansi) => {
                  const isExpired = (instansi as any).is_expired || instansi.status === 'expired';
                  const isAktif = !isExpired && (
                    instansi.status_aktif === 'Y' || 
                    (instansi.status_aktif || '').toLowerCase() === 'aktif' || 
                    (instansi.status || '').toLowerCase() === 'aktif'
                  );
                  return (
                    <tr key={instansi.idkategori} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-white/10 border border-[#161C2D]/20 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shrink-0 overflow-hidden">
                            {instansi.logo ? (
                              <img src={instansi.logo} alt={instansi.nama_kategori} className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenDetail(instansi)}
                              className="font-bold text-[#161C2D] dark:text-white block hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition cursor-pointer"
                            >
                              {instansi.nama_kategori}
                            </button>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {instansi.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-2.5 w-2.5" />
                                  {instansi.email}
                                </span>
                              )}
                              {instansi.telp && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {instansi.telp}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {instansi.jenis_instansi || 'SMA'}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          NPSN: {instansi.npsn || '-'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 dark:text-gray-300">
                        <span className="font-bold">{instansi.kota || '-'}</span>
                        <span className="block text-[10px] text-slate-400">{instansi.provinsi || '-'}</span>
                      </td>

                      {/* Stat Counts */}
                      <td className="py-3.5 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                        {(instansi as any).admin_count ?? 1}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.guru_count ?? 0}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.siswa_count ?? 0}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.kelas_count ?? 0}
                      </td>

                      {/* Status Aktif / Non Aktif */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(instansi)}
                          title="Klik untuk ubah status aktif/non-aktif"
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition cursor-pointer ${
                            isExpired
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-200'
                              : isAktif 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200' 
                                : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {isExpired ? 'Expired' : isAktif ? 'Aktif' : 'Non Aktif'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(instansi)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold transition cursor-pointer text-xs"
                            title="Buka Pusat Manajemen Data Sekolah"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Kelola Sekolah</span>
                          </button>
                          <Can perm="instansi.edit">
                            <button
                              onClick={() => handleOpenEdit(instansi)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                              title="Edit Instansi & Konfigurasi Akademik"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Can>
                          <Can perm="instansi.delete">
                            <button
                              onClick={() => setInstansiToToggle(instansi)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Nonaktifkan Instansi"
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
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <Pagination
            currentPage={currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={paginationMeta.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MANAGEMENT HUB DETAIL MODAL (PUSAT DATA SEKOLAH TERPADU)                   */}
      {/* ========================================================================= */}
      {showDetailModal && selectedInstansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-5 sm:p-6 max-w-6xl w-full shadow-[8px_8px_0px_0px_#171717] dark:shadow-[8px_8px_0px_0px_#000000] flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Hub Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#161C2D] dark:text-white">
                      {selectedInstansi.nama_kategori}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300">
                      Pusat Manajemen Sekolah
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    NPSN: {selectedInstansi.npsn || '-'} • Jenis: {selectedInstansi.jenis_instansi || 'SMA'} • ID: {selectedInstansi.idkategori}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs (9 Hub Dimensions) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-slate-200 dark:border-white/10 shrink-0 text-xs font-bold scrollbar-none">
              {[
                { key: 'info', label: 'Informasi Instansi', icon: Building2 },
                { key: 'admins', label: 'Admin Instansi', count: hubDetail?.admins?.length, icon: ShieldCheck },
                { key: 'gurus', label: 'Guru', count: hubDetail?.gurus?.length, icon: UserCheck },
                { key: 'siswas', label: 'Siswa', count: hubDetail?.siswas?.length, icon: GraduationCap },
                { key: 'kelas', label: 'Kelas & Rombel', count: hubDetail?.kelas?.length, icon: Layers },
                { key: 'mapel', label: 'Mata Pelajaran', count: hubDetail?.mata_pelajaran?.length, icon: BookOpen },
                { key: 'academic_config', label: 'Master Akademik Instansi', icon: BookMarked },
                { key: 'stats', label: 'Statistik', icon: Activity },
                { key: 'audit', label: 'Aktivitas & Audit', count: hubDetail?.audit_logs?.length, icon: History },
              ].map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-sm font-black' 
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hub Tab Content */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 text-xs">
              {loadingHub ? (
                <div className="py-20 text-center font-bold text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  Memuat data sekolah lengkap...
                </div>
              ) : (
                <>
                  {/* TAB 1: INFORMASI INSTANSI */}
                  {activeTab === 'info' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Nama Sekolah / Instansi</span>
                          <span className="text-sm font-black text-[#161C2D] dark:text-white block">{hubDetail?.instansi?.nama_kategori}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Jenjang & NPSN</span>
                          <span className="text-sm font-bold text-[#161C2D] dark:text-white block">
                            {hubDetail?.instansi?.jenis_instansi || 'SMA'} (NPSN: {hubDetail?.instansi?.npsn || 'Belum diisi'})
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Status Operasional</span>
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            hubDetail?.instansi?.status_aktif === 'Y' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {hubDetail?.instansi?.status_aktif === 'Y' ? 'Aktif' : 'Non Aktif'}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Email & Kontak</span>
                          <span className="font-bold text-[#161C2D] dark:text-white block">
                            {hubDetail?.instansi?.email || '-'} / {hubDetail?.instansi?.telp || '-'}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1 sm:col-span-2">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Alamat Lengkap</span>
                          <span className="font-medium text-[#161C2D] dark:text-white block">
                            {hubDetail?.instansi?.alamat || 'Alamat belum diatur'}, {hubDetail?.instansi?.kota || ''}, {hubDetail?.instansi?.provinsi || ''}
                          </span>
                        </div>
                      </div>

                      {/* Quick Summary Numbers */}
                      <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800/40">
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200 mb-3">
                          Ringkasan Data Sekolah
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                          <div className="p-3 rounded-xl bg-white dark:bg-[#161C2D] border border-indigo-100 dark:border-white/5">
                            <span className="text-lg font-black text-purple-600 block">{hubDetail?.admins?.length ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-500">Admin</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white dark:bg-[#161C2D] border border-indigo-100 dark:border-white/5">
                            <span className="text-lg font-black text-indigo-600 block">{hubDetail?.statistics?.total_guru ?? hubDetail?.gurus?.length ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-500">Guru</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white dark:bg-[#161C2D] border border-indigo-100 dark:border-white/5">
                            <span className="text-lg font-black text-cyan-600 block">{hubDetail?.statistics?.total_siswa ?? hubDetail?.siswas?.length ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-500">Siswa</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white dark:bg-[#161C2D] border border-indigo-100 dark:border-white/5">
                            <span className="text-lg font-black text-amber-600 block">{hubDetail?.statistics?.total_kelas ?? hubDetail?.kelas?.length ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-500">Kelas</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white dark:bg-[#161C2D] border border-indigo-100 dark:border-white/5">
                            <span className="text-lg font-black text-emerald-600 block">{hubDetail?.mata_pelajaran?.length ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-500">Mata Pelajaran</span>
                          </div>
                          <div className="p-3 rounded-xl bg-white dark:bg-[#161C2D] border border-indigo-100 dark:border-white/5">
                            <span className="text-lg font-black text-rose-600 block">{hubDetail?.statistics?.total_ujian ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-500">Paket Soal</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDetailModal(false);
                            handleOpenEdit(selectedInstansi);
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                        >
                          Edit Data & Konfigurasi Instansi
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ADMIN INSTANSI */}
                  {activeTab === 'admins' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-sm text-[#161C2D] dark:text-white">Admin Instansi ({selectedInstansi.nama_kategori})</h4>
                          <p className="text-[11px] text-slate-400">Pengelola operasional sekolah yang berhak mengatur data guru, siswa, kelas, dan jadwal ujian.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingAdmin(null);
                            setAdminForm({ nama: '', login_username: '', login_email: '', password: '', telp: '', alamat: '' });
                            setShowAdminModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah Admin Instansi</span>
                        </button>
                      </div>

                      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-[#0B1014]/40 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-black text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Nama Admin</th>
                              <th className="py-2.5 px-3">Username</th>
                              <th className="py-2.5 px-3">Email & Telp</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {(hubDetail?.admins || []).length === 0 ? (
                              <tr><td colSpan={5} className="py-8 text-center text-slate-400">Belum ada akun Admin Instansi.</td></tr>
                            ) : (
                              hubDetail.admins.map((a: any) => (
                                <tr key={a.iduser_bo} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{a.nama}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-purple-600">@{a.login_username}</td>
                                  <td className="py-2.5 px-3 text-slate-500">{a.login_email || '-'} / {a.telp || '-'}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      {a.status_aktif === 'Y' ? 'Aktif' : 'Non Aktif'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setUserToReset({ id: a.iduser_bo, nama: a.nama });
                                          setNewPassword('');
                                          setShowResetModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-amber-600"
                                        title="Reset Password"
                                      >
                                        <KeyRound className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingAdmin(a);
                                          setAdminForm({
                                            nama: a.nama,
                                            login_username: a.login_username,
                                            login_email: a.login_email,
                                            password: '',
                                            telp: a.telp || '',
                                            alamat: a.alamat || '',
                                          });
                                          setShowAdminModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                                        title="Edit Admin"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAdmin(a.iduser_bo)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                                        title="Hapus Admin"
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

                  {/* TAB 3: GURU */}
                  {activeTab === 'gurus' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-sm text-[#161C2D] dark:text-white">Daftar Guru Pengajar ({selectedInstansi.nama_kategori})</h4>
                          <p className="text-[11px] text-slate-400">Guru sekolah yang memiliki akses menyusun bank soal dan mengelola ujian.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingGuru(null);
                            setGuruForm({ nama: '', login_username: '', login_email: '', password: '', telp: '', alamat: '' });
                            setShowGuruModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah Guru</span>
                        </button>
                      </div>

                      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-[#0B1014]/40 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-black text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Nama Guru</th>
                              <th className="py-2.5 px-3">NIP / Username</th>
                              <th className="py-2.5 px-3">Mapel Diampu</th>
                              <th className="py-2.5 px-3">Email & Kontak</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {(hubDetail?.gurus || []).length === 0 ? (
                              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada data Guru terdaftar.</td></tr>
                            ) : (
                              hubDetail.gurus.map((g: any) => (
                                <tr key={g.iduser_bo} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{g.nama}</td>
                                  <td className="py-2.5 px-3 font-mono font-medium">{g.login_username}</td>
                                  <td className="py-2.5 px-3">
                                    {(g.mapel_ajar && g.mapel_ajar.length > 0) ? (
                                      <div className="flex flex-wrap gap-1">
                                        {g.mapel_ajar.map((m: string, idx: number) => (
                                          <span key={idx} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-bold">
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Belum diatur</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{g.login_email || '-'} / {g.telp || '-'}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      {g.status_aktif === 'Y' ? 'Aktif' : 'Non Aktif'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setUserToReset({ id: g.iduser_bo, nama: g.nama });
                                          setNewPassword('');
                                          setShowResetModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-amber-600"
                                        title="Reset Password"
                                      >
                                        <KeyRound className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingGuru(g);
                                          setGuruForm({
                                            nama: g.nama,
                                            login_username: g.login_username,
                                            login_email: g.login_email,
                                            password: '',
                                            telp: g.telp || '',
                                            alamat: g.alamat || '',
                                          });
                                          setShowGuruModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                                        title="Edit Guru"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteGuru(g.iduser_bo)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                                        title="Hapus Guru"
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

                  {/* TAB 4: SISWA */}
                  {activeTab === 'siswas' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-sm text-[#161C2D] dark:text-white">Daftar Siswa ({selectedInstansi.nama_kategori})</h4>
                          <p className="text-[11px] text-slate-400">Peserta ujian online CBT di sekolah ini.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingSiswa(null);
                            setSiswaForm({ nama: '', nisn: '', login_email: '', password: '', idkelas: '', telp: '' });
                            setShowSiswaModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah Siswa</span>
                        </button>
                      </div>

                      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-[#0B1014]/40 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-black text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Nama Siswa</th>
                              <th className="py-2.5 px-3">NISN</th>
                              <th className="py-2.5 px-3">Kelas / Rombel</th>
                              <th className="py-2.5 px-3">Email & Kontak</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {(hubDetail?.siswas || []).length === 0 ? (
                              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada data Siswa terdaftar.</td></tr>
                            ) : (
                              hubDetail.siswas.map((s: any) => (
                                <tr key={s.iduser} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{s.nama}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-600">{s.nisn}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-white/10">
                                      {s.kelas_name || '-'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{s.login_email || '-'} / {s.telp || '-'}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      {s.status_aktif === 'Y' ? 'Aktif' : 'Non Aktif'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setUserToReset({ id: s.iduser, nama: s.nama });
                                          setNewPassword('');
                                          setShowResetModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-amber-600"
                                        title="Reset Password"
                                      >
                                        <KeyRound className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSiswa(s);
                                          setSiswaForm({
                                            nama: s.nama,
                                            nisn: s.nisn,
                                            login_email: s.login_email,
                                            password: '',
                                            idkelas: s.idkelas || '',
                                            telp: s.telp || '',
                                          });
                                          setShowSiswaModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                                        title="Edit Siswa"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSiswa(s.iduser)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                                        title="Nonaktifkan Siswa"
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

                  {/* TAB 5: KELAS & ROMBEL */}
                  {activeTab === 'kelas' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-sm text-[#161C2D] dark:text-white">Kelas & Rombel ({selectedInstansi.nama_kategori})</h4>
                          <p className="text-[11px] text-slate-400">Rombongan belajar sekolah beserta wali kelas dan kapasitas siswa.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingKelas(null);
                            setKelasForm({ nama_kelas: '', tingkat: '', idjenjang: '', idtingkat: '', wali_kelas_id: '', kapasitas: 36, academic_year_id: '', semester_id: '', kurikulum_id: '' });
                            setShowKelasModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah Kelas</span>
                        </button>
                      </div>

                      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-[#0B1014]/40 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-black text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Nama Kelas / Rombel</th>
                              <th className="py-2.5 px-3">Tingkat & Jenjang</th>
                              <th className="py-2.5 px-3">Wali Kelas</th>
                              <th className="py-2.5 px-3 text-center">Jumlah Siswa</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {(hubDetail?.kelas || []).length === 0 ? (
                              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada Kelas & Rombel terdaftar.</td></tr>
                            ) : (
                              hubDetail.kelas.map((k: any) => (
                                <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{k.nama_kelas}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-medium text-slate-700 dark:text-gray-300">
                                      Tingkat {k.tingkat || k.tingkatKelas?.tingkat || '-'} ({k.jenjang?.nama_jenjang || '-'})
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">
                                    {k.wali_kelas?.nama || k.waliKelas?.nama || 'Belum ditentukan'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-bold">
                                    {k.siswa_count ?? 0} / {k.kapasitas ?? 36}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      {k.status_aktif === 'Y' ? 'Aktif' : 'Non Aktif'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingKelas(k);
                                          setKelasForm({
                                            nama_kelas: k.nama_kelas,
                                            tingkat: k.tingkat || '',
                                            idjenjang: k.idjenjang || '',
                                            idtingkat: k.idtingkat || '',
                                            wali_kelas_id: k.wali_kelas_id || '',
                                            kapasitas: k.kapasitas || 36,
                                            academic_year_id: k.academic_year_id || '',
                                            semester_id: k.semester_id || '',
                                            kurikulum_id: k.kurikulum_id || '',
                                          });
                                          setShowKelasModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                                        title="Edit Kelas"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteKelas(k.id)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                                        title="Hapus Kelas"
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

                  {/* TAB 6: MATA PELAJARAN */}
                  {activeTab === 'mapel' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-sm text-[#161C2D] dark:text-white">Mata Pelajaran Khusus ({selectedInstansi.nama_kategori})</h4>
                          <p className="text-[11px] text-slate-400">Mata pelajaran yang diajarkan dan diujikan di instansi ini beserta KKM-nya.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingMapel(null);
                            setMapelForm({ nama_mapel: '', kode_mapel: '', kkm: 75, idjenjang: '', idtingkat: '', idkurikulum: '' });
                            setShowMapelModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah Mata Pelajaran</span>
                        </button>
                      </div>

                      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-[#0B1014]/40 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-black text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Mata Pelajaran</th>
                              <th className="py-2.5 px-3">Kode Mapel</th>
                              <th className="py-2.5 px-3">Jenjang & Tingkat</th>
                              <th className="py-2.5 px-3">Kurikulum</th>
                              <th className="py-2.5 px-3 text-center">KKM</th>
                              <th className="py-2.5 px-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {(hubDetail?.mata_pelajaran || []).length === 0 ? (
                              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada Mata Pelajaran khusus instansi ini.</td></tr>
                            ) : (
                              hubDetail.mata_pelajaran.map((m: any) => (
                                <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{m.nama_mapel}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">{m.kode_mapel || '-'}</td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">
                                    {m.jenjang?.nama_jenjang || '-'} {m.tingkat_kelas ? `(Tingkat ${m.tingkat_kelas.tingkat})` : ''}
                                  </td>
                                  <td className="py-2.5 px-3">{m.kurikulum?.nama_kurikulum || '-'}</td>
                                  <td className="py-2.5 px-3 text-center font-black text-indigo-600">{m.kkm ?? 75}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingMapel(m);
                                          setMapelForm({
                                            nama_mapel: m.nama_mapel,
                                            kode_mapel: m.kode_mapel || '',
                                            kkm: m.kkm ?? 75,
                                            idjenjang: m.idjenjang || '',
                                            idtingkat: m.idtingkat || '',
                                            idkurikulum: m.idkurikulum || '',
                                          });
                                          setShowMapelModal(true);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                                        title="Edit Mapel"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMapel(m.id)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                                        title="Hapus Mapel"
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

                  {/* TAB 7: MASTER AKADEMIK INSTANSI (ACADEMIC CONFIG) */}
                  {activeTab === 'academic_config' && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-black text-sm text-[#161C2D] dark:text-white">Konfigurasi Master Global Instansi</h4>
                          <p className="text-[11px] text-slate-500 dark:text-gray-400">
                            Super Admin menentukan referensi Master Global mana saja yang diaktifkan untuk sekolah ini. Admin Instansi hanya menerima dan menggunakan data ini sebagai acuan.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveAcademicConfigDirect}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer shrink-0"
                        >
                          Simpan Perubahan Konfigurasi
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Tahun Ajaran */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/10 space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                            <Calendar className="h-4 w-4 text-indigo-600" />
                            <h5 className="font-black text-xs text-[#161C2D] dark:text-white">Tahun Ajaran Aktif</h5>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {masterOptions.academic_years.map(ay => {
                              const checked = form.academic_config.academic_year_ids?.includes(ay.id);
                              return (
                                <label key={ay.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-white/10 transition cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleConfigItem('academic_year_ids', ay.id)}
                                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <span className="font-bold text-[#161C2D] dark:text-white">{ay.name}</span>
                                  {ay.is_active && <span className="ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Aktif Nasional</span>}
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Jenjang */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/10 space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                            <Layers className="h-4 w-4 text-purple-600" />
                            <h5 className="font-black text-xs text-[#161C2D] dark:text-white">Jenjang yang Dimiliki</h5>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {masterOptions.jenjang.map(j => {
                              const checked = form.academic_config.jenjang_ids?.includes(j.id);
                              return (
                                <label key={j.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-white/10 transition cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleConfigItem('jenjang_ids', j.id)}
                                    className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                  />
                                  <span className="font-bold text-[#161C2D] dark:text-white">{j.nama_jenjang} ({j.kode_jenjang})</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. Tingkat Kelas */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/10 space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                            <GraduationCap className="h-4 w-4 text-cyan-600" />
                            <h5 className="font-black text-xs text-[#161C2D] dark:text-white">Tingkat Kelas yang Dibuka</h5>
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {masterOptions.tingkat_kelas.map(t => {
                              const checked = form.academic_config.tingkat_ids?.includes(t.id);
                              return (
                                <label key={t.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-white/10 transition cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleConfigItem('tingkat_ids', t.id)}
                                    className="h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                  />
                                  <span className="font-bold text-[#161C2D] dark:text-white">
                                    Tingkat {t.tingkat} {t.jenjang ? `(${t.jenjang.kode_jenjang})` : ''}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* 4. Kurikulum & Semester */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/10 space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                            <BookMarked className="h-4 w-4 text-amber-600" />
                            <h5 className="font-black text-xs text-[#161C2D] dark:text-white">Semester & Kurikulum Digunakan</h5>
                          </div>
                          <div className="space-y-3 max-h-40 overflow-y-auto">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">Pilihan Semester:</span>
                              <div className="flex flex-wrap gap-2">
                                {masterOptions.semesters.map(s => {
                                  const checked = form.academic_config.semester_ids?.includes(s.id);
                                  return (
                                    <label key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-amber-50 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleConfigItem('semester_ids', s.id)}
                                        className="h-3.5 w-3.5 rounded text-amber-600 cursor-pointer"
                                      />
                                      <span className="font-bold text-[11px] text-[#161C2D] dark:text-white">{s.nama_semester}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">Pilihan Kurikulum:</span>
                              <div className="space-y-1">
                                {masterOptions.kurikulum.map(k => {
                                  const checked = form.academic_config.kurikulum_ids?.includes(k.id);
                                  return (
                                    <label key={k.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-amber-50 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleConfigItem('kurikulum_ids', k.id)}
                                        className="h-3.5 w-3.5 rounded text-amber-600 cursor-pointer"
                                      />
                                      <span className="font-bold text-[11px] text-[#161C2D] dark:text-white">{k.nama_kurikulum} ({k.kode_kurikulum})</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 8: STATISTIK */}
                  {activeTab === 'stats' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-black text-sm text-[#161C2D] dark:text-white">5 Dimensi Statistik Real Instansi</h4>
                        <p className="text-[11px] text-slate-400">Metrik penggunaan sumber daya, kapasitas, dan aktivitas CBT.</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-center">
                          <UserCheck className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
                          <span className="text-2xl font-black text-indigo-900 dark:text-indigo-200 block">
                            {hubDetail?.statistics?.total_guru ?? hubDetail?.gurus?.length ?? 0}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600">Total Guru</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-center">
                          <GraduationCap className="h-5 w-5 text-cyan-600 mx-auto mb-2" />
                          <span className="text-2xl font-black text-cyan-900 dark:text-cyan-200 block">
                            {hubDetail?.statistics?.total_siswa ?? hubDetail?.siswas?.length ?? 0}
                          </span>
                          <span className="text-[10px] font-bold text-cyan-600">Total Siswa</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-center">
                          <Layers className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                          <span className="text-2xl font-black text-purple-900 dark:text-purple-200 block">
                            {hubDetail?.statistics?.total_kelas ?? hubDetail?.kelas?.length ?? 0}
                          </span>
                          <span className="text-[10px] font-bold text-purple-600">Total Kelas</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                          <Package className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                          <span className="text-2xl font-black text-amber-900 dark:text-amber-200 block">
                            {hubDetail?.statistics?.total_paket_soal ?? 0}
                          </span>
                          <span className="text-[10px] font-bold text-amber-600">Paket Soal</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
                          <PlayCircle className="h-5 w-5 text-rose-600 mx-auto mb-2" />
                          <span className="text-2xl font-black text-rose-900 dark:text-rose-200 block">
                            {hubDetail?.statistics?.total_ujian ?? 0}
                          </span>
                          <span className="text-[10px] font-bold text-rose-600">Total Ujian</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                          <BookOpen className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                          <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 block">
                            {hubDetail?.statistics?.total_bank_soal ?? 0}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">Butir Bank Soal</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 9: AKTIVITAS & AUDIT */}
                  {activeTab === 'audit' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-black text-sm text-[#161C2D] dark:text-white">Audit Trail & Log Aktivitas Instansi</h4>
                        <p className="text-[11px] text-slate-400">Riwayat perubahan data sekolah, pembuatan akun, dan aktivitas administratif.</p>
                      </div>

                      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-[#0B1014]/40 border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase font-black text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Waktu</th>
                              <th className="py-2.5 px-3">Aksi</th>
                              <th className="py-2.5 px-3">Modul</th>
                              <th className="py-2.5 px-3">Keterangan</th>
                              <th className="py-2.5 px-3">Oleh</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {(hubDetail?.audit_logs || []).length === 0 ? (
                              <tr><td colSpan={5} className="py-8 text-center text-slate-400">Belum ada riwayat aktivitas tercatat.</td></tr>
                            ) : (
                              hubDetail.audit_logs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                                    {log.tgl_audit ? new Date(log.tgl_audit).toLocaleString('id-ID') : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                                    {log.jenis_aksi || log.action || '-'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10">
                                      {log.modul || log.table_name || '-'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 dark:text-gray-300">
                                    {log.keterangan || log.description || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-slate-500">
                                    {log.user_name || log.created_by || 'Sistem'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hub Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Pusat Manajemen Multi-Tenant CBT • Terintegrasi Penuh
              </span>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer text-[#161C2D] dark:text-white"
              >
                Tutup Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM MODAL (TAMBAH / EDIT INSTANSI & CONFIG AKADEMIK)                     */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-3xl w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] flex flex-col max-h-[92vh] overflow-hidden">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    {isEditing ? 'Edit Data & Konfigurasi Instansi' : 'Pendaftaran Instansi Baru & Master Global'}
                  </h3>
                  <p className="text-xs text-slate-400">Tentukan profil sekolah serta izin referensi Master Global</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Tabs */}
            <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 dark:border-white/10 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setFormTab('profil')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  formTab === 'profil' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300'
                }`}
              >
                1. Profil Instansi
              </button>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setFormTab('admin')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    formTab === 'admin' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300'
                  }`}
                >
                  2. Akun Admin Sekolah
                </button>
              )}
              <button
                type="button"
                onClick={() => setFormTab('akademik')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  formTab === 'akademik' ? 'bg-indigo-600 text-white font-black' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300'
                }`}
              >
                {isEditing ? '2. Konfigurasi Master Global' : '3. Konfigurasi Master Global'}
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              
              {/* TAB PROFIL */}
              {formTab === 'profil' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Nama Instansi / Sekolah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SMA Negeri 1 Jakarta"
                      value={form.nama_kategori}
                      onChange={(e) => setForm({ ...form, nama_kategori: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Jenis / Jenjang Instansi <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={form.jenis_instansi}
                        onChange={(e) => setForm({ ...form, jenis_instansi: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-[#1A1E22] text-[#161C2D] dark:text-white font-bold focus:outline-none cursor-pointer"
                      >
                        {JENIS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        NPSN
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 20101234"
                        value={form.npsn}
                        onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Email Resmi Sekolah
                      </label>
                      <input
                        type="email"
                        placeholder="info@sman1jakarta.sch.id"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        No. Telepon / Fax
                      </label>
                      <input
                        type="text"
                        placeholder="021-12345678"
                        value={form.telp}
                        onChange={(e) => setForm({ ...form, telp: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        placeholder="Jakarta Selatan"
                        value={form.kota}
                        onChange={(e) => setForm({ ...form, kota: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Provinsi
                      </label>
                      <input
                        type="text"
                        placeholder="DKI Jakarta"
                        value={form.provinsi}
                        onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Alamat Lengkap
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Jl. Budi Utomo No. 7..."
                      value={form.alamat}
                      onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        URL Logo Instansi (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={form.logo}
                        onChange={(e) => setForm({ ...form, logo: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Status Instansi
                      </label>
                      <select
                        value={form.status_aktif}
                        onChange={(e) => setForm({ ...form, status_aktif: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-[#1A1E22] text-[#161C2D] dark:text-white font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Non Aktif">Non Aktif</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB ADMIN INSTANSI AWAL */}
              {formTab === 'admin' && !isEditing && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0" />
                    <div>
                      <span className="font-black text-purple-900 dark:text-purple-200 block">Akun Admin Sekolah Pertama</span>
                      <span className="text-[11px] text-purple-700 dark:text-purple-400">
                        Akun ini otomatis dibuatkan hak akses sebagai Admin Instansi untuk mengelola data operasional sekolah.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Nama Admin Instansi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Admin SMA Negeri 1"
                      value={form.admin_name}
                      onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Username Login Admin
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: admin_sman1"
                        value={form.admin_username}
                        onChange={(e) => setForm({ ...form, admin_username: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Password Admin
                      </label>
                      <input
                        type="password"
                        placeholder="Minimal 4 karakter"
                        value={form.admin_password}
                        onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB AKADEMIK (ACADEMIC CONFIG) */}
              {formTab === 'akademik' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                    <span className="font-black text-indigo-900 dark:text-indigo-200 block">Pemberian Referensi Master Global</span>
                    <span className="text-[11px] text-indigo-700 dark:text-indigo-400">
                      Pilih data master global mana saja yang dapat digunakan oleh Admin Instansi untuk menyusun kelas, rombel, dan jadwal ujian sekolah.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tahun Ajaran */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                      <span className="font-black text-xs text-[#161C2D] dark:text-white block">Tahun Ajaran Aktif</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {masterOptions.academic_years.map(ay => (
                          <label key={ay.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.academic_config.academic_year_ids?.includes(ay.id)}
                              onChange={() => toggleConfigItem('academic_year_ids', ay.id)}
                              className="h-3.5 w-3.5 rounded text-indigo-600 cursor-pointer"
                            />
                            <span className="font-bold text-[#161C2D] dark:text-white">{ay.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Jenjang */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                      <span className="font-black text-xs text-[#161C2D] dark:text-white block">Jenjang Sekolah</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {masterOptions.jenjang.map(j => (
                          <label key={j.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.academic_config.jenjang_ids?.includes(j.id)}
                              onChange={() => toggleConfigItem('jenjang_ids', j.id)}
                              className="h-3.5 w-3.5 rounded text-purple-600 cursor-pointer"
                            />
                            <span className="font-bold text-[#161C2D] dark:text-white">{j.nama_jenjang}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tingkat */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 sm:col-span-2">
                      <span className="font-black text-xs text-[#161C2D] dark:text-white block">Tingkat Kelas Dibuka</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto">
                        {masterOptions.tingkat_kelas.map(t => (
                          <label key={t.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.academic_config.tingkat_ids?.includes(t.id)}
                              onChange={() => toggleConfigItem('tingkat_ids', t.id)}
                              className="h-3.5 w-3.5 rounded text-cyan-600 cursor-pointer"
                            />
                            <span className="font-bold text-[#161C2D] dark:text-white">Tingkat {t.tingkat}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer text-[#161C2D] dark:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Daftarkan Instansi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODALS (ADMIN, GURU, SISWA, KELAS, MAPEL, RESET PASSWORD)              */}
      {/* ========================================================================= */}

      {/* 1. Modal Admin Instansi */}
      {showAdminModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] rounded-3xl p-5 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h4 className="font-black text-sm text-[#161C2D] dark:text-white">
              {editingAdmin ? 'Edit Admin Instansi' : 'Tambah Admin Instansi'}
            </h4>
            <form onSubmit={handleSaveAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Lengkap *</label>
                <input required type="text" value={adminForm.nama} onChange={e => setAdminForm({...adminForm, nama: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Username *</label>
                  <input required type="text" value={adminForm.login_username} onChange={e => setAdminForm({...adminForm, login_username: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email *</label>
                  <input required type="email" value={adminForm.login_email} onChange={e => setAdminForm({...adminForm, login_email: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">{editingAdmin ? 'Password Baru (Opsional)' : 'Password *'}</label>
                <input type="password" required={!editingAdmin} value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div>
                <label className="block font-bold mb-1">No. Telepon</label>
                <input type="text" value={adminForm.telp} onChange={e => setAdminForm({...adminForm, telp: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdminModal(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold">Batal</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Guru */}
      {showGuruModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] rounded-3xl p-5 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h4 className="font-black text-sm text-[#161C2D] dark:text-white">
              {editingGuru ? 'Edit Data Guru' : 'Tambah Guru Baru'}
            </h4>
            <form onSubmit={handleSaveGuru} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Lengkap Guru *</label>
                <input required type="text" value={guruForm.nama} onChange={e => setGuruForm({...guruForm, nama: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Username / NIP *</label>
                  <input required type="text" value={guruForm.login_username} onChange={e => setGuruForm({...guruForm, login_username: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email *</label>
                  <input required type="email" value={guruForm.login_email} onChange={e => setGuruForm({...guruForm, login_email: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">{editingGuru ? 'Password Baru (Opsional)' : 'Password *'}</label>
                <input type="password" required={!editingGuru} value={guruForm.password} onChange={e => setGuruForm({...guruForm, password: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div>
                <label className="block font-bold mb-1">No. Telepon</label>
                <input type="text" value={guruForm.telp} onChange={e => setGuruForm({...guruForm, telp: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowGuruModal(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold">Batal</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Siswa */}
      {showSiswaModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] rounded-3xl p-5 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h4 className="font-black text-sm text-[#161C2D] dark:text-white">
              {editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h4>
            <form onSubmit={handleSaveSiswa} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Siswa *</label>
                <input required type="text" value={siswaForm.nama} onChange={e => setSiswaForm({...siswaForm, nama: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">NISN *</label>
                  <input required type="text" value={siswaForm.nisn} onChange={e => setSiswaForm({...siswaForm, nisn: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email *</label>
                  <input required type="email" value={siswaForm.login_email} onChange={e => setSiswaForm({...siswaForm, login_email: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Pilih Kelas</label>
                  <select value={siswaForm.idkelas} onChange={e => setSiswaForm({...siswaForm, idkelas: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#1A1E22]">
                    <option value="">-- Tanpa Kelas --</option>
                    {(hubDetail?.kelas || []).map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">{editingSiswa ? 'Password (Opsional)' : 'Password *'}</label>
                  <input type="password" required={!editingSiswa} value={siswaForm.password} onChange={e => setSiswaForm({...siswaForm, password: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">No. Telepon</label>
                <input type="text" value={siswaForm.telp} onChange={e => setSiswaForm({...siswaForm, telp: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSiswaModal(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold">Batal</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Kelas */}
      {showKelasModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] rounded-3xl p-5 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h4 className="font-black text-sm text-[#161C2D] dark:text-white">
              {editingKelas ? 'Edit Data Kelas & Rombel' : 'Tambah Kelas & Rombel'}
            </h4>
            <form onSubmit={handleSaveKelas} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Kelas / Rombel *</label>
                <input required type="text" placeholder="Contoh: XII MIPA 1" value={kelasForm.nama_kelas} onChange={e => setKelasForm({...kelasForm, nama_kelas: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Tingkat (1-12)</label>
                  <input type="text" placeholder="12" value={kelasForm.tingkat} onChange={e => setKelasForm({...kelasForm, tingkat: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Kapasitas Siswa</label>
                  <input type="number" value={kelasForm.kapasitas} onChange={e => setKelasForm({...kelasForm, kapasitas: Number(e.target.value)})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Wali Kelas</label>
                <select value={kelasForm.wali_kelas_id} onChange={e => setKelasForm({...kelasForm, wali_kelas_id: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#1A1E22]">
                  <option value="">-- Belum Ada Wali Kelas --</option>
                  {(hubDetail?.gurus || []).map((g: any) => (
                    <option key={g.iduser_bo} value={g.iduser_bo}>{g.nama}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowKelasModal(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold">Batal</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Mapel */}
      {showMapelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] rounded-3xl p-5 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h4 className="font-black text-sm text-[#161C2D] dark:text-white">
              {editingMapel ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
            </h4>
            <form onSubmit={handleSaveMapel} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Mata Pelajaran *</label>
                <input required type="text" placeholder="Contoh: Matematika Peminatan" value={mapelForm.nama_mapel} onChange={e => setMapelForm({...mapelForm, nama_mapel: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kode Mapel</label>
                  <input type="text" placeholder="MTK-12" value={mapelForm.kode_mapel} onChange={e => setMapelForm({...mapelForm, kode_mapel: e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono" />
                </div>
                <div>
                  <label className="block font-bold mb-1">KKM Kelulusan</label>
                  <input type="number" min={0} max={100} value={mapelForm.kkm} onChange={e => setMapelForm({...mapelForm, kkm: Number(e.target.value)})} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowMapelModal(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold">Batal</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Reset Password */}
      {showResetModal && userToReset && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] rounded-3xl p-5 max-w-sm w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <h4 className="font-black text-sm text-[#161C2D] dark:text-white">
              Reset Password: {userToReset.nama}
            </h4>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Password Baru (Opsional)</label>
                <input
                  type="password"
                  placeholder="Kosongkan untuk auto-generate password default"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowResetModal(false)} className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold">Batal</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-600 text-white font-bold">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Toggle Status Instansi */}
      {instansiToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] rounded-3xl p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_#171717] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#161C2D] dark:text-white">
                  Ubah Status Instansi?
                </h3>
                <p className="text-xs text-slate-400">{instansiToToggle.nama_kategori}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-gray-300">
              Apakah Anda yakin ingin mengubah status instansi ini? Jika dinonaktifkan, akun admin sekolah, guru, dan siswa terkait tidak dapat mengakses CBT.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInstansiToToggle(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(instansiToToggle)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Ubah Status
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
