import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';
import {
  Clock, Calendar, AlertCircle, CheckCircle, GraduationCap,
  Play, RefreshCw, LogOut, BookOpen, User,
  Ban, AlertTriangle, X, CheckCircle2, XCircle, Lightbulb,
  Search, ChevronDown, Bell, Lock, KeyRound,
  Megaphone, Award, ChevronLeft, ChevronRight, Check, ArrowRight, Filter
} from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { toast } from '../../shared/context/ToastContext';
import {
  WelcomeBanner,
  GradientStatCard,
  DonutProgressChart,
  HighlightEventCard,
  CalendarWidget,
  HighlightDate,
  toLocalDateKey
} from '../../shared/components/dashboard';

interface ExamListItem {
  exam_group_id: number;
  exam_id: number;
  title: string;
  subject_code: string;
  subject_name: string;
  duration_minutes: number;
  effective_duration_minutes?: number;
  start_time: string;
  end_time: string;
  status: string;
  attempt: {
    id: number;
    status: 'not_started' | 'in_progress' | 'submitted' | 'auto_submitted' | 'disqualified';
    started_at: string;
    submitted_at: string | null;
    total_score: number | null;
    is_session_ended?: boolean;
  } | null;
}

export const StudentExamsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { currentPage, setPage, resetPage, paginationMeta, setPaginationFromResponse } = usePaginationUrl(10);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [overviewExams, setOverviewExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingExamGroupId, setStartingExamGroupId] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unstarted' | 'completed'>('all');

  // WhatsApp-style Flash Highlight & Scroll state
  const [highlightedExamId, setHighlightedExamId] = useState<string | null>(null);
  const [pendingScrollExamId, setPendingScrollExamId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<any>(null);

  const handleScrollToExam = (targetExamId: string | number) => {
    const examIdStr = String(targetExamId);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    setHighlightedExamId(examIdStr);

    // Check if target exam is already visible on current page
    const isCurrentlyVisible = exams.some(e => String(e.exam_group_id) === examIdStr);

    if (isCurrentlyVisible) {
      setTimeout(() => {
        const element = document.getElementById(`exam-row-${examIdStr}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    } else {
      // If search or filter is hiding it, reset them
      if (searchQuery) setSearchQuery('');
      if (statusFilter !== 'all') setStatusFilter('all');

      // Find the page index of this exam in statSourceExams
      const examIndex = statSourceExams.findIndex(e => String(e.exam_group_id) === examIdStr);
      if (examIndex !== -1) {
        const targetPage = Math.floor(examIndex / 10) + 1;
        setPendingScrollExamId(examIdStr);
        if (targetPage !== currentPage) {
          setPage(targetPage);
        } else {
          setTimeout(() => {
            const element = document.getElementById(`exam-row-${examIdStr}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 150);
        }
      } else {
        setTimeout(() => {
          const element = document.getElementById(`exam-row-${examIdStr}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    }

    // WhatsApp-style smooth fade out after 2.5s
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedExamId(null);
    }, 2500);
  };

  // Watch for page change when waiting to scroll to an exam on another page
  useEffect(() => {
    if (pendingScrollExamId && !loading) {
      const found = exams.some(e => String(e.exam_group_id) === pendingScrollExamId);
      if (found) {
        setTimeout(() => {
          const element = document.getElementById(`exam-row-${pendingScrollExamId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setPendingScrollExamId(null);
        }, 120);
      }
    }
  }, [exams, loading, pendingScrollExamId]);

  // Header Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Top Announcement / Notification State
  const [announcementDismissed, setAnnouncementDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('dismiss_student_announcement') === 'true';
  });

  const handleDismissAnnouncement = () => {
    setAnnouncementDismissed(true);
    sessionStorage.setItem('dismiss_student_announcement', 'true');
  };

  // KKM Detail Modal State
  const [kkmModalOpen, setKkmModalOpen] = useState(false);

  // Review & Pembahasan Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [reviewActiveIdx, setReviewActiveIdx] = useState(0);

  const fetchReview = async (attemptId: any) => {
    setReviewLoading(true);
    setReviewModalOpen(true);
    setReviewData(null);
    setReviewFilter('all');
    setReviewActiveIdx(0);
    try {
      const res = await apiClient.get(`/student/results/${attemptId}`);
      setReviewData(res.data);
    } catch (err) {
      toast.error('Gagal memuat kunci jawaban dan pembahasan.');
      setReviewModalOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchOverviewExams = async () => {
    try {
      const res = await apiClient.get('/student/exams', { params: { all: true } });
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setOverviewExams(items);
    } catch (err) {
      console.error('Failed to load overview exams:', err);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const params: any = {
        page: currentPage,
        per_page: 10,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiClient.get('/student/exams', { params });
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setExams(items);
      setPaginationFromResponse(res.data);
    } catch (err) {
      console.error('Failed to load student exams:', err);
      setGlobalError('Gagal memuat jadwal ujian. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewExams();
  }, []);

  useEffect(() => {
    fetchExams();
  }, [currentPage, searchQuery, statusFilter]);

  const handleStartOrResumeExam = async (exam: ExamListItem) => {
    // If disqualified, strictly block retake
    if (exam.attempt?.status === 'disqualified') {
      toast.error('Anda telah didiskualifikasi dari ujian ini dan dilarang mengulang.', 'Ujian Didiskualifikasi');
      return;
    }

    // If attempt already in progress, resume immediately
    if (exam.attempt?.status === 'in_progress') {
      navigate(`/student/session/${exam.attempt.id}`);
      return;
    }

    setStartingExamGroupId(exam.exam_group_id);
    setGlobalError(null);

    try {
      const res = await apiClient.post('/student/attempts/start', {
        exam_group_id: exam.exam_group_id
      });

      const attempt = res.data.attempt;
      navigate(`/student/session/${attempt.id}`);
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Gagal memulai ujian. Pastikan jadwal ujian sedang aktif.');
    } finally {
      setStartingExamGroupId(null);
    }
  };

  const statSourceExams = overviewExams.length > 0 ? overviewExams : exams;

  // Find priority exam for Highlight Card (active or in_progress or first available)
  const inProgressExam = statSourceExams.find(e => e.attempt?.status === 'in_progress');
  const availableExam = statSourceExams.find(e => !e.attempt || e.attempt.status === 'not_started');
  const heroExam = inProgressExam || availableExam;

  // Completed exams & KKM stats
  const KKM_STANDARD = 75;
  const finishedExams = statSourceExams.filter(e => e.attempt?.status === 'submitted' || e.attempt?.status === 'auto_submitted');
  const scoredExams = finishedExams.filter(e => e.attempt?.total_score !== null && e.attempt?.total_score !== undefined);
  const avgScore = scoredExams.length > 0
    ? Math.round(scoredExams.reduce((acc, curr) => acc + (curr.attempt?.total_score || 0), 0) / scoredExams.length)
    : 100;

  // KKM Stats per Mapel
  const passedKkmExams = scoredExams.filter(e => (e.attempt?.total_score ?? 0) >= KKM_STANDARD);
  const failedKkmExams = scoredExams.filter(e => (e.attempt?.total_score ?? 0) < KKM_STANDARD);
  const tuntasCount = passedKkmExams.length;
  const remedialCount = failedKkmExams.length;

  // Review questions computed lists
  const allReviewQuestions = useMemo(() => reviewData?.questions || [], [reviewData]);
  const correctQuestions = useMemo(() => allReviewQuestions.filter((q: any) => q.is_correct), [allReviewQuestions]);
  const incorrectQuestions = useMemo(() => allReviewQuestions.filter((q: any) => !q.is_correct), [allReviewQuestions]);
  const unansweredCount = useMemo(() => allReviewQuestions.filter((q: any) => !q.student_answer).length, [allReviewQuestions]);

  const displayedQuestions = useMemo(() => {
    if (reviewFilter === 'correct') return correctQuestions;
    if (reviewFilter === 'incorrect') return incorrectQuestions;
    return allReviewQuestions;
  }, [reviewFilter, allReviewQuestions, correctQuestions, incorrectQuestions]);

  const handleFilterChange = (filter: 'all' | 'correct' | 'incorrect') => {
    setReviewFilter(filter);
    setReviewActiveIdx(0);
  };

  const currentQ = displayedQuestions[reviewActiveIdx] || displayedQuestions[0];

  // Helper to format exam date range (e.g. "10 Nov - 12 Nov 2026")
  const formatExamDateRange = (startTimeStr?: string, endTimeStr?: string) => {
    if (!startTimeStr) return '-';
    try {
      const startDate = new Date(startTimeStr);
      if (isNaN(startDate.getTime())) return startTimeStr;

      if (!endTimeStr) {
        return startDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }

      const endDate = new Date(endTimeStr);
      if (isNaN(endDate.getTime())) {
        return startDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }

      const isSameDay =
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getDate() === endDate.getDate();

      if (isSameDay) {
        return startDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }

      const isSameYear = startDate.getFullYear() === endDate.getFullYear();
      const startFormatted = startDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: isSameYear ? undefined : 'numeric'
      });

      const endFormatted = endDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return startTimeStr;
    }
  };

  // Calendar Highlight Dates (Uses robust toLocalDateKey to match YYYY-MM-DD exactly)
  const calendarHighlights: HighlightDate[] = [];
  statSourceExams.forEach((ex) => {
    if (!ex.start_time) return;
    const isFinished = ex.attempt?.status === 'submitted' || ex.attempt?.status === 'auto_submitted';
    const type = isFinished ? 'completed' : 'upcoming';

    const startDateKey = toLocalDateKey(ex.start_time);
    if (startDateKey) {
      calendarHighlights.push({
        date: startDateKey,
        title: ex.title,
        type,
        examGroupId: ex.exam_group_id
      });
    }

    if (ex.end_time) {
      const endDateKey = toLocalDateKey(ex.end_time);
      if (endDateKey && endDateKey !== startDateKey) {
        calendarHighlights.push({
          date: endDateKey,
          title: ex.title,
          type,
          examGroupId: ex.exam_group_id
        });
      }
    }
  });

  // Active / Upcoming Exams prioritized for THIS MONTH (bulan ini) to sync with calendar & table
  const activeOrUpcomingExams = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const isUnfinished = (e: ExamListItem) =>
      !e.attempt || e.attempt.status === 'not_started' || e.attempt.status === 'in_progress';

    // 1. Prioritize upcoming/active exams for THIS MONTH (bulan ini)
    const thisMonthExams = statSourceExams.filter(e => {
      if (!e.start_time || !isUnfinished(e)) return false;
      const key = toLocalDateKey(e.start_time);
      return key.startsWith(currentMonthPrefix);
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (thisMonthExams.length > 0) {
      return thisMonthExams;
    }

    // 2. Fallback: Future exams starting from today onwards
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const futureExams = statSourceExams.filter(e => {
      if (!e.start_time || !isUnfinished(e)) return false;
      const t = new Date(e.start_time).getTime();
      return t >= todayTimestamp;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (futureExams.length > 0) {
      return futureExams;
    }

    // 3. Fallback: Any unfinished exams
    return statSourceExams
      .filter(isUnfinished)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [statSourceExams]);

  const unstartedCount = statSourceExams.filter(e => !e.attempt || e.attempt.status === 'not_started' || e.attempt.status === 'in_progress').length;
  const finishedCount = finishedExams.length;

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] flex flex-col transition-colors duration-200 font-sans">

      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-[#1A1E22] border-b-2 border-[#161C2D] dark:border-[#32363A] px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#38B1ED] text-white rounded-xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000]">
            <GraduationCap className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-black text-sm text-[#161C2D] dark:text-white tracking-tight">Detik Detik TryOut</h1>
            <p className="text-[10px] text-[#5D6371] dark:text-gray-400 font-semibold">
              {user?.profile?.institution || 'Portal Ujian Siswa'} {user?.profile?.class_name ? `• ${user.profile.class_name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:gap-4">
          {/* Announcement Toggle Button */}
          <button
            onClick={() => setAnnouncementDismissed(prev => !prev)}
            className={`p-2 rounded-2xl border transition shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-bold ${!announcementDismissed
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-500/30 dark:text-indigo-300'
              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            title="Pengumuman & Ketentuan Ujian"
          >
            <Megaphone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">Pengumuman</span>
          </button>

          <ThemeToggle compact />

          {/* Student Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-200/60 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300/60 dark:border-white/10 rounded-2xl text-xs transition duration-150 cursor-pointer shadow-xs active:scale-95"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="h-6 w-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <span className="text-slate-800 dark:text-gray-200 font-bold max-w-[130px] truncate hidden sm:inline">
                {user?.name || 'Siswa'}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-500 dark:text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Modal */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in">
                {/* User Info Header in Dropdown */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono truncate mt-0.5">
                    {user?.profile?.nisn ? `NISN: ${user.profile.nisn}` : (user?.email || 'Siswa CBT')}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {user?.profile?.class_name || user?.profile?.institution || 'Peserta CBT'}
                  </span>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  {/* Menu 1: Profil Saya */}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/student/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Profil Saya</span>
                  </button>

                  {/* Menu: Ganti Password */}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/student/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Ganti Password</span>
                  </button>

                  {/* Menu 2: Pengingat Jadwal (Scroll to Widget) */}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      document.getElementById('student-reminders')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <Bell className="h-4 w-4 text-amber-500" />
                    <span>Pengingat Jadwal</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-white/5 my-1"></div>

                {/* Menu 3: Keluar (Instant Logout on click) */}
                <div className="px-1.5 py-0.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout(); // Langsung keluar seketika tombol diklik tanpa dialog
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">

        {/* Top Announcement / Notification Banner */}
        {!announcementDismissed && (
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-indigo-400/40 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-emerald-50/80 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-emerald-950/30 p-4 sm:p-5 shadow-sm animate-fade-in">
            {/* Ambient accent */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-3.5">
                <div className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20 shrink-0 mt-0.5">
                  <Megaphone className="h-5 w-5 sm:h-6 w-6" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                      Pengumuman Siswa
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-gray-200">
                      Informasi & Ketentuan Penting Ujian CBT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed font-medium">
                    Selamat datang di portal CBT. Kerjakan ujian sesuai jadwal, pastikan koneksi internet stabil, dan penuhi batas standar <strong className="text-indigo-600 dark:text-indigo-400 font-bold">KKM 75</strong>. Kunci jawaban & pembahasan dapat dipelajari mandiri setelah sesi ujian resmi ditutup.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold text-slate-700 dark:text-gray-300">
                    <button
                      onClick={() => setKkmModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-white/90 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/10 text-indigo-700 dark:text-indigo-300 transition cursor-pointer shadow-xs"
                    >
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      <span>Standar KKM: <strong>75 Poin</strong> (Lihat Status)</span>
                    </button>
                    <span className="inline-flex items-center gap-1 bg-white/80 dark:bg-white/10 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/10">
                      🛡️ Single-Session Anti-Kecurangan Aktif
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/80 dark:bg-white/10 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/10">
                      📖 Pembahasan Tersedia Usai Sesi
                    </span>
                  </div>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismissAnnouncement}
                className="self-end sm:self-start p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10 transition shrink-0 cursor-pointer"
                title="Tutup pengumuman ini"
                aria-label="Tutup Pengumuman"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 1. Welcome Banner */}
        <WelcomeBanner
          title={`Semangat Belajar, ${user?.name || 'Siswa CBT'} 🎓`}
          subtitle="Kerjakan ujian dengan jujur, teliti, dan pastikan koneksi internet Anda stabil selama sesi berlangsung."
          roleBadge="Portal Peserta Ujian"
          metrics={[
            { label: 'Ujian Tersedia', value: exams.length - finishedExams.length, highlight: (exams.length - finishedExams.length) > 0 },
            { label: 'Ujian Selesai', value: finishedExams.length },
            { label: 'Rata-rata Skor', value: scoredExams.length > 0 ? avgScore : '-' }
          ]}
        />

        {globalError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{globalError}</span>
          </div>
        )}

        {/* 2. Hero Highlight Event Card (If there's an active or pending exam) */}
        {heroExam && (
          <HighlightEventCard
            badgeText={heroExam.attempt?.status === 'in_progress' ? 'Sedang Berlangsung' : 'Ujian Hari Ini'}
            title={heroExam.title}
            subjectName={heroExam.subject_name}
            subjectCode={heroExam.subject_code}
            durationMinutes={heroExam.duration_minutes}
            startTime={new Date(heroExam.start_time).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
            statusText={heroExam.attempt?.status === 'in_progress' ? 'Sesi sedang aktif' : 'Siap Dikerjakan'}
            actionLabel={
              startingExamGroupId === heroExam.exam_group_id
                ? 'Menyiapkan...'
                : heroExam.attempt?.status === 'in_progress'
                  ? 'Lanjutkan Ujian'
                  : 'Mulai Ujian Sekarang'
            }
            onAction={() => handleStartOrResumeExam(heroExam)}
            isLoading={startingExamGroupId === heroExam.exam_group_id}
          />
        )}

        {/* 3. Main Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Columns: Donut Chart & Exams List */}
          <div className="lg:col-span-2 space-y-6">

            {/* Donut & Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <DonutProgressChart
                title="Ringkasan Ketuntasan Nilai"
                subtitle="Performa skor ujian yang telah dikumpulkan"
                primaryPercentage={avgScore}
                centerLabel={`${avgScore}`}
                centerSublabel="Rata-rata Skor"
                items={[
                  { label: 'Rata-rata Nilai', percentage: avgScore, color: '#6366f1' },
                  { label: 'Ujian Selesai', percentage: Math.round((finishedExams.length / Math.max(exams.length, 1)) * 100), color: '#10b981', count: `${finishedExams.length}/${exams.length}` }
                ]}
              />

              <div className="space-y-4">
                <GradientStatCard
                  title="Total Ujian Diikuti"
                  value={`${finishedExams.length} Sesi`}
                  subtitle="Telah tuntas dikumpulkan"
                  icon={CheckCircle}
                  variant="emerald"
                />
                <div
                  className="relative group cursor-pointer"
                  onClick={() => setKkmModalOpen(true)}
                  title="Klik untuk melihat hasil pemantauan KKM per mata pelajaran"
                >
                  <GradientStatCard
                    title="Pemantauan KKM Mapel"
                    value={scoredExams.length > 0 ? `${tuntasCount} / ${scoredExams.length} Tuntas` : 'Standar KKM 75'}
                    subtitle={
                      remedialCount > 0
                        ? `${remedialCount} mapel perlu remedial (< KKM 75)`
                        : scoredExams.length > 0
                          ? 'Semua mapel memenuhi KKM 75'
                          : 'Klik untuk lihat rincian KKM'
                    }
                    icon={Award}
                    variant={remedialCount > 0 ? 'rose' : scoredExams.length > 0 ? 'emerald' : 'indigo'}
                  />
                  <div className="absolute top-3.5 right-3.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-black/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-white/10 flex items-center gap-1 shadow-xs pointer-events-none group-hover:scale-105 transition-transform">
                    <span>Cek KKM</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Daftar Seluruh Jadwal Ujian */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <BookOpen className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Daftar Seluruh Jadwal Ujian</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                    Ikuti ujian terjadwal sesuai mata pelajaran dan instruksi pengawas
                  </p>
                </div>
                <span className="text-xs text-slate-500 dark:text-gray-400 font-mono self-start sm:self-auto bg-slate-200/60 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                  {paginationMeta.total} Jadwal Ujian
                </span>
              </div>

              {/* Search Bar & Status Filter Tabs */}
              <div className="flex flex-col md:flex-row gap-3 pt-1 pb-1">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      resetPage();
                    }}
                    placeholder="Cari nama ujian, mata pelajaran, atau kode mapel..."
                    className="w-full pl-10 pr-9 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        resetPage();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
                      title="Hapus pencarian"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs: Semua, Belum Dikerjakan, Selesai */}
                <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/60 dark:border-white/10 rounded-2xl shrink-0 gap-1 overflow-x-auto">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      resetPage();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${statusFilter === 'all'
                      ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <span>Semua</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${statusFilter === 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-white/20 dark:text-white' : 'bg-slate-300/60 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                      }`}>
                      {statSourceExams.length}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setStatusFilter('unstarted');
                      resetPage();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${statusFilter === 'unstarted'
                      ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <span>Belum Dikerjakan</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${statusFilter === 'unstarted' ? 'bg-amber-100 text-amber-800 dark:bg-white/20 dark:text-white' : 'bg-slate-300/60 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                      }`}>
                      {unstartedCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setStatusFilter('completed');
                      resetPage();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${statusFilter === 'completed'
                      ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <span>Selesai</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${statusFilter === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-white/20 dark:text-white' : 'bg-slate-300/60 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                      }`}>
                      {finishedCount}
                    </span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="bg-white dark:bg-[#1A1E22] rounded-3xl border-2 border-[#161C2D] dark:border-[#32363A] p-8 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Memuat jadwal ujian...</p>
                </div>
              ) : exams.length === 0 ? (
                <div className="glass-panel text-center py-10 px-4 text-slate-500 dark:text-gray-400 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit mx-auto text-slate-400">
                    <Search className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-gray-200">Tidak ada jadwal ujian yang ditemukan</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau ubah tab status ujian.</p>
                  </div>
                  {(searchQuery || statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        resetPage();
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 dark:text-indigo-400 transition cursor-pointer"
                    >
                      Reset Pencarian & Filter
                    </button>
                  )}
                </div>
              ) : (
                /* Table Container (Full list on PC, Horizontal Scroll with Slim Sticky Exam Name on Mobile) */
                <div className="bg-white dark:bg-[#1A1E22] rounded-3xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
                  {/* Subtle mobile guidance bar: ONLY visible on Mobile */}
                  <div className="md:hidden flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/10 text-[11px] text-slate-500 dark:text-gray-400">
                    <span className="flex items-center gap-1 font-medium"></span>
                  </div>

                  <div className="overflow-x-auto w-full no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase bg-slate-50/70 dark:bg-white/[0.02]">
                          {/* NO: Hidden on mobile (< md), shown on PC */}
                          <th className="hidden md:table-cell py-3 sm:py-3.5 px-2 text-center w-10 shrink-0">
                            NO
                          </th>
                          {/* PAKET / UJIAN: Capped width with truncate to fit side-by-side desktop layout */}
                          <th className="py-3 sm:py-3.5 px-2.5 sm:px-3 sticky left-0 md:static z-20 md:z-auto bg-[#F7F9FC] dark:bg-[#1A1E22] md:!bg-transparent w-[110px] min-w-[110px] max-w-[115px] md:w-auto md:min-w-0 md:max-w-[160px] lg:max-w-[190px] xl:max-w-[240px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] md:shadow-none dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)] md:dark:shadow-none border-r border-slate-200/80 md:border-r-0 dark:border-white/10">
                            PAKET / UJIAN
                          </th>
                          <th className="py-3 sm:py-3.5 px-2 whitespace-nowrap">
                            TANGGAL
                          </th>
                          <th className="py-3 sm:py-3.5 px-2 whitespace-nowrap min-w-[75px]">
                            DURASI
                          </th>
                          <th className="py-3 sm:py-3.5 px-1.5 text-center whitespace-nowrap min-w-[85px]">
                            STATUS
                          </th>
                          <th className="py-3 sm:py-3.5 px-2 text-center whitespace-nowrap min-w-[85px]">
                            AKSI
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {exams.map((exam, index) => {
                          const attempt = exam.attempt;
                          const isFinished = attempt?.status === 'submitted' || attempt?.status === 'auto_submitted';
                          const isDisqualified = attempt?.status === 'disqualified';
                          const isStarting = startingExamGroupId === exam.exam_group_id;
                          const rowNumber = (paginationMeta.from || 1) + index;
                          const isHighlighted = Boolean(highlightedExamId && String(highlightedExamId) === String(exam.exam_group_id));

                          return (
                            <tr
                              id={`exam-row-${String(exam.exam_group_id)}`}
                              key={exam.exam_group_id}
                              className={`transition-all duration-1000 ${isHighlighted
                                ? 'bg-amber-100 dark:bg-amber-950 ring-2 ring-amber-400 dark:ring-amber-500 shadow-md'
                                : 'group hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                                }`}
                            >
                              {/* 1. NO (Hidden on mobile < md, visible and static on PC >= md) */}
                              <td className="hidden md:table-cell py-3 px-2 text-center text-xs font-bold text-slate-800 dark:text-gray-200 w-10 shrink-0">
                                {rowNumber}
                              </td>

                              {/* 2. PAKET / UJIAN (Capped width with truncate to fit side-by-side desktop layout) */}
                              <td className={`py-3 px-2.5 sm:px-3 sticky left-0 md:static z-10 md:z-auto ${isHighlighted
                                ? 'bg-amber-100 dark:bg-amber-950 md:!bg-transparent'
                                : 'bg-white dark:bg-[#1A1E22] group-hover:bg-[#F7F9FC] dark:group-hover:bg-[#1f2429] md:!bg-transparent md:group-hover:!bg-transparent'
                                } transition-colors duration-1000 w-[110px] min-w-[110px] max-w-[115px] md:w-auto md:min-w-0 md:max-w-[160px] lg:max-w-[190px] xl:max-w-[240px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] md:shadow-none dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.4)] md:dark:shadow-none border-r border-slate-200/80 md:border-r-0 dark:border-white/10`}>
                                <div className="min-w-0 max-w-full overflow-hidden">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="md:hidden text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded border border-indigo-200/70 dark:border-indigo-800/40">
                                      {rowNumber}
                                    </span>
                                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate" title={exam.title}>
                                      {exam.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 flex-wrap sm:flex-nowrap min-w-0">
                                    <span className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 font-medium truncate max-w-[70px] md:max-w-[95px] lg:max-w-[115px]">
                                      {exam.subject_name}
                                    </span>
                                    <span className="text-[8.5px] sm:text-[10px] font-bold font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-white/10 shrink-0">
                                      {exam.subject_code}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* 3. TANGGAL (Rentang Waktu Periode Ujian) */}
                              <td className="py-3 px-2 whitespace-nowrap">
                                <div
                                  className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-gray-300"
                                  title={exam.end_time ? `Periode Ujian: ${new Date(exam.start_time).toLocaleString('id-ID')} s.d. ${new Date(exam.end_time).toLocaleString('id-ID')}` : undefined}
                                >
                                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>{formatExamDateRange(exam.start_time, exam.end_time)}</span>
                                </div>
                              </td>

                              {/* 4. DURASI */}
                              <td className="py-3 px-2 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-gray-300">
                                  <Clock className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                  <span>
                                    {exam.effective_duration_minutes !== undefined && exam.effective_duration_minutes < exam.duration_minutes ? (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold" title={`Durasi normal ${exam.duration_minutes} menit, namun dibatasi sisa waktu sesi`}>
                                        {exam.effective_duration_minutes} Menit
                                      </span>
                                    ) : (
                                      `${exam.duration_minutes} Menit`
                                    )}
                                  </span>
                                </div>
                              </td>

                              {/* 5. STATUS */}
                              <td className="py-3 px-1.5 text-center whitespace-nowrap">
                                {isDisqualified ? (
                                  <div className="flex flex-col items-center">
                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300">
                                      DIDISKUALIFIKASI
                                    </span>
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                                      Nilai: 0
                                    </span>
                                  </div>
                                ) : isFinished ? (
                                  <div className="flex flex-col items-center">
                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-300 flex items-center justify-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                      <span>SELESAI</span>
                                    </span>
                                    {attempt?.total_score !== null && (
                                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-gray-400 font-mono mt-0.5">
                                        Nilai: {attempt.total_score}
                                      </span>
                                    )}
                                  </div>
                                ) : attempt?.status === 'in_progress' ? (
                                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300">
                                    PROSES
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-gray-300 border border-slate-300 dark:border-white/10">
                                    BELUM
                                  </span>
                                )}
                              </td>

                              {/* 6. AKSI */}
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                {isDisqualified ? (
                                  <span className="px-2.5 py-1 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-500/20 inline-flex items-center gap-1 cursor-not-allowed">
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Terkunci</span>
                                  </span>
                                ) : isFinished ? (
                                  attempt?.is_session_ended === false ? (
                                    <span className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 inline-flex items-center gap-1.5 cursor-not-allowed">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>Tunggu Sesi</span>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => fetchReview(attempt?.id)}
                                      className="px-3.5 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 bg-white dark:bg-white/5 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-xl border border-sky-400 dark:border-sky-500 inline-flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                                    >
                                      <BookOpen className="h-3.5 w-3.5" />
                                      <span>Detail</span>
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={() => handleStartOrResumeExam(exam)}
                                    disabled={isStarting}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-xl text-white inline-flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer ${attempt?.status === 'in_progress'
                                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                      : 'bg-[#2563EB] hover:bg-blue-700 shadow-blue-600/20'
                                      }`}
                                  >
                                    {isStarting ? (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        <span>Menyiapkan...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3.5 w-3.5 fill-current" />
                                        <span>{attempt?.status === 'in_progress' ? 'Lanjut' : 'Mulai'}</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

          {/* Right 1 Column: Profil Siswa (Atas) & Kalender (Bawah) */}
          <div id="student-reminders" className="space-y-6 scroll-mt-20">
            {/* Student Profile Card (Stacked vertically above Calendar) */}
            <div className="bg-white dark:bg-[#1A1E22] rounded-3xl p-5 sm:p-6 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
              {/* Header: Avatar, Name, NISN */}
              <div className="flex items-center gap-4 pb-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-600 dark:bg-indigo-600 text-white border-2 border-[#161C2D] dark:border-indigo-400/40 flex items-center justify-center text-xl font-black font-mono shrink-0 shadow-[2.5px_2.5px_0px_0px_#171717] dark:shadow-[2.5px_2.5px_0px_0px_#000000]">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'J'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                    {user?.name || 'Jhony'}
                  </h4>
                  <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tracking-wide">
                    NISN: {user?.profile?.nisn || user?.username || '0002026001'}
                  </p>
                </div>
              </div>

              {/* Rows List Divided by Lines */}
              <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs sm:text-sm">
                {/* 1. Instansi */}
                <div className="flex items-center justify-between py-3.5 gap-4">
                  <span className="text-slate-500 dark:text-gray-400 font-medium shrink-0">Instansi</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right truncate">
                    {user?.profile?.institution || 'Sekolah Mitra'}
                  </span>
                </div>

                {/* 2. Jenjang */}
                <div className="flex items-center justify-between py-3.5 gap-4">
                  <span className="text-slate-500 dark:text-gray-400 font-medium shrink-0">Jenjang</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400 text-right truncate">
                    {user?.profile?.jenjang
                      ? (user.profile.jenjang === 'SD' ? 'Sekolah Dasar (SD / MI)'
                        : user.profile.jenjang === 'SMP' ? 'Sekolah Menengah Pertama (SMP / MTs)'
                          : user.profile.jenjang === 'SMA' ? 'Sekolah Menengah Atas (SMA / MA)'
                            : user.profile.jenjang === 'SMK' ? 'Sekolah Menengah Kejuruan (SMK)'
                              : user.profile.jenjang)
                      : 'Sekolah Dasar (SD / MI)'}
                  </span>
                </div>

                {/* 3. Kelas */}
                <div className="flex items-center justify-between py-3.5 gap-4">
                  <span className="text-slate-500 dark:text-gray-400 font-medium shrink-0">Kelas</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400 text-right truncate">
                    {(() => {
                      const c = user?.profile?.class_name || user?.profile?.class_room?.name;
                      if (!c) return 'Kelas 6-B';
                      return c.toLowerCase().startsWith('kelas') ? c : `Kelas ${c}`;
                    })()}
                  </span>
                </div>

                {/* 4. Status Akun */}
                <div className="flex items-center justify-between py-3.5 gap-4">
                  <span className="text-slate-500 dark:text-gray-400 font-medium shrink-0">Status Akun</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-right flex items-center justify-end gap-1.5 shrink-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Aktif / Terdaftar</span>
                  </span>
                </div>

                {/* 5. Sesi Login */}
                <div className="flex items-center justify-between py-3.5 gap-4">
                  <span className="text-slate-500 dark:text-gray-400 font-medium shrink-0">Sesi Login</span>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-200/80 dark:border-indigo-800/40 shrink-0">
                    Tervalidasi
                  </span>
                </div>
              </div>
            </div>

            {/* Kalender & Pengingat Ujian Mendatang */}
            <CalendarWidget
              highlights={calendarHighlights}
              upcomingExams={activeOrUpcomingExams.map(ex => ({
                id: ex.exam_group_id,
                title: ex.title,
                subject_name: ex.subject_name,
                subject_code: ex.subject_code,
                start_time: ex.start_time,
                duration_minutes: ex.duration_minutes,
                attempt: ex.attempt
              }))}
              totalUpcomingCount={activeOrUpcomingExams.length}
              onExamClick={(examItem) => {
                handleScrollToExam(String(examItem.id));
              }}
              onSelectDate={(_date, dayHighlights) => {
                if (dayHighlights && dayHighlights.length > 0 && dayHighlights[0].examGroupId) {
                  handleScrollToExam(String(dayHighlights[0].examGroupId));
                }
              }}
            />
          </div>

        </div>

      </main>

      {/* Review & Pembahasan Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 dark:bg-black/85 backdrop-blur-md overflow-hidden">
          <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden">

            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {reviewData?.attempt?.title || 'Kunci Jawaban & Pembahasan Soal'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                    {reviewData?.attempt?.subject || 'TryOut'} • Nilai: <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{reviewData?.attempt?.total_score ?? '-'}</span> / 100
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {reviewLoading ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Memuat rincian kunci jawaban dan pembahasan...</p>
                </div>
              ) : (reviewData?.is_session_ended === false || reviewData?.results_hidden === true) ? (
                <div className="py-14 text-center space-y-4 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-500/20 rounded-3xl p-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Clock className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Sesi Ujian Masih Berlangsung
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-gray-300 max-w-md mx-auto mt-2 leading-relaxed font-medium">
                      {reviewData.message || 'Skor dan pembahasan soal belum dapat diakses. Menunggu jadwal sesi ujian ditutup resmi.'}
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      Akses Terkunci Sementara
                    </span>
                  </div>
                </div>
              ) : reviewData ? (
                <>
                  {/* Summary Score Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
                    <div className="text-center p-2 bg-white dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/5">
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-medium">Skor Akhir</p>
                      <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{reviewData.attempt?.total_score ?? 0}</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/5">
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 font-medium">Total Soal</p>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{allReviewQuestions.length}</p>
                    </div>
                    <div className="text-center p-2 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20">
                      <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Jawaban Benar</p>
                      <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{correctQuestions.length}</p>
                    </div>
                    <div className="text-center p-2 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-500/20">
                      <p className="text-[10px] sm:text-[11px] text-rose-700 dark:text-rose-400 font-semibold">Jawaban Salah</p>
                      <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">{incorrectQuestions.length}</p>
                    </div>
                  </div>

                  {/* Filter Tabs: Semua, Benar (Ijo), Salah (Merah) - Compact 1 Layar HP Tanpa Geser */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-gray-200">
                      <span className="flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Filter Soal:</span>
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                        {reviewFilter === 'all' ? 'Semua Soal' : reviewFilter === 'correct' ? 'Hanya Soal Benar' : 'Hanya Soal Salah'}
                      </span>
                    </div>

                    {/* Compact 3-Column Grid (Pas 100% Layar HP) */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 w-full">
                      <button
                        onClick={() => handleFilterChange('all')}
                        className={`py-1.5 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${reviewFilter === 'all'
                          ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                        <span>Semua</span>
                        <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${reviewFilter === 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-white/20 dark:text-white' : 'bg-slate-200 dark:bg-white/10'
                          }`}>
                          {allReviewQuestions.length}
                        </span>
                      </button>

                      <button
                        onClick={() => handleFilterChange('correct')}
                        className={`py-1.5 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${reviewFilter === 'correct'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100/60'
                          }`}
                      >
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Benar</span>
                        <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${reviewFilter === 'correct' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                          {correctQuestions.length}
                        </span>
                      </button>

                      <button
                        onClick={() => handleFilterChange('incorrect')}
                        className={`py-1.5 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${reviewFilter === 'incorrect'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/30 hover:bg-rose-100/60'
                          }`}
                      >
                        <XCircle className="h-3 w-3 shrink-0" />
                        <span>Salah</span>
                        <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${reviewFilter === 'incorrect' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                          {incorrectQuestions.length}
                        </span>
                      </button>
                    </div>

                    {/* Navigasi Nomor Soal Stepper (Sudah Dijawab vs Belum Dijawab) */}
                    <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-gray-400 gap-1.5">
                        <span>Pilih Nomor Soal ({displayedQuestions.length} ditampilkan):</span>
                        <div className="flex items-center gap-2.5 text-[10px]">
                          <span className="flex items-center gap-1 font-mono">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Benar ({correctQuestions.length})
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Salah ({incorrectQuestions.filter((q: any) => q.student_answer).length})
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Kosong ({unansweredCount})
                          </span>
                        </div>
                      </div>

                      {displayedQuestions.length === 0 ? (
                        <p className="text-xs text-slate-500 py-3 text-center font-medium">Tidak ada soal pada kategori filter ini.</p>
                      ) : (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
                          {displayedQuestions.map((q: any, idx: number) => {
                            const isCorrect = q.is_correct;
                            const hasAnswered = !!q.student_answer;
                            const isActive = idx === reviewActiveIdx;

                            return (
                              <button
                                key={`chip-${q.question_id || q.number}`}
                                onClick={() => setReviewActiveIdx(idx)}
                                className={`h-8 min-w-[34px] px-2 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center shrink-0 border cursor-pointer ${isActive
                                  ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 scale-105 shadow-md font-black'
                                  : 'hover:opacity-90'
                                  } ${isCorrect
                                    ? 'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500'
                                    : hasAnswered
                                      ? 'bg-rose-500 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-500'
                                      : 'bg-amber-400 text-amber-950 border-amber-500'
                                  }`}
                                title={`Soal #${q.number}: ${isCorrect ? 'Benar' : hasAnswered ? 'Salah' : 'Tidak Dijawab'}`}
                              >
                                {q.number}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Single Question Display Card */}
                  {displayedQuestions.length === 0 ? (
                    <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-200 dark:border-white/10 p-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-gray-200">
                          {reviewFilter === 'incorrect' ? 'Hebat! Seluruh soal dijawab dengan benar.' : 'Tidak ada soal dalam kategori filter ini.'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                          Klik tombol di bawah untuk kembali melihat seluruh soal.
                        </p>
                      </div>
                      <button
                        onClick={() => handleFilterChange('all')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer shadow-xs"
                      >
                        Tampilkan Semua Soal
                      </button>
                    </div>
                  ) : currentQ ? (
                    <div className="space-y-4">
                      {/* Comparison Panel: Jawaban Siswa vs Kunci Jawaban Resmi */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Box Jawaban Siswa */}
                        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition ${currentQ.is_correct
                          ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/30'
                          : currentQ.student_answer
                            ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-500/30'
                            : 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-500/30'
                          }`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-base shrink-0 shadow-sm ${currentQ.is_correct
                            ? 'bg-emerald-600 text-white'
                            : currentQ.student_answer
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                            }`}>
                            {currentQ.student_answer || '-'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                              Jawaban Anda
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {currentQ.student_answer ? `Pilihan (${currentQ.student_answer})` : 'Tidak Menjawab (Kosong)'}
                              </span>
                              {currentQ.is_correct ? (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Benar
                                </span>
                              ) : currentQ.student_answer ? (
                                <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 shrink-0">
                                  <XCircle className="h-3.5 w-3.5" /> Salah
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 shrink-0">
                                  <AlertCircle className="h-3.5 w-3.5" /> Kosong
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Box Kunci Jawaban Resmi */}
                        <div className="p-3.5 rounded-2xl border bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/30 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black font-mono text-base shrink-0 shadow-sm">
                            {currentQ.correct_answer}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                              Kunci Jawaban Resmi
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200 truncate">
                                Pilihan ({currentQ.correct_answer})
                              </span>
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 shrink-0">
                                <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Kunci Valid
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Question Content & Options */}
                      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${!currentQ.student_answer
                        ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10'
                        : currentQ.is_correct
                          ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10'
                          : 'border-rose-200 dark:border-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10'
                        }`}>

                        {/* Question Title & Number Header */}
                        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/80 dark:border-white/5">
                          <span className="text-xs font-black tracking-wider uppercase font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300">
                              Soal #{currentQ.number}
                            </span>
                            <span className="text-slate-400 dark:text-gray-500 font-normal hidden sm:inline">
                              ({reviewActiveIdx + 1} dari {displayedQuestions.length} pada filter ini)
                            </span>
                          </span>

                          <div>
                            {currentQ.is_correct ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Jawaban Benar</span>
                              </span>
                            ) : currentQ.student_answer ? (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30">
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Jawaban Salah</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Tidak Dijawab</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Soal Text */}
                        <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed mb-4">
                          <LaTeXRenderer text={currentQ.soal_text} />
                          {currentQ.soal_gambar && (
                            <img
                              src={currentQ.soal_gambar}
                              alt={`Soal ${currentQ.number}`}
                              className="mt-3 max-h-72 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs max-w-full object-contain"
                            />
                          )}
                        </div>

                        {/* Options */}
                        <div className="space-y-2.5 mb-5">
                          {currentQ.options?.map((opt: any) => {
                            const isStudentChoice = currentQ.student_answer === opt.key;
                            const isKey = currentQ.correct_answer === opt.key;

                            let optClass = "border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-gray-300";
                            if (isKey) {
                              optClass = "border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs";
                            } else if (isStudentChoice && !isKey) {
                              optClass = "border-rose-400 dark:border-rose-500/60 bg-rose-50/90 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100";
                            }

                            return (
                              <div
                                key={opt.key}
                                className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm transition ${optClass}`}
                              >
                                <span className={`w-6 h-6 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${isKey
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isStudentChoice
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                                  }`}>
                                  {opt.key}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <LaTeXRenderer text={opt.content} />
                                  {opt.media && (
                                    <img src={opt.media} alt={opt.key} className="mt-2 max-h-36 rounded-xl max-w-full object-contain" />
                                  )}
                                </div>
                                {isKey && isStudentChoice && (
                                  <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300 shrink-0 ml-auto bg-emerald-200/80 dark:bg-emerald-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                    <span>Jawaban Anda & Kunci</span>
                                  </span>
                                )}
                                {isKey && !isStudentChoice && (
                                  <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300 shrink-0 ml-auto bg-emerald-200/80 dark:bg-emerald-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                    <span>Kunci Jawaban</span>
                                  </span>
                                )}
                                {isStudentChoice && !isKey && (
                                  <span className="text-[10px] uppercase font-black text-rose-800 dark:text-rose-300 shrink-0 ml-auto bg-rose-200/80 dark:bg-rose-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                    <X className="h-3 w-3 stroke-[3]" />
                                    <span>Jawaban Anda</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Pembahasan Box */}
                        <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/90 dark:border-indigo-500/30 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                            <Lightbulb className="h-4 w-4" />
                            <span>Pembahasan & Solusi:</span>
                          </div>
                          <div className="text-xs sm:text-sm text-slate-700 dark:text-indigo-200/90 leading-relaxed pl-6">
                            <LaTeXRenderer text={currentQ.explanation || 'Tidak ada pembahasan khusus untuk nomor ini.'} />
                          </div>
                        </div>

                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            {/* Footer Modal Stepper Navigation */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-white/[0.02]">
              <button
                onClick={() => setReviewActiveIdx(prev => Math.max(prev - 1, 0))}
                disabled={reviewActiveIdx <= 0 || displayedQuestions.length === 0}
                className="px-3.5 sm:px-4 py-2 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 disabled:opacity-40 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Soal Sebelumnya</span>
                <span className="sm:hidden">Sebelumnya</span>
              </button>

              <span className="text-xs font-bold font-mono text-slate-600 dark:text-gray-300">
                {displayedQuestions.length > 0 ? `Soal ${reviewActiveIdx + 1} dari ${displayedQuestions.length}` : '0 / 0'}
              </span>

              <button
                onClick={() => setReviewActiveIdx(prev => Math.min(prev + 1, displayedQuestions.length - 1))}
                disabled={reviewActiveIdx >= displayedQuestions.length - 1 || displayedQuestions.length === 0}
                className="px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
              >
                <span className="hidden sm:inline">Soal Berikutnya</span>
                <span className="sm:hidden">Berikutnya</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Pemantauan KKM per Mapel */}
      {kkmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 dark:bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Header Modal */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Hasil Ujian & Pemantauan KKM
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                    Standar Kriteria Ketuntasan Minimal: <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">75 Poin</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setKkmModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Metric summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl text-center">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase">Total Mapel</span>
                  <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">{statSourceExams.length}</p>
                </div>
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-center">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Tuntas KKM</span>
                  <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">{tuntasCount}</p>
                </div>
                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-center">
                  <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 uppercase">Belum Tuntas</span>
                  <p className="text-xl font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">{remedialCount}</p>
                </div>
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl text-center">
                  <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase">Rata-rata</span>
                  <p className="text-xl font-black font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">{scoredExams.length > 0 ? avgScore : '-'}</p>
                </div>
              </div>

              {/* Subject Breakdown List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Rincian Nilai & Status KKM per Mata Pelajaran</span>
                </h4>

                {statSourceExams.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Belum ada mata pelajaran terdaftar.</p>
                ) : (
                  <div className="space-y-3">
                    {statSourceExams.map((ex) => {
                      const attempt = ex.attempt;
                      const hasScore = attempt?.total_score !== null && attempt?.total_score !== undefined;
                      const score = attempt?.total_score ?? 0;
                      const isTuntas = hasScore && score >= KKM_STANDARD;
                      const isFinished = attempt?.status === 'submitted' || attempt?.status === 'auto_submitted';
                      const isDisqualified = attempt?.status === 'disqualified';

                      return (
                        <div
                          key={`kkm-item-${ex.exam_group_id}`}
                          className={`p-4 rounded-2xl border transition-all ${isDisqualified
                            ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-500/20'
                            : isTuntas
                              ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-500/20'
                              : hasScore
                                ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-500/20'
                                : 'bg-slate-50/60 border-slate-200 dark:bg-white/[0.02] dark:border-white/5'
                            }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300">
                                  {ex.subject_code}
                                </span>
                                <h5 className="text-sm font-bold text-slate-900 dark:text-white">{ex.subject_name}</h5>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{ex.title}</p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              {isDisqualified ? (
                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 flex items-center gap-1">
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>DISKUALIFIKASI (0)</span>
                                </span>
                              ) : hasScore ? (
                                isTuntas ? (
                                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>TUNTAS ({score} / KKM 75)</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>BELUM TUNTAS ({score} / KKM 75)</span>
                                  </span>
                                )
                              ) : isFinished ? (
                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>MENUNGGU PENILAIAN</span>
                                </span>
                              ) : attempt?.status === 'in_progress' ? (
                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-300 flex items-center gap-1">
                                  <Play className="h-3.5 w-3.5" />
                                  <span>SEDANG DIKERJAKAN</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-gray-400 border border-slate-300 flex items-center gap-1">
                                  <span>BELUM DIKERJAKAN</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress bar comparison */}
                          {hasScore && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                <span>Skor Anda: <strong className={isTuntas ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{score}</strong></span>
                                <span>Garis KKM: <strong>75</strong></span>
                              </div>
                              <div className="relative h-2.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${isTuntas ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                                />
                                {/* KKM indicator marker at 75% */}
                                <div
                                  className="absolute inset-y-0 w-0.5 bg-black/60 dark:bg-white/80"
                                  style={{ left: '75%' }}
                                  title="Batas KKM (75)"
                                />
                              </div>
                            </div>
                          )}

                          {/* Quick review action if finished */}
                          {isFinished && attempt?.is_session_ended !== false && attempt?.id && (
                            <div className="mt-2.5 pt-2 flex justify-end">
                              <button
                                onClick={() => {
                                  setKkmModalOpen(false);
                                  fetchReview(attempt.id);
                                }}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Lihat Kunci & Pembahasan</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                onClick={() => setKkmModalOpen(false)}
                className="py-2 px-5 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default StudentExamsPage;
