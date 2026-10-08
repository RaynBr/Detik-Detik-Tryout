import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { 
  BookOpen, Calendar, FileText, 
  Layers, ArrowRight, Sparkles, Clock 
} from 'lucide-react';
import { 
  WelcomeBanner, 
  GradientStatCard, 
  DonutProgressChart, 
  HorizontalProgressBar, 
  CalendarWidget, 
  RemindersList, 
  HighlightDate, 
  ReminderItem,
  ProgressItem 
} from '../../shared/components/dashboard';
import { CardGridSkeleton } from '../../shared/components/LoadingSkeleton';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const [statsRes, questionsRes, packagesRes, examsRes] = await Promise.all([
        apiClient.get('/teacher/dashboard/stats').catch(() => ({ data: null })),
        apiClient.get('/teacher/questions').catch(() => ({ data: [] })),
        apiClient.get('/teacher/packages').catch(() => ({ data: [] })),
        apiClient.get('/teacher/exams').catch(() => ({ data: [] })),
      ]);

      const qList = Array.isArray(questionsRes.data)
        ? questionsRes.data
        : (questionsRes.data?.data || []);
      const totalQ = statsRes.data?.total_bank_soal ?? questionsRes.data?.total ?? qList.length;

      const pList = Array.isArray(packagesRes.data) ? packagesRes.data : (packagesRes.data?.data || []);
      const eList = Array.isArray(examsRes.data) ? examsRes.data : (examsRes.data?.data || []);

      setQuestions(qList);
      setTotalQuestionsCount(totalQ);
      setPackages(pList);
      setExams(eList);
    } catch (error) {
      console.error('Failed to load teacher dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  // Compute question types distribution
  const mcqCount = totalQuestionsCount > 0 ? totalQuestionsCount : (questions.length || 4665);

  // Question packages progress items
  const packageProgressItems: ProgressItem[] = (Array.isArray(packages) ? packages : []).slice(0, 4).map((pkg) => {
    const qCount = pkg.questions_count ?? pkg.total_questions ?? 50;
    const targetCount = 50;
    const percent = Math.min(Math.round((qCount / targetCount) * 100), 100);

    return {
      id: pkg.id,
      label: pkg.name || pkg.title || 'Paket Soal',
      sublabel: pkg.subject?.name || pkg.subject_name || pkg.jenjang_name || 'Mata Pelajaran',
      percentage: percent,
      badgeText: `${qCount} Soal`,
      colorClass: 'from-cyan-500 to-indigo-500'
    };
  });

  // Calendar Highlight Dates
  const calendarHighlights: HighlightDate[] = (Array.isArray(exams) ? exams : []).map((ex) => ({
    date: ex.start_time ? ex.start_time.split('T')[0] : new Date().toISOString().split('T')[0],
    title: ex.title || 'Jadwal Ujian',
    type: 'exam'
  }));

  // Reminders / Notification items
  const reminders: ReminderItem[] = [
    {
      id: 'rem-1',
      title: 'Generate 50 Soal Acak',
      description: 'Guru dapat mengenerate 50 butir soal acak dari Bank Soal ke kelas.',
      timeAgo: 'Fitur Baru',
      type: 'info' as const,
      onClick: () => navigate('/teacher/exams')
    },
    {
      id: 'rem-2',
      title: 'Bank Soal Terverifikasi',
      description: `${(totalQuestionsCount || 4665).toLocaleString('id-ID')} butir soal siap digunakan untuk simulasi TryOut.`,
      timeAgo: 'Aktif',
      type: 'success' as const,
      onClick: () => navigate('/teacher/questions')
    },
    {
      id: 'rem-3',
      title: 'Koleksi Soal Terstruktur',
      description: 'Format template soal pilihan ganda CSV siap untuk diimpor.',
      timeAgo: 'Info',
      type: 'info' as const,
      onClick: () => navigate('/teacher/questions')
    }
  ];

  // Active exams count
  const activeExamsCount = (Array.isArray(exams) ? exams : []).filter(e => e.status === 'published').length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* 1. Welcome Banner */}
      <WelcomeBanner
        title={`Selamat Mengajar, ${user?.name || 'Bapak/Ibu Guru'} 📚`}
        subtitle="Kelola bank soal mandiri, buat paket 50 soal acak, dan pantau hasil TryOut siswa dengan mudah."
        roleBadge="Panel Pengajar"
        metrics={[
          { label: 'Bank Soal', value: (totalQuestionsCount || 4665).toLocaleString('id-ID'), highlight: true },
          { label: 'Paket TryOut', value: packages.length },
          { label: 'Ujian Aktif', value: activeExamsCount }
        ]}
        actionLabel="Generate 50 Soal Random"
        onAction={() => navigate('/teacher/exams')}
        icon={Sparkles}
      />

      {/* 2. Gradient Stat Cards Grid */}
      {loading ? (
        <CardGridSkeleton count={4} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <GradientStatCard
            title="Koleksi Bank Soal"
            value={`${(totalQuestionsCount || 4665).toLocaleString('id-ID')} Butir`}
            subtitle="Soal tersimpan di database sertidemi"
            icon={BookOpen}
            variant="cyan"
            trend={{ value: 'Bank Soal Lengkap', isPositive: true }}
            onClick={() => navigate('/teacher/questions')}
          />
          <GradientStatCard
            title="Paket Soal Ujian"
            value={`${packages.length} Paket`}
            subtitle="Kumpulan TryOut terstruktur"
            icon={Layers}
            variant="indigo"
            onClick={() => navigate('/teacher/questions')}
          />
          <GradientStatCard
            title="Jadwal Ujian"
            value={`${exams.length} Sesi`}
            subtitle={`${activeExamsCount} sesi sedang aktif`}
            icon={Calendar}
            variant="amber"
            onClick={() => navigate('/teacher/exams')}
          />
          <GradientStatCard
            title="Hasil & Nilai"
            value="Rekap Siswa"
            subtitle="Laporan nilai pengerjaan TryOut"
            icon={FileText}
            variant="emerald"
            onClick={() => navigate('/teacher/reports')}
          />
        </div>
      )}

      {/* 3. Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Charts & Exams Management */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DonutProgressChart
              title="Komposisi Bank Soal"
              subtitle="Sebaran butir soal di database"
              primaryPercentage={100}
              centerLabel={`${mcqCount.toLocaleString('id-ID')}`}
              centerSublabel="Soal"
              items={[
                { label: 'Pilihan Ganda (Pilgan)', percentage: 100, color: '#06b6d4', count: mcqCount },
                { label: 'Paket TryOut Terbit', percentage: Math.min(packages.length, 100), color: '#6366f1', count: packages.length }
              ]}
            />

            <HorizontalProgressBar
              title="Kelengkapan Paket TryOut"
              subtitle="Target 50 butir soal per paket"
              items={packageProgressItems.length > 0 ? packageProgressItems : [
                { id: 1, label: 'TryOut Akbar Simulasi', sublabel: 'Umum', percentage: 100, badgeText: '50 Soal' }
              ]}
              maxItems={4}
            />
          </div>

          {/* Scheduled Exams List Table */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Jadwal Ujian Aktif</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Sesi ujian yang Anda ampu</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/teacher/exams')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300 transition btn-press"
              >
                <span>Kelola Ujian</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/5 text-slate-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3">Nama Ujian</th>
                    <th className="py-3 px-3">Mata Pelajaran</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Durasi</th>
                    <th className="py-3 px-3 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                  {exams.length > 0 ? (
                    exams.slice(0, 5).map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          <span className="block truncate max-w-[160px]">{ex.title}</span>
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-normal">{ex.academic_year?.name || '2025/2026'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20 text-[10px] font-bold">
                            {ex.subject?.name || 'Mata Pelajaran'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ex.status === 'published'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : ex.status === 'closed'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          }`}>
                            {ex.status === 'published' ? 'Aktif' : ex.status === 'closed' ? 'Selesai' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold">{ex.duration_minutes || 60} Menit</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate('/teacher/reports')}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl text-[11px] font-bold transition btn-press"
                              title="Lihat Laporan Nilai"
                            >
                              Laporan
                            </button>
                            <button
                              onClick={() => navigate('/teacher/grading')}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition shadow-xs btn-press"
                              title="Koreksi Jawaban Essay"
                            >
                              Koreksi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-gray-500 text-xs">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-400 dark:text-gray-600 opacity-60" />
                        <p className="font-medium">Belum ada jadwal ujian aktif</p>
                        <button
                          onClick={() => navigate('/teacher/exams')}
                          className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          + Buat Jadwal Ujian Sekarang
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Calendar Widget & Reminders List */}
        <div className="space-y-6">
          <CalendarWidget highlights={calendarHighlights} />
          <RemindersList
            title="Pengingat Pengajar"
            reminders={reminders}
            emptyMessage="Semua tugas pengajar telah tuntas"
          />
        </div>

      </div>

    </div>
  );
};
export default TeacherDashboard;
