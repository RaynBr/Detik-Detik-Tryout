import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import { ThemeProvider } from './shared/context/ThemeContext';
import { GuestRoute, ProtectedRoute } from './routes/guards';
import { Unauthorized } from './shared/components/Unauthorized';
import { RefreshCw } from 'lucide-react';
import { ToastProvider } from './shared/context/ToastContext';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

// Code-splitting via React.lazy for high-performance loading
const LandingPage = lazy(() => import('./features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./features/auth/components/LoginPage').then(m => ({ default: m.LoginPage })));
const StudentExamsPage = lazy(() => import('./features/student/StudentExamsPage').then(m => ({ default: m.StudentExamsPage })));
const StudentProfilePage = lazy(() => import('./features/student/StudentProfilePage').then(m => ({ default: m.StudentProfilePage })));
const ExamSessionPage = lazy(() => import('./features/student/ExamSessionPage').then(m => ({ default: m.ExamSessionPage })));
const TeacherDashboard = lazy(() => import('./features/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const TeacherLayout = lazy(() => import('./features/teacher/TeacherLayout').then(m => ({ default: m.TeacherLayout })));
const QuestionBankPage = lazy(() => import('./features/teacher/QuestionBankPage').then(m => ({ default: m.QuestionBankPage })));
const ExamsPage = lazy(() => import('./features/teacher/ExamsPage').then(m => ({ default: m.ExamsPage })));
const GradingPage = lazy(() => import('./features/teacher/GradingPage').then(m => ({ default: m.GradingPage })));
const ExamReportPage = lazy(() => import('./features/teacher/ExamReportPage').then(m => ({ default: m.ExamReportPage })));
const SuperAdminLayout = lazy(() => import('./features/admin/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })));
const SuperAdminDashboard = lazy(() => import('./features/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const SchoolUsersPage = lazy(() => import('./features/admin/SchoolUsersPage').then(m => ({ default: m.SchoolUsersPage })));
const AdminLayout = lazy(() => import('./features/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LiveMonitoringPage = lazy(() => import('./features/admin/LiveMonitoringPage').then(m => ({ default: m.LiveMonitoringPage })));
const MajorsPage = lazy(() => import('./features/admin/MajorsPage').then(m => ({ default: m.MajorsPage })));
const ClassesPage = lazy(() => import('./features/admin/ClassesPage').then(m => ({ default: m.ClassesPage })));
const SubjectsPage = lazy(() => import('./features/admin/SubjectsPage').then(m => ({ default: m.SubjectsPage })));
const AcademicYearsPage = lazy(() => import('./features/admin/AcademicYearsPage').then(m => ({ default: m.AcademicYearsPage })));
const TeachersPage = lazy(() => import('./features/admin/TeachersPage').then(m => ({ default: m.TeachersPage })));
const StudentsPage = lazy(() => import('./features/admin/StudentsPage').then(m => ({ default: m.StudentsPage })));
const InstansiPage = lazy(() => import('./features/admin/InstansiPage').then(m => ({ default: m.InstansiPage })));
const UsersManagementPage = lazy(() => import('./features/admin/UsersManagementPage').then(m => ({ default: m.UsersManagementPage })));
const AuditTrailPage = lazy(() => import('./features/admin/AuditTrailPage').then(m => ({ default: m.AuditTrailPage })));
const AdminProfilePage = lazy(() => import('./features/admin/AdminProfilePage').then(m => ({ default: m.AdminProfilePage })));
const MasterTahunSoalPage = lazy(() => import('./features/admin/MasterTahunSoalPage').then(m => ({ default: m.MasterTahunSoalPage })));
const PlatformSubscriptionsPage = lazy(() => import('./features/admin/PlatformSubscriptionsPage').then(m => ({ default: m.PlatformSubscriptionsPage })));
const PlatformSettingsPage = lazy(() => import('./features/admin/PlatformSettingsPage').then(m => ({ default: m.PlatformSettingsPage })));
const SuperAdminQuestionBankPage = lazy(() => import('./features/admin/SuperAdminQuestionBankPage').then(m => ({ default: m.SuperAdminQuestionBankPage })));

const AcademicMasterPage = lazy(() => import('./features/admin/AcademicMasterPage').then(m => ({ default: m.AcademicMasterPage })));
const MasterTahunAjaranPage = lazy(() => import('./features/admin/academic/MasterTahunAjaranPage').then(m => ({ default: m.MasterTahunAjaranPage })));
const MasterSemesterPage = lazy(() => import('./features/admin/academic/MasterSemesterPage').then(m => ({ default: m.MasterSemesterPage })));
const MasterJenjangPage = lazy(() => import('./features/admin/academic/MasterJenjangPage').then(m => ({ default: m.MasterJenjangPage })));
const MasterKurikulumPage = lazy(() => import('./features/admin/academic/MasterKurikulumPage').then(m => ({ default: m.MasterKurikulumPage })));
const MasterMataPelajaranPage = lazy(() => import('./features/admin/academic/MasterMataPelajaranPage').then(m => ({ default: m.MasterMataPelajaranPage })));
const MasterKelasPage = lazy(() => import('./features/admin/academic/MasterKelasPage').then(m => ({ default: m.MasterKelasPage })));
const MasterJurusanPage = lazy(() => import('./features/admin/academic/MasterJurusanPage').then(m => ({ default: m.MasterJurusanPage })));
const MasterTingkatKelasPage = lazy(() => import('./features/admin/academic/MasterTingkatKelasPage').then(m => ({ default: m.MasterTingkatKelasPage })));
const MaintenancePage = lazy(() => import('./features/landing/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const SubscriptionInactivePage = lazy(() => import('./features/landing/SubscriptionInactivePage').then(m => ({ default: m.SubscriptionInactivePage })));

const PageLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#070a13] text-slate-800 dark:text-white space-y-4 p-4 transition-colors">
    <div className="relative flex items-center justify-center">
      <div className="h-14 w-14 rounded-2xl bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    </div>
    <div className="text-center space-y-2">
      <p className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Memuat Komponen CBT...</p>
      <div className="w-40 mx-auto h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full animate-progress-indeterminate"></div>
      </div>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Landing Page */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/subscription-inactive" element={<SubscriptionInactivePage />} />

              {/* Unified Guest routes (Redirect to respective dashboard if already logged in) */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/staff/login" element={<Navigate to="/login" replace />} />
              </Route>

              {/* Protected routes (Require login & role validation) */}
              
              {/* Student routes */}
              <Route element={<ProtectedRoute allowedRoles={['siswa']} />}>
                <Route path="/student/dashboard" element={<StudentExamsPage />} />
                <Route path="/student-dashboard" element={<Navigate to="/student/dashboard" replace />} />
                <Route path="/student/profile" element={<StudentProfilePage />} />
                <Route path="/student/session/:attemptId" element={<ExamSessionPage />} />
              </Route>

              {/* Teacher routes */}
              <Route element={<ProtectedRoute allowedRoles={['guru']} />}>
                <Route element={<TeacherLayout />}>
                  <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  <Route path="/teacher/questions" element={<QuestionBankPage />} />
                  <Route path="/teacher/exams" element={<ExamsPage />} />
                  <Route path="/teacher/grading" element={<GradingPage />} />
                  <Route path="/teacher/reports" element={<ExamReportPage />} />
                  <Route path="/teacher/profile" element={<AdminProfilePage />} />
                </Route>
              </Route>

              {/* Super Admin Platform routes (/super-admin/*) */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route element={<SuperAdminLayout />}>
                  <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/instansi" element={<InstansiPage />} />
                  <Route path="/super-admin/users" element={<UsersManagementPage />} />
                  
                  {/* Master Akademik - Rute Submenu Spesifik */}
                  <Route path="/super-admin/master-akademik" element={<Navigate to="/super-admin/master-akademik/tahun-ajaran" replace />} />
                  <Route path="/super-admin/master-akademik/tahun-ajaran" element={<MasterTahunAjaranPage />} />
                  <Route path="/super-admin/master-akademik/semester" element={<MasterSemesterPage />} />
                  <Route path="/super-admin/master-akademik/jenjang" element={<MasterJenjangPage />} />
                  <Route path="/super-admin/master-akademik/kurikulum" element={<MasterKurikulumPage />} />
                  <Route path="/super-admin/master-akademik/mata-pelajaran" element={<MasterMataPelajaranPage />} />
                  <Route path="/super-admin/master-akademik/kelas" element={<MasterKelasPage />} />
                  <Route path="/super-admin/master-akademik/jurusan" element={<MasterJurusanPage />} />
                  <Route path="/super-admin/master-akademik/tingkat-kelas" element={<MasterTingkatKelasPage />} />

                  {/* Master Akademik - Backward-compatible routes */}
                  <Route path="/super-admin/academic-master" element={<AcademicMasterPage />} />
                  <Route path="/super-admin/academic-years" element={<MasterTahunAjaranPage />} />
                  <Route path="/super-admin/semesters" element={<MasterSemesterPage />} />
                  <Route path="/super-admin/jenjang" element={<MasterJenjangPage />} />
                  <Route path="/super-admin/kurikulum" element={<MasterKurikulumPage />} />
                  <Route path="/super-admin/subjects" element={<MasterMataPelajaranPage />} />
                  <Route path="/super-admin/classes" element={<MasterKelasPage />} />
                  <Route path="/super-admin/majors" element={<MasterJurusanPage />} />
                  <Route path="/super-admin/tingkat-kelas" element={<MasterTingkatKelasPage />} />
                  <Route path="/super-admin/tahun-soal" element={<MasterTahunSoalPage />} />

                  {/* Kelola Bank Soal */}
                  <Route path="/super-admin/bank-soal" element={<SuperAdminQuestionBankPage />} />
                  <Route path="/super-admin/question-bank" element={<SuperAdminQuestionBankPage />} />
                  <Route path="/super-admin/questions" element={<SuperAdminQuestionBankPage />} />

                  {/* Subscription, Monitoring, Pengaturan, Profil */}
                  <Route path="/super-admin/subscriptions" element={<PlatformSubscriptionsPage />} />
                  <Route path="/super-admin/monitoring" element={<AuditTrailPage />} />
                  <Route path="/super-admin/audit-logs" element={<AuditTrailPage />} />
                  <Route path="/super-admin/settings" element={<PlatformSettingsPage />} />
                  <Route path="/super-admin/profile" element={<AdminProfilePage />} />
                </Route>
              </Route>

              {/* Admin Instansi / Sekolah routes (/admin/*) - Strictly for role 'admin' */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/school-users" element={<SchoolUsersPage />} />
                  <Route path="/admin/instansi" element={<SchoolUsersPage />} />
                  <Route path="/admin/teachers" element={<TeachersPage />} />
                  <Route path="/admin/students" element={<StudentsPage />} />
                  <Route path="/admin/classes" element={<ClassesPage />} />
                  <Route path="/admin/academic-years" element={<AcademicYearsPage />} />
                  <Route path="/admin/subjects" element={<SubjectsPage />} />
                  <Route path="/admin/majors" element={<MajorsPage />} />
                  
                  {/* Master Akademik untuk Admin Instansi */}
                  <Route path="/admin/master-akademik" element={<Navigate to="/admin/master-akademik/tahun-ajaran" replace />} />
                  <Route path="/admin/master-akademik/tahun-ajaran" element={<MasterTahunAjaranPage />} />
                  <Route path="/admin/master-akademik/semester" element={<MasterSemesterPage />} />
                  <Route path="/admin/master-akademik/kurikulum" element={<MasterKurikulumPage />} />
                  <Route path="/admin/master-akademik/jenjang" element={<MasterJenjangPage />} />
                  <Route path="/admin/master-akademik/jurusan" element={<MasterJurusanPage />} />
                  <Route path="/admin/master-akademik/tingkat-kelas" element={<MasterTingkatKelasPage />} />
                  <Route path="/admin/master-akademik/mata-pelajaran" element={<MasterMataPelajaranPage />} />
                  <Route path="/admin/master-akademik/kelas" element={<MasterKelasPage />} />

                  <Route path="/admin/proctoring" element={<LiveMonitoringPage />} />
                  <Route path="/admin/reports" element={<ExamReportPage />} />
                  <Route path="/admin/profile" element={<AdminProfilePage />} />
                </Route>
              </Route>

              {/* Public utility pages */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Default fallbacks */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
