import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import {
  BookOpen,
  Filter,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  X,
  FileQuestion,
  ListOrdered,
  AlertTriangle,
  Download,
  Upload,
  Calendar
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';
import { BankSoalImportModal } from './components/BankSoalImportModal';

interface CascadingOptions {
  jenjang: Array<{ id: number; nama_jenjang: string; kode_jenjang: string }>;
  tingkat?: Array<{ id: number; idtingkat?: number | null; tingkat: number; nama_tingkat: string; label: string; idjenjang?: number | null }>;
  kelas: Array<{ id: number; idjenjang: number; nama_kelas: string; tingkat: number }>;
  mata_pelajaran: Array<{ id: number; idjenjang: number; nama_mapel: string; kode_mapel: string; kkm?: string }>;
  tahun_ajaran: Array<{ id: number; name: string; is_active: number }>;
  tahun_soal: Array<{ id: number; tahun: string; keterangan?: string }>;
}

interface QuestionPackageItem {
  id: string;
  idassessment: string;
  judul_soal: string;
  deskripsi?: string;
  idjenjang: number;
  jenjang: string;
  tingkat?: number | null;
  idtingkat?: number | null;
  tingkat_label?: string;
  idkelas?: number | null;
  kelas?: string;
  idmapel: number;
  mata_pelajaran: string;
  id_tahun_ajaran: number;
  tahun_ajaran: string;
  tahun_soal_id: number;
  tahun_soal: string;
  jumlah_soal: number;
  status: 'Aktif' | 'Nonaktif';
  status_aktif: 'Y' | 'N';
  terakhir_diubah: string;
}

interface QuestionChoice {
  key: string;
  content: string;
  image?: string | null;
  is_correct: boolean;
}

interface QuestionDetailItem {
  nomor: number;
  id: string;
  pertanyaan: string;
  soal_gambar?: string | null;
  pilihan: QuestionChoice[];
  jawaban_benar: string;
  pembahasan: string;
  tingkat_kesulitan?: string;
  status_aktif: string;
}

export const SuperAdminQuestionBankPage: React.FC = () => {
  // 1. Cascading Options from Database
  const [cascadingData, setCascadingData] = useState<CascadingOptions>({
    jenjang: [],
    tingkat: [],
    kelas: [],
    mata_pelajaran: [],
    tahun_ajaran: [],
    tahun_soal: [],
  });

  // 2. Cascading Filter Selection (Mandatory Entry Flow: Jenjang -> Tingkat -> Mapel -> TA -> Tahun Soal)
  const [selectedJenjang, setSelectedJenjang] = useState<string>('');
  const [selectedTingkat, setSelectedTingkat] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('');
  const [selectedTahunSoal, setSelectedTahunSoal] = useState<string>('');

  // 3. Question List State
  const [packages, setPackages] = useState<QuestionPackageItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('tanggal_input');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination hook
  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(10);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailHeader, setDetailHeader] = useState<any>(null);
  const [detailQuestions, setDetailQuestions] = useState<QuestionDetailItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestionPackageItem | null>(null);
  const [editForm, setEditForm] = useState({
    nama_assessment: '',
    deskripsi_assessment: '',
    idjenjang: '',
    tingkat: '',
    idmapel: '',
    id_tahun_ajaran: '',
    tahun_soal_id: '',
    status: 'Aktif',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<QuestionPackageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nama_assessment: '',
    deskripsi_assessment: '',
    idjenjang: '',
    tingkat: '',
    idmapel: '',
    id_tahun_ajaran: '',
    tahun_soal_id: '',
    status_aktif: 'Y',
  });
  const [creating, setCreating] = useState(false);

  // Helper to get allowed Tingkat numbers based on Jenjang
  const getTingkatForJenjang = useCallback((jenjangId?: string | number): number[] => {
    if (!jenjangId) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    const j = cascadingData.jenjang.find(x => String(x.id) === String(jenjangId));
    const kode = (j?.kode_jenjang || j?.nama_jenjang || '').toUpperCase();
    if (kode.includes('SD') || kode.includes('MI') || kode.includes('DASAR')) return [1, 2, 3, 4, 5, 6];
    if (kode.includes('SMP') || kode.includes('MTS') || kode.includes('PERTAMA')) return [7, 8, 9];
    if (kode.includes('SMA') || kode.includes('SMK') || kode.includes('MA') || kode.includes('ATAS') || kode.includes('KEJURUAN')) return [10, 11, 12];
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }, [cascadingData.jenjang]);

  // Upload Bank Soal Modal & Template Download state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await apiClient.get('/super-admin/question-bank/template', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_upload_bank_soal.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template Excel Bank Soal berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh template Bank Soal.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Fetch cascading filter parameters
  const fetchCascadingParams = useCallback(async (jenjangId = selectedJenjang) => {
    try {
      const res = await apiClient.get('/super-admin/question-bank/cascading-params', {
        params: { idjenjang: jenjangId }
      });
      if (res.data) {
        setCascadingData(res.data);
      }
    } catch (err) {
      console.error('Failed to load cascading params:', err);
    }
  }, [selectedJenjang]);

  useEffect(() => {
    fetchCascadingParams();
  }, []);

  // When Jenjang changes, re-fetch and reset child filters
  const handleJenjangChange = (newJenjang: string) => {
    setSelectedJenjang(newJenjang);
    setSelectedTingkat('');
    setSelectedMapel('');
    fetchCascadingParams(newJenjang);
  };

  // Available Tingkat options according to selected Jenjang
  const availableTingkat = getTingkatForJenjang(selectedJenjang);

  // Filter mapel by selected Jenjang
  const availableMapels = cascadingData.mata_pelajaran.filter(m => 
    !selectedJenjang || String(m.idjenjang) === String(selectedJenjang)
  );

  // Check if primary entry criteria are satisfied
  const isFilterActive = Boolean(selectedJenjang || selectedTingkat || selectedMapel || search);

  // Fetch question packages
  const fetchPackages = useCallback(async (page = currentPage) => {
    setLoadingPackages(true);
    try {
      const params: any = {
        page,
        per_page: 10,
        sort_by: sortBy,
        sort_dir: sortDir,
      };

      if (selectedJenjang) params.idjenjang = selectedJenjang;
      if (selectedTingkat) params.tingkat = selectedTingkat;
      if (selectedMapel) params.idmapel = selectedMapel;
      if (selectedTahunAjaran) params.id_tahun_ajaran = selectedTahunAjaran;
      if (selectedTahunSoal) params.tahun_soal_id = selectedTahunSoal;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await apiClient.get('/super-admin/question-bank', { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setPackages(list);
    } catch (err) {
      console.error('Failed to load question packages:', err);
      toast.error('Gagal memuat daftar bank soal.');
    } finally {
      setLoadingPackages(false);
    }
  }, [
    currentPage,
    selectedJenjang,
    selectedTingkat,
    selectedMapel,
    selectedTahunAjaran,
    selectedTahunSoal,
    statusFilter,
    search,
    sortBy,
    sortDir,
    setPaginationFromResponse
  ]);

  useEffect(() => {
    fetchPackages(currentPage);
  }, [
    fetchPackages,
    currentPage,
    selectedJenjang,
    selectedTingkat,
    selectedMapel,
    selectedTahunAjaran,
    selectedTahunSoal,
    statusFilter,
    sortBy,
    sortDir
  ]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetPage();
    fetchPackages(1);
  };

  // Reset all cascading filters
  const handleResetFilters = () => {
    setSelectedJenjang('');
    setSelectedTingkat('');
    setSelectedMapel('');
    setSelectedTahunAjaran('');
    setSelectedTahunSoal('');
    setSearch('');
    setStatusFilter('');
    resetPage();
  };

  // 1. Detail Soal Action
  const handleOpenDetail = async (item: QuestionPackageItem) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    setDetailHeader(item);
    setDetailQuestions([]);

    try {
      const res = await apiClient.get(`/super-admin/question-bank/${item.id}`);
      if (res.data) {
        setDetailHeader(res.data.header || item);
        setDetailQuestions(res.data.questions || []);
      }
    } catch (err) {
      toast.error('Gagal mengambil detail soal paket.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // 2. Edit Soal Action
  const handleOpenEdit = (item: QuestionPackageItem) => {
    setEditingItem(item);
    const itemJenjang = String(item.idjenjang || '');
    const itemTingkat = String(item.tingkat || '');
    setEditForm({
      nama_assessment: item.judul_soal,
      deskripsi_assessment: item.deskripsi || '',
      idjenjang: itemJenjang,
      tingkat: itemTingkat || '10',
      idmapel: String(item.idmapel || ''),
      id_tahun_ajaran: String(item.id_tahun_ajaran || selectedTahunAjaran),
      tahun_soal_id: String(item.tahun_soal_id || selectedTahunSoal),
      status: item.status,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        tingkat: Number(editForm.tingkat),
      };
      const res = await apiClient.put(`/super-admin/question-bank/${editingItem.id}`, payload);
      const updated = res.data?.data;

      // Reactive instant state update without reloading page
      setPackages(prev => prev.map(p => {
        if (p.id === editingItem.id) {
          const tkVal = Number(editForm.tingkat);
          return {
            ...p,
            judul_soal: editForm.nama_assessment,
            deskripsi: editForm.deskripsi_assessment,
            idjenjang: Number(editForm.idjenjang),
            jenjang: cascadingData.jenjang.find(j => String(j.id) === editForm.idjenjang)?.nama_jenjang || p.jenjang,
            tingkat: tkVal,
            tingkat_label: `Tingkat ${tkVal}`,
            kelas: `Tingkat ${tkVal}`,
            idmapel: Number(editForm.idmapel),
            mata_pelajaran: cascadingData.mata_pelajaran.find(m => String(m.id) === editForm.idmapel)?.nama_mapel || p.mata_pelajaran,
            status: editForm.status === 'Aktif' ? 'Aktif' : 'Nonaktif',
            status_aktif: editForm.status === 'Aktif' ? 'Y' : 'N',
            ...(updated || {})
          };
        }
        return p;
      }));

      toast.success(res.data?.message || 'Data paket soal berhasil diperbarui.');
      setEditModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSavingEdit(false);
    }
  };

  // 3. Hapus Action (Soft Delete)
  const handleOpenDelete = (item: QuestionPackageItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);

    try {
      await apiClient.delete(`/super-admin/question-bank/${itemToDelete.id}`);
      
      // Instant remove from local React state & refresh
      setPackages(prev => prev.filter(p => p.id !== itemToDelete.id));
      toast.success(`Paket soal "${itemToDelete.judul_soal}" berhasil dihapus.`);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchPackages(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus paket soal.');
    } finally {
      setDeleting(false);
    }
  };

  // 4. Aktif / Nonaktif Toggle Action
  const handleToggleStatus = async (item: QuestionPackageItem) => {
    const isCurrentlyActive = item.status === 'Aktif' || item.status_aktif === 'Y';
    const nextStatus = isCurrentlyActive ? 'Nonaktif' : 'Aktif';
    const nextStatusAktif = isCurrentlyActive ? 'N' : 'Y';

    // Optimistic instant state update
    setPackages(prev => prev.map(p => {
      if (p.id === item.id) {
        return {
          ...p,
          status: nextStatus,
          status_aktif: nextStatusAktif,
        };
      }
      return p;
    }));

    try {
      const res = await apiClient.post(`/super-admin/question-bank/${item.id}/toggle-status`);
      toast.success(res.data?.message || `Status diubah menjadi ${nextStatus}.`);
    } catch (err: any) {
      // Revert on error
      setPackages(prev => prev.map(p => p.id === item.id ? item : p));
      toast.error(err.response?.data?.message || 'Gagal mengubah status paket soal.');
    }
  };

  // 5. Tambah Paket Soal Baru
  const handleOpenCreate = () => {
    const defaultJenjang = selectedJenjang || (cascadingData.jenjang[0]?.id ? String(cascadingData.jenjang[0].id) : '3');
    const defaultTingkats = getTingkatForJenjang(defaultJenjang);
    const defaultTingkat = selectedTingkat && defaultTingkats.includes(Number(selectedTingkat))
      ? selectedTingkat
      : String(defaultTingkats[0] || 10);

    setCreateForm({
      nama_assessment: '',
      deskripsi_assessment: '',
      idjenjang: defaultJenjang,
      tingkat: defaultTingkat,
      idmapel: selectedMapel || (cascadingData.mata_pelajaran[0]?.id ? String(cascadingData.mata_pelajaran[0].id) : '1'),
      id_tahun_ajaran: selectedTahunAjaran || (cascadingData.tahun_ajaran[0]?.id ? String(cascadingData.tahun_ajaran[0].id) : '1'),
      tahun_soal_id: selectedTahunSoal || (cascadingData.tahun_soal[0]?.id ? String(cascadingData.tahun_soal[0].id) : '1'),
      status_aktif: 'Y',
    });
    setCreateModalOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nama_assessment.trim()) {
      toast.error('Judul soal / nama paket wajib diisi.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...createForm,
        tingkat: Number(createForm.tingkat),
      };
      await apiClient.post('/super-admin/question-bank', payload);
      toast.success('Paket bank soal berhasil ditambahkan.');
      setCreateModalOpen(false);
      resetPage();
      fetchPackages(1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan paket bank soal.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in font-sans">

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Modul 4 • Bank Soal Terpadu
                </span>
                <span className="text-xs text-slate-400 font-medium">• Cascading Filter Gateway</span>
              </div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight mt-0.5">
                Kelola Bank Soal
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pintu masuk utama bank soal terpadu seluruh Indonesia dengan filter berjenjang (Jenjang → Tingkat → Mapel → Tahun Soal → Tahun Ajaran).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              to="/super-admin/bank-soal/tahun-soal"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
              title="Kelola Referensi Tahun Soal"
            >
              <Calendar className="h-4 w-4" />
              <span>Kelola Tahun Soal</span>
            </Link>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
              title="Download Template Excel (18 Kolom)"
            >
              <Download className="h-4 w-4" />
              <span>{downloadingTemplate ? 'Mengunduh...' : 'Download Template Excel'}</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
              title="Upload & Import Bank Soal Massal"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Bank Soal</span>
            </button>
            <button
              onClick={() => fetchPackages(currentPage)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`h-4 w-4 ${loadingPackages ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Paket Soal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. PARAMETER FILTER (CASCADING ENTRY POINT)              */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-5 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-4">
        
        {/* Step Indicator Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#161C2D] dark:text-white flex items-center gap-2">
                1. Parameter Filter Berurutan (Cascading Filter)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Data Terhubung Master Akademik
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">
                Memilih Jenjang memfilter Tingkat → Memilih Mapel → Terkoneksi Tahun Ajaran & Tahun Soal.
              </p>
            </div>
          </div>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Parameter Filter</span>
            </button>
          )}
        </div>

        {/* 5 Cascading Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* Step 1: Jenjang */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">1</span>
              <span>Jenjang</span>
            </label>
            <select
              value={selectedJenjang}
              onChange={(e) => handleJenjangChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Jenjang</option>
              {cascadingData.jenjang.map((j) => (
                <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Tingkat (Filtered by Jenjang: SD 1-6, SMP 7-9, SMA/SMK 10-12) */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">2</span>
              <span>Tingkat</span>
            </label>
            <select
              value={selectedTingkat}
              onChange={(e) => { setSelectedTingkat(e.target.value); resetPage(); }}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Tingkat</option>
              {availableTingkat.map((tNum) => (
                <option key={tNum} value={tNum}>Tingkat {tNum}</option>
              ))}
            </select>
          </div>

          {/* Step 3: Mata Pelajaran (Filtered by Jenjang/Kelas) */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">3</span>
              <span>Mata Pelajaran</span>
            </label>
            <select
              value={selectedMapel}
              onChange={(e) => { setSelectedMapel(e.target.value); resetPage(); }}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Mata Pelajaran</option>
              {availableMapels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama_mapel} {m.kkm ? `(KKM: ${m.kkm})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 4: Tahun Ajaran */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">4</span>
              <span>Tahun Ajaran</span>
            </label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => { setSelectedTahunAjaran(e.target.value); resetPage(); }}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Tahun Ajaran</option>
              {cascadingData.tahun_ajaran.map((ta) => (
                <option key={ta.id} value={ta.id}>
                  {ta.name} {ta.is_active ? '★ (Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 5: Tahun Soal */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">5</span>
              <span>Tahun Soal</span>
            </label>
            <select
              value={selectedTahunSoal}
              onChange={(e) => { setSelectedTahunSoal(e.target.value); resetPage(); }}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Semua Tahun Soal</option>
              {cascadingData.tahun_soal.map((ts) => (
                <option key={ts.id} value={ts.id}>
                  Tahun {ts.tahun}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Secondary Filter & Search Row */}
        <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul paket soal atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-20 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
            >
              Cari
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs text-slate-400 font-bold">
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Nonaktif">Status: Nonaktif</option>
            </select>

            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split('-');
                setSortBy(sb);
                setSortDir(sd as any);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="tanggal_input-desc">Terbaru Diubah</option>
              <option value="tanggal_input-asc">Terlama</option>
              <option value="nama_assessment-asc">Judul Soal (A-Z)</option>
              <option value="nama_assessment-desc">Judul Soal (Z-A)</option>
              <option value="soal_count-desc">Jumlah Soal Terbanyak</option>
            </select>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. LIST SOAL (SERVER-SIDE PAGINATION TABLE)              */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        
        {/* Table Title & Summary */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="text-sm font-black text-[#161C2D] dark:text-white uppercase tracking-wider">
              2. Daftar Bank Soal
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300">
              Total: {paginationMeta.total} Paket Soal
            </span>
          </div>

          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            Menampilkan data tersaring berdasarkan Parameter Filter
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Judul Soal / Paket</th>
                <th className="py-3 px-3">Jenjang</th>
                <th className="py-3 px-3">Tingkat</th>
                <th className="py-3 px-3">Mata Pelajaran</th>
                <th className="py-3 px-3 text-center">Tahun Soal</th>
                <th className="py-3 px-3 text-center">Jumlah Soal</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Terakhir Diubah</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loadingPackages ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat daftar bank soal...
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 text-slate-400">
                        <FileQuestion className="h-8 w-8" />
                      </div>
                      <h4 className="text-sm font-bold text-[#161C2D] dark:text-white">
                        Tidak Ada Paket Soal Sesuai Filter
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        Cobalah mengubah kombinasi Jenjang, Tingkat, Mapel, atau Tahun Soal pada panel filter di atas.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl border border-[#161C2D] transition shadow-sm cursor-pointer"
                      >
                        Reset Semua Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                packages.map((item) => {
                  const isAktif = item.status === 'Aktif' || item.status_aktif === 'Y';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Judul Soal */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#161C2D] dark:text-white max-w-[260px] truncate" title={item.judul_soal}>
                          {item.judul_soal}
                        </div>
                        {item.deskripsi && (
                          <div className="text-[10px] text-slate-400 max-w-[240px] truncate mt-0.5">
                            {item.deskripsi}
                          </div>
                        )}
                      </td>

                      {/* Jenjang */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.jenjang}
                        </span>
                      </td>

                      {/* Tingkat */}
                      <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-gray-300">
                        {item.tingkat_label || (item.tingkat ? `Tingkat ${item.tingkat}` : (item.kelas || '-'))}
                      </td>

                      {/* Mata Pelajaran */}
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800 dark:text-gray-200 block">
                          {item.mata_pelajaran}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          TA: {item.tahun_ajaran}
                        </span>
                      </td>

                      {/* Tahun Soal */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                          {item.tahun_soal}
                        </span>
                      </td>

                      {/* Jumlah Soal */}
                      <td className="py-3.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-[11px]">
                          {item.jumlah_soal} Butir
                        </span>
                      </td>

                      {/* Status Aktif / Nonaktif Toggle */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          title="Klik untuk ubah status aktif/nonaktif"
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition cursor-pointer ${
                            isAktif
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {isAktif ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>

                      {/* Terakhir Diubah */}
                      <td className="py-3.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                        {item.terakhir_diubah}
                      </td>

                      {/* Actions: Detail, Edit, Hapus */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                            title="Detail Soal"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Edit Soal"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Hapus Soal"
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

        {/* Server-side Pagination */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <Pagination
            currentPage={currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={paginationMeta.perPage}
            from={paginationMeta.from}
            to={paginationMeta.to}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. DETAIL SOAL MODAL                                     */}
      {/* ======================================================== */}
      {detailModalOpen && detailHeader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-3xl w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl border border-[#161C2D]">
                  <FileQuestion className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    4. Detail Soal Bank
                  </h3>
                  <p className="text-xs text-slate-400">
                    Struktur Header Paket & Butir Pertanyaan Lengkap
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Header: Nama Paket, Jenjang, Kelas, Mata Pelajaran, Tahun Soal */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-[#161C2D] dark:border-[#32363A] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Nama Paket Soal:
                  </span>
                  <h4 className="text-base font-black text-[#161C2D] dark:text-white">
                    {detailHeader.nama_paket || detailHeader.judul_soal}
                  </h4>
                  {detailHeader.deskripsi && (
                    <p className="text-xs text-slate-500 mt-0.5">{detailHeader.deskripsi}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${
                    (detailHeader.status_aktif === 'Y' || detailHeader.status === 'Aktif')
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}>
                    {detailHeader.status || (detailHeader.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif')}
                  </span>
                </div>
              </div>

              {/* 4 Core Dimensions Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A1E22] border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Jenjang</span>
                  <span className="font-black text-[#161C2D] dark:text-white">{detailHeader.jenjang}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A1E22] border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tingkat</span>
                  <span className="font-black text-[#161C2D] dark:text-white">
                    {detailHeader.tingkat_label || (detailHeader.tingkat ? `Tingkat ${detailHeader.tingkat}` : (detailHeader.kelas || '-'))}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A1E22] border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Mata Pelajaran</span>
                  <span className="font-black text-[#161C2D] dark:text-white">{detailHeader.mata_pelajaran}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A1E22] border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tahun Soal</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 font-mono">{detailHeader.tahun_soal}</span>
                </div>
              </div>
            </div>

            {/* Daftar Soal: Nomor, Pertanyaan, Pilihan, Jawaban Benar, Pembahasan, Tingkat Kesulitan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
                  <ListOrdered className="h-4 w-4" />
                  <span>Daftar Butir Pertanyaan ({detailQuestions.length} Butir Soal)</span>
                </h4>
              </div>

              {loadingDetail ? (
                <div className="py-12 text-center text-slate-500 font-bold">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Memuat butir pertanyaan...
                </div>
              ) : detailQuestions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500">
                  Belum ada butir pertanyaan yang ditautkan ke paket ini.
                </div>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {detailQuestions.map((q) => (
                    <div
                      key={q.id || q.nomor}
                      className="p-4 rounded-2xl bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] space-y-3"
                    >
                      {/* Nomor & Tingkat Kesulitan */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                            {q.nomor}
                          </span>
                          <span className="text-xs font-bold text-slate-500">Soal Pilihan Ganda</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                          Kesulitan: {q.tingkat_kesulitan || 'Sedang'}
                        </span>
                      </div>

                      {/* Pertanyaan */}
                      <div className="text-xs font-bold text-[#161C2D] dark:text-white leading-relaxed whitespace-pre-wrap">
                        {q.pertanyaan}
                      </div>

                      {/* Pilihan A-E */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.pilihan.map((p) => {
                          const isCorrect = p.is_correct || p.key === q.jawaban_benar;
                          return (
                            <div
                              key={p.key}
                              className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300'
                              }`}
                            >
                              <span className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-300'
                              }`}>
                                {p.key}
                              </span>
                              <span className="flex-1 break-words">{p.content}</span>
                              {isCorrect && (
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Jawaban Benar & Pembahasan */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B1014]/40 border border-slate-200 dark:border-white/10 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-emerald-600">Kunci Jawaban:</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-xs">
                            {q.jawaban_benar}
                          </span>
                        </div>
                        {q.pembahasan && (
                          <div className="pt-1 text-[11px] text-slate-600 dark:text-gray-400">
                            <span className="font-bold text-slate-700 dark:text-gray-300">Pembahasan: </span>
                            {q.pembahasan}
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. EDIT SOAL MODAL                                       */}
      {/* ======================================================== */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-xl w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-4 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                  5. Edit Header & Parameter Paket Soal
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              
              {/* Header Soal (Judul Paket) */}
              <div>
                <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">
                  Header Soal / Judul Paket <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama_assessment}
                  onChange={(e) => setEditForm(prev => ({ ...prev, nama_assessment: e.target.value }))}
                  className="w-full px-3 py-2 font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Deskripsi Soal */}
              <div>
                <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={editForm.deskripsi_assessment}
                  onChange={(e) => setEditForm(prev => ({ ...prev, deskripsi_assessment: e.target.value }))}
                  className="w-full px-3 py-2 font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Jenjang & Tingkat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Jenjang</label>
                  <select
                    value={editForm.idjenjang}
                    onChange={(e) => {
                      const newJ = e.target.value;
                      const validTingkats = getTingkatForJenjang(newJ);
                      setEditForm(prev => ({
                        ...prev,
                        idjenjang: newJ,
                        tingkat: validTingkats.includes(Number(prev.tingkat)) ? prev.tingkat : String(validTingkats[0] || 10)
                      }));
                    }}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {cascadingData.jenjang.map(j => (
                      <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Tingkat</label>
                  <select
                    value={editForm.tingkat}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tingkat: e.target.value }))}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {getTingkatForJenjang(editForm.idjenjang).map(tNum => (
                      <option key={tNum} value={tNum}>Tingkat {tNum}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mata Pelajaran & Tahun Soal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Mata Pelajaran</label>
                  <select
                    value={editForm.idmapel}
                    onChange={(e) => setEditForm(prev => ({ ...prev, idmapel: e.target.value }))}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {cascadingData.mata_pelajaran.map(m => (
                      <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Tahun Soal</label>
                  <select
                    value={editForm.tahun_soal_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tahun_soal_id: e.target.value }))}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {cascadingData.tahun_soal.map(ts => (
                      <option key={ts.id} value={ts.id}>Tahun {ts.tahun}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Status Operasional</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. HAPUS SOAL CONFIRMATION MODAL                         */}
      {/* ======================================================== */}
      {deleteDialogOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 max-w-sm w-full shadow-[5px_5px_0px_0px_#171717] space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl border border-rose-200 w-fit">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#161C2D] dark:text-white">6. Hapus Paket Soal?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus paket <strong>{itemToDelete.judul_soal}</strong>? Sistem akan menerapkan soft-delete dan seluruh jejak audit akan dicatat.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TAMBAH PAKET SOAL BARU                             */}
      {/* ======================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-xl w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-4 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                  Tambah Paket Bank Soal Baru
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-3.5 text-xs">
              
              <div>
                <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">
                  Judul Soal / Nama Paket <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Paket Simulasi Ujian Akhir Matematika"
                  value={createForm.nama_assessment}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, nama_assessment: e.target.value }))}
                  className="w-full px-3 py-2 font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan materi uji, tingkat kesulitan, atau instruksi"
                  value={createForm.deskripsi_assessment}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, deskripsi_assessment: e.target.value }))}
                  className="w-full px-3 py-2 font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Jenjang & Tingkat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Jenjang</label>
                  <select
                    value={createForm.idjenjang}
                    onChange={(e) => {
                      const newJ = e.target.value;
                      const validTingkats = getTingkatForJenjang(newJ);
                      setCreateForm(prev => ({
                        ...prev,
                        idjenjang: newJ,
                        tingkat: validTingkats.includes(Number(prev.tingkat)) ? prev.tingkat : String(validTingkats[0] || 10)
                      }));
                    }}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {cascadingData.jenjang.map(j => (
                      <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Tingkat</label>
                  <select
                    value={createForm.tingkat}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tingkat: e.target.value }))}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {getTingkatForJenjang(createForm.idjenjang).map(tNum => (
                      <option key={tNum} value={tNum}>Tingkat {tNum}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Mata Pelajaran</label>
                  <select
                    value={createForm.idmapel}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, idmapel: e.target.value }))}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {cascadingData.mata_pelajaran.map(m => (
                      <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-gray-300 block mb-1">Tahun Soal</label>
                  <select
                    value={createForm.tahun_soal_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tahun_soal_id: e.target.value }))}
                    className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
                  >
                    {cascadingData.tahun_soal.map(ts => (
                      <option key={ts.id} value={ts.id}>Tahun {ts.tahun}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                >
                  {creating ? 'Menyimpan...' : 'Daftarkan Paket Soal'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4. Import Bank Soal Modal */}
      <BankSoalImportModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchPackages(currentPage);
          fetchCascadingParams();
        }}
      />

    </div>
  );
};

