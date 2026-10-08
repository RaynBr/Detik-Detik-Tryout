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
        Route::apiResource('classes', MasterKelasController::class);

        // Master Mata Pelajaran
        Route::post('subjects/{masterMataPelajaran}/teachers', [MasterMataPelajaranController::class, 'assignTeacher']);
        Route::delete('subjects/{masterMataPelajaran}/teachers/{iduser_bo}', [MasterMataPelajaranController::class, 'removeTeacher']);
        Route::apiResource('subjects', MasterMataPelajaranController::class);
        
        // Master Guru & Siswa (Admin Scope)
        Route::apiResource('teachers', TeacherController::class);
        Route::post('students/import', [StudentController::class, 'import']);
        Route::apiResource('students', StudentController::class);

        // Live monitor, stats & pre-flight system health check
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('dashboard/live-monitoring', [DashboardController::class, 'liveMonitoring']);
        Route::get('dashboard/pre-flight-check', [DashboardController::class, 'preFlightCheck']);
    });

    // Teacher Bank Soal & TryOut Exam management routes
    Route::middleware(['role:guru|super_admin|admin'])->prefix('teacher')->group(function () {
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('jenjang', [MasterJenjangController::class, 'index']);
        Route::get('subjects', [MasterMataPelajaranController::class, 'index']);
        Route::get('classes', [MasterKelasController::class, 'index']);
        Route::get('students', [StudentController::class, 'index']);

        // Bank Soal & Import Template
        Route::get('questions/template', [TeacherQuestionBankController::class, 'downloadTemplate']);
        Route::post('questions/import', [TeacherQuestionBankController::class, 'import']);
        Route::apiResource('questions', TeacherQuestionBankController::class);

        // TryOut Exams & Packages (Support 50 random question generator & class assignments)
        Route::post('exams/generate-random', [TeacherExamController::class, 'generateRandom50']);
        Route::post('exams/{idassessment}/assign-class', [TeacherExamController::class, 'assignToClass']);
        Route::get('exams/{idassessment}/results', [TeacherExamController::class, 'results']);
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
    });
});
