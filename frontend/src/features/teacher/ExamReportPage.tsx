import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { useToast } from '../../shared/context/ToastContext';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { ExamPrintReportModal } from './components/ExamPrintReportModal';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Users,
  TrendingUp,
  Filter,
  RefreshCw,
  HelpCircle,
  BookOpen,
  ChevronDown,
  Check,
  X,
  Eye,
  Lightbulb
} from 'lucide-react';

interface ExamItem {
  id: number;
  title: string;
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  status: string;
  kkm_score: number;
  start_time: string;
}

interface StudentReportItem {
  rank: number;
  attempt_id: number;
  student_id: number;
  name: string;
  username: string;
  nisn: string;
  nis: string;
  class_name: string;
  major_name: string;
  status: string;
  total_score: number | null;
  is_passed: boolean;
  started_at: string | null;
  submitted_at: string | null;
  duration_minutes: number | null;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  violation_count: number;
}

interface QuestionItemAnalysis {
  number: number;
  question_id: number;
  type: string;
  content_preview: string;
  topic: string;
  difficulty: string;
  weight: number;
  total_answered: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  accuracy_rate: number;
  performance_category: string;
}

interface ReportData {
  exam: {
    id: number;
    title: string;
    subject_name: string;
    subject_code: string;
    academic_year: string;
    duration_minutes: number;
    start_time: string | null;
    end_time: string | null;
    kkm_score: number;
    status: string;
    total_questions: number;
    total_weight: number;
  };
  statistics: {
    total_participants: number;
    completed_count: number;
    in_progress_count: number;
    disqualified_count: number;
    not_started_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    passed_count: number;
    remedial_count: number;
    pass_rate_percent: number;
    score_distribution: {
      range_0_20: number;
      range_21_40: number;
      range_41_60: number;
      range_61_80: number;
      range_81_100: number;
    };
  };
  students: StudentReportItem[];
  item_analysis: QuestionItemAnalysis[];
  class_progress?: Array<{
    class_name: string;
    total_students: number;
    attempted: number;
    completed: number;
    in_progress: number;
    unattempted: number;
    progress_ratio: string;
    progress_percent: number;
  }>;
}

export const ExamReportPage: React.FC = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const urlExamId = searchParams.get('exam_id') ? Number(searchParams.get('exam_id')) : null;

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);

  // Loading & Action states
  const [loadingExams, setLoadingExams] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Student Attempt Detail Modal states
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);

  // Pagination hooks
  const { currentPage, setPage, resetPage } = usePaginationUrl(15);
  const [analysisPage, setAnalysisPage] = useState<number>(1);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'students' | 'analysis'>('students');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Exam Search Combobox states
  const [isExamMenuOpen, setIsExamMenuOpen] = useState<boolean>(false);
  const [examSearchQuery, setExamSearchQuery] = useState<string>('');
  const examSelectorRef = useRef<HTMLDivElement>(null);

  // Load Exam List on mount
  useEffect(() => {
    fetchExams();
  }, []);

  // Sync when urlExamId changes
  useEffect(() => {
    if (urlExamId && Array.isArray(exams) && exams.some(e => e.id === urlExamId)) {
      setSelectedExamId(urlExamId);
    }
  }, [urlExamId, exams]);

  // Click outside to close exam dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (examSelectorRef.current && !examSelectorRef.current.contains(e.target as Node)) {
        setIsExamMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const res = await apiClient.get('/teacher/exams', { params: { all: true } });
      const raw = res.data;
      const examList: ExamItem[] = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data) ? raw.data : []);
      setExams(examList);
      if (examList.length > 0) {
        const found = urlExamId && examList.some((e: any) => e.id === urlExamId);
        setSelectedExamId(found ? urlExamId : examList[0].id);
      } else {
        setSelectedExamId(null);
      }
    } catch (err) {
      console.error('Failed to load exams list:', err);
      toast.error('Gagal memuat daftar ujian.');
    } finally {
      setLoadingExams(false);
    }
  };

  const openStudentDetail = async (attemptId: number) => {
    if (!selectedExamId) return;
    setDetailLoading(true);
    setDetailModalOpen(true);
    setStudentDetail(null);
    try {
      const res = await apiClient.get(`/teacher/exams/${selectedExamId}/attempts/${attemptId}`);
      setStudentDetail(res.data);
    } catch (err) {
      console.error('Failed to load student attempt detail:', err);
      toast.error('Gagal memuat rincian lembar jawaban siswa.');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filtered Exams based on Combobox typing
  const filteredExams = useMemo(() => {
    const safeExams = Array.isArray(exams) ? exams : [];
    if (!examSearchQuery.trim()) return safeExams;
    const q = examSearchQuery.toLowerCase();
    return safeExams.filter((ex) => {
      const matchTitle = (ex.title || '').toLowerCase().includes(q);
      const matchSubject = (ex.subject?.name || '').toLowerCase().includes(q);
      const matchCode = (ex.subject?.code || '').toLowerCase().includes(q);
      return matchTitle || matchSubject || matchCode;
    });
  }, [exams, examSearchQuery]);

  const selectedExam = useMemo(() => {
    const safeExams = Array.isArray(exams) ? exams : [];
    return safeExams.find((e) => e.id === selectedExamId) || null;
  }, [exams, selectedExamId]);

  // Load Report whenever selectedExamId changes
  useEffect(() => {
    if (selectedExamId) {
      fetchReport(selectedExamId);
    } else {
      setReport(null);
    }
  }, [selectedExamId]);

  const fetchReport = async (examId: number) => {
    setLoadingReport(true);
    try {
      const res = await apiClient.get(`/teacher/exams/${examId}/report`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load exam report:', err);
      toast.error('Gagal memuat data laporan ujian.');
    } finally {
      setLoadingReport(false);
    }
  };

  // Export Excel Handler
  const handleExportCsv = async () => {
    if (!selectedExamId || !report) return;
    setExportingCsv(true);
    try {
      const res = await apiClient.get(`/teacher/exams/${selectedExamId}/report/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.ms-excel;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Hasil_Ujian_${report.exam.title.replace(/\s+/g, '_')}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Laporan rekap nilai Excel (.xls) berhasil diunduh!');
    } catch (err) {
      console.error('Export Excel error:', err);
      toast.error('Gagal mengekspor laporan nilai.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Extract unique class list for filter dropdown
  const classList = useMemo(() => {
    if (!report?.students) return [];
    const set = new Set(report.students.map((s) => s.class_name).filter(Boolean));
    return Array.from(set);
  }, [report]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!report?.students) return [];
    return report.students.filter((st) => {
      const matchSearch =
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = selectedClass === 'all' || st.class_name === selectedClass;

      let matchStatus = true;
      if (statusFilter === 'passed') matchStatus = st.is_passed;
      else if (statusFilter === 'remedial') matchStatus = !st.is_passed && st.status !== 'disqualified';
      else if (statusFilter === 'disqualified') matchStatus = st.status === 'disqualified';

      return matchSearch && matchClass && matchStatus;
    });
  }, [report, searchQuery, selectedClass, statusFilter]);

  const totalStudents = filteredStudents.length;
  const lastStudentPage = Math.max(1, Math.ceil(totalStudents / 15));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * 15;
    return filteredStudents.slice(start, start + 15);
  }, [filteredStudents, currentPage]);

  const totalAnalysis = report?.item_analysis?.length || 0;
  const lastAnalysisPage = Math.max(1, Math.ceil(totalAnalysis / 15));
  const paginatedAnalysis = useMemo(() => {
    if (!report?.item_analysis) return [];
    const start = (analysisPage - 1) * 15;
    return report.item_analysis.slice(start, start + 15);
  }, [report, analysisPage]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header & Exam Selector (Stacking Context z-40) */}
      <div className="glass-panel p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-40">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Laporan Hasil Ujian & Analisis
              </h1>
              <p className="text-slate-500 dark:text-gray-400 text-xs font-medium mt-0.5">
                Rekapitulasi peringkat nilai, statistik kelulusan (KKM), dan analisis butir soal
              </p>
            </div>
          </div>
        </div>

        {/* Searchable Exam Combobox & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          
          {/* Searchable Combobox (Fixed Compact Width) */}
          <div className="relative w-full sm:w-60 md:w-64 z-50 shrink-0" ref={examSelectorRef}>
            <div 
              onClick={() => setIsExamMenuOpen(true)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-[#0c101c] border rounded-2xl cursor-pointer transition shadow-xs ${
                isExamMenuOpen 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Search className="h-4 w-4 text-indigo-500 shrink-0" />
                {isExamMenuOpen ? (
                  <input
                    type="text"
                    value={examSearchQuery}
                    onChange={(e) => setExamSearchQuery(e.target.value)}
                    placeholder="Cari ujian..."
                    autoFocus
                    className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedExam ? selectedExam.title : (loadingExams ? 'Memuat...' : 'Pilih Ujian')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {examSearchQuery && isExamMenuOpen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExamSearchQuery('');
                    }}
                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExamMenuOpen ? 'rotate-180 text-indigo-500' : ''}`} />
              </div>
            </div>

            {/* Dropdown Popup List with high z-index and solid background */}
            {isExamMenuOpen && (
              <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-full sm:w-80 md:w-96 z-50 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden animate-scale-up max-h-80 flex flex-col bg-white dark:bg-[#0c101c] divide-y divide-slate-100 dark:divide-white/5">
                <div className="p-2.5 bg-slate-50 dark:bg-white/[0.03] flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 font-bold px-3">
                  <span>Daftar Paket Ujian ({filteredExams.length})</span>
                  {examSearchQuery && (
                    <span className="text-indigo-600 dark:text-indigo-400 text-[10px]">Filter aktif</span>
                  )}
                </div>

                <div className="overflow-y-auto max-h-64 p-1.5 space-y-1 bg-white dark:bg-[#0c101c]">
                  {loadingExams ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">Memuat daftar ujian...</div>
                  ) : filteredExams.length === 0 ? (
                    <div className="p-6 text-center">
                      <Search className="h-6 w-6 text-slate-300 dark:text-gray-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-700 dark:text-gray-300">Tidak ada ujian ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Coba gunakan kata kunci pencarian lain</p>
                    </div>
                  ) : (
                    filteredExams.map((ex) => {
                      const isSelected = ex.id === selectedExamId;
                      return (
                        <div
                          key={ex.id}
                          onClick={() => {
                            setSelectedExamId(ex.id);
                            setIsExamMenuOpen(false);
                            setExamSearchQuery('');
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-950 dark:text-indigo-200 font-bold border border-indigo-200/60 dark:border-indigo-500/30'
                              : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 font-medium'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs ${isSelected ? 'font-black text-indigo-900 dark:text-indigo-100' : 'text-slate-800 dark:text-gray-200 font-bold'} truncate`}>
                                {ex.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-gray-400">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {ex.subject?.name || 'Umum'}
                              </span>
                              <span>•</span>
                              <span>ID: #{ex.id}</span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="p-1 bg-indigo-600 text-white rounded-full shrink-0">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => selectedExamId && fetchReport(selectedExamId)}
            disabled={loadingReport || !selectedExamId}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 rounded-xl transition btn-press"
            title="Muat Ulang Laporan"
          >
            <RefreshCw className={`h-4 w-4 ${loadingReport ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          {/* Action Buttons */}
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv || !report}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 btn-press"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{exportingCsv ? 'Mengekspor...' : 'Ekspor Excel'}</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            disabled={!report || !report.students || report.students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 btn-press"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Stacking Context z-10) */}
      <div className="relative z-10 space-y-6">

      {loadingReport ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-28 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
          </div>
          <TableSkeleton rows={6} />
        </div>
      ) : !report ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
          <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-gray-200">Pilih Ujian untuk Melihat Laporan</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Silakan pilih salah satu ujian pada menu dropdown di atas untuk menganalisis hasil dan rekap nilai peserta.
          </p>
        </div>
      ) : (
        <>
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            
            {/* Card 1: Rata-Rata Nilai */}
            <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col justify-between card-interactive">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Rata-Rata</span>
                <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <TrendingUp className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {report.statistics.average_score}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5 truncate">
                  KKM: <strong className="text-indigo-600 dark:text-indigo-400">{report.exam.kkm_score}</strong> Poin
                </div>
              </div>
            </div>

            {/* Card 2: Nilai Tertinggi */}
            <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col justify-between card-interactive">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Tertinggi</span>
                <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Award className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {report.statistics.highest_score}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5 truncate">
                  Skor Maksimal
                </div>
              </div>
            </div>

            {/* Card 3: Nilai Terendah */}
            <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col justify-between card-interactive">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Terendah</span>
                <div className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                  <XCircle className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                  {report.statistics.lowest_score}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5 truncate">
                  Skor Terendah
                </div>
              </div>
            </div>

            {/* Card 4: Tingkat Kelulusan */}
            <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col justify-between card-interactive">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Kelulusan</span>
                <div className="p-1.5 sm:p-2 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                  <CheckCircle2 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 tracking-tight">
                  {report.statistics.pass_rate_percent}%
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5 truncate">
                  <strong className="text-teal-600">{report.statistics.passed_count}</strong> Lulus
                </div>
              </div>
            </div>

            {/* Card 5: Total Peserta */}
            <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col justify-between card-interactive col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Peserta</span>
                <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {report.statistics.total_participants}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5 truncate">
                  {report.statistics.completed_count} Selesai • {report.statistics.disqualified_count} Diskualifikasi
                </div>
              </div>
            </div>

          </div>

          {/* Visual Score Distribution & Pass Rate Ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Score Range Distribution Bars */}
            <div className="lg:col-span-2 glass-panel p-4 sm:p-6 rounded-3xl">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Distribusi Rentang Nilai Siswa
              </h3>
              
              <div className="space-y-3">
                {[
                  { label: '81 - 100 (Sangat Baik)', count: report?.statistics?.score_distribution?.range_81_100 ?? 0, color: 'bg-emerald-500' },
                  { label: '61 - 80 (Baik / KKM)', count: report?.statistics?.score_distribution?.range_61_80 ?? 0, color: 'bg-teal-500' },
                  { label: '41 - 60 (Cukup)', count: report?.statistics?.score_distribution?.range_41_60 ?? 0, color: 'bg-blue-500' },
                  { label: '21 - 40 (Kurang)', count: report?.statistics?.score_distribution?.range_21_40 ?? 0, color: 'bg-amber-500' },
                  { label: '0 - 20 (Sangat Kurang)', count: report?.statistics?.score_distribution?.range_0_20 ?? 0, color: 'bg-rose-500' },
                ].map((range, i) => {
                  const totalP = report?.statistics?.total_participants ?? 0;
                  const percent = totalP > 0
                    ? Math.round((range.count / totalP) * 100)
                    : 0;

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-gray-300 text-[11px] sm:text-xs">{range.label}</span>
                        <span className="text-slate-500 dark:text-gray-400 text-[11px] sm:text-xs">
                          {range.count} Siswa ({percent}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${range.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pass vs Remedial Gauge Card */}
            <div className="glass-panel p-4 sm:p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-emerald-500" />
                  Rasio Kelulusan KKM
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Ambang batas KKM ditetapkan pada angka <strong className="text-indigo-600 dark:text-indigo-400">{report.exam.kkm_score}</strong>.
                </p>
              </div>

              <div className="my-6 text-center">
                <div className="inline-flex items-center justify-center p-6 rounded-full bg-slate-100 dark:bg-white/5 border-4 border-indigo-500/20 relative">
                  <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                    {report.statistics.pass_rate_percent}%
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-gray-300 mt-2">
                  {report.statistics.passed_count} dari {report.statistics.total_participants} Siswa Lulus KKM
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-white/5 text-center text-xs">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold block text-[11px] sm:text-xs">Lulus ({report.statistics.passed_count})</span>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                  <span className="text-amber-700 dark:text-amber-400 font-bold block text-[11px] sm:text-xs">Remedial ({report.statistics.remedial_count})</span>
                </div>
              </div>
            </div>

          </div>

          {/* Requirement 13: Progres Kelas pada Laporan Ujian */}
          {report.class_progress && report.class_progress.length > 0 && (
            <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Progres Pengerjaan per Kelas</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                    Rasio kehadiran dan status pengerjaan peserta ujian dikelompokkan berdasarkan rombel kelas.
                  </p>
                </div>
                <span className="self-start sm:self-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                  {report.class_progress.length} Kelas Terdata
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {report.class_progress.map((cp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {cp.class_name}
                      </span>
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30">
                        {cp.progress_ratio} ({cp.progress_percent}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(cp.progress_percent, 100)}%` }}
                      />
                    </div>

                    {/* Detail Metrics */}
                    <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[10px] font-bold">
                      <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <span className="block text-xs font-black">{cp.completed}</span>
                        <span>Selesai</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                        <span className="block text-xs font-black">{cp.in_progress}</span>
                        <span>Mengerjakan</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                        <span className="block text-xs font-black">{cp.unattempted}</span>
                        <span>Belum Mulai</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Tabs (Rekap Nilai vs Analisis Butir Soal) */}
          <div className="flex flex-col sm:flex-row bg-slate-200/60 dark:bg-white/5 p-1 rounded-2xl text-xs font-bold gap-1 w-full">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'students'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Rekapitulasi Nilai & Peringkat Siswa</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md">
                {report.students?.length ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === 'analysis'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              <span>Analisis Butir Soal (Item Analysis)</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 rounded-md">
                {report.item_analysis?.length ?? 0}
              </span>
            </button>
          </div>

          {/* TAB 1: REKAPITULASI NILAI SISWA */}
          {activeTab === 'students' && (
            <div className="glass-panel p-4 sm:p-6 rounded-3xl shadow-xl space-y-4">
              
              {/* Table Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      resetPage();
                    }}
                    placeholder="Cari nama siswa, NISN..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Filter Kelas */}
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-white/10 text-xs">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        resetPage();
                      }}
                      className="bg-transparent font-bold text-slate-700 dark:text-gray-300 focus:outline-none"
                    >
                      <option value="all">Semua Kelas</option>
                      {classList.map((cls, idx) => (
                        <option key={idx} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Status Kelulusan */}
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      resetPage();
                    }}
                    className="bg-slate-50 dark:bg-black/20 px-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-gray-300 focus:outline-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="passed">Lulus KKM</option>
                    <option value="remedial">Remedial</option>
                    <option value="disqualified">Didiskualifikasi</option>
                  </select>
                </div>
              </div>

              {/* Table Scores */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-white/5">
                      <th className="px-4 py-3 text-center w-16">Rank</th>
                      <th className="px-4 py-3">NISN / Akun</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-center">Benar / Salah</th>
                      <th className="px-4 py-3 text-center">Durasi</th>
                      <th className="px-4 py-3 text-center">Pelanggaran</th>
                      <th className="px-4 py-3 text-center font-black">Nilai Akhir</th>
                      <th className="px-4 py-3 text-center">Hasil</th>
                      <th className="px-4 py-3 text-center w-24">Lembar Jawaban</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400 dark:text-gray-500 font-medium">
                          Tidak ditemukan data peserta ujian yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((st, idx) => (
                        <tr key={st.attempt_id ?? `student-${st.student_id ?? idx}-${st.rank ?? idx}`} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.01] transition">
                          {/* Rank Badge */}
                          <td className="px-4 py-3 text-center">
                            {st.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black shadow-sm">
                                🥇
                              </span>
                            ) : st.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black shadow-sm">
                                🥈
                              </span>
                            ) : st.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600/80 text-white font-black shadow-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="font-bold text-slate-500 dark:text-gray-400">{st.rank}</span>
                            )}
                          </td>

                          {/* NISN */}
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-gray-400">
                            {st.nisn !== '-' ? st.nisn : st.username}
                          </td>

                          {/* Nama Siswa */}
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {st.name}
                          </td>

                          {/* Kelas */}
                          <td className="px-4 py-3 text-slate-600 dark:text-gray-400 font-medium">
                            {st.class_name}
                          </td>

                          {/* B / S / K */}
                          <td className="px-4 py-3 text-center font-mono text-[11px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{st.correct_count}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-rose-600 dark:text-rose-400">{st.incorrect_count}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-400">{st.unanswered_count}</span>
                          </td>

                          {/* Durasi */}
                          <td className="px-4 py-3 text-center text-slate-600 dark:text-gray-400 text-[11px]">
                            {st.duration_minutes !== null ? `${st.duration_minutes}m` : '-'}
                          </td>

                          {/* Pelanggaran */}
                          <td className="px-4 py-3 text-center">
                            {st.violation_count > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                                <AlertTriangle className="h-3 w-3" />
                                {st.violation_count}x
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-[11px] font-medium">Bersih</span>
                            )}
                          </td>

                          {/* Nilai Akhir */}
                          <td className="px-4 py-3 text-center font-black text-sm text-slate-900 dark:text-white">
                            {st.total_score !== null ? st.total_score : '0'}
                          </td>

                          {/* Status Kelulusan */}
                          <td className="px-4 py-3 text-center font-bold text-[11px]">
                            {st.status === 'not_started' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-400 border border-slate-200 dark:border-white/10 font-bold text-[10px]">
                                <X className="h-3 w-3 text-slate-400" />
                                Belum Mengerjakan
                              </span>
                            ) : st.status === 'disqualified' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                                <XCircle className="h-3.5 w-3.5" />
                                Diskualifikasi
                              </span>
                            ) : st.is_passed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Lulus
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Belum Lulus (Remedial)
                              </span>
                            )}
                          </td>

                          {/* Action Button: Detail Lembar Jawaban Siswa */}
                          <td className="px-4 py-3 text-center">
                            {st.status === 'not_started' ? (
                              <span className="text-[11px] text-slate-400 dark:text-gray-500 italic">Belum Ada Sesi</span>
                            ) : (
                              <button
                                onClick={() => openStudentDetail(st.attempt_id)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs border border-indigo-200 dark:border-indigo-500/20 active:scale-95"
                                title="Lihat Lembar Jawaban Siswa"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Detail</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                lastPage={lastStudentPage}
                from={totalStudents > 0 ? (currentPage - 1) * 15 + 1 : 0}
                to={Math.min(currentPage * 15, totalStudents)}
                total={totalStudents}
                onPageChange={setPage}
              />
            </div>
          )}

          {/* TAB 2: ANALISIS BUTIR SOAL */}
          {activeTab === 'analysis' && (
            <div className="glass-panel p-6 rounded-3xl shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Analisis Kinerja Butir Soal</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Evaluasi tingkat kesukaran dan persentase jawaban benar peserta ujian per nomor soal
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-gray-400 font-bold border-b border-slate-200 dark:border-white/5">
                      <th className="px-4 py-3 text-center w-12">No</th>
                      <th className="px-4 py-3">Pratinjau Pertanyaan</th>
                      <th className="px-4 py-3">Tipe Soal</th>
                      <th className="px-4 py-3">Topik / Materi</th>
                      <th className="px-4 py-3 text-center">Bobot</th>
                      <th className="px-4 py-3 text-center">Benar / Salah</th>
                      <th className="px-4 py-3">Ketepatan (% Akurasi)</th>
                      <th className="px-4 py-3 text-center">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {paginatedAnalysis.map((item) => (
                      <tr key={item.number} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.01] transition">
                        <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">{item.number}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-gray-300 max-w-xs truncate" title={item.content_preview}>
                          {item.content_preview}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-white/5 rounded-md text-[10px] font-bold text-slate-700 dark:text-gray-300 uppercase">
                            {item.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-gray-400 font-medium">{item.topic}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-gray-300">{item.weight}</td>
                        <td className="px-4 py-3 text-center font-mono text-[11px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.correct_count}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-rose-600 dark:text-rose-400">{item.incorrect_count}</span>
                        </td>
                        <td className="px-4 py-3 w-48">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-700 dark:text-gray-300">{item.accuracy_rate}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.accuracy_rate >= 75
                                    ? 'bg-emerald-500'
                                    : item.accuracy_rate >= 40
                                    ? 'bg-indigo-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${item.accuracy_rate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                              item.performance_category === 'Mudah'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : item.performance_category === 'Sedang'
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {item.performance_category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={analysisPage}
                lastPage={lastAnalysisPage}
                from={totalAnalysis > 0 ? (analysisPage - 1) * 15 + 1 : 0}
                to={Math.min(analysisPage * 15, totalAnalysis)}
                total={totalAnalysis}
                onPageChange={setAnalysisPage}
              />
            </div>
          )}

          {/* Modal Rincian Lembar Jawaban Siswa */}
          {detailModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-[#070a13]/80 backdrop-blur-md">
              <div className="w-full max-w-4xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/30">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Lembar Jawaban Siswa
                      </h3>
                      {studentDetail && (
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          {studentDetail.attempt?.student_name} ({studentDetail.attempt?.student_nisn}) — Kelas {studentDetail.attempt?.class_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {detailLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-xs text-slate-500 font-semibold">Memuat rekapan lembar jawaban siswa...</p>
                    </div>
                  ) : studentDetail ? (
                    <>
                      {/* Summary Banner */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl text-center">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium block">Skor Siswa</span>
                          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {studentDetail.attempt?.score ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium block">Total Butir Soal</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                            {studentDetail.questions?.length ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 font-medium block">Jawaban Benar</span>
                          <span className="text-2xl font-black text-emerald-600 font-mono">
                            {studentDetail.questions?.filter((q: any) => q.is_correct).length ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-600 font-medium block">Waktu Pengerjaan</span>
                          <span className="text-lg font-black text-slate-700 dark:text-gray-300 font-mono pt-1 block">
                            {studentDetail.attempt?.time_spent || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Question by question inspection */}
                      <div className="space-y-4">
                        {studentDetail.questions?.map((q: any) => {
                          const isCorrect = q.is_correct;
                          const hasAnswered = !!q.student_answer;

                          return (
                            <div
                              key={q.question_id || q.number}
                              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                !hasAnswered
                                  ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10'
                                  : isCorrect
                                  ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/15 dark:bg-emerald-950/10'
                                  : 'border-rose-200 dark:border-rose-500/20 bg-rose-50/15 dark:bg-rose-950/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className="text-xs font-black tracking-wider uppercase font-mono text-slate-700 dark:text-slate-300">
                                  Soal #{q.number}
                                </span>
                                <div>
                                  {isCorrect ? (
                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>Benar</span>
                                    </span>
                                  ) : hasAnswered ? (
                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30">
                                      <XCircle className="h-3 w-3" />
                                      <span>Salah</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>Tidak Dijawab</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed mb-3">
                                <LaTeXRenderer text={q.soal_text} />
                                {q.soal_gambar && (
                                  <img src={q.soal_gambar} alt={`Soal ${q.number}`} className="mt-2 max-h-56 rounded-xl border border-slate-200 dark:border-white/10" />
                                )}
                              </div>

                              {/* Options */}
                              <div className="space-y-2 mb-3">
                                {q.options?.map((opt: any) => {
                                  const isStudentChoice = q.student_answer === opt.key;
                                  const isKey = q.correct_answer === opt.key;

                                  let optClass = "border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-gray-300";
                                  if (isKey) {
                                    optClass = "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold";
                                  } else if (isStudentChoice && !isCorrect) {
                                    optClass = "border-rose-400 dark:border-rose-500/50 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                                  }

                                  return (
                                    <div
                                      key={opt.key}
                                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${optClass}`}
                                    >
                                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                        isKey
                                          ? 'bg-emerald-600 text-white'
                                          : isStudentChoice
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                                      }`}>
                                        {opt.key}
                                      </span>
                                      <div className="flex-1">
                                        <LaTeXRenderer text={opt.content} />
                                        {opt.media && (
                                          <img src={opt.media} alt={opt.key} className="mt-1 max-h-28 rounded-lg" />
                                        )}
                                      </div>
                                      {isKey && (
                                        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 shrink-0 ml-auto bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md">
                                          Kunci Jawaban
                                        </span>
                                      )}
                                      {isStudentChoice && !isKey && (
                                        <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 shrink-0 ml-auto bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 rounded-md">
                                          Jawaban Siswa
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Pembahasan */}
                              {q.explanation && (
                                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/20 rounded-xl space-y-1">
                                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                                    <Lightbulb className="h-3.5 w-3.5" />
                                    <span>Pembahasan Soal:</span>
                                  </div>
                                  <div className="text-xs text-slate-700 dark:text-indigo-200/90 leading-relaxed pl-5">
                                    <LaTeXRenderer text={q.explanation} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="py-2 px-5 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Printable Report Modal */}
          {showPrintModal && (
            <ExamPrintReportModal data={report} onClose={() => setShowPrintModal(false)} />
          )}

        </>
      )}
      </div>

    </div>
  );
};
