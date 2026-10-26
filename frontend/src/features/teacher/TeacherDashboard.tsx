import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { apiClient } from '../../shared/api/client';
import { 
  BookOpen, Calendar, FileText, 
  Layers, ArrowRight, Sparkles, Clock,
  GraduationCap, Users, UserCheck, School,
  Phone, Mail, Search, ShieldCheck, ChevronRight
} from 'lucide-react';
import { 
  WelcomeBanner, 
  GradientStatCard, 
  DonutProgressChart, 
  HorizontalProgressBar, 
  ProgressItem 
} from '../../shared/components/dashboard';
import { CardGridSkeleton } from '../../shared/components/LoadingSkeleton';

interface StudentItem {
  no: number;
  id: string;
  name: string;
  nama: string;
  nisn: string;
  nis: string;
  gender: string;
  email: string | null;
  phone: string;
  status: string;
}

interface TeachingClass {
  id: number;
  nama_kelas: string;
  tingkat: number;
  jenjang: string;
  role: string;
  is_wali_kelas: boolean;
  mapel_list: string[];
  total_siswa: number;
  students: StudentItem[];
}

interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  nuptk: string;
  institution: string;
  role: string;
  total_classes_taught: number;
  total_students_taught: number;
}

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Teaching Classes & Profile Data
  const [teachingClasses, setTeachingClasses] = useState<TeachingClass[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState<string>('');

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const [statsRes, questionsRes, packagesRes, examsRes, teachingRes] = await Promise.all([
        apiClient.get('/teacher/dashboard/stats').catch(() => ({ data: null })),
        apiClient.get('/teacher/questions').catch(() => ({ data: [] })),
        apiClient.get('/teacher/packages').catch(() => ({ data: [] })),
        apiClient.get('/teacher/exams').catch(() => ({ data: [] })),
        apiClient.get('/teacher/dashboard/teaching-classes').catch(() => ({ data: { classes: [], profile: null } })),
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

      const classesData: TeachingClass[] = teachingRes.data?.classes || [];
      const profileData: TeacherProfile = teachingRes.data?.profile || {
        id: user?.id || '',
        name: user?.name || 'Bapak/Ibu Guru',
        email: user?.email || '',
        phone: '-',
        nuptk: '-',
        institution: user?.profile?.institution || 'Detik Detik TryOut',
        role: 'Guru Pengajar',
        total_classes_taught: classesData.length,
        total_students_taught: classesData.reduce((acc, c) => acc + (c.total_siswa || 0), 0)
      };

      setTeachingClasses(classesData);
      setTeacherProfile(profileData);
      if (classesData.length > 0) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load teacher dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const mcqCount = totalQuestionsCount > 0 ? totalQuestionsCount : (questions.length || 4665);
  const activeExamsCount = (Array.isArray(exams) ? exams : []).filter(e => e.status === 'published').length;

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

  const selectedClass = teachingClasses.find(c => c.id === selectedClassId) || teachingClasses[0] || null;
  const filteredStudents = (selectedClass?.students || []).filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* 1. Welcome Banner */}
      <WelcomeBanner
        title={`Selamat Mengajar, ${user?.name || 'Bapak/Ibu Guru'} 📚`}
        subtitle="Kelola bank soal mandiri, susun paket TryOut, dan pantau hasil belajar siswa binaan Anda secara real-time."
        roleBadge="Panel Pengajar"
        metrics={[
          { label: 'Bank Soal', value: (totalQuestionsCount || 4665).toLocaleString('id-ID'), highlight: true },
          { label: 'Kelas Diampu', value: teachingClasses.length },
          { label: 'Total Murid', value: teacherProfile?.total_students_taught || 0 }
        ]}
        actionLabel="Buat Paket Ujian"
        onAction={() => navigate('/teacher/exams')}
        icon={Sparkles}
      />

      {/* 2. Profil Guru Card */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 bg-gradient-to-br from-white/95 via-cyan-50/20 to-indigo-50/20 dark:from-white/[0.03] dark:via-cyan-950/10 dark:to-indigo-950/10 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-600/20 shrink-0">
              <div className="h-full w-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center font-black text-2xl sm:text-3xl text-cyan-600 dark:text-cyan-400">
                {user?.name?.charAt(0) || 'G'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {teacherProfile?.name || user?.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  Guru Pengajar Aktif
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <School className="h-3.5 w-3.5 text-cyan-500" />
                  {teacherProfile?.institution || 'Detik Detik TryOut'}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                  NUPTK/NIP: <strong className="text-slate-800 dark:text-gray-200">{teacherProfile?.nuptk || '-'}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {teacherProfile?.email || user?.email}
                </span>
                {teacherProfile?.phone && teacherProfile.phone !== '-' && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    {teacherProfile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-center">
              <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Kelas Mengajar</p>
              <p className="text-lg font-black text-cyan-600 dark:text-cyan-400 mt-0.5">{teachingClasses.length} Rombel</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-center">
              <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Murid</p>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{teacherProfile?.total_students_taught || 0} Siswa</p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-center flex flex-col justify-center">
              <button
                onClick={() => navigate('/teacher/profile')}
                className="text-xs font-bold text-cyan-700 dark:text-cyan-300 hover:underline flex items-center justify-center gap-1"
              >
                <span>Edit Profil</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Gradient Stat Cards Grid */}
      {loading ? (
        <CardGridSkeleton count={4} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <GradientStatCard
            title="Koleksi Bank Soal"
            value={`${(totalQuestionsCount || 4665).toLocaleString('id-ID')} Butir`}
            subtitle="Soal terverifikasi di bank soal"
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
            onClick={() => navigate('/teacher/exams')}
          />
          <GradientStatCard
            title="Sesi Ujian Aktif"
            value={`${exams.length} Sesi`}
            subtitle={`${activeExamsCount} sesi sedang aktif`}
            icon={Calendar}
            variant="amber"
            onClick={() => navigate('/teacher/exams')}
          />
          <GradientStatCard
            title="Laporan Nilai Siswa"
            value="Rekap Hasil"
            subtitle="Hasil pengerjaan & KKM"
            icon={FileText}
            variant="emerald"
            onClick={() => navigate('/teacher/reports')}
          />
        </div>
      )}

      {/* 4. Section: Guru Mengajar di Kelas Apa Saja & Siapa Saja Muridnya */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Kelas yang Anda Ajar & Daftar Siswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pilih rombongan belajar untuk melihat data murid yang Anda bimbing
              </p>
            </div>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari murid / NISN..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>
        </div>

        {/* Class Selection Pills */}
        {teachingClasses.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {teachingClasses.map((cls) => {
              const isSelected = cls.id === selectedClassId;
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                      : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>{cls.nama_kelas}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : cls.is_wali_kelas
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}>
                    {cls.role} ({cls.total_siswa})
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
            <Users className="h-8 w-8 mx-auto text-slate-400 dark:text-gray-500 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-gray-300">Belum ada penugasan kelas mengajar</p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Admin sekolah Anda dapat menetapkan Anda sebagai Wali Kelas atau Guru Pengampu Mata Pelajaran.</p>
          </div>
        )}

        {/* Selected Class Details & Students Table */}
        {selectedClass && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300">
                <span>Rombel: <strong className="text-slate-900 dark:text-white">{selectedClass.nama_kelas}</strong></span>
                <span>•</span>
                <span>Jenjang: <strong className="text-slate-900 dark:text-white">{selectedClass.jenjang}</strong></span>
                <span>•</span>
                <span>Peran: <strong className="text-cyan-600 dark:text-cyan-400">{selectedClass.role}</strong></span>
                {selectedClass.mapel_list.length > 0 && (
                  <>
                    <span>•</span>
                    <span>Mapel: <strong className="text-indigo-600 dark:text-indigo-400">{selectedClass.mapel_list.join(', ')}</strong></span>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                Menampilkan {filteredStudents.length} dari {selectedClass.total_siswa} murid
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3 px-3.5 w-12 text-center">No</th>
                    <th className="py-3 px-3.5">NISN / NIS</th>
                    <th className="py-3 px-3.5">Nama Siswa</th>
                    <th className="py-3 px-3.5">Jenis Kelamin</th>
                    <th className="py-3 px-3.5">Email / Kontak</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                        <td className="py-2.5 px-3.5 text-center font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-gray-200">{s.nisn}</td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 font-black text-[10px] flex items-center justify-center shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <span className="truncate max-w-[200px]">{s.name}</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 dark:text-gray-400">{s.gender === 'L' ? 'Laki-laki' : s.gender === 'P' ? 'Perempuan' : s.gender}</td>
                        <td className="py-2.5 px-3.5 text-slate-500 dark:text-gray-400 text-[11px]">{s.email || s.phone || '-'}</td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-gray-500 text-xs">
                        Tidak ada siswa yang cocok dengan pencarian di kelas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. Main Split Section: Progress Charts & Active Exams */}
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
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-normal">{ex.academic_year?.name || '2026/2027'}</span>
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

        {/* Right 1 Column: Quick Action Cards */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Aksi Cepat Pengajar</h3>
            
            <button
              onClick={() => navigate('/teacher/questions')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-cyan-50/50 hover:bg-cyan-100/60 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-500/20 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-600 text-white rounded-xl shadow-md shadow-cyan-600/30">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Bank Soal TryOut</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">Input & impor template soal</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
            </button>

            <button
              onClick={() => navigate('/teacher/exams')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/50 hover:bg-indigo-100/60 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-500/20 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Generate 50 Soal Acak</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">Acak paket soal otomatis</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
            </button>

            <button
              onClick={() => navigate('/teacher/reports')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-500/20 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/30">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Laporan Nilai & KKM</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">Evaluasi ketuntasan siswa</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
export default TeacherDashboard;
