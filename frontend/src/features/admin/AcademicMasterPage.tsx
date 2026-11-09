import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import {
  CalendarDays,
  Layers,
  BookOpen,
  School,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  RefreshCw,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Check,
  ExternalLink
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

export type AcademicHierarchyTab =
  | 'jenjang'
  | 'kelas'
  | 'mata-pelajaran'
  | 'tahun-ajaran'
  | 'parameter-filter'
  // Secondary / alias tabs for backwards compatibility
  | 'semester'
  | 'kurikulum'
  | 'jurusan'
  | 'tingkat-kelas';

export const AcademicMasterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial active hierarchy tab
  const getInitialTab = (): AcademicHierarchyTab => {
    const fromQuery = searchParams.get('tab') as AcademicHierarchyTab;
    if (fromQuery) return fromQuery;

    // Map legacy path to hierarchy tab
    if (location.pathname.includes('jenjang')) return 'jenjang';
    if (location.pathname.includes('classes')) return 'kelas';
    if (location.pathname.includes('subjects')) return 'mata-pelajaran';
    if (location.pathname.includes('academic-years') || location.pathname.includes('semesters')) return 'tahun-ajaran';
    return 'jenjang';
  };

  const [activeTab, setActiveTab] = useState<AcademicHierarchyTab>(getInitialTab);
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Dropdown reference dependencies
  const [jenjangOptions, setJenjangOptions] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapelOptions, setMapelOptions] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [tahunSoalList, setTahunSoalList] = useState<any[]>([]);
  const tahunSubTab: string = 'tahun-ajaran';

  // Filter within Kelas or Mapel by selected Jenjang
  const [filterJenjangId, setFilterJenjangId] = useState<string>('');

  // Interactive Parameter Filter Simulation State (Node 5)
  const [simJenjang, setSimJenjang] = useState<string>('');
  const [simKelas, setSimKelas] = useState<string>('');
  const [simMapel, setSimMapel] = useState<string>('');
  const [simTahunAjaran, setSimTahunAjaran] = useState<string>('');
  const [simTahunSoal, setSimTahunSoal] = useState<string>('');
  const [simResultCount, setSimResultCount] = useState<number | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Inline KKM edit state
  const [inlineKkmId, setInlineKkmId] = useState<number | null>(null);
  const [inlineKkmValue, setInlineKkmValue] = useState<string>('75');
  const [savingKkm, setSavingKkm] = useState(false);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  // Tab configurations matching the required hierarchy
  const hierarchyTabs = [
    {
      key: 'jenjang' as AcademicHierarchyTab,
      label: '1. Master Jenjang',
      badge: 'Level 1',
      icon: Layers,
      description: 'Pusat klasifikasi tingkat pendidikan (SD, SMP, SMA, SMK). Jenjang memiliki relasi satu-ke-banyak dengan Kelas.',
      endpoint: '/super-admin/jenjang'
    },
    {
      key: 'kelas' as AcademicHierarchyTab,
      label: '2. Master Kelas',
      badge: '1:N Jenjang',
      icon: School,
      description: 'Rombongan belajar yang bernaung di bawah Jenjang tertentu (Tingkat, Jurusan, Kapasitas).',
      endpoint: '/super-admin/classes'
    },
    {
      key: 'mata-pelajaran' as AcademicHierarchyTab,
      label: '3. Mata Pelajaran & KKM',
      badge: 'KKM Dinamis',
      icon: BookOpen,
      description: 'Kurikulum mata pelajaran terhubung Jenjang & Kelas dengan standar KKM yang dapat bervariasi dinamis.',
      endpoint: '/super-admin/subjects'
    },
    {
      key: 'tahun-ajaran' as AcademicHierarchyTab,
      label: '4. Tahun Ajaran & Soal',
      badge: 'Global Param',
      icon: CalendarDays,
      description: 'Tahun Ajaran aktif sebagai parameter global seluruh data akademik, dipadukan referensi Tahun Soal.',
      endpoint: '/super-admin/academic-years'
    },
    {
      key: 'parameter-filter' as AcademicHierarchyTab,
      label: '5. Parameter Filter',
      badge: 'Lintas Modul',
      icon: Sliders,
      description: 'Mesin parameter filter cascading terintegrasi yang digunakan modul Bank Soal & CBT Ujian.',
      endpoint: ''
    },
  ];

  const currentTabConfig = hierarchyTabs.find(t => t.key === activeTab) || hierarchyTabs[0];

  // Fetch all master reference options
  const fetchReferenceOptions = async () => {
    try {
      const [resJenjang, resKelas, resMapel, resTA, resTS] = await Promise.allSettled([
        apiClient.get('/super-admin/jenjang', { params: { all: true } }),
        apiClient.get('/super-admin/classes', { params: { all: true } }),
        apiClient.get('/super-admin/subjects', { params: { all: true } }),
        apiClient.get('/super-admin/academic-years', { params: { all: true } }),
        apiClient.get('/super-admin/tahun-soal', { params: { all: true } })
      ]);

      if (resJenjang.status === 'fulfilled' && resJenjang.value.data) {
        const jList = resJenjang.value.data.data || resJenjang.value.data;
        setJenjangOptions(Array.isArray(jList) ? jList : []);
      }
      if (resKelas.status === 'fulfilled' && resKelas.value.data) {
        const kList = resKelas.value.data.data || resKelas.value.data;
        setKelasList(Array.isArray(kList) ? kList : []);
      }
      if (resMapel.status === 'fulfilled' && resMapel.value.data) {
        const mList = resMapel.value.data.data || resMapel.value.data;
        setMapelOptions(Array.isArray(mList) ? mList : []);
      }
      if (resTA.status === 'fulfilled' && resTA.value.data) {
        const taList = resTA.value.data.data || resTA.value.data;
        setAcademicYears(Array.isArray(taList) ? taList : []);
      }
      if (resTS.status === 'fulfilled' && resTS.value.data) {
        const tsList = resTS.value.data.data || resTS.value.data;
        setTahunSoalList(Array.isArray(tsList) ? tsList : []);
      }
    } catch (err) {
      console.error('Failed to load master references:', err);
    }
  };

  useEffect(() => {
    fetchReferenceOptions();
  }, []);

  // Fetch data for current active tab
  const fetchData = useCallback(async (page = currentPage) => {
    if (activeTab === 'parameter-filter') return;

    setLoading(true);
    try {
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (filterJenjangId) params.idjenjang = filterJenjangId;

      let ep = currentTabConfig.endpoint;
      if (activeTab === 'tahun-ajaran') {
        ep = tahunSubTab === 'tahun-soal' ? '/super-admin/tahun-soal' : '/super-admin/academic-years';
      }
      if (activeTab === 'semester') ep = '/super-admin/semesters';
      if (activeTab === 'kurikulum') ep = '/super-admin/kurikulum';
      if (activeTab === 'jurusan') ep = '/super-admin/majors';
      if (activeTab === 'tingkat-kelas') ep = '/super-admin/tingkat-kelas';

      const res = await apiClient.get(ep, { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setDataList(list);
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal memuat data ${currentTabConfig.label}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, tahunSubTab, search, filterJenjangId, currentPage, currentTabConfig.endpoint, currentTabConfig.label, setPaginationFromResponse]);

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage, activeTab, tahunSubTab, search, filterJenjangId]);

  // Handle Tab Switch
  const handleTabChange = (tab: AcademicHierarchyTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSearch('');
    setFilterJenjangId('');
    resetPage();
  };

  // Run simulation for Parameter Filter (Node 5)
  const runParameterFilterSimulation = async () => {
    setSimLoading(true);
    try {
      const params: any = { per_page: 1 };
      if (simJenjang) params.idjenjang = simJenjang;
      if (simKelas) params.idkelas = simKelas;
      if (simMapel) params.idmapel = simMapel;
      if (simTahunAjaran) params.id_tahun_ajaran = simTahunAjaran;
      if (simTahunSoal) params.tahun_soal_id = simTahunSoal;

      const res = await apiClient.get('/super-admin/question-bank', { params });
      const total = res.data?.total ?? (res.data?.data ? res.data.data.length : 0);
      setSimResultCount(total);
    } catch {
      setSimResultCount(0);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'parameter-filter') {
      runParameterFilterSimulation();
    }
  }, [activeTab, simJenjang, simKelas, simMapel, simTahunAjaran, simTahunSoal]);

  // Inline KKM save
  const handleSaveInlineKkm = async (item: any) => {
    const kkmNum = parseFloat(inlineKkmValue);
    if (isNaN(kkmNum) || kkmNum < 0 || kkmNum > 100) {
      toast.error('Nilai KKM harus di antara 0 sampai 100.');
      return;
    }

    setSavingKkm(true);
    try {
      await apiClient.put(`/super-admin/subjects/${item.id}`, {
        ...item,
        kkm: kkmNum
      });
      setDataList(prev => prev.map(m => m.id === item.id ? { ...m, kkm: kkmNum } : m));
      toast.success(`KKM ${item.nama_mapel} berhasil diperbarui menjadi ${kkmNum}.`);
      setInlineKkmId(null);
    } catch {
      toast.error('Gagal memperbarui nilai KKM.');
    } finally {
      setSavingKkm(false);
    }
  };

  // Toggle TA Activation
  const handleToggleActivateTA = async (taItem: any) => {
    try {
      await apiClient.post(`/super-admin/academic-years/${taItem.id}/activate`);
      toast.success(`Tahun ajaran ${taItem.name} diaktifkan sebagai parameter global.`);
      fetchData(currentPage);
      fetchReferenceOptions();
    } catch {
      toast.error('Gagal mengaktifkan tahun ajaran.');
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedItem(null);

    switch (activeTab) {
      case 'jenjang':
        setFormData({ kode_jenjang: '', nama_jenjang: '', urutan: jenjangOptions.length + 1, status_aktif: 'Y', keterangan: '' });
        break;
      case 'kelas':
        setFormData({ nama_kelas: '', tingkat: 10, idjenjang: filterJenjangId || jenjangOptions[0]?.id || 1, jurusan: 'Umum', kapasitas: 36 });
        break;
      case 'mata-pelajaran':
        setFormData({
          nama_mapel: '',
          kode_mapel: '',
          idjenjang: filterJenjangId || jenjangOptions[0]?.id || 1,
          kelompok: 'Wajib',
          kkm: 75.00,
          tahun_ajaran: academicYears.find(t => t.is_active)?.name || '2026/2027',
          deskripsi: ''
        });
        break;
      case 'tahun-ajaran':
        if (tahunSubTab === 'tahun-soal') {
          setFormData({ tahun: new Date().getFullYear().toString(), keterangan: '', is_active: true });
        } else {
          setFormData({ name: '', semester: 'odd', is_active: false });
        }
        break;
      default:
        setFormData({});
    }

    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: any) => {
    setIsEditing(true);
    setSelectedItem(item);

    switch (activeTab) {
      case 'jenjang':
        setFormData({
          id: item.id,
          kode_jenjang: item.kode_jenjang,
          nama_jenjang: item.nama_jenjang,
          urutan: item.urutan ?? 1,
          status_aktif: item.status_aktif || 'Y',
          keterangan: item.keterangan || ''
        });
        break;
      case 'kelas':
        setFormData({
          id: item.id,
          nama_kelas: item.nama_kelas,
          tingkat: item.tingkat || 10,
          idjenjang: item.idjenjang || 1,
          jurusan: item.jurusan || 'Umum',
          kapasitas: item.kapasitas || 36
        });
        break;
      case 'mata-pelajaran':
        setFormData({
          id: item.id,
          nama_mapel: item.nama_mapel,
          kode_mapel: item.kode_mapel,
          idjenjang: item.idjenjang || 1,
          kelompok: item.kelompok || 'Wajib',
          kkm: item.kkm ?? 75.00,
          tahun_ajaran: item.tahun_ajaran || '2026/2027',
          deskripsi: item.deskripsi || ''
        });
        break;
      case 'tahun-ajaran':
        if (tahunSubTab === 'tahun-soal') {
          setFormData({
            id: item.id,
            tahun: item.tahun,
            keterangan: item.keterangan || '',
            is_active: Boolean(item.is_active)
          });
        } else {
          setFormData({
            id: item.id,
            name: item.name,
            semester: item.semester,
            is_active: Boolean(item.is_active)
          });
        }
        break;
      default:
        setFormData({ ...item });
    }

    setShowModal(true);
  };

  // Save Modal Form
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let ep = currentTabConfig.endpoint;
      if (activeTab === 'tahun-ajaran' && tahunSubTab === 'tahun-soal') {
        ep = '/super-admin/tahun-soal';
      }
      if (isEditing) {
        await apiClient.put(`${ep}/${selectedItem.id}`, formData);
        toast.success(`Data berhasil diperbarui.`);
      } else {
        await apiClient.post(ep, formData);
        toast.success(`Data berhasil ditambahkan.`);
      }
      setShowModal(false);
      fetchData(currentPage);
      fetchReferenceOptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleDelete = async (item: any) => {
    const itemName = item.nama_jenjang || item.nama_kelas || item.nama_mapel || (item.tahun ? `Tahun Soal ${item.tahun}` : item.name) || 'data ini';
    if (!window.confirm(`Yakin ingin menghapus ${itemName}?`)) return;

    try {
      let ep = currentTabConfig.endpoint;
      if (activeTab === 'tahun-ajaran' && tahunSubTab === 'tahun-soal') {
        ep = '/super-admin/tahun-soal';
      }
      await apiClient.delete(`${ep}/${item.id}`);
      toast.success(`${itemName} berhasil dihapus.`);
      fetchData(currentPage);
      fetchReferenceOptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus data.');
    }
  };

  // Active Tahun Ajaran reference
  const activeTA = academicYears.find(t => t.is_active) || academicYears[0];

  return (
    <div className="space-y-6 pb-16 animate-fade-in font-sans">
      
      {/* ======================================================== */}
      {/* 1. RELATIONAL FLOW ARCHITECTURE BANNER (DIAGRAM ACUAN)   */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  Modul 3 • Hub Manajemen Relasi
                </span>
                <span className="text-xs text-slate-400 font-medium">• Arsitektur Data Akademik</span>
              </div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight mt-0.5">
                Master Data Akademik
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pusat manajemen data terpadu dengan relasi eksplisit: Jenjang (1:N) Kelas, Mata Pelajaran & KKM Dinamis terhubung Jenjang & Kelas, serta Tahun Ajaran sebagai parameter global.
              </p>
            </div>
          </div>

          <button
            onClick={() => { fetchData(currentPage); fetchReferenceOptions(); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer self-start lg:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan Relasi Data</span>
          </button>
        </div>

        {/* Visual Architecture Flow Diagram (Diagram Acuan) */}
        <div className="pt-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2 p-3 bg-slate-50 dark:bg-[#0B1014]/50 border-2 border-[#161C2D]/30 rounded-xl">
            
            {/* Step A: Global Parameter */}
            <div className="flex-1 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-center">
              <span className="text-[9px] font-black uppercase text-indigo-600 block">Parameter Global</span>
              <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 block truncate">
                Tahun Ajaran: {activeTA?.name || '2026/2027'}
              </span>
              <span className="text-[10px] text-slate-400">Parameter Seluruh Data</span>
            </div>

            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />

            {/* Step B: Master Jenjang */}
            <div className="flex-1 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-center">
              <span className="text-[9px] font-black uppercase text-purple-600 block">Tingkat Pendidikan</span>
              <span className="text-xs font-black text-purple-950 dark:text-purple-200 block">
                {jenjangOptions.length} Master Jenjang
              </span>
              <span className="text-[10px] text-slate-400">SD • SMP • SMA • SMK</span>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase">1 : N</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>

            {/* Step C: Master Kelas */}
            <div className="flex-1 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
              <span className="text-[9px] font-black uppercase text-blue-600 block">Rombel Siswa</span>
              <span className="text-xs font-black text-blue-950 dark:text-blue-200 block">
                {kelasList.length} Master Kelas
              </span>
              <span className="text-[10px] text-slate-400">Tingkat 1 - 12</span>
            </div>

            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />

            {/* Step D: Mapel & KKM */}
            <div className="flex-1 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[9px] font-black uppercase text-amber-600 block">Kurikulum & KKM</span>
              <span className="text-xs font-black text-amber-950 dark:text-amber-200 block truncate">
                Mapel & KKM Dinamis
              </span>
              <span className="text-[10px] text-slate-400">Bervariasi Per Jenjang</span>
            </div>

            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />

            {/* Step E: Parameter Filter Engine */}
            <div className="flex-1 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[9px] font-black uppercase text-emerald-600 block">Output Filter</span>
              <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 block">
                Parameter Filter
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Dipakai Bank Soal</span>
            </div>

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. FIVE HIERARCHY TABS NAVIGATION                        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {hierarchyTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-600 text-white border-[#161C2D] shadow-[4px_4px_0px_0px_#171717] translate-y-[-2px]'
                  : 'bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white text-indigo-900 font-bold' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                }`}>
                  {tab.badge}
                </span>
              </div>
              <div>
                <span className="font-black text-xs block tracking-tight">
                  {tab.label}
                </span>
                <span className={`text-[10px] block mt-0.5 line-clamp-1 ${
                  isActive ? 'text-indigo-100' : 'text-slate-400'
                }`}>
                  {tab.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. MANAGEMENT CONTENT FOR ACTIVE HIERARCHY NODE           */}
      {/* ======================================================== */}

      {/* NODE 5: PARAMETER FILTER ENGINE SIMULATOR */}
      {activeTab === 'parameter-filter' ? (
        <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Parameter Filter Generator
                </span>
                <span className="text-xs text-slate-400 font-medium">• Lintas Modul CBT</span>
              </div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white mt-1">
                Pusat Integrasi Parameter Filter Akademik
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Uji coba dan validasi kombinasi berurutan dari Master Akademik sebelum diterapkan ke modul Kelola Bank Soal dan CBT Ujian.
              </p>
            </div>

            <button
              onClick={() => navigate('/super-admin/bank-soal')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer self-start sm:self-auto"
            >
              <span>Buka di Kelola Bank Soal</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 block mb-1">
                1. Jenjang
              </label>
              <select
                value={simJenjang}
                onChange={(e) => { setSimJenjang(e.target.value); setSimKelas(''); setSimMapel(''); }}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
              >
                <option value="">Pilih Jenjang</option>
                {jenjangOptions.map(j => (
                  <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 block mb-1">
                2. Kelas (Filtered)
              </label>
              <select
                value={simKelas}
                onChange={(e) => setSimKelas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
              >
                <option value="">Semua Kelas</option>
                {kelasList
                  .filter(k => !simJenjang || String(k.idjenjang) === String(simJenjang))
                  .map(k => (
                    <option key={k.id} value={k.id}>{k.nama_kelas} (Tk. {k.tingkat})</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 block mb-1">
                3. Mata Pelajaran & KKM
              </label>
              <select
                value={simMapel}
                onChange={(e) => setSimMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
              >
                <option value="">Semua Mapel</option>
                {mapelOptions
                  .filter(m => !simJenjang || String(m.idjenjang) === String(simJenjang))
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nama_mapel} (KKM: {m.kkm ?? 75})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 block mb-1">
                4. Tahun Ajaran
              </label>
              <select
                value={simTahunAjaran}
                onChange={(e) => setSimTahunAjaran(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
              >
                <option value="">Semua TA</option>
                {academicYears.map(ta => (
                  <option key={ta.id} value={ta.id}>
                    {ta.name} {ta.is_active ? '★ (Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-600 dark:text-gray-300 block mb-1">
                5. Tahun Soal
              </label>
              <select
                value={simTahunSoal}
                onChange={(e) => setSimTahunSoal(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none"
              >
                <option value="">Semua Tahun Soal</option>
                {tahunSoalList.map(ts => (
                  <option key={ts.id} value={ts.id}>Tahun {ts.tahun}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Validation Result Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-[#161C2D] dark:border-[#32363A] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 block">Status Validasi Parameter:</span>
                <span className="text-sm font-black text-[#161C2D] dark:text-white block">
                  Kombinasi Filter Siap & Terhubung Sempurna dengan Database
                </span>
                <span className="text-xs text-slate-500">
                  {simLoading ? 'Menghitung kecocokan...' : `Ditemukan ${simResultCount ?? 0} data Bank Soal cocok dengan kombinasi ini.`}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                navigate(`/super-admin/bank-soal?idjenjang=${simJenjang}&idkelas=${simKelas}&idmapel=${simMapel}`);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl border border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer shrink-0"
            >
              Terapkan ke Bank Soal →
            </button>
          </div>

        </div>
      ) : (
        /* TABLE MANAGEMENT FOR NODES 1, 2, 3, 4 */
        <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] space-y-4">
          
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-sm font-black text-[#161C2D] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>{activeTab === 'tahun-ajaran' ? (tahunSubTab === 'tahun-soal' ? 'Master Tahun Soal' : 'Master Tahun Ajaran') : currentTabConfig.label}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300">
                  Total: {paginationMeta.total}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {activeTab === 'tahun-ajaran' ? (tahunSubTab === 'tahun-soal' ? 'Referensi tahun penerbitan paket soal ujian.' : currentTabConfig.description) : currentTabConfig.description}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer self-start md:self-auto shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah {activeTab === 'tahun-ajaran' ? (tahunSubTab === 'tahun-soal' ? 'Tahun Soal' : 'Tahun Ajaran') : currentTabConfig.label.replace(/^\d+\.\s*/, '')}</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Cari data ${currentTabConfig.label.replace(/^\d+\.\s*/, '')}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
              />
            </div>

            {/* Filter by Jenjang (if Kelas or Mapel tab is active) */}
            {(activeTab === 'kelas' || activeTab === 'mata-pelajaran') && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-400 shrink-0">Filter Jenjang:</span>
                <select
                  value={filterJenjangId}
                  onChange={(e) => { setFilterJenjangId(e.target.value); resetPage(); }}
                  className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Jenjang</option>
                  {jenjangOptions.map(j => (
                    <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Entity Specific Tables */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                  {activeTab === 'jenjang' && (
                    <>
                      <th className="py-3 px-3">Kode & Nama Jenjang</th>
                      <th className="py-3 px-3 text-center">Urutan</th>
                      <th className="py-3 px-3 text-center">Jumlah Kelas Terkait</th>
                      <th className="py-3 px-3">Keterangan</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </>
                  )}

                  {activeTab === 'kelas' && (
                    <>
                      <th className="py-3 px-3">Nama Kelas & Rombel</th>
                      <th className="py-3 px-3">Jenjang Terhubung</th>
                      <th className="py-3 px-3 text-center">Tingkat</th>
                      <th className="py-3 px-3">Jurusan</th>
                      <th className="py-3 px-3 text-center">Kapasitas</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </>
                  )}

                  {activeTab === 'mata-pelajaran' && (
                    <>
                      <th className="py-3 px-3">Kode & Nama Mapel</th>
                      <th className="py-3 px-3">Jenjang</th>
                      <th className="py-3 px-3 text-center">KKM Dinamis (Standar)</th>
                      <th className="py-3 px-3">Kelompok</th>
                      <th className="py-3 px-3 text-center">Tahun Ajaran</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </>
                  )}

                  {activeTab === 'tahun-ajaran' && (
                    tahunSubTab === 'tahun-soal' ? (
                      <>
                        <th className="py-3 px-3">Tahun Soal</th>
                        <th className="py-3 px-3">Keterangan</th>
                        <th className="py-3 px-3 text-center">Status Aktif</th>
                        <th className="py-3 px-3 text-center">Ubah Status</th>
                        <th className="py-3 px-3 text-right">Aksi</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-3">Tahun Ajaran</th>
                        <th className="py-3 px-3 text-center">Semester</th>
                        <th className="py-3 px-3 text-center">Status Aktif (Global)</th>
                        <th className="py-3 px-3 text-center">Aktivasi</th>
                        <th className="py-3 px-3 text-right">Aksi</th>
                      </>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center font-bold text-slate-500">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Memuat data...
                    </td>
                  </tr>
                ) : dataList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Tidak ditemukan data dengan filter ini.
                    </td>
                  </tr>
                ) : (
                  dataList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      
                      {/* TAB 1: JENJANG */}
                      {activeTab === 'jenjang' && (
                        <>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-[#161C2D] dark:text-white block">
                              {item.nama_jenjang}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kode: {item.kode_jenjang}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold">
                            {item.urutan}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-xs border border-blue-200">
                              {kelasList.filter(k => k.idjenjang === item.id).length} Kelas
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-600 dark:text-gray-300">
                            {item.keterangan || '-'}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              item.status_aktif === 'Y' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}

                      {/* TAB 2: KELAS */}
                      {activeTab === 'kelas' && (
                        <>
                          <td className="py-3.5 px-3 font-bold text-[#161C2D] dark:text-white">
                            {item.nama_kelas}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
                              {jenjangOptions.find(j => j.id === item.idjenjang)?.nama_jenjang || `Jenjang ${item.idjenjang}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold">
                            Tk. {item.tingkat}
                          </td>
                          <td className="py-3.5 px-3 text-slate-600 dark:text-gray-300">
                            {item.jurusan || 'Umum'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            {item.kapasitas || 36} Siswa
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}

                      {/* TAB 3: MATA PELAJARAN & KKM DINAMIS */}
                      {activeTab === 'mata-pelajaran' && (
                        <>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-[#161C2D] dark:text-white block">
                              {item.nama_mapel}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kode: {item.kode_mapel}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
                              {jenjangOptions.find(j => j.id === item.idjenjang)?.kode_jenjang || `Jenjang ${item.idjenjang}`}
                            </span>
                          </td>
                          
                          {/* Dynamic KKM with quick inline edit */}
                          <td className="py-3.5 px-3 text-center">
                            {inlineKkmId === item.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={inlineKkmValue}
                                  onChange={(e) => setInlineKkmValue(e.target.value)}
                                  className="w-16 px-1.5 py-0.5 text-xs font-bold text-center rounded border-2 border-indigo-500"
                                />
                                <button
                                  onClick={() => handleSaveInlineKkm(item)}
                                  disabled={savingKkm}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                  title="Simpan KKM"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setInlineKkmId(null)}
                                  className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition"
                                  title="Batal"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setInlineKkmId(item.id); setInlineKkmValue(String(item.kkm ?? 75)); }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-mono font-black text-xs border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                                title="Klik untuk edit KKM dinamis"
                              >
                                KKM: {item.kkm ?? 75.00}
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="font-semibold">{item.kelompok || 'Wajib'}</span>
                          </td>

                          <td className="py-3.5 px-3 text-center font-mono">
                            {item.tahun_ajaran || '2026/2027'}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}

                      {/* TAB 4: TAHUN AJARAN & TAHUN SOAL */}
                      {activeTab === 'tahun-ajaran' && (
                        tahunSubTab === 'tahun-soal' ? (
                          <>
                            <td className="py-3.5 px-3 font-bold font-mono text-base text-[#161C2D] dark:text-white">
                              {item.tahun}
                            </td>
                            <td className="py-3.5 px-3 text-slate-600 dark:text-gray-300">
                              {item.keterangan || '-'}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                item.is_active
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {item.is_active ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <button
                                onClick={async () => {
                                  try {
                                    await apiClient.put(`/super-admin/tahun-soal/${item.id}`, {
                                      tahun: item.tahun,
                                      keterangan: item.keterangan,
                                      is_active: !item.is_active,
                                    });
                                    toast.success(`Tahun soal ${!item.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
                                    fetchData(currentPage);
                                    fetchReferenceOptions();
                                  } catch {
                                    toast.error('Gagal mengubah status.');
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                  item.is_active ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3.5 px-3 font-bold text-[#161C2D] dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-3 text-center font-semibold">
                              {item.semester === 'odd' ? 'Ganjil' : item.semester === 'even' ? 'Genap' : (item.semester || '-')}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                item.is_active
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {item.is_active ? '★ Aktif (Global)' : 'Tidak Aktif'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {!item.is_active && (
                                <button
                                  onClick={() => handleToggleActivateTA(item)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] border border-indigo-200 transition cursor-pointer"
                                >
                                  Jadikan Aktif
                                </button>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )
                      )}

                    </tr>
                  ))
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
              from={paginationMeta.from}
              to={paginationMeta.to}
              onPageChange={setPage}
            />
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL ADD / EDIT FORM                                 */}
      {/* ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-lg w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-4 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                {isEditing ? `Edit ${currentTabConfig.label.replace(/^\d+\.\s*/, '')}` : `Tambah ${currentTabConfig.label.replace(/^\d+\.\s*/, '')}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3 text-xs">
              
              {/* FORM JENJANG */}
              {activeTab === 'jenjang' && (
                <>
                  <div>
                    <label className="font-bold block mb-1">Kode Jenjang (SD/SMP/SMA/SMK) *</label>
                    <input
                      type="text"
                      required
                      value={formData.kode_jenjang || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, kode_jenjang: e.target.value }))}
                      className="w-full px-3 py-2 font-bold uppercase rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Nama Lengkap Jenjang *</label>
                    <input
                      type="text"
                      required
                      value={formData.nama_jenjang || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nama_jenjang: e.target.value }))}
                      className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1">Urutan Tampilan</label>
                      <input
                        type="number"
                        value={formData.urutan || 1}
                        onChange={(e) => setFormData(prev => ({ ...prev, urutan: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Status</label>
                      <select
                        value={formData.status_aktif || 'Y'}
                        onChange={(e) => setFormData(prev => ({ ...prev, status_aktif: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22]"
                      >
                        <option value="Y">Aktif</option>
                        <option value="N">Nonaktif</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* FORM KELAS */}
              {activeTab === 'kelas' && (
                <>
                  <div>
                    <label className="font-bold block mb-1">Jenjang Terhubung *</label>
                    <select
                      required
                      value={formData.idjenjang || jenjangOptions[0]?.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, idjenjang: e.target.value }))}
                      className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22]"
                    >
                      {jenjangOptions.map(j => (
                        <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Nama Kelas (Rombel) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kelas 10 MIPA 1"
                      value={formData.nama_kelas || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nama_kelas: e.target.value }))}
                      className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1">Tingkat Kelas (1-12) *</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        required
                        value={formData.tingkat || 10}
                        onChange={(e) => setFormData(prev => ({ ...prev, tingkat: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Jurusan / Peminatan</label>
                      <input
                        type="text"
                        placeholder="MIPA, IPS, Umum, dsb"
                        value={formData.jurusan || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, jurusan: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* FORM MATA PELAJARAN & KKM DINAMIS */}
              {activeTab === 'mata-pelajaran' && (
                <>
                  <div>
                    <label className="font-bold block mb-1">Jenjang Terhubung *</label>
                    <select
                      required
                      value={formData.idjenjang || jenjangOptions[0]?.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, idjenjang: e.target.value }))}
                      className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22]"
                    >
                      {jenjangOptions.map(j => (
                        <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1">Kode Mapel *</label>
                      <input
                        type="text"
                        required
                        placeholder="MTK-SMA"
                        value={formData.kode_mapel || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, kode_mapel: e.target.value }))}
                        className="w-full px-3 py-2 font-bold uppercase rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Kelompok</label>
                      <select
                        value={formData.kelompok || 'Wajib'}
                        onChange={(e) => setFormData(prev => ({ ...prev, kelompok: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22]"
                      >
                        <option value="Wajib">Wajib</option>
                        <option value="Peminatan">Peminatan</option>
                        <option value="Muatan Lokal">Muatan Lokal</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Nama Mata Pelajaran *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Matematika Peminatan"
                      value={formData.nama_mapel || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nama_mapel: e.target.value }))}
                      className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1 text-amber-600 dark:text-amber-400">
                      KKM Dinamis (Standar Ketuntasan Minimal 0-100) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={formData.kkm ?? 75.00}
                      onChange={(e) => setFormData(prev => ({ ...prev, kkm: e.target.value }))}
                      className="w-full px-3 py-2 font-mono font-black text-sm rounded-xl border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Dapat disesuaikan secara dinamis untuk setiap jenjang dan mata pelajaran.
                    </span>
                  </div>
                </>
              )}

              {/* FORM TAHUN AJARAN & TAHUN SOAL */}
              {activeTab === 'tahun-ajaran' && (
                tahunSubTab === 'tahun-soal' ? (
                  <>
                    <div>
                      <label className="font-bold block mb-1">Tahun Soal (Contoh: 2026, 2027) *</label>
                      <input
                        type="text"
                        required
                        placeholder="2026"
                        value={formData.tahun || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, tahun: e.target.value }))}
                        className="w-full px-3 py-2 font-bold font-mono rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Keterangan / Label Ujian</label>
                      <input
                        type="text"
                        placeholder="Tryout Nasional, Ujian Sekolah, dsb"
                        value={formData.keterangan || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Status</label>
                      <select
                        value={formData.is_active ? '1' : '0'}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === '1' }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22]"
                      >
                        <option value="1">Aktif</option>
                        <option value="0">Nonaktif</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="font-bold block mb-1">Format Tahun Ajaran (Contoh: 2026/2027) *</label>
                      <input
                        type="text"
                        required
                        placeholder="2026/2027"
                        value={formData.name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Semester</label>
                      <select
                        value={formData.semester || 'odd'}
                        onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                        className="w-full px-3 py-2 font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22]"
                      >
                        <option value="odd">Semester Ganjil (Odd)</option>
                        <option value="even">Semester Genap (Even)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="is_active_checkbox"
                        checked={Boolean(formData.is_active)}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="is_active_checkbox" className="font-bold text-xs cursor-pointer">
                        Jadikan sebagai Tahun Ajaran Aktif (Parameter Global Sistem)
                      </label>
                    </div>
                  </>
                )
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
