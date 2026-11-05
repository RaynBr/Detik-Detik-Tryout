import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { 
  Building2, Plus, Edit2, Trash2, Search, X, 
  Mail, Phone, 
  GraduationCap, UserCheck, Layers, Package, PlayCircle, 
  Eye, RefreshCw, Filter, BookOpen, Calendar, BookMarked, Compass, ShieldAlert
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

export interface AcademicSummary {
  tahun_ajaran: number;
  semester: number;
  kurikulum: number;
  jenjang: number;
  jurusan: number;
  tingkat_kelas: number;
  mata_pelajaran: number;
  kelas: number;
  total_all: number;
}

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
    return '';
  });
  const [jenisFilter, setJenisFilter] = useState('');

  useEffect(() => {
    if (urlStatus) {
      setStatusFilter(urlStatus === 'non_aktif' || urlStatus === 'nonaktif' ? 'nonaktif' : urlStatus);
    }
  }, [urlStatus]);

  // Detail Modal
  const [selectedInstansi, setSelectedInstansi] = useState<InstansiItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Master Akademik Read-Only Summary & Detail States
  const [academicSummary, setAcademicSummary] = useState<AcademicSummary | null>(null);
  const [loadingAcademicSummary, setLoadingAcademicSummary] = useState(false);
  const [showAcademicDetailModal, setShowAcademicDetailModal] = useState(false);
  const [academicDetails, setAcademicDetails] = useState<any>(null);
  const [loadingAcademicDetails, setLoadingAcademicDetails] = useState(false);
  const [activeAcademicTab, setActiveAcademicTab] = useState<'tahun_ajaran' | 'semester' | 'kurikulum' | 'jenjang' | 'jurusan' | 'tingkat_kelas' | 'mata_pelajaran'>('tahun_ajaran');

  // Form Modal (Add / Edit)
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  });

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

  useEffect(() => {
    fetchInstansi(currentPage);
  }, [search, statusFilter, jenisFilter, currentPage]);

  const handleOpenAdd = () => {
    setIsEditing(false);
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
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (instansi: InstansiItem) => {
    setIsEditing(true);
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
    });
    setShowFormModal(true);
  };

  const handleOpenDetail = async (instansi: InstansiItem) => {
    setSelectedInstansi(instansi);
    setShowDetailModal(true);
    setLoadingAcademicSummary(true);
    setAcademicSummary(null);
    try {
      const res = await apiClient.get(`/super-admin/instansi/${instansi.idkategori}`);
      if (res.data?.master_akademik_summary) {
        setAcademicSummary(res.data.master_akademik_summary);
      }
    } catch (err) {
      console.error('Failed to load academic summary:', err);
    } finally {
      setLoadingAcademicSummary(false);
    }
  };

  const handleOpenAcademicDetail = async (instansi: InstansiItem) => {
    setShowAcademicDetailModal(true);
    setLoadingAcademicDetails(true);
    try {
      const res = await apiClient.get(`/super-admin/instansi/${instansi.idkategori}/academic-details`);
      setAcademicDetails(res.data || null);
    } catch (err) {
      console.error('Failed to fetch academic details', err);
      toast.error('Gagal memuat data detail akademik.');
    } finally {
      setLoadingAcademicDetails(false);
    }
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

      // Optimistic & instant state update to prevent stale UI
      setInstansiList(prev => prev.map(item => {
        if (item.idkategori === instansi.idkategori) {
          return {
            ...item,
            status: newStatus,
            status_aktif: newStatusAktif
          };
        }
        return item;
      }));

      if (selectedInstansi && selectedInstansi.idkategori === instansi.idkategori) {
        setSelectedInstansi(prev => prev ? { ...prev, status: newStatus, status_aktif: newStatusAktif } : null);
      }

      toast.success(res.data?.message || `Status instansi ${instansi.nama_kategori} berhasil diperbarui.`);
      setInstansiToToggle(null);
      // Background re-fetch to ensure complete synchronization
      fetchInstansi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status instansi.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                1. Kelola Instansi Mitra CBT
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pendaftaran, verifikasi, statistik sumber daya, dan hak operasional sekolah se-Indonesia.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Instansi Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari instansi, NPSN, kota..."
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
            <option value="non_aktif">Status: Non Aktif</option>
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
                <th className="py-3 px-3 text-center">Guru</th>
                <th className="py-3 px-3 text-center">Siswa</th>
                <th className="py-3 px-3 text-center">Kelas</th>
                <th className="py-3 px-3 text-center">Paket</th>
                <th className="py-3 px-3 text-center">Ujian</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data instansi...
                  </td>
                </tr>
              ) : instansiList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center font-bold text-slate-500">
                    Tidak ditemukan data instansi yang cocok.
                  </td>
                </tr>
              ) : (
                instansiList.map((instansi) => {
                  const isAktif = instansi.status_aktif === 'Y' || 
                                  (instansi.status_aktif || '').toLowerCase() === 'aktif' || 
                                  (instansi.status || '').toLowerCase() === 'aktif';
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
                            <span className="font-bold text-[#161C2D] dark:text-white block hover:text-indigo-600 transition">
                              {instansi.nama_kategori}
                            </span>
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

                      {/* 5 Statistik Real */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.guru_count ?? 0}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.siswa_count ?? 0}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.kelas_count ?? 0}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.paket_soal_count ?? 0}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">
                        {instansi.ujian_count ?? 0}
                      </td>

                      {/* Status Aktif / Non Aktif */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(instansi)}
                          title="Klik untuk ubah status aktif/non-aktif"
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition cursor-pointer ${
                            isAktif 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {isAktif ? 'Aktif' : 'Non Aktif'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(instansi)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                            title="Detail Instansi & Statistik"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(instansi)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Edit Instansi"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setInstansiToToggle(instansi)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Nonaktifkan / Hapus Instansi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Detail & Statistics Modal */}
      {showDetailModal && selectedInstansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-2xl w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    Detail Profil Instansi
                  </h3>
                  <p className="text-xs text-slate-400">ID: {selectedInstansi.idkategori}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 5 Real Statistics Cards */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Statistik Sumber Daya
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-center">
                  <UserCheck className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
                  <span className="text-lg font-black text-indigo-900 dark:text-indigo-200 block">
                    {selectedInstansi.guru_count ?? 0}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Total Guru</span>
                </div>
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-center">
                  <GraduationCap className="h-4 w-4 text-cyan-600 mx-auto mb-1" />
                  <span className="text-lg font-black text-cyan-900 dark:text-cyan-200 block">
                    {selectedInstansi.siswa_count ?? 0}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">Total Siswa</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-center">
                  <Layers className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                  <span className="text-lg font-black text-purple-900 dark:text-purple-200 block">
                    {selectedInstansi.kelas_count ?? 0}
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Total Kelas</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                  <Package className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                  <span className="text-lg font-black text-amber-900 dark:text-amber-200 block">
                    {selectedInstansi.paket_soal_count ?? 0}
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Paket Soal</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-center">
                  <PlayCircle className="h-4 w-4 text-rose-600 mx-auto mb-1" />
                  <span className="text-lg font-black text-rose-900 dark:text-rose-200 block">
                    {selectedInstansi.ujian_count ?? 0}
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Total Ujian</span>
                </div>
              </div>
            </div>

            {/* Profile Fields List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Nama Instansi</span>
                <span className="font-bold text-[#161C2D] dark:text-white text-sm">{selectedInstansi.nama_kategori}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Jenis & NPSN</span>
                <span className="font-bold text-[#161C2D] dark:text-white">
                  {selectedInstansi.jenis_instansi || 'SMA'} (NPSN: {selectedInstansi.npsn || 'Belum diisi'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Email & Kontak</span>
                <span className="font-bold text-[#161C2D] dark:text-white">
                  {selectedInstansi.email || '-'} / {selectedInstansi.telp || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Status Penggunaan</span>
                {(() => {
                  const isDetailAktif = selectedInstansi.status_aktif === 'Y' || 
                                        (selectedInstansi.status_aktif || '').toLowerCase() === 'aktif' || 
                                        (selectedInstansi.status || '').toLowerCase() === 'aktif';
                  return (
                    <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                      isDetailAktif
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}>
                      {isDetailAktif ? 'Aktif' : 'Non Aktif'}
                    </span>
                  );
                })()}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 sm:col-span-2 space-y-1">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Alamat & Wilayah</span>
                <span className="font-medium text-[#161C2D] dark:text-white block">
                  {selectedInstansi.alamat || 'Alamat belum diatur'}, {selectedInstansi.kota || ''}, {selectedInstansi.provinsi || ''}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 sm:col-span-2 space-y-1">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Tanggal Dibuat / Registrasi</span>
                <span className="font-mono text-slate-500 dark:text-gray-400">
                  {selectedInstansi.created_at || selectedInstansi.tgl_input || '-'}
                </span>
              </div>
            </div>

            {/* Master Akademik Summary Section (Read Only) */}
            <div className="p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-black text-[#161C2D] dark:text-white">
                    Master Akademik
                  </h4>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                  Read Only
                </span>
              </div>

              {loadingAcademicSummary ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Memuat ringkasan data akademik...</span>
                </div>
              ) : !academicSummary || (
                  (academicSummary.tahun_ajaran || 0) +
                  (academicSummary.semester || 0) +
                  (academicSummary.kurikulum || 0) +
                  (academicSummary.jenjang || 0) +
                  (academicSummary.jurusan || 0) +
                  (academicSummary.tingkat_kelas || 0) +
                  (academicSummary.mata_pelajaran || 0) === 0
                ) ? (
                <div className="p-4 text-center text-xs font-bold text-slate-500 bg-white/70 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                  Belum ada data.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Tahun Ajaran</span>
                    </span>
                    <span className="font-bold text-[#161C2D] dark:text-white">
                      : {academicSummary.tahun_ajaran}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Semester</span>
                    </span>
                    <span className="font-bold text-[#161C2D] dark:text-white">
                      : {academicSummary.semester}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Kurikulum</span>
                    </span>
                    <span className="font-bold text-[#161C2D] dark:text-white">
                      : {academicSummary.kurikulum}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Jenjang</span>
                    </span>
                    <span className="font-bold text-[#161C2D] dark:text-white">
                      : {academicSummary.jenjang}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Jurusan</span>
                    </span>
                    <span className="font-bold text-[#161C2D] dark:text-white">
                      : {academicSummary.jurusan}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Tingkat/Kelas</span>
                    </span>
                    <span className="font-bold text-[#161C2D] dark:text-white">
                      : {academicSummary.tingkat_kelas}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-white/5 sm:col-span-2">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>Mata Pelajaran</span>
                    </span>
                    <span className="font-bold text-[#161C2D] dark:text-white">
                      : {academicSummary.mata_pelajaran}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-t border-indigo-200/60 dark:border-indigo-800/20">
                <span className="text-[11px] text-slate-500 dark:text-gray-400 italic">
                  Data bersifat read only. Pengelolaan penuh dilakukan oleh Admin Instansi.
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenAcademicDetail(selectedInstansi)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-white/10 hover:bg-indigo-50 dark:hover:bg-white/20 border-2 border-indigo-300 dark:border-indigo-700 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Detail</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer text-[#161C2D] dark:text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Academic Detail Modal (Super Admin View Only) */}
      {showAcademicDetailModal && selectedInstansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-4xl w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-5 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                      Detail Master Akademik: {selectedInstansi.nama_kategori}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      Read Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Super Admin hanya bertugas memantau platform. Data akademik dikelola penuh oleh instansi terkait.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAcademicDetailModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Read-Only Alert Banner */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-gray-300">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Halaman ini berstatus <strong>Read-Only</strong>. Tidak ada tombol Create, Update, atau Delete pada tampilan Super Admin.
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-white/10 pb-2">
              {[
                { key: 'tahun_ajaran', label: 'Tahun Ajaran', count: academicDetails?.academic_years?.length ?? 0, icon: Calendar },
                { key: 'semester', label: 'Semester', count: academicDetails?.semesters?.length ?? 0, icon: BookOpen },
                { key: 'kurikulum', label: 'Kurikulum', count: academicDetails?.kurikulum?.length ?? 0, icon: BookMarked },
                { key: 'jenjang', label: 'Jenjang', count: academicDetails?.jenjang?.length ?? 0, icon: Layers },
                { key: 'jurusan', label: 'Jurusan', count: academicDetails?.majors?.length ?? 0, icon: Compass },
                { key: 'tingkat_kelas', label: 'Tingkat/Kelas', count: academicDetails?.tingkat_kelas?.length ?? 0, icon: Building2 },
                { key: 'mata_pelajaran', label: 'Mata Pelajaran', count: academicDetails?.mata_pelajaran?.length ?? 0, icon: BookOpen },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeAcademicTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveAcademicTab(tab.key as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            {loadingAcademicDetails ? (
              <div className="py-12 text-center text-xs font-bold text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Memuat data detail akademik...
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[220px]">
                {/* 1. Tahun Ajaran */}
                {activeAcademicTab === 'tahun_ajaran' && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black text-[10px]">
                        <th className="py-2.5 px-3">Tahun Ajaran</th>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Tanggal Mulai</th>
                        <th className="py-2.5 px-3">Tanggal Selesai</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(academicDetails?.academic_years || []).length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">Belum ada data Tahun Ajaran.</td></tr>
                      ) : (
                        academicDetails.academic_years.map((row: any) => (
                          <tr key={row.id}>
                            <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{row.year}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{row.code || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{row.start_date || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{row.end_date || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400'
                              }`}>
                                {row.is_active ? 'Aktif' : 'Non Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 2. Semester */}
                {activeAcademicTab === 'semester' && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black text-[10px]">
                        <th className="py-2.5 px-3">Nama Semester</th>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(academicDetails?.semesters || []).length === 0 ? (
                        <tr><td colSpan={3} className="py-6 text-center text-slate-400">Belum ada data Semester.</td></tr>
                      ) : (
                        academicDetails.semesters.map((row: any) => (
                          <tr key={row.id}>
                            <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{row.nama_semester}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{row.kode_semester || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400'
                              }`}>
                                {row.is_active ? 'Aktif' : 'Non Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 3. Kurikulum */}
                {activeAcademicTab === 'kurikulum' && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black text-[10px]">
                        <th className="py-2.5 px-3">Nama Kurikulum</th>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Tahun</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(academicDetails?.kurikulum || []).length === 0 ? (
                        <tr><td colSpan={4} className="py-6 text-center text-slate-400">Belum ada data Kurikulum.</td></tr>
                      ) : (
                        academicDetails.kurikulum.map((row: any) => (
                          <tr key={row.id}>
                            <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{row.nama_kurikulum}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{row.kode_kurikulum || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{row.tahun || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400'
                              }`}>
                                {row.is_active ? 'Aktif' : 'Non Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 4. Jenjang */}
                {activeAcademicTab === 'jenjang' && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black text-[10px]">
                        <th className="py-2.5 px-3">Nama Jenjang</th>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Tingkat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(academicDetails?.jenjang || []).length === 0 ? (
                        <tr><td colSpan={3} className="py-6 text-center text-slate-400">Belum ada data Jenjang.</td></tr>
                      ) : (
                        academicDetails.jenjang.map((row: any) => (
                          <tr key={row.id}>
                            <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{row.nama_jenjang}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{row.kode_jenjang || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{row.tingkat || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 5. Jurusan */}
                {activeAcademicTab === 'jurusan' && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black text-[10px]">
                        <th className="py-2.5 px-3">Nama Jurusan</th>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Bidang Keahlian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(academicDetails?.majors || []).length === 0 ? (
                        <tr><td colSpan={3} className="py-6 text-center text-slate-400">Belum ada data Jurusan.</td></tr>
                      ) : (
                        academicDetails.majors.map((row: any) => (
                          <tr key={row.id}>
                            <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{row.name}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{row.code || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{row.category || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 6. Tingkat/Kelas */}
                {activeAcademicTab === 'tingkat_kelas' && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black text-[10px]">
                        <th className="py-2.5 px-3">Tingkat</th>
                        <th className="py-2.5 px-3">Nama Tingkat</th>
                        <th className="py-2.5 px-3">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(academicDetails?.tingkat_kelas || []).length === 0 ? (
                        <tr><td colSpan={3} className="py-6 text-center text-slate-400">Belum ada data Tingkat Kelas.</td></tr>
                      ) : (
                        academicDetails.tingkat_kelas.map((row: any) => (
                          <tr key={row.id}>
                            <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">Tingkat {row.tingkat}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-gray-300">{row.nama_tingkat}</td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-gray-400">{row.deskripsi || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 7. Mata Pelajaran */}
                {activeAcademicTab === 'mata_pelajaran' && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black text-[10px]">
                        <th className="py-2.5 px-3">Mata Pelajaran</th>
                        <th className="py-2.5 px-3">Kode Mapel</th>
                        <th className="py-2.5 px-3">Kelompok</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(academicDetails?.mata_pelajaran || []).length === 0 ? (
                        <tr><td colSpan={4} className="py-6 text-center text-slate-400">Belum ada data Mata Pelajaran.</td></tr>
                      ) : (
                        academicDetails.mata_pelajaran.map((row: any) => (
                          <tr key={row.id}>
                            <td className="py-2.5 px-3 font-bold text-[#161C2D] dark:text-white">{row.nama_mapel}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{row.kode_mapel || '-'}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{row.kelompok || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400'
                              }`}>
                                {row.is_active ? 'Aktif' : 'Non Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowAcademicDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer text-[#161C2D] dark:text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Add / Edit) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-xl w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                {isEditing ? 'Edit Informasi Instansi' : 'Tambah Instansi Mitra Baru'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Nama Instansi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMA Negeri 1 Indonesia"
                  value={form.nama_kategori}
                  onChange={(e) => setForm({ ...form, nama_kategori: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Jenis Instansi</label>
                  <select
                    value={form.jenis_instansi}
                    onChange={(e) => setForm({ ...form, jenis_instansi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  >
                    {JENIS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">NPSN (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 20108899"
                    value={form.npsn}
                    onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Email Resmi</label>
                  <input
                    type="email"
                    placeholder="sekolah@kemdikbud.go.id"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Nomor HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={form.telp}
                    onChange={(e) => setForm({ ...form, telp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Jl. Merdeka No. 45, RT 01/RW 02"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    placeholder="Kota Jakarta Selatan"
                    value={form.kota}
                    onChange={(e) => setForm({ ...form, kota: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Provinsi</label>
                  <input
                    type="text"
                    placeholder="DKI Jakarta"
                    value={form.provinsi}
                    onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">URL Logo Instansi</label>
                  <input
                    type="text"
                    placeholder="https://... atau /images/logo.png"
                    value={form.logo}
                    onChange={(e) => setForm({ ...form, logo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Status Operasional</label>
                  <select
                    value={form.status_aktif}
                    onChange={(e) => setForm({ ...form, status_aktif: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white font-medium"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non Aktif">Non Aktif</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Daftarkan Instansi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Toggle Status / Soft Delete */}
      {instansiToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 max-w-sm w-full shadow-[5px_5px_0px_0px_#171717] space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl border border-amber-200 w-fit">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#161C2D] dark:text-white">Ubah Status / Nonaktifkan?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin mengubah status operasional instansi <strong>{instansiToToggle.nama_kategori}</strong>? Instansi yang dinonaktifkan tidak akan dapat diakses oleh admin atau siswanya.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setInstansiToToggle(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleToggleStatus(instansiToToggle)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
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
