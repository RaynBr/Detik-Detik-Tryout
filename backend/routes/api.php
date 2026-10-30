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

// Public Auth routes (Requirement 7: Throttle login 5 req/min)
Route::post('/auth/login', [LoginController::class, 'login'])->middleware('throttle:5,1');

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

        // Kelola Instansi Multi-Tenant (CRUD Instansi, Admin, Masa Aktif, Suspend)
        Route::post('instansi/{idkategori}/admins', [InstansiController::class, 'storeAdmin']);
        Route::put('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'updateAdmin']);
        Route::delete('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'destroyAdmin']);
        Route::apiResource('instansi', InstansiController::class);

        // Kelola Pengguna Platform
        Route::get('users/super-admins', [UserManagementController::class, 'superAdmins']);
        Route::post('users/super-admins', [UserManagementController::class, 'storeSuperAdmin']);
        Route::get('users/admin-instansi', [UserManagementController::class, 'adminInstansi']);
        Route::post('users/admin-instansi', [UserManagementController::class, 'storeAdminInstansi']);
        Route::get('users/monitoring-guru-siswa', [UserManagementController::class, 'monitoringGuruSiswa']);

        // Master Platform Nasional
        Route::apiResource('jenjang', MasterJenjangController::class);
        Route::apiResource('subjects', MasterMataPelajaranController::class);
        Route::apiResource('tahun-soal', MasterTahunSoalController::class);

        // Subscriptions & Kuota Instansi
        Route::get('subscriptions', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'index']);
        Route::put('subscriptions/{idkategori}', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'updateQuota']);

        // Monitoring & Audit Trail Global
        Route::get('audit-logs', [AuditTrailController::class, 'index']);
        Route::get('audit-logs/actions', [AuditTrailController::class, 'actions']);
        Route::get('audit-logs/summary', [AuditTrailController::class, 'summary']);
        Route::get('monitoring/activity', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'activity']);
        Route::get('monitoring/security', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'security']);

        // Pengaturan Platform (SMTP, Logo, Maintenance, Backup)
        Route::get('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'index']);
        Route::post('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'update']);

        // Profil & Keamanan Super Admin
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword']);
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

        // Kelola Guru Sekolah (CRUD, Import, Reset Password, Guru Mapel)
        Route::get('teachers/template', [TeacherController::class, 'downloadTemplate']);
        Route::post('teachers/import', [TeacherController::class, 'import'])->middleware('throttle:5,1');
        Route::post('teachers/{iduser_bo}/reset-password', [TeacherController::class, 'resetPassword'])->middleware('throttle:5,1');
        Route::apiResource('teachers', TeacherController::class);

        // Kelola Siswa Sekolah (CRUD, Import, Reset Password)
        Route::get('students/template', [StudentController::class, 'downloadTemplate']);
        Route::post('students/import', [StudentController::class, 'import'])->middleware('throttle:5,1');
        Route::post('students/{iduser}/reset-password', [StudentController::class, 'resetPassword'])->middleware('throttle:5,1');
        Route::apiResource('students', StudentController::class);

        // Kelola Kelas & Rombel (Wali Kelas, Siswa Kelas, Guru Pengampu)
        Route::post('classes/{masterKela}/students', [MasterKelasController::class, 'addStudent']);
        Route::delete('classes/{masterKela}/students/{iduser}', [MasterKelasController::class, 'removeStudent']);
        Route::get('classes/{masterKela}/subject-teachers', [MasterKelasController::class, 'getSubjectTeachers']);
        Route::post('classes/{masterKela}/subject-teachers', [MasterKelasController::class, 'assignSubjectTeacher']);
        Route::put('classes/{masterKela}/subject-teachers/{guruMapelId}', [MasterKelasController::class, 'updateSubjectTeacher']);
        Route::delete('classes/{masterKela}/subject-teachers/{guruMapelId}', [MasterKelasController::class, 'removeSubjectTeacher']);
        Route::apiResource('classes', MasterKelasController::class)->parameters(['classes' => 'masterKela']);

        // Akademik Sekolah (Tahun Ajaran, Mapel & KKM, Jenjang, Jurusan)
        Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
        Route::get('academic-years/{academicYear}/subjects', [AcademicYearController::class, 'subjects']);
        Route::post('academic-years/{academicYear}/subjects', [AcademicYearController::class, 'attachSubject']);
        Route::delete('academic-years/{academicYear}/subjects/{idmapel}', [AcademicYearController::class, 'detachSubject']);
        Route::get('academic-years/{academicYear}/students', [AcademicYearController::class, 'students']);
        Route::post('academic-years/{academicYear}/students', [AcademicYearController::class, 'enrollStudents']);
        Route::delete('academic-years/{academicYear}/students/{iduser}', [AcademicYearController::class, 'removeStudent']);
        Route::apiResource('academic-years', AcademicYearController::class);
        Route::post('subjects/{masterMataPelajaran}/teachers', [MasterMataPelajaranController::class, 'assignTeacher']);
        Route::delete('subjects/{masterMataPelajaran}/teachers/{iduser_bo}', [MasterMataPelajaranController::class, 'removeTeacher']);
        Route::apiResource('subjects', MasterMataPelajaranController::class);
        Route::apiResource('jenjang', MasterJenjangController::class);
        Route::apiResource('majors', \App\Http\Controllers\Api\Admin\MajorController::class);
        Route::apiResource('tahun-soal', MasterTahunSoalController::class);

        // Test Tasks & Internal Tool
        Route::apiResource('test-tasks', TestTaskController::class);

        // User Management (Super Admin compatibility alias)
        Route::get('users/super-admins', [UserManagementController::class, 'superAdmins']);
        Route::post('users/super-admins', [UserManagementController::class, 'storeSuperAdmin']);
        Route::get('users/admin-instansi', [UserManagementController::class, 'adminInstansi']);
        Route::post('users/admin-instansi', [UserManagementController::class, 'storeAdminInstansi']);
        Route::get('users/monitoring-guru-siswa', [UserManagementController::class, 'monitoringGuruSiswa']);

        // Profil & Keamanan Admin Sekolah
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword']);
    });

    // Teacher Bank Soal & TryOut Exam management routes
    Route::middleware(['role:guru|super_admin|admin'])->prefix('teacher')->group(function () {
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('dashboard/teaching-classes', [DashboardController::class, 'teacherTeachingClasses']);
        Route::get('jenjang', [MasterJenjangController::class, 'index']);
        Route::get('subjects', [MasterMataPelajaranController::class, 'index']);
        Route::get('classes', [MasterKelasController::class, 'index']);
        Route::get('students', [StudentController::class, 'index']);
        Route::get('academic-years', [AcademicYearController::class, 'index']);

        // Profil & Keamanan (Guru)
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword']);

        // Bank Soal & Import Template (Requirement 7: Throttle import 5 req/min)
        Route::get('questions/template', [TeacherQuestionBankController::class, 'downloadTemplate']);
        Route::post('questions/import', [TeacherQuestionBankController::class, 'import'])->middleware('throttle:5,1');
        Route::patch('questions/{id}/status', [TeacherQuestionBankController::class, 'toggleStatus']);
        Route::apiResource('questions', TeacherQuestionBankController::class);

        // TryOut Exams & Packages (Requirement 7: Throttle generate 10 req/min, export 20 req/min)
        Route::post('exams/generate-random', [TeacherExamController::class, 'generateRandom50'])->middleware('throttle:10,1');
        Route::post('exams/{idassessment}/assign-class', [TeacherExamController::class, 'assignToClass']);
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
        Route::post('change-password', [ProfileController::class, 'changePassword']);
    });
});
