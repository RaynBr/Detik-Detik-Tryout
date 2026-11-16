import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { CardGridSkeleton, QuestionListSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { 
  Search, Eye, X, Folder, ArrowLeft, Layers, CheckCircle, 
  ChevronRight, Calendar, BookOpen, CheckCircle2,
  HelpCircle, Lightbulb, ShieldCheck
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface QuestionPackage {
  id: string | number;
  code?: string;
  kode_paket?: string;
  title?: string;
  nama_paket?: string;
  description?: string | null;
  deskripsi?: string | null;
  total_soal: number;
  questions_count?: number;
  idjenjang?: number;
  jenjang?: string;
  tingkat?: number;
  tingkat_label?: string;
  idmapel?: number;
  mata_pelajaran?: string;
  subject?: Subject;
  tahun_soal?: string;
  created_at?: string;
}

interface QuestionOption {
  key: string;
  content: string;
  media_url?: string | null;
  is_correct: boolean;
}

interface QuestionItem {
  id: string | number;
  nomor_soal: number;
  urutan: number;
  soal_text: string;
  soal_gambar?: string | null;
  options: QuestionOption[];
  jawaban: string;
  jawaban_benar: string;
  penjelasan_jawaban?: string | null;
  pembahasan?: string | null;
  tingkat_kesulitan: string;
  difficulty?: string;
  bab?: string;
  mata_pelajaran?: string;
  jenjang?: string;
  tingkat?: string;
  tahun_soal?: string;
}

export const QuestionBankPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Navigation level: 'packages' (Katalog Paket) or 'package_detail' (Daftar Soal & Pembahasan)
  const [currentView, setCurrentView] = useState<'packages' | 'package_detail'>('packages');
  const [selectedPackage, setSelectedPackage] = useState<QuestionPackage | null>(null);

  // Data states
  const [packages, setPackages] = useState<QuestionPackage[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Filter options from Cascading Params
  const [jenjangList, setJenjangList] = useState<any[]>([]);
  const [tingkatList, setTingkatList] = useState<any[]>([]);
  const [subjectList, setSubjectList] = useState<any[]>([]);
  const [tahunSoalList, setTahunSoalList] = useState<any[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [tahunSoalFilter, setTahunSoalFilter] = useState('');

  // Preview Modal
  const [previewingQuestion, setPreviewingQuestion] = useState<QuestionItem | null>(null);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(12);

  // 1. Fetch Cascading Filter Parameters
  const fetchFilterParams = async () => {
    try {
      const res = await apiClient.get('/teacher/global-question-bank/cascading-params', {
        params: { idjenjang: jenjangFilter || undefined }
      }).catch(() => null);

      if (res?.data) {
        setJenjangList(res.data.jenjang || []);
        setTingkatList(res.data.tingkat || []);
        setSubjectList(res.data.mata_pelajaran || []);
        setTahunSoalList(res.data.tahun_soal || []);
      }
    } catch (err) {
      console.warn('Failed to load filter params:', err);
    }
  };

  useEffect(() => {
    fetchFilterParams();
  }, [jenjangFilter]);

  // 2. Fetch Global Question Bank Packages
  const fetchPackages = async (page = currentPage) => {
    setLoadingPackages(true);
    try {
      const res = await apiClient.get('/teacher/global-question-bank', {
        params: {
          search: search || undefined,
          idjenjang: jenjangFilter || undefined,
          tingkat: tingkatFilter || undefined,
          idmapel: subjectFilter || undefined,
          tahun_soal_id: tahunSoalFilter || undefined,
          page
        }
      });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setPackages(list);
    } catch (err) {
      console.error('Failed to load global question bank packages:', err);
      toast.error('Gagal memuat katalog bank soal global.');
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    if (currentView === 'packages') {
      fetchPackages(currentPage);
    }
  }, [currentPage, search, jenjangFilter, tingkatFilter, subjectFilter, tahunSoalFilter, currentView]);

  // 3. Open Package and Fetch All its Questions
  const handleOpenPackage = async (pkg: QuestionPackage) => {
    setSelectedPackage(pkg);
    setCurrentView('package_detail');
    setLoadingQuestions(true);
    try {
      const res = await apiClient.get(`/teacher/global-question-bank/${pkg.id}`);
      const qList = res.data?.questions || res.data?.package?.questions || res.data?.soal || [];
      setQuestions(qList);
    } catch (err: any) {
      console.error('Failed to load package questions:', err);
      toast.error(err.response?.data?.message || 'Gagal memuat butir soal.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleBackToCatalog = () => {
    setCurrentView('packages');
    setSelectedPackage(null);
    setQuestions([]);
  };

  const handleScheduleExam = (pkgId: string | number) => {
    navigate(`/teacher/exams?action=from_package&package_id=${pkgId}`);
  };

  const getDifficultyBadge = (difficulty: string) => {
    const diff = (difficulty || '').toLowerCase();
    if (diff === 'mudah' || diff === 'easy') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
          Mudah
        </span>
      );
    }
    if (diff === 'sulit' || diff === 'hard') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20">
          Sulit
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
        Sedang
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {currentView === 'package_detail' && selectedPackage ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBackToCatalog}
                className="p-2.5 glass-panel hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:text-white rounded-2xl transition shadow-xs cursor-pointer"
                title="Kembali ke Katalog"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                  <span>Katalog Bank Soal Global</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-slate-800 dark:text-white">{selectedPackage.mata_pelajaran || selectedPackage.subject?.name || 'Mata Pelajaran'}</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
                    <Folder className="h-6 w-6" />
                  </div>
                  <span>{selectedPackage.nama_paket || selectedPackage.title}</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                    {selectedPackage.kode_paket || selectedPackage.code || `PKG-${selectedPackage.id}`}
                  </span>
                </h1>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
                  <BookOpen className="h-6 w-6" />
                </div>
                <span>Katalog Bank Soal Global</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
                Jelajahi dan telaah seluruh paket bank soal resmi dari Super Admin (Read-Only). Untuk membuat atau mengenerate ujian dari bank soal ini, gunakan menu Jadwal Ujian.
              </p>
            </div>
          )}
        </div>

        {/* Top Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5 shadow-xs">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            <span>Katalog Resmi Super Admin (Read-Only)</span>
          </span>

          {currentView === 'package_detail' && selectedPackage && (
            <button
              onClick={() => handleScheduleExam(selectedPackage.id)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>Jadwalkan Ujian dari Paket Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. VIEW 1: KATALOG PAKET BANK SOAL GLOBAL */}
      {currentView === 'packages' && (
        <div className="space-y-6">
          
          {/* Search & Cascading Filter Bar */}
          <div className="glass-panel p-4 md:p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari paket soal..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPage();
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              {/* Filter Jenjang */}
              <div>
                <select
                  value={jenjangFilter}
                  onChange={(e) => {
                    setJenjangFilter(e.target.value);
                    setTingkatFilter('');
                    resetPage();
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white font-medium"
                >
                  <option value="">Semua Jenjang</option>
                  {jenjangList.map((j) => (
                    <option key={j.id} value={j.id}>{j.nama_jenjang}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tingkat */}
              <div>
                <select
                  value={tingkatFilter}
                  onChange={(e) => {
                    setTingkatFilter(e.target.value);
                    resetPage();
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white font-medium"
                >
                  <option value="">Semua Tingkat</option>
                  {tingkatList.map((t) => (
                    <option key={t.id || t.tingkat} value={t.tingkat}>
                      {t.nama_tingkat || `Tingkat ${t.tingkat}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Mapel */}
              <div>
                <select
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    resetPage();
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white font-medium"
                >
                  <option value="">Semua Mata Pelajaran</option>
                  {subjectList.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama_mapel}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tahun Soal */}
              <div>
                <select
                  value={tahunSoalFilter}
                  onChange={(e) => {
                    setTahunSoalFilter(e.target.value);
                    resetPage();
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white font-medium"
                >
                  <option value="">Semua Tahun Soal</option>
                  {tahunSoalList.map((t) => (
                    <option key={t.id} value={t.id}>{t.tahun} {t.keterangan ? `(${t.keterangan})` : ''}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Clear Filter Shortcut */}
            {(search || jenjangFilter || tingkatFilter || subjectFilter || tahunSoalFilter) && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-gray-400">
                  Menampilkan hasil filter katalog
                </span>
                <button
                  onClick={() => {
                    setSearch('');
                    setJenjangFilter('');
                    setTingkatFilter('');
                    setSubjectFilter('');
                    setTahunSoalFilter('');
                    resetPage();
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  Reset Semua Filter
                </button>
              </div>
            )}
          </div>

          {/* Package Cards Grid */}
          {loadingPackages ? (
            <CardGridSkeleton count={6} cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
          ) : packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="glass-panel rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md group"
                >
                  <div>
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 truncate">
                        {pkg.mata_pelajaran || pkg.subject?.name || 'Mata Pelajaran'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-gray-400">
                        {pkg.kode_paket || pkg.code || `PKG-${pkg.id}`}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base md:text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
                      {pkg.nama_paket || pkg.title}
                    </h3>

                    {pkg.deskripsi || pkg.description ? (
                      <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 mb-4">
                        {pkg.deskripsi || pkg.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mb-4">
                        Paket bank soal platform resmi dari Super Admin.
                      </p>
                    )}

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-5 text-[11px]">
                      {pkg.jenjang && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300 font-semibold">
                          {pkg.jenjang}
                        </span>
                      )}
                      {(pkg.tingkat_label || pkg.tingkat) && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300 font-semibold">
                          {pkg.tingkat_label || `Tingkat ${pkg.tingkat}`}
                        </span>
                      )}
                      {pkg.tahun_soal && pkg.tahun_soal !== '-' && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20 font-bold">
                          Thn {pkg.tahun_soal}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer & Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white">
                      <Layers className="h-4 w-4 text-indigo-500" />
                      <span>{pkg.total_soal || pkg.questions_count || 0} Butir Soal</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleScheduleExam(pkg.id)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
                        title="Jadwalkan Ujian dari Paket Ini"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleOpenPackage(pkg)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Buka Paket</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-white/10">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Tidak ada paket soal yang cocok
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian atau ubah kombinasi filter jenjang, tingkat, dan mata pelajaran.
              </p>
            </div>
          )}

          {/* Pagination */}
          {packages.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={paginationMeta.lastPage}
              onPageChange={setPage}
              total={paginationMeta.total}
              perPage={paginationMeta.perPage}
            />
          )}
        </div>
      )}

      {/* 3. VIEW 2: ISI PAKET BANK SOAL (READ ONLY - TELAAT SOAL & PEMBAHASAN) */}
      {currentView === 'package_detail' && selectedPackage && (
        <div className="space-y-6">
          
          {/* Detail Metadata Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-gradient-to-r from-indigo-500/5 via-cyan-500/5 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Informasi Paket</span>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700 dark:text-gray-300">
                  <span>Mata Pelajaran: <strong className="text-indigo-600 dark:text-indigo-400">{selectedPackage.mata_pelajaran || selectedPackage.subject?.name}</strong></span>
                  <span>â€¢</span>
                  <span>Jenjang: <strong className="text-slate-900 dark:text-white">{selectedPackage.jenjang || 'Semua'}</strong></span>
                  <span>â€¢</span>
                  <span>Tingkat: <strong className="text-slate-900 dark:text-white">{selectedPackage.tingkat_label || selectedPackage.tingkat || '-'}</strong></span>
                  <span>â€¢</span>
                  <span>Tahun Soal: <strong className="text-cyan-600 dark:text-cyan-400">{selectedPackage.tahun_soal || '-'}</strong></span>
                  <span>â€¢</span>
                  <span>Total: <strong className="text-emerald-600 dark:text-emerald-400">{questions.length} Butir Soal</strong></span>
                </div>
              </div>

              <button
                onClick={handleBackToCatalog}
                className="self-start sm:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Katalog</span>
              </button>
            </div>
          </div>

          {/* List of Questions with full question text, options, answers, and explanations */}
          {loadingQuestions ? (
            <QuestionListSkeleton count={5} />
          ) : questions.length > 0 ? (
            <div className="space-y-5">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="glass-panel rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-600 text-white font-black text-xs">
                        {q.nomor_soal || idx + 1}
                      </span>
                      {getDifficultyBadge(q.tingkat_kesulitan || q.difficulty || 'Sedang')}
                      {q.bab && q.bab !== '-' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300">
                          Bab: {q.bab}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewingQuestion(q)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview Soal</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="text-sm text-slate-800 dark:text-gray-200 leading-relaxed space-y-3 font-medium">
                    <LaTeXRenderer text={q.soal_text} />
                    {q.soal_gambar && (
                      <div className="my-2">
                        <img 
                          src={q.soal_gambar} 
                          alt="Ilustrasi Soal" 
                          className="max-h-64 rounded-xl border border-slate-200 dark:border-white/10 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="space-y-2 pt-2">
                    {q.options && q.options.map((opt) => {
                      const isCorrect = opt.is_correct || opt.key === q.jawaban_benar || opt.key === q.jawaban;
                      return (
                        <div
                          key={opt.key}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border text-xs transition ${
                            isCorrect 
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/40 text-emerald-950 dark:text-emerald-200 font-semibold'
                              : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-gray-300'
                          }`}
                        >
                          <span className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                            isCorrect 
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                          }`}>
                            {opt.key}
                          </span>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <LaTeXRenderer text={opt.content} />
                            {opt.media_url && (
                              <img src={opt.media_url} alt={`Opsi ${opt.key}`} className="max-h-32 mt-2 rounded-lg border border-slate-200 dark:border-white/10" />
                            )}
                          </div>
                          {isCorrect && (
                            <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Kunci Jawaban</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pembahasan Box */}
                  <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-800/30 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1.5">
                      <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>Pembahasan & Kunci Jawaban (Kunci: {q.jawaban_benar || q.jawaban})</span>
                    </div>
                    <div className="text-slate-700 dark:text-gray-300 leading-relaxed pl-5 font-normal">
                      <LaTeXRenderer text={q.penjelasan_jawaban || q.pembahasan || 'Belum ada pembahasan khusus untuk butir ini.'} />
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-white/10">
              <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                Paket ini belum memiliki butir soal aktif.
              </p>
            </div>
          )}

        </div>
      )}

      {/* 4. MODAL PREVIEW SOAL DETAIL */}
      {previewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0c101d] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-white/10 animate-scale-up space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-600 text-white font-black text-sm">
                  {previewingQuestion.nomor_soal}
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Telaah Butir Soal</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{previewingQuestion.mata_pelajaran || selectedPackage?.mata_pelajaran}</span>
                    <span>â€¢</span>
                    <span>{getDifficultyBadge(previewingQuestion.tingkat_kesulitan)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewingQuestion(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Question Text */}
            <div className="text-sm text-slate-800 dark:text-gray-200 leading-relaxed">
              <LaTeXRenderer text={previewingQuestion.soal_text} />
              {previewingQuestion.soal_gambar && (
                <img src={previewingQuestion.soal_gambar} alt="Ilustrasi" className="max-h-64 mt-3 rounded-xl border border-slate-200 dark:border-white/10" />
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              {previewingQuestion.options && previewingQuestion.options.map((opt) => {
                const isCorrect = opt.is_correct || opt.key === previewingQuestion.jawaban_benar || opt.key === previewingQuestion.jawaban;
                return (
                  <div
                    key={opt.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                      isCorrect 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-600/40 text-emerald-900 dark:text-emerald-300 font-semibold'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-md flex items-center justify-center font-bold shrink-0 ${
                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                    }`}>
                      {opt.key}
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <LaTeXRenderer text={opt.content} />
                      {opt.media_url && <img src={opt.media_url} alt="" className="max-h-24 mt-1 rounded" />}
                    </div>
                    {isCorrect && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Kunci
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pembahasan */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span>Pembahasan & Solusi Soal</span>
              </div>
              <div className="text-slate-700 dark:text-gray-300 leading-relaxed font-normal">
                <LaTeXRenderer text={previewingQuestion.penjelasan_jawaban || previewingQuestion.pembahasan || 'Tidak ada pembahasan khusus untuk butir ini.'} />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setPreviewingQuestion(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup Telaah
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
