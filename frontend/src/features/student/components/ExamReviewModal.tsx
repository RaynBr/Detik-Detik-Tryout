import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, CheckCircle2, XCircle, AlertCircle, BookOpen, Clock, 
  Lock, RefreshCw, ChevronLeft, ChevronRight, Lightbulb
} from 'lucide-react';
import { LaTeXRenderer } from '../../../shared/components/LaTeXRenderer';

export type ReviewFilterType = 'all' | 'correct' | 'incorrect' | 'unanswered';

export interface ExamReviewOption {
  key: string;
  content: string;
  media?: string | null;
}

export interface ExamReviewQuestion {
  number: number;
  question_id: number;
  soal_text: string;
  soal_gambar?: string | null;
  options: ExamReviewOption[];
  student_answer?: string | null;
  correct_answer: string;
  is_correct: boolean;
  status: 'correct' | 'incorrect' | 'unanswered';
  explanation?: string;
}

export interface ExamReviewData {
  is_session_ended?: boolean;
  results_hidden?: boolean;
  message?: string;
  session_end_time?: string | null;
  attempt?: {
    id: number;
    assessment_id: number;
    title: string;
    subject: string;
    kkm?: number;
    status: string;
    total_score: number | null;
    total_questions: number;
    total_correct: number | null;
    total_incorrect: number | null;
    total_unanswered?: number | null;
    is_passed_kkm?: boolean;
    duration_spent?: string;
    submitted_at?: string;
  };
  questions?: ExamReviewQuestion[];
}

interface ExamReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewData: ExamReviewData | null;
  isLoading?: boolean;
}

export const ExamReviewModal: React.FC<ExamReviewModalProps> = ({
  isOpen,
  onClose,
  reviewData,
  isLoading = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<ReviewFilterType>('all');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  // Extract questions with fallback calculation
  const allQuestions: ExamReviewQuestion[] = useMemo(() => {
    if (!reviewData?.questions) return [];
    return reviewData.questions.map((q, idx) => {
      const studentAns = q.student_answer ? String(q.student_answer).trim().toUpperCase() : null;
      const correctAns = String(q.correct_answer).trim().toUpperCase();
      let status: 'correct' | 'incorrect' | 'unanswered' = 'unanswered';
      if (studentAns) {
        status = studentAns === correctAns ? 'correct' : 'incorrect';
      }
      return {
        ...q,
        number: q.number || idx + 1,
        student_answer: studentAns,
        correct_answer: correctAns,
        is_correct: status === 'correct',
        status,
        explanation: q.explanation || 'Tidak ada pembahasan khusus untuk nomor ini.'
      };
    });
  }, [reviewData]);

  // Counts
  const totalCount = allQuestions.length;
  const correctCount = useMemo(() => allQuestions.filter(q => q.status === 'correct').length, [allQuestions]);
  const incorrectCount = useMemo(() => allQuestions.filter(q => q.status === 'incorrect').length, [allQuestions]);
  const unansweredCount = useMemo(() => allQuestions.filter(q => q.status === 'unanswered').length, [allQuestions]);

  const kkm = reviewData?.attempt?.kkm ?? 75;
  const rawScore = reviewData?.attempt?.total_score ?? (totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0);
  const isPassedKkm = reviewData?.attempt?.is_passed_kkm !== undefined 
    ? reviewData.attempt.is_passed_kkm 
    : rawScore >= kkm;
  const kkmDiff = Math.abs(Math.round(rawScore - kkm));

  // Filtered Questions according to active filter
  const filteredQuestions = useMemo(() => {
    if (activeFilter === 'correct') {
      return allQuestions.filter(q => q.status === 'correct');
    }
    if (activeFilter === 'incorrect') {
      return allQuestions.filter(q => q.status === 'incorrect');
    }
    if (activeFilter === 'unanswered') {
      return allQuestions.filter(q => q.status === 'unanswered');
    }
    return allQuestions;
  }, [allQuestions, activeFilter]);

  // Keep selected index valid when filter changes
  useEffect(() => {
    setSelectedQuestionIndex(0);
  }, [activeFilter]);

  // Current active question
  const currentQuestion: ExamReviewQuestion | undefined = filteredQuestions[selectedQuestionIndex];

  // If currently active question belongs to index in allQuestions
  const currentOverallIndex = useMemo(() => {
    if (!currentQuestion) return -1;
    return allQuestions.findIndex(q => q.question_id === currentQuestion.question_id);
  }, [allQuestions, currentQuestion]);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedQuestionIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedQuestionIndex(prev => Math.min(filteredQuestions.length - 1, prev + 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredQuestions.length, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 dark:bg-black/85 backdrop-blur-sm overflow-hidden animate-fade-in">
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-4 sm:px-6 py-4 border-b-2 border-[#161C2D] dark:border-[#32363A] flex items-center justify-between shrink-0 bg-[#F4F6F9] dark:bg-[#21262B]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-[#4379EE] text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                  {reviewData?.attempt?.title || 'Kunci Jawaban & Pembahasan'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {reviewData?.attempt?.subject || 'TryOut'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-gray-400 font-medium truncate mt-0.5">
                {reviewData?.attempt?.submitted_at ? `Selesai: ${new Date(reviewData.attempt.submitted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB` : 'Hasil Pengerjaan Siswa'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            aria-label="Tutup Pembahasan"
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white rounded-xl bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition shrink-0 ml-2"
          >
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-5">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="h-9 w-9 text-[#4379EE] animate-spin mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-gray-300">
                Memuat rincian hasil dan kunci jawaban...
              </p>
            </div>
          ) : (reviewData?.is_session_ended === false || reviewData?.results_hidden === true) ? (
            /* SESSION STILL ACTIVE / HIDDEN LOCK */
            <div className="py-12 sm:py-16 text-center space-y-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-600/40 rounded-3xl p-6 shadow-[3px_3px_0px_0px_#171717]">
              <div className="w-16 h-16 rounded-2xl bg-amber-200 dark:bg-amber-900/40 border-2 border-[#161C2D] text-amber-900 dark:text-amber-300 flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#171717]">
                <Clock className="h-8 w-8 stroke-[2.5]" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Sesi Ujian Masih Berlangsung
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 mt-2 leading-relaxed">
                  {reviewData.message || 'Skor dan pembahasan soal belum dapat diakses. Menunggu jadwal sesi ujian ditutup resmi oleh pengawas.'}
                </p>
              </div>
              <div className="pt-2">
                <span className="px-4 py-2 rounded-xl text-xs font-black bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] text-amber-800 dark:text-amber-300 inline-flex items-center gap-2 shadow-[2px_2px_0px_0px_#171717]">
                  <Lock className="h-4 w-4" />
                  Akses Terkunci Sementara
                </span>
              </div>
            </div>
          ) : reviewData ? (
            <>
              {/* REVISI 4: HEADER RINGKASAN (Skor, KKM Status, Benar, Salah, Kosong) */}
              <div className="bg-[#F8FAFC] dark:bg-[#21262B] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  
                  {/* Skor & KKM Status */}
                  <div className="col-span-2 sm:col-span-1 p-3 bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl flex flex-col justify-between shadow-[2px_2px_0px_0px_#171717]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Skor Akhir
                    </span>
                    <div className="my-1">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-[#4379EE]">
                        {rawScore}
                      </span>
                      <span className="text-xs font-mono text-slate-400 dark:text-gray-500 font-bold"> / 100</span>
                    </div>
                    <div>
                      {isPassedKkm ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Tuntas (KKM {kkm})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>Kurang {kkmDiff} dari KKM {kkm}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Soal */}
                  <div className="p-3 bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl flex flex-col justify-between shadow-[2px_2px_0px_0px_#171717]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Total Soal
                    </span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white my-1">
                      {totalCount}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium">100% Pengerjaan</span>
                  </div>

                  {/* Jawaban Benar */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-xl flex flex-col justify-between shadow-[2px_2px_0px_0px_#10B981]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Benar
                    </span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 my-1">
                      {correctCount}
                    </p>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                      {totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0}% Akurasi
                    </span>
                  </div>

                  {/* Jawaban Salah */}
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-500 rounded-xl flex flex-col justify-between shadow-[2px_2px_0px_0px_#EF4444]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                      Salah
                    </span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400 my-1">
                      {incorrectCount}
                    </p>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold font-mono">
                      {totalCount > 0 ? Math.round((incorrectCount / totalCount) * 100) : 0}% Kesalahan
                    </span>
                  </div>

                  {/* Tidak Dijawab */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 rounded-xl flex flex-col justify-between shadow-[2px_2px_0px_0px_#F59E0B]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Kosong
                    </span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 my-1">
                      {unansweredCount}
                    </p>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold font-mono">
                      {totalCount > 0 ? Math.round((unansweredCount / totalCount) * 100) : 0}% Tak Diisi
                    </span>
                  </div>

                </div>
              </div>

              {/* REVISI 6: TOMBOL FILTER INTERAKTIF [Semua] [Benar] [Salah] [Tidak Dijawab] */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 mr-1 hidden sm:inline">
                    Filter:
                  </span>
                  
                  {/* Filter: Semua */}
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition border-2 border-[#161C2D] dark:border-[#32363A] ${
                      activeFilter === 'all'
                        ? 'bg-[#4379EE] text-white shadow-[2px_2px_0px_0px_#171717] translate-x-[1px] translate-y-[1px]'
                        : 'bg-white dark:bg-[#1A1E22] text-slate-700 dark:text-gray-300 shadow-[2px_2px_0px_0px_#171717] hover:bg-slate-100 dark:hover:bg-[#252A2E]'
                    }`}
                  >
                    <span>Semua</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${activeFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'}`}>
                      {totalCount}
                    </span>
                  </button>

                  {/* Filter: Benar */}
                  <button
                    onClick={() => setActiveFilter('correct')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition border-2 border-[#161C2D] dark:border-[#32363A] ${
                      activeFilter === 'correct'
                        ? 'bg-[#10B981] text-white shadow-[2px_2px_0px_0px_#171717] translate-x-[1px] translate-y-[1px]'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 shadow-[2px_2px_0px_0px_#171717] hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Benar</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${activeFilter === 'correct' ? 'bg-white/25 text-white' : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200'}`}>
                      {correctCount}
                    </span>
                  </button>

                  {/* Filter: Salah */}
                  <button
                    onClick={() => setActiveFilter('incorrect')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition border-2 border-[#161C2D] dark:border-[#32363A] ${
                      activeFilter === 'incorrect'
                        ? 'bg-[#EF4444] text-white shadow-[2px_2px_0px_0px_#171717] translate-x-[1px] translate-y-[1px]'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 shadow-[2px_2px_0px_0px_#171717] hover:bg-rose-100'
                    }`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Salah</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${activeFilter === 'incorrect' ? 'bg-white/25 text-white' : 'bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-200'}`}>
                      {incorrectCount}
                    </span>
                  </button>

                  {/* Filter: Tidak Dijawab */}
                  <button
                    onClick={() => setActiveFilter('unanswered')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition border-2 border-[#161C2D] dark:border-[#32363A] ${
                      activeFilter === 'unanswered'
                        ? 'bg-[#F59E0B] text-white shadow-[2px_2px_0px_0px_#171717] translate-x-[1px] translate-y-[1px]'
                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 shadow-[2px_2px_0px_0px_#171717] hover:bg-amber-100'
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Kosong</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${activeFilter === 'unanswered' ? 'bg-white/25 text-white' : 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200'}`}>
                      {unansweredCount}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] font-bold font-mono text-slate-500 dark:text-gray-400 self-end sm:self-center">
                  Menampilkan {filteredQuestions.length} soal
                </div>
              </div>

              {/* REVISI 5: PANEL NAVIGASI NOMOR SOAL (GRID NOMOR) DENGAN EFEK DIMMING REVISI 6 */}
              <div className="bg-[#F8FAFC] dark:bg-[#21262B] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-3.5 sm:p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-gray-300 mb-2.5">
                  <span className="uppercase tracking-wider">Navigasi Nomor Soal</span>
                  <span className="text-[11px] font-mono font-black text-slate-500 dark:text-gray-400">
                    Dijawab: {correctCount + incorrectCount} • Belum: {unansweredCount}
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-1.5 sm:gap-2">
                  {allQuestions.map((q, idx) => {
                    // Check if question matches active filter
                    const matchesFilter = activeFilter === 'all' || q.status === activeFilter;
                    const isSelected = currentOverallIndex === idx;

                    // Color indicator on review: Green = correct, Red = incorrect, Gray = unanswered
                    let colorClass = 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-white/20';
                    if (q.status === 'correct') {
                      colorClass = 'bg-[#10B981] text-white border-[#059669]';
                    } else if (q.status === 'incorrect') {
                      colorClass = 'bg-[#EF4444] text-white border-[#DC2626]';
                    } else if (q.status === 'unanswered') {
                      colorClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600/40';
                    }

                    return (
                      <button
                        key={q.question_id || idx}
                        onClick={() => {
                          // If question matches active filter, select it within filter
                          const filteredIdx = filteredQuestions.findIndex(fq => fq.question_id === q.question_id);
                          if (filteredIdx !== -1) {
                            setSelectedQuestionIndex(filteredIdx);
                          } else {
                            // If not in active filter, switch filter to that question's status or 'all' and select it
                            setActiveFilter(q.status);
                            // We set immediate index on next tick or allow user to jump
                            const newFiltered = allQuestions.filter(item => item.status === q.status);
                            const targetIdx = newFiltered.findIndex(item => item.question_id === q.question_id);
                            setSelectedQuestionIndex(targetIdx >= 0 ? targetIdx : 0);
                          }
                        }}
                        className={`h-9 sm:h-10 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center border-2 ${colorClass} ${
                          isSelected 
                            ? 'ring-4 ring-[#4379EE] scale-105 shadow-[2px_2px_0px_0px_#171717] z-10 font-black' 
                            : 'hover:scale-105'
                        } ${
                          !matchesFilter 
                            ? 'opacity-25 grayscale hover:opacity-80' 
                            : 'opacity-100'
                        }`}
                        title={`Soal ${q.number} - ${q.status === 'correct' ? 'Benar' : q.status === 'incorrect' ? 'Salah' : 'Tidak Dijawab'}`}
                      >
                        {q.number}
                      </button>
                    );
                  })}
                </div>

                {/* Legend Guide */}
                <div className="flex items-center gap-4 flex-wrap pt-3 mt-3 border-t border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-[#10B981] border border-[#059669]"></span>
                    <span>Benar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-[#EF4444] border border-[#DC2626]"></span>
                    <span>Salah</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-200 border border-amber-400"></span>
                    <span>Tidak Dijawab</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md border-2 border-[#4379EE] ring-2 ring-[#4379EE]/40"></span>
                    <span>Sedang Dilihat</span>
                  </div>
                </div>
              </div>

              {/* REVISI 6: TAMPILAN SOAL SATU PER SATU (SINGLE QUESTION MODE) */}
              {filteredQuestions.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 dark:bg-white/[0.02] border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-6">
                  <p className="text-sm font-bold text-slate-600 dark:text-gray-400">
                    Tidak ada soal pada kategori filter ini.
                  </p>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="mt-3 px-4 py-2 bg-[#4379EE] text-white rounded-xl text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]"
                  >
                    Tampilkan Semua Soal
                  </button>
                </div>
              ) : currentQuestion ? (
                <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 sm:p-6 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] space-y-5 animate-fade-in">
                  
                  {/* Top Bar of Single Question: Indikator "Soal 2 dari 7 (Salah)" */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-indigo-50 dark:bg-indigo-950/40 text-[#4379EE] border-2 border-indigo-200 dark:border-indigo-800">
                        SOAL #{currentQuestion.number}
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-gray-400 font-mono">
                        (Soal {selectedQuestionIndex + 1} dari {filteredQuestions.length} dalam filter {
                          activeFilter === 'correct' ? 'Benar' : activeFilter === 'incorrect' ? 'Salah' : activeFilter === 'unanswered' ? 'Kosong' : 'Semua'
                        })
                      </span>
                    </div>

                    <div>
                      {currentQuestion.status === 'correct' ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-2 border-emerald-500 shadow-[2px_2px_0px_0px_#10B981]">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Jawaban Benar</span>
                        </span>
                      ) : currentQuestion.status === 'incorrect' ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-2 border-rose-500 shadow-[2px_2px_0px_0px_#EF4444]">
                          <XCircle className="h-4 w-4" />
                          <span>Jawaban Salah</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-2 border-amber-500 shadow-[2px_2px_0px_0px_#F59E0B]">
                          <AlertCircle className="h-4 w-4" />
                          <span>Tidak Dijawab</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                    <LaTeXRenderer text={currentQuestion.soal_text} />
                    {currentQuestion.soal_gambar && (
                      <div className="mt-3 p-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl inline-block max-w-full">
                        <img 
                          src={currentQuestion.soal_gambar} 
                          alt={`Soal ${currentQuestion.number}`} 
                          className="max-h-80 rounded-lg object-contain" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      Pilihan Jawaban:
                    </div>
                    {currentQuestion.options?.map((opt) => {
                      const isStudentChoice = currentQuestion.student_answer === opt.key;
                      const isCorrectKey = currentQuestion.correct_answer === opt.key;

                      let containerStyle = "border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-gray-300";
                      let keyBadgeStyle = "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300";

                      if (isCorrectKey) {
                        containerStyle = "border-2 border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-bold shadow-[2px_2px_0px_0px_#10B981]";
                        keyBadgeStyle = "bg-[#10B981] text-white";
                      } else if (isStudentChoice && !currentQuestion.is_correct) {
                        containerStyle = "border-2 border-rose-500 bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-medium shadow-[2px_2px_0px_0px_#EF4444]";
                        keyBadgeStyle = "bg-[#EF4444] text-white";
                      }

                      return (
                        <div
                          key={opt.key}
                          className={`p-3.5 sm:p-4 rounded-xl flex items-start justify-between gap-3 text-xs sm:text-sm transition ${containerStyle}`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black font-mono text-xs shrink-0 border border-black/10 ${keyBadgeStyle}`}>
                              {opt.key}
                            </span>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <LaTeXRenderer text={opt.content} />
                              {opt.media && (
                                <img src={opt.media} alt={opt.key} className="mt-2 max-h-36 rounded-lg object-contain" />
                              )}
                            </div>
                          </div>

                          {/* Status Tag on Option */}
                          <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                            {isCorrectKey && (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-[#10B981] text-white shadow-xs">
                                Kunci Benar
                              </span>
                            )}
                            {isStudentChoice && (
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-white shadow-xs ${
                                isCorrectKey ? 'bg-[#4379EE]' : 'bg-[#EF4444]'
                              }`}>
                                {isCorrectKey ? 'Pilihan Anda' : 'Pilihan Anda (Salah)'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* REVISI 4: PEMBAHASAN DETAIL SOAL */}
                  <div className="bg-[#EEF2FF] dark:bg-indigo-950/20 border-2 border-indigo-300 dark:border-indigo-800/60 rounded-2xl p-4 sm:p-5 space-y-2 shadow-[2px_2px_0px_0px_#6366F1]">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                      <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      <h5 className="text-xs sm:text-sm font-black tracking-wide uppercase">
                        Kunci & Pembahasan Soal
                      </h5>
                    </div>
                    <div className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium pt-1">
                      <LaTeXRenderer text={currentQuestion.explanation || 'Tidak ada penjelasan tambahan untuk soal ini.'} />
                    </div>
                  </div>

                  {/* BOTTOM PREV / NEXT NAVIGATION (INSIDE FILTER) */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-slate-100 dark:border-white/5">
                    <button
                      type="button"
                      disabled={selectedQuestionIndex === 0}
                      onClick={() => setSelectedQuestionIndex(prev => Math.max(0, prev - 1))}
                      className="min-h-[44px] px-4 py-2 bg-white dark:bg-[#1A1E22] hover:bg-slate-100 dark:hover:bg-[#252A2E] disabled:opacity-40 disabled:cursor-not-allowed border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl text-xs sm:text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
                    >
                      <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                      <span>Sebelumnya</span>
                    </button>

                    <span className="text-xs font-black font-mono text-slate-500 dark:text-gray-400">
                      {selectedQuestionIndex + 1} / {filteredQuestions.length}
                    </span>

                    <button
                      type="button"
                      disabled={selectedQuestionIndex >= filteredQuestions.length - 1}
                      onClick={() => setSelectedQuestionIndex(prev => Math.min(filteredQuestions.length - 1, prev + 1))}
                      className="min-h-[44px] px-4 py-2 bg-[#4379EE] hover:bg-[#3465D9] disabled:opacity-40 disabled:cursor-not-allowed border-2 border-[#161C2D] text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </div>

                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 sm:px-6 py-3 border-t-2 border-[#161C2D] dark:border-[#32363A] bg-[#F4F6F9] dark:bg-[#21262B] flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium hidden sm:block">
            Gunakan tombol panah keyboard (&larr; / &rarr;) untuk navigasi cepat antar soal.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2 bg-[#161C2D] dark:bg-white text-white dark:text-[#161C2D] rounded-xl text-xs font-black border-2 border-[#161C2D] dark:border-white shadow-[2px_2px_0px_0px_#171717] hover:opacity-95 active:translate-x-[1px] active:translate-y-[1px] transition ml-auto"
          >
            Tutup Pembahasan
          </button>
        </div>

      </div>
    </div>
  );
};
export default ExamReviewModal;