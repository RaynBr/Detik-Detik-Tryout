import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { CardGridSkeleton } from '../../shared/components/LoadingSkeleton';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';
import {
  Clock, Calendar, AlertCircle, CheckCircle, GraduationCap,
  Play, RefreshCw, LogOut, BookOpen, ShieldCheck, User,
  Ban, X,
  Building, Search, ChevronDown, Bell, Lock, KeyRound
} from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { BrandLogo } from '../../shared/components/BrandLogo';
import { toast } from '../../shared/context/ToastContext';
import {
  WelcomeBanner,
  GradientStatCard,
  DonutProgressChart,
  HighlightEventCard,
  CalendarWidget,
  RemindersList,
  HighlightDate,
  ReminderItem
} from '../../shared/components/dashboard';
import { StudentAnnouncementModal, AnnouncementItem } from './components/StudentAnnouncementModal';
import { SubjectKkmMonitor, SubjectExamSummaryCard, SubjectKkmStat } from './components/SubjectKkmProgressCard';
import { ExamReviewModal } from './components/ExamReviewModal';

interface ExamListItem {
  exam_group_id: number;
  exam_id: number;
  title: string;
  subject_id?: number | null;
  subject_code: string;
  subject_name: string;
  kkm?: number;
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
  const { currentPage, setPage, resetPage, paginationMeta, setPaginationFromResponse } = usePaginationUrl(15);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [overviewExams, setOverviewExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [startingExamGroupId, setStartingExamGroupId] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unstarted' | 'completed'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);

  // Announcement Modal & Notification State
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<number[]>(() => {
    try {
      const userKey = user?.id || 'guest';
      const saved = localStorage.getItem(`cbt_dismissed_announcements_${userKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Review & Pembahasan Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState<any | null>(null);

  const fetchReview = async (attemptId: any) => {
    setReviewLoading(true);
    setReviewModalOpen(true);
    setReviewData(null);
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

  // Timezone-safe date extractor (handles 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', ISO strings)
  const extractDateOnly = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {
      // ignore
    }
    return '';
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

  const fetchAnnouncements = async () => {
    try {
      const res = await apiClient.get('/student/announcements');
      const items: AnnouncementItem[] = res.data?.data || [];
      setAnnouncements(items);

      // Auto-open once per login session if there are undismissed announcements
      const userKey = user?.id || 'guest';
      const sessionKey = `cbt_announcement_seen_session_${userKey}`;
      const hasSeenSession = sessionStorage.getItem(sessionKey);
      const unreadCount = items.filter(a => !dismissedAnnouncementIds.includes(a.id)).length;

      if (!hasSeenSession && unreadCount > 0) {
        setAnnouncementModalOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  const handleDismissAnnouncement = (id: number) => {
    const userKey = user?.id || 'guest';
    const next = dismissedAnnouncementIds.includes(id)
      ? dismissedAnnouncementIds.filter(x => x !== id)
      : [...dismissedAnnouncementIds, id];
    setDismissedAnnouncementIds(next);
    try {
      localStorage.setItem(`cbt_dismissed_announcements_${userKey}`, JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismissAllAnnouncements = () => {
    const userKey = user?.id || 'guest';
    const allIds = announcements.map(a => a.id);
    setDismissedAnnouncementIds(allIds);
    try {
      localStorage.setItem(`cbt_dismissed_announcements_${userKey}`, JSON.stringify(allIds));
    } catch (e) {
      console.error(e);
    }
    setAnnouncementModalOpen(false);
  };

  const fetchExams = async (showSkeleton = true) => {
    if (showSkeleton) {
      setLoading(true);
    }
    setGlobalError(null);
    try {
      const params: any = {
        page: currentPage,
        per_page: 15,
      };
      const searchTerms = [searchQuery.trim(), selectedSubjectFilter].filter(Boolean).join(' ');
      if (searchTerms) params.search = searchTerms;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiClient.get('/student/exams', { params });
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setExams(items);
      setPaginationFromResponse(res.data);
    } catch (err) {
      console.error('Failed to load student exams:', err);
      if (showSkeleton) {
        setGlobalError('Gagal memuat jadwal ujian. Silakan coba beberapa saat lagi.');
      }
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
    }
  };

  // Real-time synchronization runner (background auto-refresh without flickering loading screen)
  const syncDashboardData = async (silent = true) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await Promise.all([
        fetchOverviewExams(),
        fetchExams(!silent)
      ]);
    } finally {
      isSyncingRef.current = false;
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // 1. Initial Load
  useEffect(() => {
    fetchOverviewExams();
    fetchAnnouncements();
  }, []);

  // 2. Fetch exams when user modifies page, search, or filters
  useEffect(() => {
    fetchExams(true);
  }, [currentPage, searchQuery, statusFilter, selectedSubjectFilter]);

  // 3. Periodic Background Auto-Polling (every 5 seconds for instant real-time sync)
  useEffect(() => {
    const timer = setInterval(() => {
      syncDashboardData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentPage, searchQuery, statusFilter, selectedSubjectFilter]);

  // 4. Tab Focus & Page Visibility Change (immediate sync when student opens/returns to tab)
  useEffect(() => {
    const handleRevalidate = () => {
      syncDashboardData(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRevalidate();
      }
    };

    window.addEventListener('focus', handleRevalidate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleRevalidate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage, searchQuery, statusFilter, selectedSubjectFilter]);

  // 5. Cross-tab instant sync via localStorage storage event & BroadcastChannel
  useEffect(() => {
    const handleRevalidate = () => {
      syncDashboardData(true);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cbt_exam_schedule_updated') {
        handleRevalidate();
      }
    };
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cbt_exam_sync_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'exam_updated') {
          handleRevalidate();
        }
      };
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [currentPage, searchQuery, statusFilter, selectedSubjectFilter]);

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

  // Completed exams stats
  const finishedExams = statSourceExams.filter(e => e.attempt?.status === 'submitted' || e.attempt?.status === 'auto_submitted');
  const scoredExams = finishedExams.filter(e => e.attempt?.total_score !== null && e.attempt?.total_score !== undefined);
  const avgScore = scoredExams.length > 0
    ? Math.round(scoredExams.reduce((acc, curr) => acc + (curr.attempt?.total_score || 0), 0) / scoredExams.length)
    : 100;

  // Fixed statistics calculations: prevent negative available exams & clamp percentages <= 100%
  const totalExamsCount = Math.max(statSourceExams.length, paginationMeta.total || 0);
  const finishedCount = finishedExams.length;
  const availableExamsCount = Math.max(0, totalExamsCount - finishedCount);
  const unstartedCount = Math.max(0, statSourceExams.filter(e => !e.attempt || e.attempt.status === 'not_started' || e.attempt.status === 'in_progress').length);
  const completionPercent = totalExamsCount > 0
    ? Math.min(100, Math.max(0, Math.round((finishedCount / totalExamsCount) * 100)))
    : 0;

  // Compute subject-level KKM statistics
  const subjectKkmStats: SubjectKkmStat[] = React.useMemo(() => {
    const map = new Map<string, {
      subject_id?: number | null;
      subject_code: string;
      subject_name: string;
      kkm: number;
      total_exams: number;
      completed_exams: number;
      scores: number[];
    }>();

    statSourceExams.forEach((ex) => {
      const key = ex.subject_name || ex.subject_code || 'Umum';
      if (!map.has(key)) {
        map.set(key, {
          subject_id: ex.subject_id,
          subject_code: ex.subject_code || 'MAPEL',
          subject_name: ex.subject_name || 'Mata Pelajaran',
          kkm: ex.kkm || 75,
          total_exams: 0,
          completed_exams: 0,
          scores: [],
        });
      }

      const item = map.get(key)!;
      item.total_exams += 1;
      if (ex.attempt?.status === 'submitted' || ex.attempt?.status === 'auto_submitted') {
        item.completed_exams += 1;
        if (ex.attempt.total_score !== null && ex.attempt.total_score !== undefined) {
          item.scores.push(ex.attempt.total_score);
        }
      }
    });

    return Array.from(map.values()).map((s) => {
      const hasScores = s.scores.length > 0;
      const avg = hasScores ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : null;
      const latest = hasScores ? s.scores[s.scores.length - 1] : null;
      const isTuntas = avg !== null ? avg >= s.kkm : false;
      const diff = avg !== null ? avg - s.kkm : null;

      return {
        subject_id: s.subject_id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        kkm: s.kkm,
        total_exams: s.total_exams,
        completed_exams: s.completed_exams,
        scored_exams: s.scores.length,
        avg_score: avg,
        latest_score: latest,
        is_tuntas: isTuntas,
        score_diff: diff,
      };
    });
  }, [statSourceExams]);

  // Unread announcements count for navbar bell badge
  const unreadAnnouncementsCount = announcements.filter(a => !dismissedAnnouncementIds.includes(a.id)).length;

  // Calendar Highlight Dates (dengan pemetaan status pengingat: upcoming, in_progress, completed)
  const calendarHighlights: HighlightDate[] = statSourceExams.map((ex) => {
    const isFinished = ex.attempt?.status === 'submitted' || ex.attempt?.status === 'auto_submitted';
    const isDisqualified = ex.attempt?.status === 'disqualified';
    const isInProgress = ex.attempt?.status === 'in_progress';
    const status = isDisqualified
      ? 'disqualified'
      : isFinished
      ? 'completed'
      : isInProgress
      ? 'in_progress'
      : 'upcoming';

    const cleanDate = extractDateOnly(ex.start_time) || extractDateOnly(new Date().toISOString());

    return {
      date: cleanDate,
      title: ex.title,
      subject_name: ex.subject_name,
      subject_code: ex.subject_code,
      start_time: ex.start_time,
      duration_minutes: ex.duration_minutes,
      status: status,
      type: 'exam',
      exam_group_id: ex.exam_group_id,
    };
  });

  // Dynamic Reminders for student computed from exam schedules & announcements
  const activeOrUpcomingExams = statSourceExams
    .filter(e => !e.attempt || e.attempt.status === 'not_started' || e.attempt.status === 'in_progress')
    .sort((a, b) => {
      const timeA = new Date((a.start_time || '').replace(' ', 'T')).getTime();
      const timeB = new Date((b.start_time || '').replace(' ', 'T')).getTime();
      return timeA - timeB;
    });

  const dynamicExamReminders: ReminderItem[] = activeOrUpcomingExams.slice(0, 3).map((ex) => {
    const isInProgress = ex.attempt?.status === 'in_progress';
    const examDate = ex.start_time
      ? new Date(ex.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Jadwal Aktif';

    return {
      id: `rem-exam-${ex.exam_group_id}`,
      title: ex.title,
      description: isInProgress
        ? `${ex.subject_name} • Sesi sedang aktif! Lanjutkan pengerjaan sebelum waktu habis.`
        : `${ex.subject_name} • Mulai: ${examDate} (${ex.duration_minutes} Menit)`,
      timeAgo: isInProgress ? 'Sedang Aktif' : 'Mendatang',
      type: isInProgress ? ('warning' as const) : ('info' as const)
    };
  });

  const announcementReminders: ReminderItem[] = announcements.slice(0, 3).map((a) => ({
    id: `rem-anno-${a.id}`,
    title: a.title,
    description: a.content.length > 85 ? a.content.substring(0, 85) + '...' : a.content,
    timeAgo: a.badge_text || 'Pengumuman',
    type: a.category === 'warning' ? 'warning' : a.category === 'exam' ? 'success' : 'info',
    onClick: () => setAnnouncementModalOpen(true),
  }));

  const studentReminders: ReminderItem[] = [
    ...announcementReminders,
    ...dynamicExamReminders,
    {
      id: 'rem-integrity',
      title: 'Integritas & Anti-Cheat Aktif',
      description: 'Layar penuh wajib saat ujian. Batas perpindahan tab dipantau secara otomatis.',
      timeAgo: 'Penting',
      type: 'warning' as const
    },
    ...(activeOrUpcomingExams.length === 0 && statSourceExams.length > 0 ? [{
      id: 'rem-completed-all',
      title: 'Semua Jadwal Ujian Selesai',
      description: 'Seluruh sesi ujian yang ditugaskan telah berhasil Anda kerjakan.',
      timeAgo: 'Tuntas',
      type: 'success' as const
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1014] text-[#161C2D] dark:text-[#F7FCFE] flex flex-col transition-colors duration-200 font-sans overflow-x-hidden">

      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-[#1A1E22] border-b-2 border-[#161C2D] dark:border-[#32363A] px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <BrandLogo imgClassName="h-8 sm:h-9 w-auto" />
          <div className="hidden sm:block border-l-2 border-slate-200 dark:border-white/10 pl-3">
            <p className="text-[11px] text-[#5D6371] dark:text-gray-400 font-semibold leading-tight">
              {user?.profile?.institution || 'Portal Ujian Siswa'}
            </p>
            {user?.profile?.class_name && (
              <p className="text-[10px] font-mono text-[#38B1ED] font-bold">
                Kelas: {user.profile.class_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:gap-3.5">
          {/* Live Sync Status & Manual Refresh */}
          <button
            type="button"
            onClick={() => syncDashboardData(false)}
            disabled={isSyncing}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-2 border-[#161C2D] dark:border-[#32363A] text-[#161C2D] dark:text-gray-300 shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            aria-label="Sinkronisasi Data Real-Time"
            title="Sinkronisasi Data Real-Time (Otomatis & Terus Diperbarui)"
          >
            <RefreshCw className={`h-4.5 w-4.5 stroke-[2.2] ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="Koneksi Real-time Aktif">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </button>

          {/* Announcement Bell with Unread Badge */}
          <button
            onClick={() => setAnnouncementModalOpen(true)}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-2 border-[#161C2D] dark:border-[#32363A] text-[#161C2D] dark:text-gray-300 shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            aria-label="Buka Pengumuman"
            title="Pengumuman & Informasi CBT"
          >
            <Bell className="h-4.5 w-4.5 stroke-[2.2]" />
            {unreadAnnouncementsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4.5 min-w-4.5 px-1 rounded-full bg-rose-500 text-white font-mono font-black text-[10px] flex items-center justify-center border-2 border-white dark:border-[#1A1E22] animate-pulse">
                {unreadAnnouncementsCount}
              </span>
            )}
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
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">

        {/* 1. Welcome Banner */}
        <WelcomeBanner
          title={`Semangat Belajar, ${user?.name || 'Siswa CBT'} 🎓`}
          subtitle="Kerjakan ujian dengan jujur, teliti, dan pastikan koneksi internet Anda stabil selama sesi berlangsung."
          roleBadge="Portal Peserta Ujian"
          metrics={[
            { label: 'Ujian Tersedia', value: availableExamsCount, highlight: availableExamsCount > 0 },
            { label: 'Ujian Selesai', value: finishedCount },
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
                centerSublabel="Rata-rata Skor (0–100)"
                items={[
                  { label: 'Rata-rata Nilai', percentage: avgScore, color: '#6366f1', count: `${avgScore}/100` },
                  { label: 'Ujian Selesai', percentage: completionPercent, color: '#10b981', count: `${finishedCount}/${totalExamsCount}` }
                ]}
              >
                {/* Pemantauan KKM per Mapel */}
                <SubjectKkmMonitor
                  subjects={subjectKkmStats}
                  activeSubjectFilter={selectedSubjectFilter}
                  onSelectSubject={(sub) => {
                    setSelectedSubjectFilter(sub);
                    resetPage();
                  }}
                />
              </DonutProgressChart>

              <div className="space-y-4">
                <GradientStatCard
                  title="Total Ujian Diikuti"
                  value={`${finishedCount} Sesi`}
                  subtitle="Telah tuntas dikumpulkan"
                  icon={CheckCircle}
                  variant="emerald"
                />

                {/* Hasil Ujian per Mapel (Menggantikan Kartu Keamanan Sesi) */}
                <SubjectExamSummaryCard
                  subjects={subjectKkmStats}
                  activeSubjectFilter={selectedSubjectFilter}
                  onSelectSubject={(sub) => {
                    setSelectedSubjectFilter(sub);
                    resetPage();
                  }}
                />
              </div>
            </div>

            {/* All Exams List / History Card Grid */}
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
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs text-slate-600 dark:text-gray-300 font-mono font-bold bg-slate-200/60 dark:bg-white/5 px-3 py-1 rounded-xl border border-slate-300/60 dark:border-white/10">
                    {paginationMeta.total} Jadwal Ujian
                  </span>
                </div>
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

                {/* Filter Tabs: Semua, Belum Dikerjakan, Selesai (Revisi 7: Scrollable Horizontal & 44px) */}
                <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/60 dark:border-white/10 rounded-2xl shrink-0 gap-1 overflow-x-auto no-scrollbar max-w-full">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      resetPage();
                    }}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${statusFilter === 'all'
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
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${statusFilter === 'unstarted'
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
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${statusFilter === 'completed'
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

              {/* Active Subject Filter Banner (from Hasil Ujian per Mapel) */}
              {selectedSubjectFilter && (
                <div className="flex items-center justify-between p-2.5 px-3 bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-xl text-xs animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-indigo-600 text-white font-mono text-[9px] font-bold">MAPEL</span>
                    <span className="text-slate-600 dark:text-gray-300">Menyaring jadwal ujian untuk:</span>
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300 underline underline-offset-2">
                      {selectedSubjectFilter}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSubjectFilter(null);
                      resetPage();
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                    title="Tampilkan seluruh mata pelajaran"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Hapus Filter</span>
                  </button>
                </div>
              )}

              {loading ? (
                <CardGridSkeleton count={2} cols="grid-cols-1 md:grid-cols-2" />
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
                /* Tampilan Tabel / List Sesuai Contoh Sketsa Pengguna (NO | Paket | Tanggal | Durasi | Status | Aksi) */
                <div className="glass-panel rounded-3xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] overflow-hidden bg-white dark:bg-[#1A1E22] animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-white/5 border-b-2 border-[#161C2D] dark:border-[#32363A] text-[11px] font-mono font-black text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                          <th className="py-3.5 px-3 text-center w-12 sm:w-16">NO</th>
                          <th className="py-3.5 px-3 sm:px-4 min-w-[200px]">PAKET / UJIAN</th>
                          <th className="py-3.5 px-3 sm:px-4 whitespace-nowrap">TANGGAL</th>
                          <th className="py-3.5 px-3 sm:px-4 whitespace-nowrap">DURASI</th>
                          <th className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">STATUS</th>
                          <th className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap min-w-[140px]">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                        {exams.map((exam, index) => {
                          const attempt = exam.attempt;
                          const isFinished = attempt?.status === 'submitted' || attempt?.status === 'auto_submitted';
                          const isDisqualified = attempt?.status === 'disqualified';
                          const isStarting = startingExamGroupId === exam.exam_group_id;
                          const rowNumber = (paginationMeta.from || 1) + index;
                          const dateStr = exam.start_time
                            ? new Date(exam.start_time).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-';

                          return (
                            <tr
                              key={exam.exam_group_id}
                              className={`hover:bg-indigo-50/40 dark:hover:bg-white/[0.03] transition-colors ${
                                isDisqualified
                                  ? 'bg-rose-50/20 dark:bg-rose-950/10'
                                  : isFinished
                                  ? 'bg-emerald-50/10 dark:bg-emerald-950/5'
                                  : ''
                              }`}
                            >
                              {/* 1. NO */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-500 dark:text-gray-400">
                                {rowNumber}
                              </td>

                              {/* 2. PAKET / NAMA UJIAN */}
                              <td className="py-3.5 px-3 sm:px-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
                                    {exam.title}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-gray-400">
                                    <span className="font-semibold text-slate-700 dark:text-gray-300">
                                      {exam.subject_name}
                                    </span>
                                    <span>•</span>
                                    <span className="font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 rounded border border-slate-200 dark:border-white/10 text-[10px]">
                                      {exam.subject_code}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* 3. TANGGAL */}
                              <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300 font-mono text-[11px]">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>{dateStr}</span>
                                </div>
                              </td>

                              {/* 4. DURASI */}
                              <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 font-mono text-[11px] font-semibold">
                                  <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                  <span>
                                    {exam.effective_duration_minutes !== undefined &&
                                    exam.effective_duration_minutes < exam.duration_minutes ? (
                                      <span
                                        className="text-amber-600 dark:text-amber-400 font-bold"
                                        title={`Durasi normal ${exam.duration_minutes} menit, namun dibatasi sisa waktu sesi`}
                                      >
                                        {exam.effective_duration_minutes} Menit
                                      </span>
                                    ) : (
                                      `${exam.duration_minutes} Menit`
                                    )}
                                  </span>
                                </div>
                              </td>

                              {/* 5. STATUS */}
                              <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                                {isDisqualified ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">
                                    <Ban className="h-3 w-3 shrink-0" />
                                    Didiskualifikasi
                                  </span>
                                ) : attempt?.status === 'in_progress' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 animate-pulse">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    Sedang Dikerjakan
                                  </span>
                                ) : isFinished ? (
                                  <div className="flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                                      <CheckCircle className="h-3 w-3 shrink-0" />
                                      Selesai
                                    </span>
                                    {attempt?.total_score !== null && attempt?.total_score !== undefined && (
                                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        Nilai: {attempt.total_score}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-white/10 dark:text-gray-300 dark:border-white/20">
                                    Belum
                                  </span>
                                )}
                              </td>

                              {/* 6. AKSI (Detail / Mulai / Lanjutkan) */}
                              <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                                {isDisqualified ? (
                                  <span className="text-[11px] text-rose-500 font-bold italic">
                                    Didiskualifikasi
                                  </span>
                                ) : isFinished ? (
                                  attempt?.is_session_ended === false ? (
                                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-500 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 inline-flex items-center gap-1 cursor-not-allowed">
                                      <Clock className="h-3.5 w-3.5" />
                                      Tunggu Sesi
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => fetchReview(attempt?.id)}
                                      className="min-h-[36px] px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black border-2 border-indigo-200 dark:border-indigo-500/40 inline-flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                                      title="Lihat Kunci & Pembahasan"
                                    >
                                      <BookOpen className="h-3.5 w-3.5" />
                                      <span>Detail</span>
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={() => handleStartOrResumeExam(exam)}
                                    disabled={isStarting}
                                    className={`min-h-[36px] px-4 py-1.5 rounded-xl text-xs font-black transition inline-flex items-center gap-1.5 border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 ${
                                      attempt?.status === 'in_progress'
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                        : 'bg-[#4379EE] hover:bg-[#3465D9] text-white'
                                    }`}
                                  >
                                    {isStarting ? (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        <span>Menyiapkan...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3.5 w-3.5" />
                                        <span>{attempt?.status === 'in_progress' ? 'Lanjutkan' : 'Mulai'}</span>
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
                currentPage={paginationMeta.currentPage}
                lastPage={paginationMeta.lastPage}
                from={paginationMeta.from}
                to={paginationMeta.to}
                total={paginationMeta.total}
                onPageChange={setPage}
              />
            </div>

          </div>

          {/* Right 1 Column: Student Profile, Calendar & Reminders */}
          <div className="space-y-6">

            {/* Student Profile Card */}
            <div className="glass-panel rounded-3xl p-5 space-y-4 border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-400/40 flex items-center justify-center text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono shadow-md">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[170px]">{user?.name}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">
                    {user?.profile?.nisn ? `NISN: ${user.profile.nisn}` : (user?.email || user?.username)}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-indigo-500" /> Instansi</span>
                  <span className="text-slate-900 dark:text-white font-bold">{user?.profile?.institution || 'Sekolah Mitra'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-purple-500" /> Jenjang</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{user?.profile?.jenjang || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-blue-500" /> Kelas</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{user?.profile?.class_name || user?.profile?.class_room?.name || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
                  <span>Status Akun</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Aktif / Terdaftar</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
                  <span>Sesi Login</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-mono font-bold">Tervalidasi</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Keamanan Akun</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px] flex items-center gap-1" title="Single-session lock aktif: akun Anda dilindungi dari multi-login bersamaan">
                    <Lock className="h-3 w-3" /> Lock Sesi Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <CalendarWidget
              highlights={calendarHighlights}
              isSyncing={isSyncing}
              onSelectExam={(examGroupId) => {
                const target = statSourceExams.find(e => String(e.exam_group_id) === String(examGroupId));
                if (target) {
                  handleStartOrResumeExam(target);
                }
              }}
            />

            {/* Reminders with id for smooth auto-scroll from header dropdown */}
            <div id="student-reminders" className="scroll-mt-20">
              <RemindersList
                title="Informasi & Pengingat"
                reminders={studentReminders}
              />
            </div>

          </div>

        </div>

      </main>

      {/* Review & Pembahasan Modal (Revisi 4, 5, 6) */}
      <ExamReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        reviewData={reviewData}
        isLoading={reviewLoading}
      />

      {/* Student Announcement Modal (Revisi 1) */}
      <StudentAnnouncementModal
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        announcements={announcements}
        dismissedIds={dismissedAnnouncementIds}
        onDismissAnnouncement={handleDismissAnnouncement}
        onDismissAll={handleDismissAllAnnouncements}
      />

    </div>
  );
};
export default StudentExamsPage;
