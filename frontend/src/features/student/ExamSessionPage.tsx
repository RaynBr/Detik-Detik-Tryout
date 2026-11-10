import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { PageLoader } from '../../shared/components/LoadingSkeleton';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { toast } from '../../shared/context/ToastContext';
import {
  saveAnswerOffline,
  getOfflineAnswers,
  getPendingOfflineAnswers,
  markAnswerAsSynced,
  saveExamSessionOffline,
  getExamSessionOffline,
  clearOfflineExamData
} from '../../shared/utils/offlineExamStorage';
import { 
  Clock, AlertTriangle, Shield, CheckSquare, 
  ChevronLeft, ChevronRight, ChevronDown, HelpCircle, Send, Maximize,
  CheckCircle, X, RefreshCw, Check, Ban, WifiOff, HardDrive,
  BookOpen, Lock, Pin, PinOff
} from 'lucide-react';
import { ExamReviewModal } from './components/ExamReviewModal';

interface QuestionOption {
  id: number;
  content: string;
  media_url: string | null;
}

interface MatchingPair {
  id: number;
  left_item: string;
  right_item: string;
}

interface Question {
  answer_id: number;
  question_id: number;
  topic: string;
  type: 'multiple_choice_single' | 'multiple_choice_multi' | 'essay' | 'true_false' | 'matching';
  content: string;
  media_url: string | null;
  options: QuestionOption[];
  matching_pairs: MatchingPair[];
  answer_content: any;
  is_flagged: boolean;
}

export const ExamSessionPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  // Core state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState<string>('Ujian CBT');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isSessionLimited, setIsSessionLimited] = useState<boolean>(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Anti-Cheat & Security
  const [violationCount, setViolationCount] = useState(0);
  const [disqualified, setDisqualified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(true);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [latestViolationMessage, setLatestViolationMessage] = useState('');
  const [maxTabSwitches, setMaxTabSwitches] = useState<number>(5);

  // Anti-Cheat Instant Tracker Refs
  const violationCountRef = useRef(0);
  const maxTabSwitchesRef = useRef(5);
  const disqualifiedRef = useRef(false);
  const lastViolationTimestampRef = useRef(0);

  // Countdown Timer Wall-Clock Ref (prevents interval teardown stutter and timer drift)
  const targetEndTimeRef = useRef<number | null>(null);
  const autoSubmittedRef = useRef<boolean>(false);

  // Autosave and Sync state
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'saved_offline' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number | null;
    status: string;
    message: string;
    is_session_ended?: boolean;
    session_end_time?: string | null;
  } | null>(null);

  // Responsive & Accessibility State (Font Scaling)
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Dropdown Menu Navigasi Soal di Sisi Kanan (User Request: "ditaruh kanan aja dibikin kaya menu dropdown gitu jangan diatas")
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Opsi sematkan sidebar di desktop jika siswa ingin tetap menampilkan panel
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cbt_sidebar_pinned') === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleSidebarPin = () => {
    setIsSidebarPinned(prev => {
      const next = !prev;
      try { localStorage.setItem('cbt_sidebar_pinned', String(next)); } catch (_) {}
      return next;
    });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNavDropdown(false);
      }
    };
    if (showNavDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNavDropdown]);

  // Question Filter in Navigation: 'all' | 'unanswered' | 'answered' | 'flagged'
  type NavFilterType = 'all' | 'unanswered' | 'answered' | 'flagged';
  const [navFilter, setNavFilter] = useState<NavFilterType>('all');

  // Fast navigation to next unanswered question
  const jumpToNextUnanswered = () => {
    const nextIdx = questions.findIndex(
      (q, i) => i > currentIdx && (!q.answer_content || Object.keys(q.answer_content).length === 0)
    );
    if (nextIdx !== -1) {
      setCurrentIdx(nextIdx);
      return;
    }
    const firstIdx = questions.findIndex(
      q => !q.answer_content || Object.keys(q.answer_content).length === 0
    );
    if (firstIdx !== -1) {
      setCurrentIdx(firstIdx);
    } else {
      toast.success('Hebat! Semua soal telah dijawab.');
    }
  };

  // Immediate Review & Pembahasan Modal State
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  const [reviewData, setReviewData] = useState<any | null>(null);

  const fetchSessionReview = async () => {
    if (!attemptId) return;
    setReviewLoading(true);
    setShowReviewModal(true);
    try {
      const res = await apiClient.get(`/student/results/${attemptId}`);
      setReviewData(res.data);
    } catch (err) {
      toast.error('Gagal memuat kunci jawaban dan pembahasan.');
      setShowReviewModal(false);
    } finally {
      setReviewLoading(false);
    }
  };

  // In-memory fallback queue
  const pendingAnswersQueue = useRef<{ [questionId: number]: any }>({});
  const isSyncingRef = useRef(false);

  // 1. Initial Exam Attempt Loader with IndexedDB Offline Fallback
  useEffect(() => {
    const fetchExamSession = async () => {
      setLoadingSession(true);
      setFetchError(null);
      try {
        const res = await apiClient.get(`/student/attempts/${attemptId}/questions`);
        const attempt = res.data.attempt;
        let qList: Question[] = res.data.questions || [];

        // Exam title
        const title = attempt?.exam?.title || res.data.attempt?.exam?.title || 'Ujian CBT';
        setExamTitle(title);
        if (attemptId) {
          try { localStorage.setItem(`cbt_exam_title_${attemptId}`, title); } catch (_) {}
        }

        // Dynamic max tab switches from exam anti-cheat settings
        const settingLimit = attempt.exam?.settings?.max_tab_switches;
        if (settingLimit !== undefined && settingLimit !== null) {
          const parsed = Number(settingLimit);
          setMaxTabSwitches(parsed);
          maxTabSwitchesRef.current = parsed;
        }

        const count = attempt.tab_switch_count || 0;
        setViolationCount(count);
        violationCountRef.current = count;

        // Check if already finished or disqualified
        if (['submitted', 'auto_submitted', 'disqualified'].includes(attempt.status)) {
          disqualifiedRef.current = attempt.status === 'disqualified';
          setSubmissionResult({
            score: attempt.total_score,
            status: attempt.status,
            message: attempt.status === 'disqualified' 
              ? 'Sesi ujian ini telah didiskualifikasi.' 
              : 'Anda telah mengumpulkan lembar jawaban untuk ujian ini.'
          });
          // Clean up offline storage
          if (attemptId) clearOfflineExamData(attemptId);
          setLoadingSession(false);
          return;
        }

        // Merge any pending answers previously saved in IndexedDB
        if (attemptId) {
          const offlineAnswers = await getOfflineAnswers(attemptId);
          if (offlineAnswers.length > 0) {
            const answerMap = new Map(offlineAnswers.map(a => [a.questionId, a]));
            qList = qList.map(q => {
              const cached = answerMap.get(q.question_id);
              if (cached) {
                return {
                  ...q,
                  answer_content: cached.answer_content,
                  is_flagged: cached.is_flagged
                };
              }
              return q;
            });
          }

          // Cache entire question set to IndexedDB for offline resilience
          const rawSecs = res.data.time_remaining_seconds !== undefined
            ? res.data.time_remaining_seconds
            : (res.data.attempt?.time_remaining_seconds !== undefined ? res.data.attempt.time_remaining_seconds : 0);
          const remainingSecs = Math.max(0, Math.floor(Number(rawSecs) || 0));

          if (res.data.is_session_limited || res.data.attempt?.is_session_limited) {
            setIsSessionLimited(true);
          }

          if (remainingSecs <= 0 && attempt.status === 'in_progress') {
            handleAutoSubmit();
            setLoadingSession(false);
            return;
          }

          targetEndTimeRef.current = Date.now() + remainingSecs * 1000;
          await saveExamSessionOffline(attemptId, qList, remainingSecs);
          const pending = await getPendingOfflineAnswers(attemptId);
          setPendingSyncCount(pending.length);
        }

        setQuestions(qList);
        const initialRawSecs = res.data.time_remaining_seconds !== undefined
          ? res.data.time_remaining_seconds
          : (res.data.attempt?.time_remaining_seconds || 0);
        const initialCleanSecs = Math.max(0, Math.floor(Number(initialRawSecs) || 0));
        setTimeRemaining(initialCleanSecs);
        targetEndTimeRef.current = Date.now() + initialCleanSecs * 1000;

      } catch (err: any) {
        console.warn('Network request failed, attempting IndexedDB offline cache restore:', err);

        // Attempt to load from IndexedDB offline storage
        if (attemptId) {
          const cachedTitle = localStorage.getItem(`cbt_exam_title_${attemptId}`);
          if (cachedTitle) setExamTitle(cachedTitle);
          const cachedSession = await getExamSessionOffline(attemptId);
          if (cachedSession && cachedSession.questions && cachedSession.questions.length > 0) {
            const offlineAnswers = await getOfflineAnswers(attemptId);
            let restoredQuestions: Question[] = cachedSession.questions;

            if (offlineAnswers.length > 0) {
              const answerMap = new Map(offlineAnswers.map(a => [a.questionId, a]));
              restoredQuestions = restoredQuestions.map(q => {
                const cached = answerMap.get(q.question_id);
                if (cached) {
                  return {
                    ...q,
                    answer_content: cached.answer_content,
                    is_flagged: cached.is_flagged
                  };
                }
                return q;
              });
            }

            setQuestions(restoredQuestions);
            const cachedCleanSecs = Math.max(0, Math.floor(Number(cachedSession.timeRemainingSeconds) || 0));
            setTimeRemaining(cachedCleanSecs);
            targetEndTimeRef.current = Date.now() + cachedCleanSecs * 1000;
            const pending = await getPendingOfflineAnswers(attemptId);
            setPendingSyncCount(pending.length);
            setSavingStatus('saved_offline');
            toast.info('Mode Offline Aktif: Lembar soal berhasil dipulihkan dari penyimpanan perangkat lokal (IndexedDB).', 'Mode Offline');
            setLoadingSession(false);
            return;
          }
        }

        setFetchError(err.response?.data?.message || 'Gagal memuat sesi ujian. Silakan periksa koneksi internet Anda.');
      } finally {
        setLoadingSession(false);
      }
    };

    fetchExamSession();
  }, [attemptId]);

  // 2. Online / Offline network listeners & resilient auto-flush engine
  const flushPendingAnswers = async () => {
    if (!attemptId || isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      // 1. Get pending answers from IndexedDB
      const pendingList = await getPendingOfflineAnswers(attemptId);
      setPendingSyncCount(pendingList.length);

      if (pendingList.length === 0) {
        isSyncingRef.current = false;
        return;
      }

      let syncedSuccessCount = 0;

      for (const item of pendingList) {
        try {
          const payload = {
            question_id: item.questionId,
            answer_content: item.answer_content,
            is_flagged: item.is_flagged
          };

          await apiClient.patch(`/student/attempts/${attemptId}/answers`, payload);
          await markAnswerAsSynced(attemptId, item.questionId);
          delete pendingAnswersQueue.current[item.questionId];
          syncedSuccessCount++;
        } catch (err) {
          console.warn(`Sync retry failed for question ${item.questionId}:`, err);
        }
      }

      const remainingPending = await getPendingOfflineAnswers(attemptId);
      setPendingSyncCount(remainingPending.length);

      if (remainingPending.length === 0) {
        setSavingStatus('saved');
        if (syncedSuccessCount > 0) {
          toast.success(`Sinkronisasi Sukses: ${syncedSuccessCount} jawaban offline telah berhasil terkirim ke server!`, 'Sinkronisasi Server');
        }
      } else {
        setSavingStatus('saved_offline');
      }
    } catch (e) {
      console.error('Error during flushPendingAnswers:', e);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi internet terhubung kembali. Memulai sinkronisasi data...', 'Internet Pulih');
      flushPendingAnswers();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Koneksi internet terputus. Seluruh jawaban Anda tetap aman tersimpan di perangkat lokal (IndexedDB).', 'Mode Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic Background Sync Heartbeat (every 10 seconds if online)
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        flushPendingAnswers();
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [attemptId]);

  // 3. Wall-Clock Synchronized Countdown Timer (drift-proof, zero teardown latency)
  useEffect(() => {
    if (loadingSession || submissionResult || disqualified) return;

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;

      const now = Date.now();
      const diffMs = targetEndTimeRef.current - now;
      const remainingSecs = Math.max(0, Math.ceil(diffMs / 1000));

      setTimeRemaining(remainingSecs);

      if (remainingSecs <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && targetEndTimeRef.current) {
        const now = Date.now();
        const diffMs = targetEndTimeRef.current - now;
        const remainingSecs = Math.max(0, Math.ceil(diffMs / 1000));
        setTimeRemaining(remainingSecs);
        if (remainingSecs <= 0 && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          handleAutoSubmit();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadingSession, submissionResult, disqualified]);

  // 4. Anti-Cheat: Tab Switching & Window Blur Detection (Alt+Tab, Minimize, Split Screen)
  useEffect(() => {
    if (loadingSession || submissionResult || disqualified) return;

    const triggerViolation = (type: string = 'tab_switch') => {
      if (disqualifiedRef.current || disqualified || submissionResult) return;

      const now = Date.now();
      // Debounce duplicate events fired within 600ms for the exact same switch
      if (now - lastViolationTimestampRef.current < 600) return;
      lastViolationTimestampRef.current = now;

      // Synchronous optimistic increment (0ms UI latency)
      violationCountRef.current += 1;
      const currentCount = violationCountRef.current;
      const maxLimit = maxTabSwitchesRef.current;

      setViolationCount(currentCount);

      if (currentCount >= maxLimit) {
        disqualifiedRef.current = true;
        setDisqualified(true);
        setShowViolationModal(false);
        setSubmissionResult({
          score: 0,
          status: 'disqualified',
          message: 'Anda didiskualifikasi dari ujian karena berpindah jendela/aplikasi (Alt+Tab) melebihi batas maksimal yang diizinkan.'
        });

        // Fire explicit disqualify call immediately to guarantee database lock
        apiClient.post(`/student/attempts/${attemptId}/disqualify`, {
          attempt_id: attemptId
        }).catch(err => {
          console.error('Failed to sync disqualify status:', err);
        });
      } else {
        setShowViolationModal(true);
        setLatestViolationMessage(`Peringatan: Terdeteksi perpindahan jendela/aplikasi ke-${currentCount} dari batas maksimal ${maxLimit} kali! Sisa kesempatan: ${maxLimit - currentCount} kali.`);
        toast.warning(
          `Peringatan: Terdeteksi perpindahan jendela (${currentCount}/${maxLimit})! Sisa kesempatan: ${maxLimit - currentCount}.`, 
          'Pelanggaran Terdeteksi'
        );
      }

      // Sync to backend asynchronously
      apiClient.post(`/student/attempts/${attemptId}/violations`, {
        attempt_id: attemptId,
        violation_type: type,
        type: type,
        is_disqualified: currentCount >= maxLimit,
        force_disqualify: currentCount >= maxLimit
      }).then(res => {
        if (res.data.is_disqualified) {
          disqualifiedRef.current = true;
          setDisqualified(true);
          setShowViolationModal(false);
          setSubmissionResult({
            score: 0,
            status: 'disqualified',
            message: 'Anda didiskualifikasi dari ujian karena berpindah jendela/aplikasi (Alt+Tab) melebihi batas maksimal yang diizinkan.'
          });
        }
      }).catch(err => {
        console.error('Violation background sync error:', err);
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switch');
      }
    };

    const handleBlur = () => {
      triggerViolation('window_blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [loadingSession, attemptId, submissionResult, disqualified]);

  // 5. Anti-Cheat: Fullscreen Event Monitor & Shortcut Key Protection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && !submissionResult && !loadingSession) {
        setShowFullscreenModal(true);
      }
    };

    // Anti-Cheat: Prevent F12, DevTools, Copy, Cut, Paste outside inputs, Print, Drag & Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Block Developer Tools (F12, Ctrl+Shift+I/J/C)
      if (e.key === 'F12' || (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Copy (Ctrl+C), Cut (Ctrl+X), Print (Ctrl+P), Save (Ctrl+S), View Source (Ctrl+U)
      if (isCtrlOrCmd && ['c', 'x', 'p', 's', 'u'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        toast.warning('Aksi menyalin (Copy) / mencetak lembar soal diblokir demi integritas ujian!', 'Proteksi Keamanan');
        return;
      }

      // Check if user is typing in essay or input
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      // Block Select All (Ctrl+A) and Paste (Ctrl+V) outside text inputs
      if (isCtrlOrCmd && ['a', 'v'].includes(key) && !isTyping) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Keyboard navigation between questions: Arrow Left (Previous) & Arrow Right (Next)
      if (!isTyping) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setCurrentIdx(prev => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1));
        }
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning('Menyalin (Copy) teks lembar ujian tidak diizinkan!', 'Proteksi Integritas');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isTyping) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('cut', handleCut, true);
    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('selectstart', handleSelectStart, true);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('cut', handleCut, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('selectstart', handleSelectStart, true);
    };
  }, [submissionResult, loadingSession, questions.length]);

  const enterFullscreenMode = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          setShowFullscreenModal(false);
        })
        .catch((err) => {
          console.warn('Fullscreen request blocked:', err);
          setShowFullscreenModal(false);
        });
    } else {
      setShowFullscreenModal(false);
    }
  };

  const exitFullscreenMode = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.warn('Error exiting fullscreen:', err);
      });
    }
  };

  // Automatically exit fullscreen when exam is completed or disqualified
  useEffect(() => {
    if (submissionResult || disqualified) {
      exitFullscreenMode();
    }
  }, [submissionResult, disqualified]);

  const handleReturnToDashboard = async () => {
    exitFullscreenMode();
    if (disqualifiedRef.current || disqualified || submissionResult?.status === 'disqualified') {
      try {
        await apiClient.post(`/student/attempts/${attemptId}/disqualify`, { attempt_id: attemptId });
      } catch (err) {
        console.warn('Disqualify sync error on return:', err);
      }
    }
    navigate('/student/dashboard');
  };

  // Autosave payload handler with IndexedDB dual-layer persistence
  const saveAnswerToBackend = async (question: Question) => {
    // Layer 1: Immediately persist to IndexedDB (takes < 2ms, zero risk of data loss)
    if (attemptId) {
      await saveAnswerOffline(attemptId, question.question_id, question.answer_content, question.is_flagged, 'pending');
    }

    const payload = {
      question_id: question.question_id,
      answer_content: question.answer_content,
      is_flagged: question.is_flagged
    };

    // Layer 2: If offline, mark as saved locally
    if (!navigator.onLine) {
      setSavingStatus('saved_offline');
      if (attemptId) {
        const pending = await getPendingOfflineAnswers(attemptId);
        setPendingSyncCount(pending.length);
      }
      return;
    }

    // If online, dispatch to backend server
    setSavingStatus('saving');
    try {
      await apiClient.patch(`/student/attempts/${attemptId}/answers`, payload);
      setSavingStatus('saved');
      if (attemptId) {
        await markAnswerAsSynced(attemptId, question.question_id);
        const pending = await getPendingOfflineAnswers(attemptId);
        setPendingSyncCount(pending.length);
      }
      delete pendingAnswersQueue.current[question.question_id];
    } catch (err) {
      console.warn('Network sync failed, answer preserved safely in IndexedDB:', err);
      pendingAnswersQueue.current[question.question_id] = payload;
      setSavingStatus('saved_offline');
      if (attemptId) {
        const pending = await getPendingOfflineAnswers(attemptId);
        setPendingSyncCount(pending.length);
      }
    }
  };

  // Individual Question answer modifiers
  const handleMCQSingleChange = (optionId: number) => {
    const updated = [...questions];
    updated[currentIdx].answer_content = { option_id: optionId };
    setQuestions(updated);
    saveAnswerToBackend(updated[currentIdx]);
  };

  const handleMCQMultiToggle = (optionId: number) => {
    const updated = [...questions];
    const currentAns = updated[currentIdx].answer_content?.option_ids || [];
    
    let newAns;
    if (currentAns.includes(optionId)) {
      newAns = currentAns.filter((id: number) => id !== optionId);
    } else {
      newAns = [...currentAns, optionId];
    }

    updated[currentIdx].answer_content = { option_ids: newAns };
    setQuestions(updated);
    saveAnswerToBackend(updated[currentIdx]);
  };

  const handleTrueFalseChange = (value: string) => {
    const updated = [...questions];
    updated[currentIdx].answer_content = { text: value };
    setQuestions(updated);
    saveAnswerToBackend(updated[currentIdx]);
  };

  const essayDebounceRef = useRef<any>(null);

  const handleEssayChange = (value: string) => {
    const updated = [...questions];
    updated[currentIdx].answer_content = { essay_text: value };
    setQuestions(updated);

    // Save to IndexedDB immediately for instant keystroke durability
    if (attemptId) {
      saveAnswerOffline(attemptId, updated[currentIdx].question_id, updated[currentIdx].answer_content, updated[currentIdx].is_flagged, 'pending');
    }

    // Debounce backend request by 800ms for smooth essay typing without server flooding
    if (essayDebounceRef.current) {
      clearTimeout(essayDebounceRef.current);
    }
    essayDebounceRef.current = setTimeout(() => {
      saveAnswerToBackend(updated[currentIdx]);
    }, 800);
  };

  const handleMatchingChange = (leftItem: string, rightItem: string) => {
    const updated = [...questions];
    const currentMatches = updated[currentIdx].answer_content?.matches || {};
    
    const newMatches = { ...currentMatches, [leftItem]: rightItem };
    updated[currentIdx].answer_content = { matches: newMatches };
    
    setQuestions(updated);
    saveAnswerToBackend(updated[currentIdx]);
  };

  const toggleFlag = () => {
    const updated = [...questions];
    updated[currentIdx].is_flagged = !updated[currentIdx].is_flagged;
    setQuestions(updated);
    saveAnswerToBackend(updated[currentIdx]);
  };

  const handleAutoSubmit = async () => {
    exitFullscreenMode();
    try {
      // Flush offline pending answers first
      if (attemptId && navigator.onLine) {
        await flushPendingAnswers();
      }
      const res = await apiClient.post(`/student/attempts/${attemptId}/submit`);
      if (attemptId) {
        await clearOfflineExamData(attemptId);
      }
      setSubmissionResult({
        score: res.data.attempt?.total_score ?? null,
        status: res.data.attempt?.status ?? 'auto_submitted',
        message: res.data.is_session_ended === false
          ? 'Waktu pengerjaan Anda telah selesai. Seluruh jawaban Anda telah tersimpan dengan aman di server. Skor dan pembahasan akan diumumkan setelah seluruh sesi ujian ditutup resmi.'
          : 'Waktu ujian telah berakhir. Seluruh lembar jawaban Anda telah dikumpulkan secara otomatis.',
        is_session_ended: res.data.is_session_ended,
        session_end_time: res.data.session_end_time,
      });
    } catch (err) {
      console.error('Auto submit error:', err);
    }
  };

  const handleManualSubmit = () => {
    setSubmitError(null);
    setShowSubmitConfirmModal(true);
  };

  const handleConfirmFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Check offline before submitting
    if (!navigator.onLine) {
      setSubmitError('Koneksi internet Anda sedang terputus. Seluruh jawaban Anda aman tersimpan di perangkat lokal (IndexedDB). Silakan hubungkan kembali perangkat Anda ke jaringan sebelum mengumpulkan ujian.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Flush all pending offline answers to server first
      if (attemptId) {
        await flushPendingAnswers();
      }

      const res = await apiClient.post(`/student/attempts/${attemptId}/submit`);
      exitFullscreenMode();
      setShowSubmitConfirmModal(false);

      if (attemptId) {
        await clearOfflineExamData(attemptId);
      }

      setSubmissionResult({
        score: res.data.attempt?.total_score ?? null,
        status: res.data.attempt?.status ?? 'submitted',
        message: res.data.is_session_ended === false
          ? 'Selamat! Ujian Anda telah berhasil dikumpulkan dan tersimpan aman di server. Skor dan pembahasan soal akan diumumkan setelah seluruh sesi ujian ditutup resmi.'
          : 'Selamat! Ujian Anda telah berhasil dikumpulkan dan tersimpan dengan aman di server.',
        is_session_ended: res.data.is_session_ended,
        session_end_time: res.data.session_end_time,
      });
    } catch (err: any) {
      console.error('Submit exam error:', err);
      setSubmitError(err.response?.data?.message || 'Gagal mengirimkan ujian. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatter for time display (sanitized against floating-point decimals)
  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, Math.floor(Number(secs) || 0));
    const h = Math.floor(safeSecs / 3600);
    const m = Math.floor((safeSecs % 3600) / 60);
    const s = safeSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIdx];

  // Render Submission Result / Success Screen / Disqualification Screen
  if (submissionResult) {
    const isDisq = submissionResult.status === 'disqualified';
    const answeredCount = questions.filter(q => q.answer_content && Object.keys(q.answer_content).length > 0).length;

    return (
      <div className="min-h-screen bg-slate-100/70 dark:bg-[#070a13] flex items-center justify-center p-6 text-center transition-colors duration-200">
        <div className={`max-w-md w-full glass-panel p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden border ${
          isDisq 
            ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20' 
            : 'border-emerald-500/20'
        }`}>
          <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl ${
            isDisq ? 'bg-rose-500/10' : 'bg-emerald-500/10'
          }`}></div>
          
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
            isDisq
              ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            {isDisq ? (
              <Ban className="h-10 w-10 animate-pulse" />
            ) : (
              <CheckCircle className="h-10 w-10 animate-pulse" />
            )}
          </div>

          <div>
            <h2 className={`text-2xl font-black tracking-tight ${
              isDisq ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            }`}>
              {isDisq ? 'Ujian Didiskualifikasi!' : 'Ujian Selesai!'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-2 leading-relaxed font-medium">
              {submissionResult.message}
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
              <span>Status Ujian</span>
              <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase font-mono ${
                isDisq ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}>
                {isDisq ? 'DIDISKUALIFIKASI' : 'SELESAI'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
              <span>Total Butir Soal</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{questions.length} Soal</span>
            </div>
            {!isDisq && (
              <div className="flex justify-between items-center text-slate-600 dark:text-gray-400 font-medium">
                <span>Soal Terjawab</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{answeredCount} Soal</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 dark:border-white/5 text-sm font-bold">
              <span className="text-slate-700 dark:text-gray-300">Nilai / Skor Akhir</span>
              {isDisq ? (
                <span className="text-lg font-mono text-rose-600 dark:text-rose-400 font-black">0</span>
              ) : submissionResult.is_session_ended === false ? (
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                  Menunggu Tutup Sesi
                </span>
              ) : (
                <span className="text-lg font-mono text-indigo-600 dark:text-indigo-400">
                  {submissionResult.score ?? '-'}
                </span>
              )}
            </div>
          </div>

          {/* Banner notification if session still active */}
          {!isDisq && submissionResult.is_session_ended === false && (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed text-left flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong>Sesi Masih Berlangsung:</strong> Skor dan pembahasan belum dapat diakses. Menunggu jadwal sesi ujian ditutup resmi.
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {!isDisq && (
              submissionResult.is_session_ended === false ? (
                <div className="w-full py-3 px-4 font-semibold text-xs rounded-xl text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 cursor-not-allowed">
                  <Lock className="h-4 w-4" />
                  <span>Pembahasan Belum Dibuka (Menunggu Tutup Sesi)</span>
                </div>
              ) : (
                <button
                  onClick={fetchSessionReview}
                  className="w-full py-3.5 px-4 font-bold text-sm rounded-xl shadow-md transition active:scale-95 text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Lihat Kunci & Pembahasan Ujian</span>
                </button>
              )
            )}

            <button
              onClick={handleReturnToDashboard}
              className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl shadow-lg transition active:scale-95 text-white ${
                isDisq
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
            >
              Kembali ke Portal Siswa
            </button>
          </div>
        </div>

        {/* Modal Kunci & Pembahasan Ujian (Revisi 4, 5, 6) */}
        <ExamReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          reviewData={reviewData}
          isLoading={reviewLoading}
        />
      </div>
    );
  }

  // 1. Loading State
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-100/70 dark:bg-[#070a13] flex items-center justify-center transition-colors">
        <PageLoader message="Mempersiapkan lembar soal & sinkronisasi timer..." height="min-h-[60vh]" />
      </div>
    );
  }

  // 2. Error State
  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-100/70 dark:bg-[#070a13] flex items-center justify-center p-6 text-center transition-colors">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl space-y-6 shadow-2xl border border-rose-300 dark:border-red-500/20">
          <AlertTriangle className="h-14 w-14 text-amber-500 mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Informasi Ujian</h2>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-2 leading-relaxed font-medium">{fetchError}</p>
          </div>
          <button
            onClick={handleReturnToDashboard}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 transition text-white font-bold text-sm rounded-xl"
          >
            Kembali ke Portal Siswa
          </button>
        </div>
      </div>
    );
  }

  // 3. Disqualified Lock Screen
  if (disqualified) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 dark:bg-[#070a13]/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full glass-panel p-8 border border-rose-300 dark:border-red-500/20 rounded-3xl space-y-6 shadow-2xl">
          <AlertTriangle className="h-16 w-16 text-rose-600 dark:text-red-500 mx-auto animate-bounce" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-rose-600 dark:text-red-400 tracking-tight">Sesi Ujian Diblokir</h2>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-2 leading-relaxed font-medium">
              Akun Anda telah didiskualifikasi dari ujian ini karena melebihi batas perpindahan tab browser yang diizinkan (maksimal {maxTabSwitches} kali).
            </p>
          </div>
          <button
            onClick={handleReturnToDashboard}
            className="w-full py-3 px-4 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 transition text-slate-800 dark:text-white font-bold text-sm rounded-xl"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 4. Fullscreen Gatekeeper Modal
  if (showFullscreenModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-[#070a13]/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl space-y-6 shadow-2xl border border-slate-200/80 dark:border-white/10">
          <Shield className="h-16 w-16 text-indigo-600 dark:text-indigo-400 mx-auto animate-pulse" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Peraturan Keamanan Ujian</h2>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-2 leading-relaxed font-medium">
              Ujian ini mewajibkan mode Layar Penuh (Fullscreen) dan mendeteksi perpindahan tab browser. Pelanggaran berulang dapat menyebabkan lembar jawaban Anda otomatis terkumpul atau diblokir.
            </p>
          </div>
          <button
            onClick={enterFullscreenMode}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30"
          >
            <Maximize className="h-4 w-4" />
            <span>Masuk Layar Penuh & Mulai</span>
          </button>
        </div>
      </div>
    );
  }

  // 5. Empty Questions State
  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100/70 dark:bg-[#070a13] flex items-center justify-center p-6 text-center transition-colors">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl space-y-6 shadow-2xl border border-slate-200/80 dark:border-white/10">
          <HelpCircle className="h-14 w-14 text-indigo-600 dark:text-indigo-400 mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Soal Belum Tersedia</h2>
            <p className="text-xs text-slate-600 dark:text-gray-400 mt-2 leading-relaxed font-medium">
              Paket soal untuk jadwal ujian ini belum diisi oleh guru pengampu atau sedang dalam pembaruan.
            </p>
          </div>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 transition text-white font-bold text-sm rounded-xl"
          >
            Kembali ke Portal Siswa
          </button>
        </div>
      </div>
    );
  }

  // Answer stats for navigation & confirmation
  const answeredCount = questions.filter(q => q.answer_content && Object.keys(q.answer_content).length > 0).length;
  const flaggedCount = questions.filter(q => q.is_flagged).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070a13] text-slate-800 dark:text-gray-100 flex flex-col transition-colors duration-200 cbt-secure-session select-none cursor-default overflow-x-hidden">
      
      {/* Top Session Bar (Revisi 8: Sticky Header) */}
      <header className="h-16 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-md border-b-2 border-[#161C2D] dark:border-[#32363A] px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-5 w-5 text-[#4379EE] shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-xs md:max-w-md" title={examTitle}>
              {examTitle}
            </h1>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden md:inline">
              Modul Proteksi Aktif {isFullscreen ? '(Layar Penuh)' : ''}
            </span>
          </div>
        </div>

        {/* Sync Timer & Controls widget */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Dropdown Menu Navigasi Soal di Kanan (User Request: "ditaruh kanan aja dibikin kaya menu dropdown gitu jangan diatas") */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowNavDropdown(prev => !prev)}
              className={`min-h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] transition active:translate-x-[1px] active:translate-y-[1px] ${
                showNavDropdown
                  ? 'bg-[#4379EE] text-white ring-2 ring-[#4379EE]/30'
                  : 'bg-white dark:bg-[#1A1E22] text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-[#252A2E]'
              }`}
              title="Menu Daftar Soal"
            >
              <CheckSquare className="h-4 w-4 text-[#4379EE] group-hover:text-white" />
              <span className="font-mono">{currentIdx + 1}/{questions.length}</span>
              <span className="hidden sm:inline">Daftar Soal</span>
              {unansweredCount > 0 ? (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-md text-[10px] font-mono font-bold animate-pulse">
                  {unansweredCount}
                </span>
              ) : (
                <span className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-500 text-white rounded-md text-[10px] font-mono font-bold">
                  ✓
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showNavDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Panel Dropdown Melayang di Sisi Kanan (Responsif: Fixed bounded di HP, Absolute di Desktop) */}
            {showNavDropdown && (
              <>
                {/* Mobile Backdrop agar saat disentuh di luar, menu tertutup */}
                <div
                  className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 animate-fade-in"
                  onClick={() => setShowNavDropdown(false)}
                />

                <div className="fixed inset-x-2.5 top-[68px] sm:top-full sm:right-0 sm:left-auto sm:absolute sm:mt-2 w-auto sm:w-[380px] max-w-[calc(100vw-20px)] sm:max-w-[94vw] bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] p-3.5 sm:p-4 z-50 space-y-3 sm:space-y-3.5 animate-slideDown max-h-[calc(100vh-85px)] sm:max-h-[82vh] overflow-y-auto">
                
                {/* Header Dropdown */}
                <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4.5 w-4.5 text-[#4379EE]" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Daftar Soal
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Opsi Sematkan Panel Samping di Desktop */}
                    <button
                      type="button"
                      onClick={toggleSidebarPin}
                      className="hidden md:flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 transition"
                      title={isSidebarPinned ? 'Lepas Sematan (Gunakan Dropdown)' : 'Sematkan ke Sisi Kanan Layar'}
                    >
                      {isSidebarPinned ? <PinOff className="h-3 w-3 text-rose-500" /> : <Pin className="h-3 w-3 text-[#4379EE]" />}
                      <span>{isSidebarPinned ? 'Lepas' : 'Sematkan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNavDropdown(false)}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Ringkasan Status */}
                <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                  Dijawab: <span className="text-emerald-600 font-black">{answeredCount}</span> • Belum: <span className="text-rose-600 font-black">{unansweredCount}</span> • Ragu: <span className="text-amber-600 font-black">{flaggedCount}</span>
                </div>

                {/* Filter Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setNavFilter('all')}
                    className={`py-1.5 px-1.5 rounded-xl border transition text-center ${
                      navFilter === 'all'
                        ? 'bg-[#161C2D] text-white dark:bg-white dark:text-black border-[#161C2D] shadow-xs'
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900'
                    }`}
                  >
                    Semua ({questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNavFilter('unanswered')}
                    className={`py-1.5 px-1.5 rounded-xl border transition text-center ${
                      navFilter === 'unanswered'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    Belum ({unansweredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNavFilter('answered')}
                    className={`py-1.5 px-1.5 rounded-xl border transition text-center ${
                      navFilter === 'answered'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    Dijawab ({answeredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNavFilter('flagged')}
                    className={`py-1.5 px-1.5 rounded-xl border transition text-center ${
                      navFilter === 'flagged'
                        ? 'bg-amber-400 text-amber-950 border-amber-600 font-black shadow-xs'
                        : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    Ragu ({flaggedCount})
                  </button>
                </div>

                {/* Tombol Lompat ke Soal Kosong */}
                {unansweredCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      jumpToNextUnanswered();
                      if (window.innerWidth < 768) {
                        setShowNavDropdown(false);
                      }
                    }}
                    className="w-full py-2 px-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border-2 border-rose-400 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#EF4444] active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    <span>⏩ Lompat ke Soal Kosong Berikutnya</span>
                  </button>
                )}

                {/* Grid Nomor Soal */}
                <div className="overflow-y-auto max-h-[46vh] p-1">
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, index) => {
                      const isAnswered = q.answer_content && Object.keys(q.answer_content).length > 0;
                      const isCurrent = index === currentIdx;
                      const isFlagged = q.is_flagged;

                      const matchesFilter =
                        navFilter === 'all' ||
                        (navFilter === 'unanswered' && !isAnswered) ||
                        (navFilter === 'answered' && isAnswered) ||
                        (navFilter === 'flagged' && isFlagged);

                      let colorStyle = "bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-300";
                      if (isFlagged) {
                        colorStyle = "bg-amber-400 text-amber-950 border-amber-600 font-black";
                      } else if (isAnswered) {
                        colorStyle = "bg-[#10B981] text-white border-[#059669]";
                      }

                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setCurrentIdx(index);
                            if (window.innerWidth < 768) {
                              setShowNavDropdown(false);
                            }
                          }}
                          className={`h-10 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center border-2 shadow-xs ${colorStyle} ${
                            isCurrent
                              ? 'ring-4 ring-[#4379EE] border-2 border-[#161C2D] scale-105 shadow-[2px_2px_0px_0px_#171717] z-10'
                              : 'hover:scale-105 active:scale-95'
                          } ${!matchesFilter ? 'opacity-25 grayscale hover:opacity-100' : ''}`}
                          title={`Soal ${index + 1}: ${isFlagged ? 'Ragu-ragu' : isAnswered ? 'Sudah Dijawab' : 'Belum Dijawab'}`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend Guide */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-slate-100 dark:border-white/10 text-[10px] text-slate-600 dark:text-gray-400 font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md border-2 border-[#4379EE] ring-2 ring-[#4379EE]/40 shrink-0"></span>
                    <span>Soal Aktif</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md bg-[#10B981] border border-[#059669] shrink-0"></span>
                    <span>Dijawab ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md bg-amber-400 border border-amber-600 shrink-0"></span>
                    <span>Ragu-Ragu ({flaggedCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md bg-white dark:bg-white/5 border border-slate-300 dark:border-white/20 shrink-0"></span>
                    <span>Belum Dijawab ({unansweredCount})</span>
                  </div>
                </div>

              </div>
              </>
            )}
          </div>

          {/* Font Size Adjuster (A- / A / A+) */}
          <div className="hidden sm:flex items-center bg-slate-200/60 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 rounded-xl p-0.5 text-xs font-bold font-mono">
            <button
              type="button"
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded-lg transition ${fontSize === 'sm' ? 'bg-[#4379EE] text-white shadow-xs' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
              title="Ukuran Teks Kecil"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize('base')}
              className={`px-2 py-1 rounded-lg transition ${fontSize === 'base' ? 'bg-[#4379EE] text-white shadow-xs' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
              title="Ukuran Teks Normal"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded-lg transition ${fontSize === 'lg' ? 'bg-[#4379EE] text-white shadow-xs' : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
              title="Ukuran Teks Besar"
            >
              A+
            </button>
          </div>

          <ThemeToggle compact />

          {/* Violation warning badge */}
          {violationCount > 0 && (
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pelanggaran:</span>
              <span>{violationCount}/{maxTabSwitches}</span>
            </div>
          )}

          {/* Live Network & IndexedDB Storage Status Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono border transition ${
            !isOnline || savingStatus === 'saved_offline'
              ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
          }`}>
            {!isOnline || savingStatus === 'saved_offline' ? (
              <>
                <HardDrive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Tersimpan di Perangkat</span>
                {pendingSyncCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-md text-[9px] font-black">
                    {pendingSyncCount}
                  </span>
                )}
              </>
            ) : savingStatus === 'saving' ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-[#4379EE] animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tersimpan</span>
              </>
            )}
          </div>

          {/* Timer with Adaptive Urgency Glow */}
          <div className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black font-mono border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] transition-all duration-300 min-h-[38px] ${
            timeRemaining <= 60
              ? 'bg-rose-500 text-white animate-glow-rose'
              : timeRemaining <= 300
              ? 'bg-amber-400 text-amber-950 animate-glow-amber'
              : 'bg-white dark:bg-[#1A1E22] text-[#4379EE]'
          }`}>
            <Clock className={`h-3.5 sm:h-4 w-3.5 sm:w-4 ${timeRemaining <= 300 ? 'animate-bounce' : 'animate-pulse'}`} />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          <button
            onClick={handleManualSubmit}
            className="hidden sm:flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#10B981] hover:bg-emerald-600 active:translate-x-[1px] active:translate-y-[1px] text-white rounded-xl text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition min-h-[38px]"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Selesai</span>
          </button>
        </div>
      </header>

      {/* Session Time Window Limitation Alert */}
      {isSessionLimited && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs px-4 py-2 flex items-center justify-center gap-2 font-medium shrink-0 animate-fade-in">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Waktu pengerjaan disesuaikan dan dibatasi oleh sisa waktu penutupan sesi gelombang ujian ini.</span>
        </div>
      )}

      {/* Top Floating Offline Notification Banner */}
      {!isOnline && (
        <div className="bg-amber-500/90 text-amber-950 text-xs px-4 py-2 flex items-center justify-between gap-3 shadow-md z-20 font-medium">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              <strong>Koneksi Internet Terputus:</strong> Anda dalam mode offline. Lembar jawaban Anda tetap <strong>100% aman tersimpan di penyimpanan perangkat lokal (IndexedDB)</strong> dan akan otomatis disinkronkan ke server saat internet terhubung kembali.
            </span>
          </div>
        </div>
      )}

      {/* 6. Active Violation Warning Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-center animate-slideDown">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl space-y-5 shadow-2xl border-2 border-amber-500/50 bg-amber-50/95 dark:bg-[#1a1205]/95 text-slate-900 dark:text-white">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 animate-bounce">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-amber-900 dark:text-amber-300 tracking-tight">
                PERINGATAN PERPINDAHAN LAYAR!
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-amber-100/90 mt-2 leading-relaxed font-medium">
                {latestViolationMessage}
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-2">
                Jika Anda berpindah jendela atau keluar layar lagi hingga mencapai batas ({maxTabSwitches}x), lembar ujian Anda akan otomatis didiskualifikasi (nilai 0).
              </p>
            </div>
            <button
              onClick={() => setShowViolationModal(false)}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-600/30 btn-press"
            >
              Saya Mengerti & Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}

      {/* Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        
        {/* Question Workspace (Luas & Bersih Tanpa Bar di Atas Soal) */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 pb-28 md:pb-8 overflow-y-auto flex flex-col justify-between">
          <div key={currentIdx} className="space-y-4 sm:space-y-5 max-w-4xl mx-auto w-full animate-fade-in">
            
            {/* Topic header dengan tombol buka dropdown di sisi kanan */}
            <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider text-xs sm:text-sm">
                  SOAL NOMOR {currentIdx + 1} <span className="text-slate-400 font-normal">/ {questions.length}</span>
                </span>
                {currentQuestion.is_flagged && (
                  <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-yellow-500/20 text-amber-900 dark:text-yellow-400 border border-amber-300 dark:border-yellow-500/30 rounded-lg text-[10px] font-bold shadow-xs">
                    Ragu-ragu
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Tombol Buka Menu Dropdown Soal (di Sisi Kanan) */}
                <button
                  type="button"
                  onClick={() => setShowNavDropdown(prev => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border-2 border-[#161C2D] dark:border-[#32363A] text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
                  title="Buka Menu Dropdown Daftar Soal"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-[#4379EE]" />
                  <span>Daftar Soal</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showNavDropdown ? 'rotate-180' : ''}`} />
                </button>

                <span className="px-2.5 py-1 bg-slate-200/60 dark:bg-white/5 border border-slate-300/60 dark:border-white/5 text-slate-600 dark:text-gray-400 rounded-lg font-medium text-[11px] truncate max-w-[150px] sm:max-w-none">
                  Topik: {currentQuestion.topic}
                </span>
              </div>
            </div>

            {/* Question prompt rendering with LaTeX */}
            <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-4 shadow-sm overflow-hidden backdrop-blur-md">
              <div className={`text-slate-900 dark:text-white font-medium overflow-x-auto ${
                fontSize === 'sm' ? 'text-sm leading-normal' : fontSize === 'lg' ? 'text-lg sm:text-xl leading-relaxed' : 'text-base leading-relaxed'
              }`}>
                <LaTeXRenderer text={currentQuestion.content} />
              </div>
              {currentQuestion.media_url && (
                <div className="max-w-full sm:max-w-md bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  <img src={currentQuestion.media_url} alt="Question attach" className="w-full object-contain max-h-80 sm:max-h-96" />
                </div>
              )}
            </div>

            {/* Options Input Fields based on Question Type */}
            <div className="space-y-3">
              
              {/* Type: Single MCQ */}
              {currentQuestion.type === 'multiple_choice_single' && (
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options.map((opt, optIdx) => {
                    const isSelected = currentQuestion.answer_content?.option_id === opt.id;
                    const optionLetter = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][optIdx] || `${optIdx + 1}`;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleMCQSingleChange(opt.id)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 text-xs sm:text-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] min-h-[50px] ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-[#4379EE] text-indigo-950 dark:text-white font-bold ring-2 ring-[#4379EE]/25'
                            : 'bg-white dark:bg-[#1A1E22] border-[#161C2D] dark:border-[#32363A] text-slate-800 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-[#252A2E]'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-x-auto max-w-full">
                          <span className={`h-7 w-7 shrink-0 rounded-xl text-xs font-black font-mono flex items-center justify-center transition-all border border-black/10 ${
                            isSelected
                              ? 'bg-[#4379EE] text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                          }`}>
                            {optionLetter}
                          </span>
                          <div className="overflow-x-auto">
                            <LaTeXRenderer text={opt.content} />
                          </div>
                        </div>
                        {opt.media_url && (
                          <img src={opt.media_url} alt="Option attach" className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-lg shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type: Multi MCQ */}
              {currentQuestion.type === 'multiple_choice_multi' && (
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options.map((opt, optIdx) => {
                    const isSelected = currentQuestion.answer_content?.option_ids?.includes(opt.id);
                    const optionLetter = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][optIdx] || `${optIdx + 1}`;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleMCQMultiToggle(opt.id)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm min-h-[50px] btn-press ${
                          isSelected
                            ? 'bg-indigo-50/90 dark:bg-indigo-600/25 border-indigo-500 text-indigo-950 dark:text-white font-semibold ring-2 ring-indigo-500/20'
                            : 'bg-white/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-indigo-300 dark:hover:border-indigo-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-x-auto max-w-full">
                          <span className={`h-7 w-7 shrink-0 rounded-xl text-xs font-bold font-mono flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                          }`}>
                            {optionLetter}
                          </span>
                          <div className="overflow-x-auto">
                            <LaTeXRenderer text={opt.content} />
                          </div>
                        </div>
                        {opt.media_url && (
                          <img src={opt.media_url} alt="Option attach" className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-lg shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type: True / False */}
              {currentQuestion.type === 'true_false' && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {['Benar', 'Salah'].map((val) => {
                    const isSelected = currentQuestion.answer_content?.text === val;
                    return (
                      <button
                        key={val}
                        onClick={() => handleTrueFalseChange(val)}
                        className={`py-3.5 sm:py-4 rounded-2xl border text-xs sm:text-sm font-bold transition shadow-sm active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500/50 text-indigo-950 dark:text-white'
                            : 'bg-white/80 dark:bg-white/[0.01] border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-gray-400 hover:bg-slate-100/60'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type: Matching (Responsive on Mobile) */}
              {currentQuestion.type === 'matching' && (
                <div className="space-y-3 bg-slate-50 dark:bg-white/[0.01] border border-slate-200/80 dark:border-white/5 p-4 sm:p-5 rounded-3xl shadow-sm">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider mb-2">Jodohkan Opsi Kiri dan Kanan:</h4>
                  {currentQuestion.matching_pairs.map((pair) => {
                    const selectedRight = currentQuestion.answer_content?.matches?.[pair.left_item] || '';
                    return (
                      <div key={pair.id} className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center justify-between text-xs py-3 border-b border-slate-200/80 dark:border-white/5 last:border-0">
                        <span className="text-slate-800 dark:text-gray-300 font-semibold text-xs sm:text-sm">{pair.left_item}</span>
                        <div className="flex items-center gap-2 flex-1 sm:justify-end">
                          <span className="text-slate-400 dark:text-gray-600 font-bold hidden sm:inline">⇔</span>
                          <select
                            value={selectedRight}
                            onChange={(e) => handleMatchingChange(pair.left_item, e.target.value)}
                            className="w-full sm:w-auto min-w-[180px] px-3 py-2 glass-input rounded-xl text-slate-900 dark:text-white bg-white dark:bg-[#090d16] font-medium text-xs focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- Pilih Jawaban --</option>
                            {currentQuestion.matching_pairs.map((rOpt) => (
                              <option key={rOpt.id} value={rOpt.right_item}>
                                {rOpt.right_item}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Type: Essay */}
              {currentQuestion.type === 'essay' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider">
                    Tuliskan Lembar Jawaban Uraian Anda:
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Tuliskan penjelasan lengkap Anda di sini..."
                    value={currentQuestion.answer_content?.essay_text || ''}
                    onChange={(e) => handleEssayChange(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed"
                  />
                </div>
              )}

            </div>

          </div>

          {/* Desktop bottom navigation buttons (Revisi 8) */}
          <div className="hidden md:flex justify-between items-center gap-3 pt-6 border-t-2 border-[#161C2D]/15 dark:border-white/10 mt-8 max-w-4xl mx-auto w-full">
            <button
              type="button"
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-5 bg-white dark:bg-[#1A1E22] hover:bg-slate-100 dark:hover:bg-[#252A2E] disabled:opacity-40 border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl text-xs sm:text-sm font-black text-slate-800 dark:text-white shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
              <span>Sebelumnya</span>
            </button>

            <button
              type="button"
              onClick={toggleFlag}
              className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-5 border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl text-xs sm:text-sm font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition ${
                currentQuestion.is_flagged
                  ? 'bg-amber-400 text-amber-950 font-black'
                  : 'bg-white dark:bg-[#1A1E22] text-slate-700 dark:text-gray-300 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              <span>{currentQuestion.is_flagged ? 'Batal Ragu-ragu' : 'Ragu-ragu'}</span>
            </button>

            {currentIdx === questions.length - 1 ? (
              <button
                type="button"
                onClick={handleManualSubmit}
                className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-6 bg-[#10B981] hover:bg-emerald-600 text-white border-2 border-[#161C2D] rounded-xl text-xs sm:text-sm font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                <Send className="h-4 w-4" />
                <span>Selesai & Kumpulkan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-5 bg-[#4379EE] hover:bg-[#3465D9] text-white border-2 border-[#161C2D] rounded-xl text-xs sm:text-sm font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </main>

        {/* Question Navigator Sidebar (Desktop 2-Kolom: Ditampilkan di sisi kanan saat disematkan) */}
        {isSidebarPinned && (
          <aside className="hidden md:block w-72 lg:w-80 bg-white/70 dark:bg-[#0c1222]/70 backdrop-blur-md border-l-2 border-[#161C2D] dark:border-[#32363A] p-4 lg:p-5 shrink-0 overflow-y-auto">
            <div className="space-y-4">
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    <CheckSquare className="h-4.5 w-4.5 text-[#4379EE]" />
                    <span>Panel Navigasi</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSidebarPin}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-700 dark:text-gray-300 transition"
                    title="Lepas sematan panel (gunakan menu dropdown di kanan)"
                  >
                    <PinOff className="h-3 w-3 text-rose-500" />
                    <span>Tutup Panel</span>
                  </button>
                </div>

                {/* Revisi 5: Ringkasan di atas grid */}
                <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/10">
                  Dijawab: <span className="text-emerald-600 font-black">{answeredCount}</span> • Belum: <span className="text-rose-600 font-black">{unansweredCount}</span> • Ragu: <span className="text-amber-600 font-black">{flaggedCount}</span>
                </div>
              </div>

            {/* Filter Buttons di Sidebar Desktop */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono font-bold">
              <button
                type="button"
                onClick={() => setNavFilter('all')}
                className={`py-1.5 px-2 rounded-xl border transition text-center ${
                  navFilter === 'all'
                    ? 'bg-[#161C2D] text-white dark:bg-white dark:text-black border-[#161C2D] shadow-xs'
                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900'
                }`}
              >
                Semua ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setNavFilter('unanswered')}
                className={`py-1.5 px-2 rounded-xl border transition text-center ${
                  navFilter === 'unanswered'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                Belum ({unansweredCount})
              </button>
              <button
                type="button"
                onClick={() => setNavFilter('answered')}
                className={`py-1.5 px-2 rounded-xl border transition text-center ${
                  navFilter === 'answered'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                Dijawab ({answeredCount})
              </button>
              <button
                type="button"
                onClick={() => setNavFilter('flagged')}
                className={`py-1.5 px-2 rounded-xl border transition text-center ${
                  navFilter === 'flagged'
                    ? 'bg-amber-400 text-amber-950 border-amber-600 font-black shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                Ragu ({flaggedCount})
              </button>
            </div>

            {/* Quick Jump Action Button */}
            {unansweredCount > 0 && (
              <button
                type="button"
                onClick={jumpToNextUnanswered}
                className="w-full py-2 px-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border-2 border-rose-400 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#EF4444] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <span>⏩ Lompat ke Soal Kosong</span>
              </button>
            )}

            {/* Grid of numbers */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const isAnswered = q.answer_content && Object.keys(q.answer_content).length > 0;
                const isCurrent = index === currentIdx;
                const isFlagged = q.is_flagged;

                const matchesFilter =
                  navFilter === 'all' ||
                  (navFilter === 'unanswered' && !isAnswered) ||
                  (navFilter === 'answered' && isAnswered) ||
                  (navFilter === 'flagged' && isFlagged);

                let colorStyle = "bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-700 dark:text-gray-300";
                if (isFlagged) {
                  colorStyle = "bg-amber-400 text-amber-950 border-amber-600 font-black";
                } else if (isAnswered) {
                  colorStyle = "bg-[#10B981] text-white border-[#059669]";
                }

                return (
                  <button
                    key={index}
                    onClick={() => setCurrentIdx(index)}
                    className={`h-10 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center border-2 shadow-xs ${colorStyle} ${
                      isCurrent
                        ? 'ring-4 ring-[#4379EE] border-2 border-[#161C2D] scale-105 shadow-[2px_2px_0px_0px_#171717] z-10'
                        : 'hover:scale-105 active:scale-95'
                    } ${!matchesFilter ? 'opacity-25 grayscale hover:opacity-100' : ''}`}
                    title={`Soal ${index + 1}: ${isFlagged ? 'Ragu-ragu' : isAnswered ? 'Sudah Dijawab' : 'Belum Dijawab'}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend guide */}
            <div className="border-t-2 border-slate-200 dark:border-white/10 pt-4 space-y-2 text-[11px] text-slate-600 dark:text-gray-400 font-bold">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md border-2 border-[#4379EE] ring-2 ring-[#4379EE]/40 shrink-0"></span>
                <span>Soal Aktif Saat Ini</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-[#10B981] border border-[#059669] shrink-0"></span>
                <span>Sudah Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-amber-400 border border-amber-600 shrink-0"></span>
                <span>Ragu-Ragu ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-white dark:bg-white/5 border border-slate-300 dark:border-white/20 shrink-0"></span>
                <span>Belum Dijawab ({unansweredCount})</span>
              </div>
            </div>

            {/* Violation Alert Warning box */}
            {violationCount > 0 && (
              <div className="p-3 bg-rose-50 dark:bg-red-950/20 border-2 border-rose-300 dark:border-red-500/30 rounded-2xl text-rose-700 dark:text-red-300 text-xs flex gap-2 shadow-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 animate-bounce text-rose-600 dark:text-red-400" />
                <div>
                  <span className="font-bold block">Peringatan Keamanan!</span>
                  <span>Anda melakukan {violationCount} pelanggaran. (Batas maksimal: {maxTabSwitches})</span>
                </div>
              </div>
            )}

          </div>
        </aside>
      )}

      </div>

      {/* Mobile Sticky Bottom Bar (Revisi 8) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-md border-t-2 border-[#161C2D] dark:border-[#32363A] p-2 sm:p-3 shadow-[0px_-4px_16px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="min-h-[44px] flex-1 flex items-center justify-center gap-1 py-2 px-2.5 bg-white dark:bg-[#1A1E22] hover:bg-slate-100 dark:hover:bg-[#252A2E] disabled:opacity-40 border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl text-xs font-black text-slate-800 dark:text-white shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
          >
            <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={toggleFlag}
            className={`min-h-[44px] flex-1 flex items-center justify-center gap-1 py-2 px-2.5 border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition ${
              currentQuestion.is_flagged
                ? 'bg-amber-400 text-amber-950 font-black'
                : 'bg-white dark:bg-[#1A1E22] text-slate-700 dark:text-gray-300'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>{currentQuestion.is_flagged ? 'Ragu' : 'Ragu?'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNavDropdown(prev => !prev)}
            className="min-h-[44px] flex-1 flex items-center justify-center gap-1 py-2 px-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#4379EE] dark:text-indigo-300 border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition font-mono"
            title="Buka Menu Dropdown Soal"
          >
            <CheckSquare className="h-4 w-4" />
            <span>{currentIdx + 1}/{questions.length}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showNavDropdown ? 'rotate-180' : ''}`} />
          </button>

          {currentIdx === questions.length - 1 ? (
            <button
              type="button"
              onClick={handleManualSubmit}
              className="min-h-[44px] flex-1.2 flex items-center justify-center gap-1 py-2 px-3 bg-[#10B981] hover:bg-emerald-600 text-white border-2 border-[#161C2D] rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Selesai</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
              className="min-h-[44px] flex-1 flex items-center justify-center gap-1 py-2 px-2.5 bg-[#4379EE] hover:bg-[#3465D9] text-white border-2 border-[#161C2D] rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Quick Navigation Pill on Mobile/Tablet */}
      <button
        type="button"
        onClick={() => setShowNavDropdown(prev => !prev)}
        className="md:hidden fixed bottom-20 right-3.5 z-20 bg-white/95 dark:bg-[#1A1E22]/95 backdrop-blur-md border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] rounded-full px-3 py-2 flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white active:scale-95 transition"
        title="Buka Menu Dropdown Soal"
      >
        <CheckSquare className="h-4 w-4 text-[#4379EE]" />
        <span>Soal ({answeredCount}/{questions.length})</span>
        {unansweredCount > 0 ? (
          <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-mono font-bold animate-pulse">
            {unansweredCount} Kosong
          </span>
        ) : (
          <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-mono font-bold">
            Lengkap
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${showNavDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Confirmation Modal for Final Submit (Revisi 8) */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#1A1E22] rounded-3xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] relative border-2 border-[#161C2D] dark:border-[#32363A] space-y-5">
            <button
              onClick={() => setShowSubmitConfirmModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#10B981] text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">Konfirmasi Selesai Ujian</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Pastikan seluruh lembar soal telah Anda periksa.</p>
              </div>
            </div>

            {/* Statistik Jawaban */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-2xl shadow-[2px_2px_0px_0px_#10B981]">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                  {answeredCount}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-black">Terjawab</span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-500 rounded-2xl shadow-[2px_2px_0px_0px_#EF4444]">
                <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono block">
                  {unansweredCount}
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-black">Kosong</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 rounded-2xl shadow-[2px_2px_0px_0px_#F59E0B]">
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono block">
                  {flaggedCount}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-black">Ragu-ragu</span>
              </div>
            </div>

            {(() => {
              if (unansweredCount > 0) {
                return (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-400 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <div>
                      <p className="font-black text-sm">Masih ada {unansweredCount} soal yang belum dijawab!</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 font-medium leading-relaxed">
                        Apakah yakin ingin mengumpulkan sekarang? Lembar soal yang kosong akan bernilai 0.
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-400 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Semua soal ({questions.length}) telah Anda jawab dengan lengkap!</span>
                </div>
              );
            })()}

            {submitError && (
              <div className="p-3 bg-rose-50 dark:bg-red-950/40 border-2 border-rose-400 text-rose-700 dark:text-red-300 rounded-2xl text-xs flex items-start gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2 border-t-2 border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-2 px-3 bg-white dark:bg-[#1A1E22] hover:bg-slate-100 dark:hover:bg-[#252A2E] text-slate-800 dark:text-white rounded-xl text-xs font-black border-2 border-[#161C2D] dark:border-[#32363A] shadow-[2px_2px_0px_0px_#171717] transition disabled:opacity-50"
              >
                Kembali ke Soal
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-2 px-3 bg-[#10B981] hover:bg-emerald-600 text-white rounded-xl text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] active:translate-x-[1px] active:translate-y-[1px] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Mengumpulkan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[2.5]" />
                    <span>Tetap Kumpulkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default ExamSessionPage;
