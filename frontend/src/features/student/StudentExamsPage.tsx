import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { CardGridSkeleton } from '../../shared/components/LoadingSkeleton';
import { LaTeXRenderer } from '../../shared/components/LaTeXRenderer';
import { 
  Clock, Calendar, AlertCircle, CheckCircle, GraduationCap, 
  Play, RefreshCw, LogOut, BookOpen, ShieldCheck, User,
  Ban, AlertTriangle, X, CheckCircle2, XCircle, Lightbulb,
  Building
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
  RemindersList, 
  HighlightDate, 
  ReminderItem 
} from '../../shared/components/dashboard';

interface ExamListItem {
  exam_group_id: number;
  exam_id: number;
  title: string;
  subject_code: string;
  subject_name: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  status: string;
  attempt: {
    id: number;
    status: 'not_started' | 'in_progress' | 'submitted' | 'auto_submitted' | 'disqualified';
    started_at: string;
    submitted_at: string | null;
    total_score: number | null;
  } | null;
}

export const StudentExamsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingExamGroupId, setStartingExamGroupId] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  const fetchExams = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await apiClient.get('/student/exams');
      setExams(res.data || []);
    } catch (err) {
      console.error('Failed to load student exams:', err);
      setGlobalError('Gagal memuat jadwal ujian. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

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

  // Find priority exam for Highlight Card (active or in_progress or first available)
  const inProgressExam = exams.find(e => e.attempt?.status === 'in_progress');
  const availableExam = exams.find(e => !e.attempt || e.attempt.status === 'not_started');
  const heroExam = inProgressExam || availableExam;

  // Completed exams stats
  const finishedExams = exams.filter(e => e.attempt?.status === 'submitted' || e.attempt?.status === 'auto_submitted');
  const scoredExams = finishedExams.filter(e => e.attempt?.total_score !== null && e.attempt?.total_score !== undefined);
  const avgScore = scoredExams.length > 0 
    ? Math.round(scoredExams.reduce((acc, curr) => acc + (curr.attempt?.total_score || 0), 0) / scoredExams.length)
    : 100;

  // Calendar Highlight Dates
  const calendarHighlights: HighlightDate[] = exams.map((ex) => ({
    date: ex.start_time ? ex.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
    title: ex.title,
    type: 'exam'
  }));

  // Reminders for student
  const studentReminders: ReminderItem[] = [
    {
      id: 'rem-s1',
      title: 'Integritas & Anti-Cheat Aktif',
      description: 'Layar penuh wajib saat ujian. Batas perpindahan tab dipantau secara otomatis.',
      timeAgo: 'Penting',
      type: 'warning' as const
    },
    {
      id: 'rem-s2',
      title: 'Simpan Jawaban Otomatis',
      description: 'Seluruh jawaban pilihan ganda, essay & menjodohkan tersimpan di server secara real-time.',
      timeAgo: 'Info',
      type: 'info' as const
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070a13] text-slate-800 dark:text-gray-100 flex flex-col transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="h-16 glass-panel border-b border-slate-200 dark:border-white/5 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">Detik Detik TryOut</h1>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">
              {user?.profile?.institution || 'Portal Ujian Siswa'} {user?.profile?.class_name ? `• ${user.profile.class_name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <ThemeToggle compact />

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-200/60 dark:bg-white/5 border border-slate-300/60 dark:border-white/5 rounded-xl text-xs">
            <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-700 dark:text-gray-300 font-semibold">{user?.name}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 dark:bg-red-600/10 hover:bg-red-100 dark:hover:bg-red-600/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
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
                <GradientStatCard
                  title="Keamanan Sesi"
                  value="100% Aman"
                  subtitle="Single-session lock aktif"
                  icon={ShieldCheck}
                  variant="indigo"
                />
              </div>
            </div>

            {/* All Exams List / History Card Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <BookOpen className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Daftar Seluruh Jadwal Ujian</span>
                </h3>
                <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">{exams.length} Total Jadwal</span>
              </div>

              {loading ? (
                <CardGridSkeleton count={2} cols="grid-cols-1 md:grid-cols-2" />
              ) : exams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  {exams.map((exam) => {
                    const attempt = exam.attempt;
                    const isFinished = attempt?.status === 'submitted' || attempt?.status === 'auto_submitted';
                    const isDisqualified = attempt?.status === 'disqualified';
                    const isStarting = startingExamGroupId === exam.exam_group_id;

                    return (
                      <div 
                        key={exam.exam_group_id} 
                        className={`glass-panel p-5 rounded-3xl flex flex-col justify-between card-interactive border ${
                          isDisqualified
                            ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20'
                            : isFinished 
                            ? 'border-emerald-200 dark:border-emerald-500/20 hover:border-emerald-400/40 bg-emerald-50/30 dark:bg-slate-900/50' 
                            : 'border-slate-200/80 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30 bg-white/80 dark:bg-slate-900/40'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                              isDisqualified
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                                : attempt?.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : isFinished
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                : 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                            }`}>
                              {isDisqualified ? 'DIDISKUALIFIKASI' : attempt?.status === 'in_progress' ? 'SEDANG DIKERJAKAN' : isFinished ? 'SELESAI' : 'TERSEDIA'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-gray-400 font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                              {exam.subject_code}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{exam.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-gray-400 mt-0.5 font-medium">{exam.subject_name}</p>
                          </div>

                          {isDisqualified ? (
                            <div className="p-2.5 bg-rose-100/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-start gap-2 text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                              <span>Dalam ujian ini Anda didiskualifikasi karena melanggar batas aturan perpindahan tab.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl text-[11px] text-slate-600 dark:text-gray-400 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-gray-400" />
                                <span>{exam.duration_minutes} Menit</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-gray-400" />
                                <span>{new Date(exam.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                          {isDisqualified ? (
                            <div className="w-full py-2.5 bg-rose-100/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-center rounded-xl text-xs font-black border border-rose-300 dark:border-rose-500/30 flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                              <span>Ujian Didiskualifikasi (Nilai: 0)</span>
                            </div>
                          ) : isFinished ? (
                            <div className="space-y-2">
                              <div className="w-full py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 text-center rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Selesai {attempt?.total_score !== null && `(Nilai: ${attempt.total_score})`}</span>
                              </div>
                              <button
                                onClick={() => fetchReview(attempt?.id)}
                                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-center rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>Lihat Kunci & Pembahasan</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartOrResumeExam(exam)}
                              disabled={isStarting}
                              className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 btn-press ${
                                attempt?.status === 'in_progress'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
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
                                  <span>{attempt?.status === 'in_progress' ? 'Lanjutkan Ujian' : 'Mulai Ujian'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-panel text-center py-12 text-slate-500 dark:text-gray-400 rounded-3xl border border-slate-200/80 dark:border-white/5">
                  <GraduationCap className="h-10 w-10 text-slate-400 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs font-medium">Belum ada ujian terjadwal untuk akun Anda saat ini.</p>
                </div>
              )}
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
              </div>
            </div>

            {/* Calendar */}
            <CalendarWidget highlights={calendarHighlights} />

            {/* Reminders */}
            <RemindersList
              title="Informasi & Pengingat"
              reminders={studentReminders}
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
              ) : reviewData ? (
                <>
                  {/* Summary Score Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 rounded-2xl">
                    <div className="text-center p-2">
                      <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">Skor Akhir</p>
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{reviewData.attempt?.total_score ?? 0}</p>
                    </div>
                    <div className="text-center p-2">
                      <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">Total Soal</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{reviewData.attempt?.total_questions ?? reviewData.questions?.length ?? 0}</p>
                    </div>
                    <div className="text-center p-2">
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Jawaban Benar</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{reviewData.attempt?.total_correct ?? 0}</p>
                    </div>
                    <div className="text-center p-2">
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Jawaban Salah</p>
                      <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">{reviewData.attempt?.total_incorrect ?? 0}</p>
                    </div>
                  </div>

                  {/* List of Questions */}
                  <div className="space-y-5">
                    {reviewData.questions?.map((q: any) => {
                      const isCorrect = q.is_correct;
                      const hasAnswered = !!q.student_answer;

                      return (
                        <div 
                          key={q.question_id || q.number}
                          className={`p-5 rounded-2xl border transition-all ${
                            !hasAnswered
                              ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10'
                              : isCorrect 
                              ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10' 
                              : 'border-rose-200 dark:border-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10'
                          }`}
                        >
                          {/* Question header badge */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-xs font-black tracking-wider uppercase font-mono text-slate-700 dark:text-slate-300">
                              Soal Nomor {q.number}
                            </span>
                            <div className="flex items-center gap-1.5">
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
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Tidak Dijawab</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Soal Content */}
                          <div className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed mb-4">
                            <LaTeXRenderer text={q.soal_text} />
                            {q.soal_gambar && (
                              <img src={q.soal_gambar} alt={`Soal ${q.number}`} className="mt-2 max-h-60 rounded-xl border border-slate-200 dark:border-white/10" />
                            )}
                          </div>

                          {/* Options */}
                          <div className="space-y-2 mb-4">
                            {q.options?.map((opt: any) => {
                              const isStudentChoice = q.student_answer === opt.key;
                              const isKey = q.correct_answer === opt.key;

                              let optClass = "border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-gray-300";
                              if (isKey) {
                                optClass = "border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold";
                              } else if (isStudentChoice && !isCorrect) {
                                optClass = "border-rose-400 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200";
                              }

                              return (
                                <div 
                                  key={opt.key}
                                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${optClass}`}
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
                                      <img src={opt.media} alt={opt.key} className="mt-1 max-h-32 rounded-lg" />
                                    )}
                                  </div>
                                  {isKey && (
                                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 shrink-0 ml-auto bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md">
                                      Kunci Jawaban
                                    </span>
                                  )}
                                  {isStudentChoice && !isKey && (
                                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 shrink-0 ml-auto bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 rounded-md">
                                      Jawaban Anda
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Pembahasan Box */}
                          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/20 rounded-xl space-y-1.5">
                            <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                              <Lightbulb className="h-3.5 w-3.5" />
                              <span>Pembahasan:</span>
                            </div>
                            <div className="text-xs text-slate-700 dark:text-indigo-200/90 leading-relaxed pl-5">
                              <LaTeXRenderer text={q.explanation || 'Tidak ada pembahasan khusus.'} />
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="py-2 px-5 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition"
              >
                Tutup Pembahasan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default StudentExamsPage;
