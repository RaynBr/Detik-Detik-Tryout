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

// Public Auth routes
Route::post('/auth/login', [LoginController::class, 'login'])->middleware('throttle:30,1');

// Protected routes (Requires Auth & Session Lock check)
Route::middleware(['auth:sanctum', 'single_session'])->group(function () {
    Route::get('/auth/me', [SessionController::class, 'me']);
    Route::post('/auth/logout', [LoginController::class, 'logout']);

    // Admin & Super Admin Management routes
    Route::middleware(['role:super_admin|admin'])->prefix('admin')->group(function () {
        // Manajemen Instansi & Multi-Tenant User CRUD (Super Admin)
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

        // Master Jenjang Pendidikan (SD, SMP, SMA, SMK)
        Route::apiResource('jenjang', MasterJenjangController::class);

        // Master Kelas (Free text names for private schools)
        Route::post('classes/{masterKela}/students', [MasterKelasController::class, 'addStudent']);
        Route::delete('classes/{masterKela}/students/{iduser}', [MasterKelasController::class, 'removeStudent']);
        Route::apiResource('classes', MasterKelasController::class)->parameters(['classes' => 'masterKela']);

        // Master Mata Pelajaran
        Route::post('subjects/{masterMataPelajaran}/teachers', [MasterMataPelajaranController::class, 'assignTeacher']);
        Route::delete('subjects/{masterMataPelajaran}/teachers/{iduser_bo}', [MasterMataPelajaranController::class, 'removeTeacher']);
        Route::apiResource('subjects', MasterMataPelajaranController::class);
        
        // Master Guru & Siswa (Admin Scope)
        Route::get('teachers/template', [TeacherController::class, 'downloadTemplate']);
        Route::post('teachers/import', [TeacherController::class, 'import']);
        Route::post('teachers/{iduser_bo}/reset-password', [TeacherController::class, 'resetPassword']);
        Route::apiResource('teachers', TeacherController::class);
        
        Route::get('students/template', [StudentController::class, 'downloadTemplate']);
        Route::post('students/import', [StudentController::class, 'import']);
        Route::post('students/{iduser}/reset-password', [StudentController::class, 'resetPassword']);
        Route::apiResource('students', StudentController::class);

        // Live monitor, stats & pre-flight system health check & school reports
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('dashboard/reports', [DashboardController::class, 'reports']);
        Route::get('dashboard/live-monitoring', [DashboardController::class, 'liveMonitoring']);
        Route::get('dashboard/pre-flight-check', [DashboardController::class, 'preFlightCheck']);

        // Profil & Keamanan (Admin & Super Admin)
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword']);

        // Master Tahun Ajaran & Tahun Soal (Requirement 1)
        Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
        Route::apiResource('academic-years', AcademicYearController::class);
        Route::apiResource('tahun-soal', MasterTahunSoalController::class);

        // Test Task Manager (Requirement 7: CRUD Testing Internal)
        Route::apiResource('test-tasks', TestTaskController::class);

        // Audit Trail (Requirement 3: Super Admin & Admin Instansi)
        Route::get('audit-logs', [AuditTrailController::class, 'index']);
        Route::get('audit-logs/actions', [AuditTrailController::class, 'actions']);
        Route::get('audit-logs/summary', [AuditTrailController::class, 'summary']);

        // Super Admin ONLY Routes (Menu 2 Kelola Pengguna)
        Route::middleware(['role:super_admin'])->group(function () {
            // Kelola Pengguna (Menu 2 Flow)
            Route::get('users/super-admins', [UserManagementController::class, 'superAdmins']);
            Route::post('users/super-admins', [UserManagementController::class, 'storeSuperAdmin']);
            Route::get('users/admin-instansi', [UserManagementController::class, 'adminInstansi']);
            Route::post('users/admin-instansi', [UserManagementController::class, 'storeAdminInstansi']);
            Route::get('users/monitoring-guru-siswa', [UserManagementController::class, 'monitoringGuruSiswa']);
        });
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

        // Bank Soal & Import Template
        Route::get('questions/template', [TeacherQuestionBankController::class, 'downloadTemplate']);
        Route::post('questions/import', [TeacherQuestionBankController::class, 'import']);
        Route::patch('questions/{id}/status', [TeacherQuestionBankController::class, 'toggleStatus']);
        Route::apiResource('questions', TeacherQuestionBankController::class);

        // TryOut Exams & Packages (Support 50 random question generator & class assignments)
        Route::post('exams/generate-random', [TeacherExamController::class, 'generateRandom50']);
        Route::post('exams/{idassessment}/assign-class', [TeacherExamController::class, 'assignToClass']);
        Route::get('exams/{idassessment}/results', [TeacherExamController::class, 'results']);
        Route::get('exams/{idassessment}/report', [TeacherExamController::class, 'report']);
        Route::get('exams/{idassessment}/report/export', [TeacherExamController::class, 'exportReport']);
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
