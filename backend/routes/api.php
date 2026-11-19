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
use App\Http\Controllers\Api\Teacher\TeacherGlobalQuestionBankController;
use App\Http\Controllers\Api\Student\ExamAttemptController;
use App\Http\Controllers\Api\Student\AnswerController;
use App\Http\Controllers\Api\Student\ResultController;
use App\Http\Controllers\Api\Proctoring\ViolationLogController;
use Illuminate\Support\Facades\Route;

// Public Auth & Platform routes
Route::get('/', function () {
    return response()->json([
        'status' => 'online',
        'app' => config('app.name', 'Detik Detik Tryout CBT'),
        'message' => 'Backend API is running successfully',
        'timestamp' => now()->toIso8601String(),
    ]);
});
Route::post('/auth/login', [LoginController::class, 'login'])->middleware('throttle:60,1')->name('login');
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
        Route::get('dashboard/stats', [DashboardController::class, 'stats'])
            ->middleware('permission:dashboard_platform.view');

        // Kelola Instansi Multi-Tenant (CRUD Instansi, Admin, Guru, Siswa, Kelas, Mapel, Master Global Config)
        Route::get('instansi/master-options', [InstansiController::class, 'masterOptions'])
            ->middleware('permission:instansi.view');
        Route::patch('instansi/{idkategori}/status', [InstansiController::class, 'toggleStatus'])
            ->middleware('permission:instansi.edit');
        Route::post('instansi/{idkategori}/toggle-status', [InstansiController::class, 'toggleStatus'])
            ->middleware('permission:instansi.edit');
        Route::get('instansi/{idkategori}/academic-details', [InstansiController::class, 'academicDetails'])
            ->middleware('permission:instansi.view');
        Route::put('instansi/{idkategori}/academic-config', [InstansiController::class, 'updateAcademicConfig'])
            ->middleware('permission:instansi.edit');
        Route::post('instansi/{idkategori}/admins', [InstansiController::class, 'storeAdmin'])
            ->middleware('permission:instansi.create');
        Route::put('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'updateAdmin'])
            ->middleware('permission:instansi.edit');
        Route::delete('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'destroyAdmin'])
            ->middleware('permission:instansi.delete');
        Route::post('instansi/{idkategori}/gurus', [InstansiController::class, 'storeGuru'])
            ->middleware('permission:instansi.create');
        Route::put('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'updateGuru'])
            ->middleware('permission:instansi.edit');
        Route::delete('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'destroyGuru'])
            ->middleware('permission:instansi.delete');
        Route::post('instansi/{idkategori}/siswas', [InstansiController::class, 'storeSiswa'])
            ->middleware('permission:instansi.create');
        Route::put('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'updateSiswa'])
            ->middleware('permission:instansi.edit');
        Route::delete('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'destroySiswa'])
            ->middleware('permission:instansi.delete');
        Route::post('instansi/{idkategori}/kelas', [InstansiController::class, 'storeKelas'])
            ->middleware('permission:instansi.create');
        Route::put('instansi/{idkategori}/kelas/{idkelas}', [InstansiController::class, 'updateKelas'])
            ->middleware('permission:instansi.edit');
        Route::delete('instansi/{idkategori}/kelas/{idkelas}', [InstansiController::class, 'destroyKelas'])
            ->middleware('permission:instansi.delete');
        Route::post('instansi/{idkategori}/mata-pelajaran', [InstansiController::class, 'storeMapel'])
            ->middleware('permission:instansi.create');
        Route::put('instansi/{idkategori}/mata-pelajaran/{idmapel}', [InstansiController::class, 'updateMapel'])
            ->middleware('permission:instansi.edit');
        Route::delete('instansi/{idkategori}/mata-pelajaran/{idmapel}', [InstansiController::class, 'destroyMapel'])
            ->middleware('permission:instansi.delete');

        Route::get('instansi', [InstansiController::class, 'index'])->middleware('permission:instansi.view');
        Route::post('instansi', [InstansiController::class, 'store'])->middleware('permission:instansi.create');
        Route::get('instansi/{instansi}', [InstansiController::class, 'show'])->middleware('permission:instansi.view');
        Route::put('instansi/{instansi}', [InstansiController::class, 'update'])->middleware('permission:instansi.edit');
        Route::patch('instansi/{instansi}', [InstansiController::class, 'update'])->middleware('permission:instansi.edit');
        Route::delete('instansi/{instansi}', [InstansiController::class, 'destroy'])->middleware('permission:instansi.delete');

        // Kelola Pengguna Platform
        Route::get('users/super-admins', [UserManagementController::class, 'superAdmins'])
            ->middleware('permission:user_platform.view');
        Route::post('users/super-admins', [UserManagementController::class, 'storeSuperAdmin'])
            ->middleware('permission:user_platform.create');
        Route::get('users/admin-instansi', [UserManagementController::class, 'adminInstansi'])
            ->middleware('permission:user_platform.view');
        Route::post('users/admin-instansi', [UserManagementController::class, 'storeAdminInstansi'])
            ->middleware('permission:user_platform.create');
        Route::get('users/monitoring-guru-siswa', [UserManagementController::class, 'monitoringGuruSiswa'])
            ->middleware('permission:user_platform.view');
        Route::post('users/{id}/reset-password', [UserManagementController::class, 'resetPassword'])
            ->middleware(['throttle:5,1', 'permission:user_platform.edit']);
        Route::patch('users/{id}/status', [UserManagementController::class, 'toggleStatus'])
            ->middleware('permission:user_platform.edit');
        Route::post('users/{id}/toggle-status', [UserManagementController::class, 'toggleStatus'])
            ->middleware('permission:user_platform.edit');

        Route::get('users', [UserManagementController::class, 'index'])->middleware('permission:user_platform.view');
        Route::post('users', [UserManagementController::class, 'store'])->middleware('permission:user_platform.create');
        Route::get('users/{user}', [UserManagementController::class, 'show'])->middleware('permission:user_platform.view');
        Route::put('users/{user}', [UserManagementController::class, 'update'])->middleware('permission:user_platform.edit');
        Route::patch('users/{user}', [UserManagementController::class, 'update'])->middleware('permission:user_platform.edit');
        Route::delete('users/{user}', [UserManagementController::class, 'destroy'])->middleware('permission:user_platform.delete');

        // Master Tahun Soal untuk Bank Soal Nasional
        Route::get('tahun-soal', [MasterTahunSoalController::class, 'index'])->middleware('permission:master.view');
        Route::post('tahun-soal', [MasterTahunSoalController::class, 'store'])->middleware('permission:master.manage');
        Route::get('tahun-soal/{tahun_soal}', [MasterTahunSoalController::class, 'show'])->middleware('permission:master.view');
        Route::put('tahun-soal/{tahun_soal}', [MasterTahunSoalController::class, 'update'])->middleware('permission:master.manage');
        Route::patch('tahun-soal/{tahun_soal}', [MasterTahunSoalController::class, 'update'])->middleware('permission:master.manage');
        Route::delete('tahun-soal/{tahun_soal}', [MasterTahunSoalController::class, 'destroy'])->middleware('permission:master.manage');

        // Kelola Bank Soal (Cascading Parameter Filter, List Soal, Detail, Edit, Hapus, Aktif/Nonaktif, Template & Import)
        Route::get('question-bank/template', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'downloadTemplate'])
            ->middleware('permission:banksoal.view');
        Route::post('question-bank/preview', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'preview'])
            ->middleware('permission:banksoal.manage');
        Route::post('question-bank/import', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'import'])
            ->middleware('permission:banksoal.manage');
        Route::get('question-bank/cascading-params', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'cascadingParams'])
            ->middleware('permission:banksoal.view');
        Route::patch('question-bank/{id}/status', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'toggleStatus'])
            ->middleware('permission:banksoal.manage');
        Route::post('question-bank/{id}/toggle-status', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'toggleStatus'])
            ->middleware('permission:banksoal.manage');

        Route::get('question-bank', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'index'])->middleware('permission:banksoal.view');
        Route::post('question-bank', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'store'])->middleware('permission:banksoal.manage');
        Route::get('question-bank/{question_bank}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'show'])->middleware('permission:banksoal.view');
        Route::put('question-bank/{question_bank}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'update'])->middleware('permission:banksoal.manage');
        Route::patch('question-bank/{question_bank}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'update'])->middleware('permission:banksoal.manage');
        Route::delete('question-bank/{question_bank}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'destroy'])->middleware('permission:banksoal.manage');

        Route::get('bank-soal', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'index'])->middleware('permission:banksoal.view');
        Route::post('bank-soal', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'store'])->middleware('permission:banksoal.manage');
        Route::get('bank-soal/{bank_soal}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'show'])->middleware('permission:banksoal.view');
        Route::put('bank-soal/{bank_soal}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'update'])->middleware('permission:banksoal.manage');
        Route::patch('bank-soal/{bank_soal}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'update'])->middleware('permission:banksoal.manage');
        Route::delete('bank-soal/{bank_soal}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'destroy'])->middleware('permission:banksoal.manage');

        Route::patch('questions/{id}/status', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'toggleStatus'])
            ->middleware('permission:banksoal.manage');
        Route::get('questions', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'index'])->middleware('permission:banksoal.view');
        Route::post('questions', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'store'])->middleware('permission:banksoal.manage');
        Route::get('questions/{question}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'show'])->middleware('permission:banksoal.view');
        Route::put('questions/{question}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'update'])->middleware('permission:banksoal.manage');
        Route::patch('questions/{question}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'update'])->middleware('permission:banksoal.manage');
        Route::delete('questions/{question}', [\App\Http\Controllers\Api\SuperAdmin\SuperAdminQuestionBankController::class, 'destroy'])->middleware('permission:banksoal.manage');

        // Subscriptions & Akses Instansi
        Route::get('subscriptions', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'index'])
            ->middleware('permission:subscription.view');
        Route::put('subscriptions/{idkategori}', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'updateQuota'])
            ->middleware('permission:subscription.manage');
        Route::post('subscriptions/{idkategori}/toggle', [\App\Http\Controllers\Api\SuperAdmin\PlatformSubscriptionController::class, 'toggleStatus'])
            ->middleware('permission:subscription.manage');

        // Monitoring & Audit Trail Global
        Route::get('monitoring/stats', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'stats'])
            ->middleware('permission:audit.view');
        Route::get('monitoring/audit-logs', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'auditLogs'])
            ->middleware('permission:audit.view');
        Route::get('monitoring/modules', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'modules'])
            ->middleware('permission:audit.view');
        Route::get('audit-logs', [AuditTrailController::class, 'index'])
            ->middleware('permission:audit.view');
        Route::get('audit-logs/export', [AuditTrailController::class, 'export'])
            ->middleware('permission:audit.view');
        Route::get('audit-logs/actions', [AuditTrailController::class, 'actions'])
            ->middleware('permission:audit.view');
        Route::get('audit-logs/summary', [AuditTrailController::class, 'summary'])
            ->middleware('permission:audit.view');
        Route::get('monitoring/activity', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'activity'])
            ->middleware('permission:audit.view');
        Route::get('monitoring/security', [\App\Http\Controllers\Api\SuperAdmin\PlatformMonitoringController::class, 'security'])
            ->middleware('permission:audit.view');

        // Pengaturan Platform (Logo, Maintenance, Favicon, Support)
        Route::get('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'index'])
            ->middleware('permission:platform_setting.view');
        Route::post('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'update'])
            ->middleware('permission:platform_setting.manage');
        Route::put('settings', [\App\Http\Controllers\Api\SuperAdmin\PlatformSettingController::class, 'update'])
            ->middleware('permission:platform_setting.manage');

        // Profil & Keamanan Super Admin
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword'])->middleware('throttle:5,1');

        // =============================================
        // MASTER AKADEMIK GLOBAL (Super Admin CRUD)
        // Super Admin menggunakan idkategori = '27830150842287772'
        // =============================================
        Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate'])
            ->middleware('permission:master.manage');
        Route::get('academic-years', [AcademicYearController::class, 'index'])->middleware('permission:master.view');
        Route::post('academic-years', [AcademicYearController::class, 'store'])->middleware('permission:master.manage');
        Route::get('academic-years/{academic_year}', [AcademicYearController::class, 'show'])->middleware('permission:master.view');
        Route::put('academic-years/{academic_year}', [AcademicYearController::class, 'update'])->middleware('permission:master.manage');
        Route::patch('academic-years/{academic_year}', [AcademicYearController::class, 'update'])->middleware('permission:master.manage');
        Route::delete('academic-years/{academic_year}', [AcademicYearController::class, 'destroy'])->middleware('permission:master.manage');

        Route::post('semesters/{semester}/activate', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'activate'])
            ->middleware('permission:master.manage');
        Route::get('semesters', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'index'])->middleware('permission:master.view');
        Route::post('semesters', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'store'])->middleware('permission:master.manage');
        Route::get('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'show'])->middleware('permission:master.view');
        Route::put('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'update'])->middleware('permission:master.manage');
        Route::patch('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'update'])->middleware('permission:master.manage');
        Route::delete('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'destroy'])->middleware('permission:master.manage');

        Route::get('kurikulum', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'index'])->middleware('permission:master.view');
        Route::post('kurikulum', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'store'])->middleware('permission:master.manage');
        Route::get('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'show'])->middleware('permission:master.view');
        Route::put('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'update'])->middleware('permission:master.manage');
        Route::patch('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'update'])->middleware('permission:master.manage');
        Route::delete('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'destroy'])->middleware('permission:master.manage');

        Route::get('jenjang', [MasterJenjangController::class, 'index'])->middleware('permission:master.view');
        Route::post('jenjang', [MasterJenjangController::class, 'store'])->middleware('permission:master.manage');
        Route::get('jenjang/{jenjang}', [MasterJenjangController::class, 'show'])->middleware('permission:master.view');
        Route::put('jenjang/{jenjang}', [MasterJenjangController::class, 'update'])->middleware('permission:master.manage');
        Route::patch('jenjang/{jenjang}', [MasterJenjangController::class, 'update'])->middleware('permission:master.manage');
        Route::delete('jenjang/{jenjang}', [MasterJenjangController::class, 'destroy'])->middleware('permission:master.manage');

        Route::get('tingkat-kelas', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'index'])->middleware('permission:master.view');
        Route::post('tingkat-kelas', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'store'])->middleware('permission:master.manage');
        Route::get('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'show'])->middleware('permission:master.view');
        Route::put('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'update'])->middleware('permission:master.manage');
        Route::patch('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'update'])->middleware('permission:master.manage');
        Route::delete('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'destroy'])->middleware('permission:master.manage');

        // Announcement Management (Super Admin Global)
        Route::get('announcements/target-options', [\App\Http\Controllers\Api\AnnouncementController::class, 'targetOptions'])
            ->middleware('permission:announcement_global.view');
        Route::post('announcements/{id}/publish', [\App\Http\Controllers\Api\AnnouncementController::class, 'publish'])
            ->middleware('permission:announcement_global.manage');
        Route::post('announcements/{id}/archive', [\App\Http\Controllers\Api\AnnouncementController::class, 'archive'])
            ->middleware('permission:announcement_global.manage');

        Route::get('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'index'])->middleware('permission:announcement_global.view');
        Route::post('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'store'])->middleware('permission:announcement_global.manage');
        Route::get('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'show'])->middleware('permission:announcement_global.view');
        Route::put('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update'])->middleware('permission:announcement_global.manage');
        Route::patch('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update'])->middleware('permission:announcement_global.manage');
        Route::delete('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'destroy'])->middleware('permission:announcement_global.manage');
    });

    // ==========================================
    // 2. ADMIN INSTANSI / SEKOLAH ROUTES
    // ==========================================
    Route::middleware(['role:admin', 'tenant_ownership'])->prefix('admin')->group(function () {
        // Dashboard Sekolah Terisolasi
        Route::get('dashboard/stats', [DashboardController::class, 'stats'])
            ->middleware('permission:dashboard_sekolah.view');
        Route::get('dashboard/reports', [DashboardController::class, 'reports'])
            ->middleware('permission:laporan.view');
        Route::get('dashboard/live-monitoring', [DashboardController::class, 'liveMonitoring'])
            ->middleware('permission:monitoring.view');
        Route::get('dashboard/pre-flight-check', [DashboardController::class, 'preFlightCheck'])
            ->middleware('permission:monitoring.view');

        // Menu Pengguna Instansi (Server-side Paginated 15 per page)
        Route::get('school-users', [InstansiController::class, 'schoolUsers'])
            ->middleware('permission:guru.view');
        Route::post('instansi/{idkategori}/admins', [InstansiController::class, 'storeAdmin'])
            ->middleware('permission:admin_sekolah.manage');
        Route::put('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'updateAdmin'])
            ->middleware('permission:admin_sekolah.manage');
        Route::delete('instansi/{idkategori}/admins/{iduser_bo}', [InstansiController::class, 'destroyAdmin'])
            ->middleware('permission:admin_sekolah.manage');
        Route::post('instansi/{idkategori}/gurus', [InstansiController::class, 'storeGuru'])
            ->middleware('permission:guru.create');
        Route::put('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'updateGuru'])
            ->middleware('permission:guru.edit');
        Route::delete('instansi/{idkategori}/gurus/{iduser_bo}', [InstansiController::class, 'destroyGuru'])
            ->middleware('permission:guru.delete');
        Route::post('instansi/{idkategori}/siswas', [InstansiController::class, 'storeSiswa'])
            ->middleware('permission:siswa.create');
        Route::put('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'updateSiswa'])
            ->middleware('permission:siswa.edit');
        Route::delete('instansi/{idkategori}/siswas/{iduser}', [InstansiController::class, 'destroySiswa'])
            ->middleware('permission:siswa.delete');

        Route::get('instansi', [InstansiController::class, 'index'])->middleware('permission:instansi_sekolah.view');
        Route::get('instansi/{instansi}', [InstansiController::class, 'show'])->middleware('permission:instansi_sekolah.view');
        Route::put('instansi/{instansi}', [InstansiController::class, 'update'])->middleware('permission:instansi_sekolah.manage');
        Route::patch('instansi/{instansi}', [InstansiController::class, 'update'])->middleware('permission:instansi_sekolah.manage');
        Route::delete('instansi/{instansi}', [InstansiController::class, 'destroy'])->middleware('permission:instansi_sekolah.manage');

        // Kelola Guru Sekolah (CRUD, Import, Export, Reset Password, Guru Mapel)
        Route::get('teachers/export', [TeacherController::class, 'export'])
            ->middleware('permission:guru.view');
        Route::get('teachers/template', [TeacherController::class, 'downloadTemplate'])
            ->middleware('permission:guru.view');
        Route::post('teachers/import', [TeacherController::class, 'import'])
            ->middleware(['throttle:5,1', 'permission:guru.import']);
        Route::post('teachers/{iduser_bo}/reset-password', [TeacherController::class, 'resetPassword'])
            ->middleware(['throttle:5,1', 'permission:guru.edit']);
        Route::patch('teachers/{iduser_bo}/toggle-status', [TeacherController::class, 'toggleStatus'])
            ->middleware('permission:guru.edit');

        Route::get('teachers', [TeacherController::class, 'index'])->middleware('permission:guru.view');
        Route::post('teachers', [TeacherController::class, 'store'])->middleware('permission:guru.create');
        Route::get('teachers/{teacher}', [TeacherController::class, 'show'])->middleware('permission:guru.view');
        Route::put('teachers/{teacher}', [TeacherController::class, 'update'])->middleware('permission:guru.edit');
        Route::patch('teachers/{teacher}', [TeacherController::class, 'update'])->middleware('permission:guru.edit');
        Route::delete('teachers/{teacher}', [TeacherController::class, 'destroy'])->middleware('permission:guru.delete');

        // Kelola Siswa Sekolah (CRUD, Import, Export, Reset Password)
        Route::get('students/export', [StudentController::class, 'export'])
            ->middleware('permission:siswa.view');
        Route::get('students/template', [StudentController::class, 'downloadTemplate'])
            ->middleware('permission:siswa.view');
        Route::post('students/import', [StudentController::class, 'import'])
            ->middleware(['throttle:5,1', 'permission:siswa.import']);
        Route::post('students/{iduser}/reset-password', [StudentController::class, 'resetPassword'])
            ->middleware(['throttle:5,1', 'permission:siswa.edit']);
        Route::patch('students/{iduser}/toggle-status', [StudentController::class, 'toggleStatus'])
            ->middleware('permission:siswa.edit');

        Route::get('students', [StudentController::class, 'index'])->middleware('permission:siswa.view');
        Route::post('students', [StudentController::class, 'store'])->middleware('permission:siswa.create');
        Route::get('students/{student}', [StudentController::class, 'show'])->middleware('permission:siswa.view');
        Route::put('students/{student}', [StudentController::class, 'update'])->middleware('permission:siswa.edit');
        Route::patch('students/{student}', [StudentController::class, 'update'])->middleware('permission:siswa.edit');
        Route::delete('students/{student}', [StudentController::class, 'destroy'])->middleware('permission:siswa.delete');

        // Kelola Kelas & Rombel (Wali Kelas, Siswa Kelas, Guru Pengampu)
        Route::get('classes-options', [MasterKelasController::class, 'options'])
            ->middleware('permission:kelas.view');
        Route::get('classes/{masterKela}/academic-context', [MasterKelasController::class, 'academicContext'])
            ->middleware('permission:kelas.view');
        Route::post('classes/{masterKela}/students', [MasterKelasController::class, 'addStudent'])
            ->middleware('permission:kelas.manage');
        Route::delete('classes/{masterKela}/students/{iduser}', [MasterKelasController::class, 'removeStudent'])
            ->middleware('permission:kelas.manage');
        Route::get('classes/{masterKela}/subject-teachers', [MasterKelasController::class, 'getSubjectTeachers'])
            ->middleware('permission:kelas.view');
        Route::post('classes/{masterKela}/subject-teachers', [MasterKelasController::class, 'assignSubjectTeacher'])
            ->middleware('permission:guru_pengampu.manage');
        Route::put('classes/{masterKela}/subject-teachers/{guruMapelId}', [MasterKelasController::class, 'updateSubjectTeacher'])
            ->middleware('permission:guru_pengampu.manage');
        Route::delete('classes/{masterKela}/subject-teachers/{guruMapelId}', [MasterKelasController::class, 'removeSubjectTeacher'])
            ->middleware('permission:guru_pengampu.manage');
        Route::patch('classes/{id}/toggle-status', [MasterKelasController::class, 'toggleStatus'])
            ->middleware('permission:kelas.manage');

        Route::get('classes', [MasterKelasController::class, 'index'])->middleware('permission:kelas.view');
        Route::post('classes', [MasterKelasController::class, 'store'])->middleware('permission:kelas.manage');
        Route::get('classes/{masterKela}', [MasterKelasController::class, 'show'])->middleware('permission:kelas.view');
        Route::put('classes/{masterKela}', [MasterKelasController::class, 'update'])->middleware('permission:kelas.manage');
        Route::patch('classes/{masterKela}', [MasterKelasController::class, 'update'])->middleware('permission:kelas.manage');
        Route::delete('classes/{masterKela}', [MasterKelasController::class, 'destroy'])->middleware('permission:kelas.manage');

        // Akademik Sekolah (Tahun Ajaran, Mapel & KKM, Jenjang, Jurusan, Semester, Kurikulum, Tingkat Kelas)
        Route::post('academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate'])
            ->middleware('permission:akademik_sekolah.manage');
        Route::get('academic-years/{academicYear}/subjects', [AcademicYearController::class, 'subjects'])
            ->middleware('permission:akademik_sekolah.view');
        Route::post('academic-years/{academicYear}/subjects', [AcademicYearController::class, 'attachSubject'])
            ->middleware('permission:akademik_sekolah.manage');
        Route::delete('academic-years/{academicYear}/subjects/{idmapel}', [AcademicYearController::class, 'detachSubject'])
            ->middleware('permission:akademik_sekolah.manage');
        Route::get('academic-years/{academicYear}/students', [AcademicYearController::class, 'students'])
            ->middleware('permission:akademik_sekolah.view');
        Route::post('academic-years/{academicYear}/students', [AcademicYearController::class, 'enrollStudents'])
            ->middleware('permission:akademik_sekolah.manage');
        Route::delete('academic-years/{academicYear}/students/{iduser}', [AcademicYearController::class, 'removeStudent'])
            ->middleware('permission:akademik_sekolah.manage');

        Route::get('academic-years', [AcademicYearController::class, 'index'])->middleware('permission:akademik_sekolah.view');
        Route::post('academic-years', [AcademicYearController::class, 'store'])->middleware('permission:akademik_sekolah.manage');
        Route::get('academic-years/{academic_year}', [AcademicYearController::class, 'show'])->middleware('permission:akademik_sekolah.view');
        Route::put('academic-years/{academic_year}', [AcademicYearController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::patch('academic-years/{academic_year}', [AcademicYearController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::delete('academic-years/{academic_year}', [AcademicYearController::class, 'destroy'])->middleware('permission:akademik_sekolah.manage');

        Route::post('semesters/{semester}/activate', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'activate'])
            ->middleware('permission:akademik_sekolah.manage');
        Route::get('semesters', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'index'])->middleware('permission:akademik_sekolah.view');
        Route::post('semesters', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'store'])->middleware('permission:akademik_sekolah.manage');
        Route::get('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'show'])->middleware('permission:akademik_sekolah.view');
        Route::put('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::patch('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::delete('semesters/{semester}', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'destroy'])->middleware('permission:akademik_sekolah.manage');

        Route::get('kurikulum', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'index'])->middleware('permission:akademik_sekolah.view');
        Route::post('kurikulum', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'store'])->middleware('permission:akademik_sekolah.manage');
        Route::get('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'show'])->middleware('permission:akademik_sekolah.view');
        Route::put('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::patch('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::delete('kurikulum/{kurikulum}', [\App\Http\Controllers\Api\Admin\MasterKurikulumController::class, 'destroy'])->middleware('permission:akademik_sekolah.manage');

        Route::get('tingkat-kelas', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'index'])->middleware('permission:akademik_sekolah.view');
        Route::post('tingkat-kelas', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'store'])->middleware('permission:akademik_sekolah.manage');
        Route::get('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'show'])->middleware('permission:akademik_sekolah.view');
        Route::put('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::patch('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::delete('tingkat-kelas/{tingkat_kela}', [\App\Http\Controllers\Api\Admin\MasterTingkatKelasController::class, 'destroy'])->middleware('permission:akademik_sekolah.manage');

        Route::get('subjects-options', [MasterMataPelajaranController::class, 'options'])
            ->middleware('permission:mapel.view');
        Route::patch('subjects/{masterMataPelajaran}/toggle-status', [MasterMataPelajaranController::class, 'toggleStatus'])
            ->middleware('permission:mapel.manage');
        Route::post('subjects/{masterMataPelajaran}/teachers', [MasterMataPelajaranController::class, 'assignTeacher'])
            ->middleware('permission:guru_pengampu.manage');
        Route::delete('subjects/{masterMataPelajaran}/teachers/{iduser_bo}', [MasterMataPelajaranController::class, 'removeTeacher'])
            ->middleware('permission:guru_pengampu.manage');

        Route::get('subjects', [MasterMataPelajaranController::class, 'index'])->middleware('permission:mapel.view');
        Route::post('subjects', [MasterMataPelajaranController::class, 'store'])->middleware('permission:mapel.manage');
        Route::get('subjects/{subject}', [MasterMataPelajaranController::class, 'show'])->middleware('permission:mapel.view');
        Route::put('subjects/{subject}', [MasterMataPelajaranController::class, 'update'])->middleware('permission:mapel.manage');
        Route::patch('subjects/{subject}', [MasterMataPelajaranController::class, 'update'])->middleware('permission:mapel.manage');
        Route::delete('subjects/{subject}', [MasterMataPelajaranController::class, 'destroy'])->middleware('permission:mapel.manage');

        Route::get('jenjang', [MasterJenjangController::class, 'index'])->middleware('permission:akademik_sekolah.view');
        Route::post('jenjang', [MasterJenjangController::class, 'store'])->middleware('permission:akademik_sekolah.manage');
        Route::get('jenjang/{jenjang}', [MasterJenjangController::class, 'show'])->middleware('permission:akademik_sekolah.view');
        Route::put('jenjang/{jenjang}', [MasterJenjangController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::patch('jenjang/{jenjang}', [MasterJenjangController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::delete('jenjang/{jenjang}', [MasterJenjangController::class, 'destroy'])->middleware('permission:akademik_sekolah.manage');

        Route::get('majors', [\App\Http\Controllers\Api\Admin\MajorController::class, 'index'])->middleware('permission:akademik_sekolah.view');
        Route::post('majors', [\App\Http\Controllers\Api\Admin\MajorController::class, 'store'])->middleware('permission:akademik_sekolah.manage');
        Route::get('majors/{major}', [\App\Http\Controllers\Api\Admin\MajorController::class, 'show'])->middleware('permission:akademik_sekolah.view');
        Route::put('majors/{major}', [\App\Http\Controllers\Api\Admin\MajorController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::patch('majors/{major}', [\App\Http\Controllers\Api\Admin\MajorController::class, 'update'])->middleware('permission:akademik_sekolah.manage');
        Route::delete('majors/{major}', [\App\Http\Controllers\Api\Admin\MajorController::class, 'destroy'])->middleware('permission:akademik_sekolah.manage');

        // Test Tasks & Internal Tool (Strictly Super Admin only)
        Route::apiResource('test-tasks', TestTaskController::class)->middleware('role:super_admin');

        // Audit Trail & Aktivitas Guru / Siswa
        Route::get('audit-logs', [AuditTrailController::class, 'index'])
            ->middleware('permission:aktivitas.view');
        Route::get('audit-logs/export', [AuditTrailController::class, 'export'])
            ->middleware('permission:aktivitas.view');
        Route::get('teacher-student-activities', [AuditTrailController::class, 'teacherStudentActivities'])
            ->middleware('permission:aktivitas.view');
        Route::get('teacher-student-activities/export', [AuditTrailController::class, 'exportTeacherStudentActivities'])
            ->middleware('permission:aktivitas.view');

        // Jadwal Ujian untuk Admin Instansi
        Route::get('exams', [TeacherExamController::class, 'index'])
            ->middleware('permission:jadwal.view');
        Route::get('exams/{idassessment}', [TeacherExamController::class, 'show'])
            ->middleware('permission:jadwal.view');
        Route::post('exams', [TeacherExamController::class, 'store'])
            ->middleware('permission:jadwal.manage');
        Route::put('exams/{idassessment}', [TeacherExamController::class, 'update'])
            ->middleware('permission:jadwal.manage');
        Route::delete('exams/{idassessment}', [TeacherExamController::class, 'destroy'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/toggle-status', [TeacherExamController::class, 'toggleStatus'])
            ->middleware('permission:jadwal.manage');
        Route::patch('exams/{idassessment}/toggle-status', [TeacherExamController::class, 'toggleStatus'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/publish', [TeacherExamController::class, 'publish'])
            ->middleware('permission:jadwal.manage');
        Route::get('exams/{idassessment}/questions', [TeacherExamController::class, 'getQuestions'])
            ->middleware('permission:jadwal.view');
        Route::post('exams/{idassessment}/questions/add-global', [TeacherExamController::class, 'addQuestionFromGlobal'])
            ->middleware('permission:jadwal.manage');
        Route::put('exams/{idassessment}/questions/{idsoal}/replace', [TeacherExamController::class, 'replaceQuestion'])
            ->middleware('permission:jadwal.manage');
        Route::delete('exams/{idassessment}/questions/{idsoal}', [TeacherExamController::class, 'removeQuestion'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/questions/reorder', [TeacherExamController::class, 'reorderQuestions'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/questions/{idsoal}/annul', [TeacherExamController::class, 'annulQuestion'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/assign-class', [TeacherExamController::class, 'assignToClass'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/generate-random', [TeacherExamController::class, 'generateRandom50'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);
        Route::post('exams/generate-from-global', [TeacherExamController::class, 'generateRandom50'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);
        Route::post('exams/copy-from-global-package', [TeacherExamController::class, 'copyFromGlobalPackage'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);
        Route::post('exams/copy-from-teacher-package', [TeacherExamController::class, 'copyFromTeacherPackage'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);

        Route::get('exam-groups', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'index'])->middleware('permission:jadwal.view');
        Route::post('exam-groups', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'store'])->middleware('permission:jadwal.manage');
        Route::get('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'show'])->middleware('permission:jadwal.view');
        Route::put('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'update'])->middleware('permission:jadwal.manage');
        Route::patch('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'update'])->middleware('permission:jadwal.manage');
        Route::delete('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'destroy'])->middleware('permission:jadwal.manage');

        // Profil & Keamanan Admin Sekolah
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword'])->middleware('throttle:5,1');

        // Announcement Management (Admin Instansi)
        Route::get('announcements/target-options', [\App\Http\Controllers\Api\AnnouncementController::class, 'targetOptions'])
            ->middleware('permission:announcement.view');
        Route::post('announcements/{id}/publish', [\App\Http\Controllers\Api\AnnouncementController::class, 'publish'])
            ->middleware('permission:announcement.manage');
        Route::post('announcements/{id}/archive', [\App\Http\Controllers\Api\AnnouncementController::class, 'archive'])
            ->middleware('permission:announcement.manage');

        Route::get('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'index'])->middleware('permission:announcement.view');
        Route::post('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'store'])->middleware('permission:announcement.manage');
        Route::get('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'show'])->middleware('permission:announcement.view');
        Route::put('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update'])->middleware('permission:announcement.manage');
        Route::patch('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update'])->middleware('permission:announcement.manage');
        Route::delete('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'destroy'])->middleware('permission:announcement.manage');
    });

    // Read-only Master Tahun Soal: Bisa diakses oleh Admin Instansi & Guru untuk dropdown bank soal & jadwal ujian
    Route::middleware(['role:admin|guru|super_admin', 'tenant_ownership'])->prefix('admin')->group(function () {
        Route::get('tahun-soal', [MasterTahunSoalController::class, 'index'])
            ->middleware('permission:akademik_sekolah.view|soal.view|jadwal.view');
        Route::get('tahun-soal/{tahun_soal}', [MasterTahunSoalController::class, 'show'])
            ->middleware('permission:akademik_sekolah.view|soal.view|jadwal.view');
    });

    // ==========================================
    // 3. TEACHER ROUTES
    // ==========================================
    Route::middleware(['role:guru|super_admin|admin|admin_instansi'])->prefix('teacher')->group(function () {
        // Teacher Dashboard & Academic Context (Protected by role, read-only context)
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('dashboard/teaching-classes', [DashboardController::class, 'teacherTeachingClasses']);
        Route::get('jenjang', [MasterJenjangController::class, 'index']);
        Route::get('subjects', [MasterMataPelajaranController::class, 'index']);
        Route::get('classes', [MasterKelasController::class, 'index']);
        Route::get('classes/{masterKela}/academic-context', [MasterKelasController::class, 'academicContext']);
        Route::get('students', [StudentController::class, 'index']);
        Route::get('academic-years', [AcademicYearController::class, 'index']);
        Route::get('semesters', [\App\Http\Controllers\Api\Admin\MasterSemesterController::class, 'index']);
        Route::get('tahun-soal', [MasterTahunSoalController::class, 'index'])
            ->middleware('permission:soal.view|jadwal.view');

        // Profil & Keamanan (Guru)
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::post('profile/change-password', [ProfileController::class, 'changePassword'])->middleware('throttle:5,1');

        // Katalog Bank Soal Global (Read-Only Katalog untuk Guru, Mutasi hanya Super Admin)
        Route::get('global-question-bank/cascading-params', [TeacherGlobalQuestionBankController::class, 'cascadingParams'])
            ->middleware('permission:banksoal_global.view');
        Route::get('global-question-bank', [TeacherGlobalQuestionBankController::class, 'index'])
            ->middleware('permission:banksoal_global.view');
        Route::get('global-question-bank/{id}', [TeacherGlobalQuestionBankController::class, 'show'])
            ->middleware('permission:banksoal_global.view');
        Route::post('global-question-bank', [TeacherGlobalQuestionBankController::class, 'store'])
            ->middleware('permission:banksoal_global.manage');
        Route::put('global-question-bank/{id}', [TeacherGlobalQuestionBankController::class, 'update'])
            ->middleware('permission:banksoal_global.manage');
        Route::delete('global-question-bank/{id}', [TeacherGlobalQuestionBankController::class, 'destroy'])
            ->middleware('permission:banksoal_global.manage');

        // Bank Soal Packages (Katalog Global Read-Only)
        Route::get('packages', [TeacherGlobalQuestionBankController::class, 'index'])
            ->middleware('permission:banksoal_global.view');
        Route::get('packages/{id}', [TeacherGlobalQuestionBankController::class, 'show'])
            ->middleware('permission:banksoal_global.view');

        // Bank Soal Guru & Import Template
        Route::get('questions/template', [TeacherQuestionBankController::class, 'downloadTemplate'])
            ->middleware('permission:soal.view');
        Route::post('questions/import', [TeacherQuestionBankController::class, 'import'])
            ->middleware(['throttle:5,1', 'permission:soal.manage']);
        Route::patch('questions/{id}/status', [TeacherQuestionBankController::class, 'toggleStatus'])
            ->middleware('permission:soal.manage');

        Route::get('questions', [TeacherQuestionBankController::class, 'index'])->middleware('permission:soal.view');
        Route::post('questions', [TeacherQuestionBankController::class, 'store'])->middleware('permission:soal.manage');
        Route::get('questions/{question}', [TeacherQuestionBankController::class, 'show'])->middleware('permission:soal.view');
        Route::put('questions/{question}', [TeacherQuestionBankController::class, 'update'])->middleware('permission:soal.manage');
        Route::patch('questions/{question}', [TeacherQuestionBankController::class, 'update'])->middleware('permission:soal.manage');
        Route::delete('questions/{question}', [TeacherQuestionBankController::class, 'destroy'])->middleware('permission:soal.manage');

        // TryOut Exams & Packages (Jadwal Ujian)
        Route::post('exams/generate-random', [TeacherExamController::class, 'generateRandom50'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);
        Route::post('exams/generate-from-global', [TeacherExamController::class, 'generateRandom50'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);
        Route::post('exams/copy-from-global-package', [TeacherExamController::class, 'copyFromGlobalPackage'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);
        Route::post('exams/copy-from-teacher-package', [TeacherExamController::class, 'copyFromTeacherPackage'])
            ->middleware(['throttle:10,1', 'permission:jadwal.manage']);
        Route::post('exams/{idassessment}/publish', [TeacherExamController::class, 'publish'])
            ->middleware('permission:jadwal.manage');
        Route::get('exams/{idassessment}/questions', [TeacherExamController::class, 'getQuestions'])
            ->middleware('permission:jadwal.view');
        Route::post('exams/{idassessment}/questions/add-global', [TeacherExamController::class, 'addQuestionFromGlobal'])
            ->middleware('permission:jadwal.manage');
        Route::put('exams/{idassessment}/questions/{idsoal}/replace', [TeacherExamController::class, 'replaceQuestion'])
            ->middleware('permission:jadwal.manage');
        Route::delete('exams/{idassessment}/questions/{idsoal}', [TeacherExamController::class, 'removeQuestion'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/questions/reorder', [TeacherExamController::class, 'reorderQuestions'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/questions/{idsoal}/annul', [TeacherExamController::class, 'annulQuestion'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/assign-class', [TeacherExamController::class, 'assignToClass'])
            ->middleware('permission:jadwal.manage');
        Route::post('exams/{idassessment}/toggle-status', [TeacherExamController::class, 'toggleStatus'])
            ->middleware('permission:jadwal.manage');
        Route::patch('exams/{idassessment}/toggle-status', [TeacherExamController::class, 'toggleStatus'])
            ->middleware('permission:jadwal.manage');

        // Laporan & Rekap Nilai Ujian Guru
        Route::get('exams/{idassessment}/results', [TeacherExamController::class, 'results'])
            ->middleware('permission:laporan.view');
        Route::get('exams/{idassessment}/attempts', [TeacherExamController::class, 'attempts'])
            ->middleware('permission:laporan.view');
        Route::get('exams/{idassessment}/report', [TeacherExamController::class, 'report'])
            ->middleware('permission:laporan.export');
        Route::get('exams/{idassessment}/report/export', [TeacherExamController::class, 'exportReport'])
            ->middleware(['throttle:20,1', 'permission:laporan.export']);
        Route::get('exams/{idassessment}/attempts/{attemptId}', [TeacherExamController::class, 'attemptDetail'])
            ->middleware('permission:laporan.view');
        Route::get('attempts/{attemptId}', [TeacherExamController::class, 'singleAttemptDetail'])
            ->middleware('permission:laporan.view');
        Route::post('answers/{ansId}/grade', [TeacherExamController::class, 'gradeAnswer'])
            ->middleware('permission:laporan.view');

        Route::get('exam-groups', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'index'])->middleware('permission:jadwal.view');
        Route::post('exam-groups', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'store'])->middleware('permission:jadwal.manage');
        Route::get('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'show'])->middleware('permission:jadwal.view');
        Route::put('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'update'])->middleware('permission:jadwal.manage');
        Route::patch('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'update'])->middleware('permission:jadwal.manage');
        Route::delete('exam-groups/{exam_group}', [\App\Http\Controllers\Api\Teacher\ExamGroupController::class, 'destroy'])->middleware('permission:jadwal.manage');

        Route::get('exams', [TeacherExamController::class, 'index'])->middleware('permission:jadwal.view');
        Route::post('exams', [TeacherExamController::class, 'store'])->middleware('permission:jadwal.manage');
        Route::get('exams/{exam}', [TeacherExamController::class, 'show'])->middleware('permission:jadwal.view');
        Route::put('exams/{exam}', [TeacherExamController::class, 'update'])->middleware('permission:jadwal.manage');
        Route::patch('exams/{exam}', [TeacherExamController::class, 'update'])->middleware('permission:jadwal.manage');
        Route::delete('exams/{exam}', [TeacherExamController::class, 'destroy'])->middleware('permission:jadwal.manage');

        // Teacher Announcements Management
        Route::get('announcements/target-options', [\App\Http\Controllers\Api\AnnouncementController::class, 'targetOptions'])
            ->middleware('permission:announcement.view');
        Route::post('announcements/{id}/publish', [\App\Http\Controllers\Api\AnnouncementController::class, 'publish'])
            ->middleware('permission:announcement.manage');
        Route::post('announcements/{id}/archive', [\App\Http\Controllers\Api\AnnouncementController::class, 'archive'])
            ->middleware('permission:announcement.manage');

        Route::get('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'index'])->middleware('permission:announcement.view');
        Route::post('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'store'])->middleware('permission:announcement.manage');
        Route::get('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'show'])->middleware('permission:announcement.view');
        Route::put('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update'])->middleware('permission:announcement.manage');
        Route::patch('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'update'])->middleware('permission:announcement.manage');
        Route::delete('announcements/{announcement}', [\App\Http\Controllers\Api\AnnouncementController::class, 'destroy'])->middleware('permission:announcement.manage');
    });

    // ==========================================
    // 4. STUDENT EXAM ROUTES
    // ==========================================
    Route::middleware(['role:siswa'])->prefix('student')->group(function () {
        Route::get('announcements', [\App\Http\Controllers\Api\AnnouncementController::class, 'studentIndex'])
            ->middleware('permission:announcement.view');
        Route::get('exams', [ExamAttemptController::class, 'availableExams'])
            ->middleware('permission:ujian.ikut');
        Route::post('attempts/start', [ExamAttemptController::class, 'start'])
            ->middleware(['throttle:30,1', 'permission:ujian.ikut']);
        Route::get('attempts/{attempt}', [ExamAttemptController::class, 'showAttempt'])
            ->middleware('permission:ujian.ikut');
        Route::get('attempts/{attempt}/questions', [ExamAttemptController::class, 'showAttempt'])
            ->middleware('permission:ujian.ikut');
        Route::patch('attempts/{attempt}/answers', [AnswerController::class, 'saveAnswer'])
            ->middleware(['throttle:180,1', 'permission:ujian.ikut']);
        Route::post('attempts/{attempt}/submit', [ExamAttemptController::class, 'submit'])
            ->middleware(['throttle:20,1', 'permission:ujian.ikut']);
        Route::post('attempts/{attempt}/disqualify', [ViolationLogController::class, 'disqualify'])
            ->middleware('permission:ujian.ikut');
        Route::post('attempts/{attempt}/violations', [ViolationLogController::class, 'logViolation'])
            ->middleware(['throttle:60,1', 'permission:ujian.ikut']);
        Route::post('attempts/violations', [ViolationLogController::class, 'logViolation'])
            ->middleware(['throttle:60,1', 'permission:ujian.ikut']);
        Route::get('results/{attempt}', [ResultController::class, 'showResult'])
            ->middleware('permission:nilai.view');
        Route::post('change-password', [ProfileController::class, 'changePassword'])
            ->middleware('throttle:5,1');
    });

    // ==========================================
    // 5. DYNAMIC RBAC MANAGEMENT ROUTES
    // ==========================================
    Route::middleware(['throttle:60,1'])->group(function () {
        // Permissions
        Route::get('permissions', [\App\Http\Controllers\Api\Rbac\PermissionController::class, 'index'])
            ->middleware('permission:role_platform.view|role_instansi.view');

        // Roles
        Route::get('roles', [\App\Http\Controllers\Api\Rbac\RoleController::class, 'index'])
            ->middleware('permission:role_platform.view|role_instansi.view');
        Route::get('roles/{id}', [\App\Http\Controllers\Api\Rbac\RoleController::class, 'show'])
            ->middleware('permission:role_platform.view|role_instansi.view');
        Route::post('roles', [\App\Http\Controllers\Api\Rbac\RoleController::class, 'store'])
            ->middleware('permission:role_platform.manage|role_instansi.manage');
        Route::put('roles/{id}', [\App\Http\Controllers\Api\Rbac\RoleController::class, 'update'])
            ->middleware('permission:role_platform.manage|role_instansi.manage');
        Route::delete('roles/{id}', [\App\Http\Controllers\Api\Rbac\RoleController::class, 'destroy'])
            ->middleware('permission:role_platform.manage|role_instansi.manage');
        Route::put('roles/{id}/permissions', [\App\Http\Controllers\Api\Rbac\RoleController::class, 'syncPermissions'])
            ->middleware('permission:role_platform.manage|role_instansi.manage');

        // User Roles Assignment
        Route::put('users/{id}/roles', [\App\Http\Controllers\Api\Rbac\UserRoleController::class, 'assignRoles'])
            ->middleware('permission:role_platform.manage|role_instansi.manage');

        // Dynamic Navigation Menus
        Route::get('menus', [\App\Http\Controllers\Api\Rbac\MenuController::class, 'index']);
    });
});
