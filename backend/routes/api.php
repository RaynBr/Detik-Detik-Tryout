<?php

use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\SessionController;
use App\Http\Controllers\Api\Admin\MasterJenjangController;
use App\Http\Controllers\Api\Admin\MasterKelasController;
use App\Http\Controllers\Api\Admin\MasterMataPelajaranController;
use App\Http\Controllers\Api\Admin\InstansiController;
use App\Http\Controllers\Api\Admin\TeacherController;
use App\Http\Controllers\Api\Admin\StudentController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\AuditTrailController;
use App\Http\Controllers\Api\Admin\UserManagementController;
use App\Http\Controllers\Api\Admin\ProfileController;
use App\Http\Controllers\Api\Admin\MasterTahunSoalController;
use App\Http\Controllers\Api\Admin\AcademicYearController;
use App\Http\Controllers\Api\Admin\TestTaskController;
use App\Http\Controllers\Api\Teacher\TeacherExamController;
use App\Http\Controllers\Api\Teacher\TeacherQuestionBankController;
use App\Http\Controllers\Api\Student\ExamAttemptController;
use App\Http\Controllers\Api\Student\AnswerController;
use App\Http\Controllers\Api\Student\ResultController;
use App\Http\Controllers\Api\Proctoring\ViolationLogController;
use Illuminate\Support\Facades\Route;

// Public Auth & Platform routes
Route::post('/auth/login', [LoginController::class, 'login'])->middleware('throttle:5,1')->name('login');
Route::get('/public/platform-settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'publicSettings']);

// Protected routes (Requires Auth & Session Lock check)
Route::middleware(['auth:sanctum', 'single_session'])->group(function () {
    Route::get('/auth/me', [SessionController::class, 'me']);
    Route::post('/auth/logout', [LoginController::class, 'logout']);

    // ==========================================
    // 1. SUPER ADMIN PLATFORM ROUTES
    // ==========================================
    Route::middleware(['role:super_admin'])->prefix('super-admin')->group(function () {
        // Platform Global Dashboard Stats
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);

        // Kelola Instansi Multi-Tenant (CRUD Instansi, Admin, Guru, Siswa, Kelas, Mapel, Master Global Config)
        Route::get('instansi/master-options', [InstansiController::class, 'masterOptions']);
        Route::patch('instansi/{idkategori}/status', [InstansiController::class, 'toggleStatus']);
        Route::post('instansi/{idkategori}/toggle-status', [InstansiController::class, 'toggleStatus']);
        Route::get('instansi/{idkategori}/academic-details', [InstansiController::class, 'academicDetails']);
        Route::put('instansi/{idkategori}/academic-config', [InstansiController::class, 'updateAcademicConfig']);
        Route::post('instansi/{idkategori}/admins', [InstansiController::class, 'storeAdmin']);
        Route::put('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'updateAdmin']);
        Route::delete('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'destroyAdmin']);
        Route::post('instansi/{idkategori}/gurus', [InstansiController::class, 'storeGuru']);
        Route::put('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'updateGuru']);
        Route::delete('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'destroyGuru']);
        Route::post('instansi/{idkategori}/siswas', [InstansiController::class, 'storeSiswa']);
        Route::put('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'updateSiswa']);
        Route::delete('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'destroySiswa']);
        Route::post('instansi/{idkategori}/kelas', [InstansiController::class, 'storeKelas']);
        Route::put('instansi/{idkategori}/kelas/{idkelas}', [InstansiController::class, 'updateKelas']);
        Route::delete('instansi/{idkategori}/kelas/{idkelas}', [InstansiController::class, 'destroyKelas']);
        Route::post('instansi/{idkategori}/mata-pelajaran', [InstansiController::class, 'storeMapel']);
        Route::put('instansi/{idkategori}/mata-pelajaran/{idmapel}', [InstansiController::class, 'updateMapel']);
        Route::delete('instansi/{idkategori}/mata-pelajaran/{idmapel}', [InstansiController::class, 'destroyMapel']);
        Route::apiResource('instansi', InstansiController::class);

        // Kelola Pengguna Platform
        Route::get('users/super-admins', [UserManagementController::class, 'superAdmins']);
        Route::post('users/super-admins', [UserManagementController::class, 'storeSuperAdmin']);
        Route::get('users/admin-instansi', [UserManagementController::class, 'adminInstansi']);
        Route::post('users/admin-instansi', [UserManagementController::class, 'storeAdminInstansi']);
        Route::get('users/monitoring-guru-siswa', [UserManagementController::class, 'monitoringGuruSiswa']);
        Route::post('users/{id}/reset-password', [UserManagementController::class, 'resetPassword'])->middleware('throttle:5,1');
        Route::patch('users/{id}/status', [UserManagementController::class, 'toggleStatus']);
        Route::post('users/{id}/toggle-status', [UserManagementController::class, 'toggleStatus']);
        Route::apiResource('users', UserManagementController::class);

        // Master Tahun Soal untuk Bank Soal Nasional
        Route::apiResource('tahun-soal', MasterTahunSoalController::class);

        // Kelola Bank Soal (Cascading Parameter Filter, List Soal, Detail, Edit, Hapus, Aktif/Nonaktif, Template & Import)
        Route::get('question-bank/template', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'downloadTemplate']);
        Route::post('question-bank/preview', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'preview']);
        Route::post('question-bank/import', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'import']);
        Route::get('question-bank/cascading-params', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'cascadingParams']);
        Route::patch('question-bank/{id}/status', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'toggleStatus']);
        Route::post('question-bank/{id}/toggle-status', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'toggleStatus']);
        Route::apiResource('question-bank', \App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class);
        Route::apiResource('bank-soal', \App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class);
        Route::patch('questions/{id}/status', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'toggleStatus']);
        Route::apiResource('questions', \App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class);

        // Subscriptions & Akses Instansi
        Route::get('subscriptions', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'index']);
        Route::put('subscriptions/{idkategori}', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'updateQuota']);
        Route::post('subscriptions/{idkategori}/toggle', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'toggleStatus']);

        // Monitoring & Audit Trail Global
        Route::get('monitoring/stats', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'stats']);
        Route::get('monitoring/audit-logs', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'auditLogs']);
        Route::get('monitoring/modules', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'modules']);
        Route::get('audit-logs', [AuditTrailController::class, 'index']);
        Route::get('audit-logs/export', [AuditTrailController::class, 'export']);
        Route::get('audit-logs/actions', [AuditTrailController::class, 'actions']);
        Route::get('audit-logs/summary', [AuditTrailController::class, 'summary']);
        Route::get('monitoring/activity', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'activity']);
        Route::get('monitoring/security', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'security']);

        // Pengaturan Platform (Logo, Maintenance, Favicon, Support)
        Route::get('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'index']);
        Route::post('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'update']);
        Route::put('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'update']);

        // Profil & Keamanan Super Admin
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword'])->middleware('throttle:5,1');

        // =============================================
        // MASTER AKADEMIK GLOBAL (Super Admin CRUD)
        // Super Admin menggunakan idkategori = '27830150842287772'
        // =============================================
        Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
        Route::apiResource('academic-years', AcademicYearController::class);
        Route::post('semesters/{semester}/activate', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'activate']);
        Route::apiResource('semesters', \App\Http\Controllers\Api\Admin\MasterSemesterController::class);
        Route::apiResource('kurikulum', \App\Http\Controllers\Api\Admin\MasterKurikulumController::class);
        Route::apiResource('jenjang', MasterJenjangController::class);
        Route::apiResource('tingkat-kelas', \App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class);
    });

    // ==========================================
    // 2. ADMIN INSTANSI / SEKOLAH ROUTES
    // ==========================================
    Route::middleware(['role:admin'])->prefix('admin')->group(function () {
        // Dashboard Sekolah Terisolasi
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('dashboard/reports', [DashboardController::class, 'reports']);
        Route::get('dashboard/live-monitoring', [DashboardController::class, 'liveMonitoring']);
        Route::get('dashboard/pre-flight-check', [DashboardController::class, 'preFlightCheck']);

        // Menu Pengguna Instansi (Server-side Paginated 15 per page)
        Route::get('school-users', [InstansiController::class, 'schoolUsers']);
        Route::post('instansi/{idkategori}/admins', [InstansiController::class, 'storeAdmin']);
        Route::put('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'updateAdmin']);
        Route::delete('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'destroyAdmin']);
        Route::post('instansi/{idkategori}/gurus', [InstansiController::class, 'storeGuru']);
        Route::put('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'updateGuru']);
        Route::delete('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'destroyGuru']);
        Route::post('instansi/{idkategori}/siswas', [InstansiController::class, 'storeSiswa']);
        Route::put('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'updateSiswa']);
        Route::delete('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'destroySiswa']);
        Route::apiResource('instansi', InstansiController::class);

        // Kelola Guru Sekolah (CRUD, Import, Export, Reset Password, Guru Mapel)
        Route::get('teachers/export', [TeacherController::class, 'export']);
        Route::get('teachers/template', [TeacherController::class, 'downloadTemplate']);
        Route::post('teachers/import', [TeacherController::class, 'import'])->middleware('throttle:5,1');
        Route::post('teachers/{iduser_bo}/reset-password', [TeacherController::class, 'resetPassword'])->middleware('throttle:5,1');
        Route::patch('teachers/{iduser_bo}/toggle-status', [TeacherController::class, 'toggleStatus']);
        Route::apiResource('teachers', TeacherController::class);

        // Kelola Siswa Sekolah (CRUD, Import, Export, Reset Password)
        Route::get('students/export', [StudentController::class, 'export']);
        Route::get('students/template', [StudentController::class, 'downloadTemplate']);
        Route::post('students/import', [StudentController::class, 'import'])->middleware('throttle:5,1');
        Route::post('students/{iduser}/reset-password', [StudentController::class, 'resetPassword'])->middleware('throttle:5,1');
        Route::patch('students/{iduser}/toggle-status', [StudentController::class, 'toggleStatus']);
        Route::apiResource('students', StudentController::class);

        // Kelola Kelas & Rombel (Wali Kelas, Siswa Kelas, Guru Pengampu)
        Route::get('classes-options', [MasterKelasController::class, 'options']);
        Route::get('classes/{masterKela}/academic-context', [MasterKelasController::class, 'academicContext']);
        Route::post('classes/{masterKela}/students', [MasterKelasController::class, 'addStudent']);
        Route::delete('classes/{masterKela}/students/{iduser}', [MasterKelasController::class, 'removeStudent']);
        Route::get('classes/{masterKela}/subject-teachers', [MasterKelasController::class, 'getSubjectTeachers']);
        Route::post('classes/{masterKela}/subject-teachers', [MasterKelasController::class, 'assignSubjectTeacher']);
        Route::put('classes/{masterKela}/subject-teachers/{guruMapelId}', [MasterKelasController::class, 'updateSubjectTeacher']);
        Route::delete('classes/{masterKela}/subject-teachers/{guruMapelId}', [MasterKelasController::class, 'removeSubjectTeacher']);
        Route::patch('classes/{id}/toggle-status', [MasterKelasController::class, 'toggleStatus']);
        Route::apiResource('classes', MasterKelasController::class)->parameters(['classes' => 'masterKela']);

        // Akademik Sekolah (Tahun Ajaran, Mapel & KKM, Jenjang, Jurusan, Semester, Kurikulum, Tingkat Kelas)
        Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
        Route::get('academic-years/{academicYear}/subjects', [AcademicYearController::class, 'subjects']);
        Route::post('academic-years/{academicYear}/subjects', [AcademicYearController::class, 'attachSubject']);
        Route::delete('academic-years/{academicYear}/subjects/{idmapel}', [AcademicYearController::class, 'detachSubject']);
        Route::get('academic-years/{academicYear}/students', [AcademicYearController::class, 'students']);
        Route::post('academic-years/{academicYear}/students', [AcademicYearController::class, 'enrollStudents']);
        Route::delete('academic-years/{academicYear}/students/{iduser}', [AcademicYearController::class, 'removeStudent']);
        Route::apiResource('academic-years', AcademicYearController::class);
        Route::post('semesters/{semester}/activate', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'activate']);
        Route::apiResource('semesters', \App\Http\Controllers\Api\Admin\MasterSemesterController::class);
        Route::apiResource('kurikulum', \App\Http\Controllers\Api\Admin\MasterKurikulumController::class);
        Route::apiResource('tingkat-kelas', \App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class);
        Route::get('subjects-options', [MasterMataPelajaranController::class, 'options']);
        Route::patch('subjects/{masterMataPelajaran}/toggle-status', [MasterMataPelajaranController::class, 'toggleStatus']);
        Route::post('subjects/{masterMataPelajaran}/teachers', [MasterMataPelajaranController::class, 'assignTeacher']);
        Route::delete('subjects/{masterMataPelajaran}/teachers/{iduser_bo}', [MasterMataPelajaranController::class, 'removeTeacher']);
        Route::apiResource('subjects', MasterMataPelajaranController::class);
        Route::apiResource('jenjang', MasterJenjangController::class);
        Route::apiResource('majors', \App\Http\Controllers\Api\Admin\MajorController::class);
        Route::apiResource('tahun-soal', MasterTahunSoalController::class);

        // Test Tasks & Internal Tool
        Route::apiResource('test-tasks', TestTaskController::class);

        // Audit Trail & Aktivitas Guru / Siswa
        Route::get('audit-logs', [AuditTrailController::class, 'index']);
        Route::get('audit-logs/export', [AuditTrailController::class, 'export']);
        Route::get('teacher-student-activities', [AuditTrailController::class, 'teacherStudentActivities']);
        Route::get('teacher-student-activities/export', [AuditTrailController::class, 'exportTeacherStudentActivities']);

        // Jadwal Ujian untuk Admin Instansi
        Route::get('exams', [TeacherExamController::class, 'index']);
        Route::get('exams/{idassessment}', [TeacherExamController::class, 'show']);
        Route::post('exams', [TeacherExamController::class, 'store']);
        Route::put('exams/{idassessment}', [TeacherExamController::class, 'update']);
        Route::delete('exams/{idassessment}', [TeacherExamController::class, 'destroy']);
        Route::post('exams/{idassessment}/toggle-status', [TeacherExamController::class, 'toggleStatus']);

        // Profil & Keamanan Admin Sekolah
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword'])->middleware('throttle:5,1');
    });

    // Teacher Bank Soal & TryOut Exam management routes
    Route::middleware(['role:guru|super_admin|admin'])->prefix('teacher')->group(function () {
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('dashboard/teaching-classes', [DashboardController::class, 'teacherTeachingClasses']);
        Route::get('jenjang', [MasterJenjangController::class, 'index']);
        Route::get('subjects', [MasterMataPelajaranController::class, 'index']);
        Route::get('classes', [MasterKelasController::class, 'index']);
        Route::get('classes/{masterKela}/academic-context', [MasterKelasController::class, 'academicContext']);
        Route::get('students', [StudentController::class, 'index']);
        Route::get('academic-years', [AcademicYearController::class, 'index']);

        // Profil & Keamanan (Guru)
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword'])->middleware('throttle:5,1');

        // Bank Soal & Import Template (Requirement 7: Throttle import 5 req/min)
        Route::get('questions/template', [TeacherQuestionBankController::class, 'downloadTemplate']);
        Route::post('questions/import', [TeacherQuestionBankController::class, 'import'])->middleware('throttle:5,1');
        Route::patch('questions/{id}/status', [TeacherQuestionBankController::class, 'toggleStatus']);
        Route::apiResource('questions', TeacherQuestionBankController::class);

        // TryOut Exams & Packages (Requirement 7: Throttle generate 10 req/min, export 20 req/min)
        Route::post('exams/generate-random', [TeacherExamController::class, 'generateRandom50'])->middleware('throttle:10,1');
        Route::post('exams/{idassessment}/publish', [TeacherExamController::class, 'publish']);
        Route::get('exams/{idassessment}/questions', [TeacherExamController::class, 'getQuestions']);
        Route::post('exams/{idassessment}/questions/add-global', [TeacherExamController::class, 'addQuestionFromGlobal']);
        Route::put('exams/{idassessment}/questions/{idsoal}/replace', [TeacherExamController::class, 'replaceQuestion']);
        Route::delete('exams/{idassessment}/questions/{idsoal}', [TeacherExamController::class, 'removeQuestion']);
        Route::post('exams/{idassessment}/questions/reorder', [TeacherExamController::class, 'reorderQuestions']);
        Route::post('exams/{idassessment}/questions/{idsoal}/annul', [TeacherExamController::class, 'annulQuestion']);
        Route::post('exams/{idassessment}/assign-class', [TeacherExamController::class, 'assignToClass']);
        Route::post('exams/{idassessment}/toggle-status', [TeacherExamController::class, 'toggleStatus']);
        Route::patch('exams/{idassessment}/toggle-status', [TeacherExamController::class, 'toggleStatus']);
        Route::get('exams/{idassessment}/results', [TeacherExamController::class, 'results']);
        Route::get('exams/{idassessment}/report', [TeacherExamController::class, 'report']);
        Route::get('exams/{idassessment}/report/export', [TeacherExamController::class, 'exportReport'])->middleware('throttle:20,1');
        Route::get('exams/{idassessment}/attempts/{attemptId}', [TeacherExamController::class, 'attemptDetail']);
        Route::apiResource('exam-groups', \App\Http\Controllers\Api\Teacher\ExamGroupController::class);
        Route::apiResource('exams', TeacherExamController::class);
        Route::apiResource('packages', TeacherExamController::class);
    });

    // Student Exam pengerjaan routes with High-Throughput Burst Rate Limiting
    Route::middleware(['role:siswa'])->prefix('student')->group(function () {
        Route::get('exams', [ExamAttemptController::class, 'availableExams']);
        Route::post('attempts/start', [ExamAttemptController::class, 'start'])->middleware('throttle:30,1');
        Route::get('attempts/{attempt}', [ExamAttemptController::class, 'showAttempt']);
        Route::get('attempts/{attempt}/questions', [ExamAttemptController::class, 'showAttempt']);
        Route::patch('attempts/{attempt}/answers', [AnswerController::class, 'saveAnswer'])->middleware('throttle:180,1');
        Route::post('attempts/{attempt}/submit', [ExamAttemptController::class, 'submit'])->middleware('throttle:20,1');
        Route::post('attempts/{attempt}/disqualify', [ViolationLogController::class, 'disqualify']);
        Route::post('attempts/{attempt}/violations', [ViolationLogController::class, 'logViolation'])->middleware('throttle:60,1');
        Route::post('attempts/violations', [ViolationLogController::class, 'logViolation'])->middleware('throttle:60,1');
        Route::get('results/{attempt}', [ResultController::class, 'showResult']);
        Route::post('change-password', [ProfileController::class, 'changePassword'])->middleware('throttle:5,1');
    });
});
