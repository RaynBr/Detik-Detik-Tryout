<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\AuditLog;
use App\Models\MasterKelas;
use App\Models\MasterTahunSoal;
use App\Models\Menu;
use App\Models\Permission;
use App\Models\Role;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Services\RbacAssignmentService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

class DynamicRbacTest extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // 1. Force SQLite in-memory database to ensure sertidemi is NEVER touched
        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.foreign_key_constraints' => false,
            'rbac.enforce' => false,
            'rbac.tenant_enforce' => false,
            'rbac.log_denied' => true,
            'rbac.auto_assign_on_create' => true,
        ]);
        RbacAssignmentService::enableAutoAssign();
        DB::purge('mysql');
        DB::purge('sqlite');

        // 2. Build minimal schemas in SQLite memory
        $this->createTestSchemas();

        // 3. Register custom test routes with middlewares
        $this->registerTestRoutes();
    }

    protected function tearDown(): void
    {
        RbacAssignmentService::enableAutoAssign();
        DB::purge('sqlite');
        parent::tearDown();
    }

    protected function createTestSchemas(): void
    {
        Schema::create('kategori_user_bo', function (Blueprint $table) {
            $table->string('idkategori', 25)->primary();
            $table->string('nama_kategori');
            $table->timestamps();
        });

        Schema::create('user_bo', function (Blueprint $table) {
            $table->string('iduser_bo', 36)->primary();
            $table->string('idkategori', 25)->nullable();
            $table->string('nama')->nullable();
            $table->string('email')->nullable();
            $table->string('username')->nullable();
            $table->string('password')->nullable();
            $table->string('login_email')->nullable();
            $table->string('login_username')->nullable();
            $table->string('login_password')->nullable();
            $table->string('telp')->nullable();
            $table->text('alamat')->nullable();
            $table->string('nip')->nullable();
            $table->string('nuptk')->nullable();
            $table->string('jenis_kelamin')->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('id_tahun_ajaran')->nullable();
            $table->boolean('force_change_password')->default(false);
            $table->string('status_aktif')->default('Y');
            $table->string('status_remove')->default('N');
            $table->string('status_admin')->default('0');
            $table->string('role_type')->nullable();
            $table->timestamp('tanggal_input')->nullable();
            $table->timestamp('tanggal_update')->nullable();
            $table->timestamps();
        });

        Schema::create('user', function (Blueprint $table) {
            $table->string('iduser', 36)->primary();
            $table->string('idkategori', 25)->nullable();
            $table->unsignedBigInteger('idkelas')->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('id_tahun_ajaran')->nullable();
            $table->string('nama')->nullable();
            $table->string('username')->nullable();
            $table->string('password')->nullable();
            $table->string('nis')->nullable();
            $table->string('nisn')->nullable();
            $table->string('jenis_kelamin')->nullable();
            $table->integer('nomor_absen')->nullable();
            $table->string('tempat_lahir')->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->string('agama')->nullable();
            $table->string('login_email')->nullable();
            $table->string('login_password')->nullable();
            $table->boolean('force_change_password')->default(false);
            $table->string('telp')->nullable();
            $table->text('alamat')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->string('url_image')->nullable();
            $table->timestamp('tanggal_input')->nullable();
            $table->timestamps();
        });

        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('master_kelas', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('nama_kelas')->nullable();
            $table->timestamps();
        });

        Schema::create('master_tahun_soal', function (Blueprint $table) {
            $table->id();
            $table->string('tahun');
            $table->string('keterangan')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('assessment', function (Blueprint $table) {
            $table->string('idassessment', 36)->primary();
            $table->string('idkategori', 25)->nullable();
            $table->string('nama_assessment')->nullable();
            $table->string('idassessment_kategori')->nullable();
            $table->string('url_image_panjang')->nullable();
            $table->string('url_image_kotak')->nullable();
            $table->string('url_sertifikat_depan_template')->nullable();
            $table->string('url_sertifikat_belakang_template')->nullable();
            $table->string('idsertifikat_kategori')->nullable();
            $table->string('url_logo_sponsor')->nullable();
            $table->integer('harga_assessment')->default(0);
            $table->integer('diskon_assessment')->default(0);
            $table->integer('status_diskon')->default(0);
            $table->integer('tampil_assessment_pilgan')->default(50);
            $table->integer('tampil_assessment_essay')->default(0);
            $table->integer('point_assessment')->default(0);
            $table->string('point_assessment_nama')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->string('status_paket')->default('draft');
            $table->integer('is_locked')->default(0);
            $table->date('tanggal_mulai_assessment')->nullable();
            $table->date('tanggal_batas_assessment')->nullable();
            $table->integer('waktu_pengerjaan')->default(90);
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content');
            $table->string('category')->default('Umum');
            $table->string('priority')->default('Normal');
            $table->string('status')->default('Aktif');
            $table->string('badge_text')->nullable();
            $table->string('target_role')->default('all');
            $table->string('target_type')->default('all');
            $table->string('target_id')->nullable();
            $table->string('idkategori', 25)->nullable();
            $table->string('id_guru', 50)->nullable();
            $table->string('created_by_user_id', 50)->nullable();
            $table->string('role', 50)->default('admin');
            $table->string('attachment_url')->nullable();
            $table->string('attachment_name')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('publish_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action');
            $table->string('module');
            $table->string('target_id')->nullable();
            $table->string('description')->nullable();
            $table->text('details')->nullable();
            $table->string('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->string('user_role')->nullable();
            $table->string('target_type')->nullable();
            $table->string('target_label')->nullable();
            $table->text('metadata')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('instansi_name')->nullable();
            $table->timestamps();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('tokenable_type');
            $table->string('tokenable_id');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('label');
            $table->string('instansi_id', 25)->nullable();
            $table->string('scope_key')->default('GLOBAL');
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->string('module');
            $table->enum('scope', ['platform', 'instansi']);
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('permission_id');
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->string('user_type');
            $table->string('user_id');
            $table->unsignedBigInteger('role_id');
            $table->timestamps();
            $table->primary(['user_type', 'user_id', 'role_id']);
        });

        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('label');
            $table->string('icon')->nullable();
            $table->string('path')->nullable();
            $table->string('permission_key')->nullable();
            $table->enum('scope', ['platform', 'instansi']);
            $table->integer('sort_order')->default(0);
            $table->string('attachment_url')->nullable();
            $table->string('attachment_name')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    protected function registerTestRoutes(): void
    {
        // Teacher workflow routes
        Route::middleware(['auth:sanctum', 'permission:soal.view'])->get('/test/teacher/questions', function () {
            return response()->json(['status' => 'success', 'data' => 'questions_list']);
        });
        Route::middleware(['auth:sanctum', 'permission:jadwal.manage'])->post('/test/teacher/exams', function () {
            return response()->json(['status' => 'success', 'data' => 'exam_created']);
        });
        Route::middleware(['auth:sanctum', 'permission:laporan.view'])->get('/test/teacher/reports', function () {
            return response()->json(['status' => 'success', 'data' => 'reports_viewed']);
        });
        Route::middleware(['auth:sanctum', 'permission:banksoal_global.manage'])->post('/test/teacher/banksoal-global-manage', function () {
            return response()->json(['status' => 'success', 'data' => 'global_bank_managed']);
        });

        // Student workflow routes
        Route::middleware(['auth:sanctum', 'permission:ujian.ikut'])->get('/test/student/exams', function () {
            return response()->json(['status' => 'success', 'data' => 'available_exams']);
        });
        Route::middleware(['auth:sanctum', 'permission:ujian.ikut'])->post('/test/student/attempts/start', function () {
            return response()->json(['status' => 'success', 'data' => 'attempt_started']);
        });
        Route::middleware(['auth:sanctum', 'permission:ujian.ikut'])->patch('/test/student/attempts/answer', function () {
            return response()->json(['status' => 'success', 'data' => 'answer_saved']);
        });
        Route::middleware(['auth:sanctum', 'permission:ujian.ikut'])->post('/test/student/attempts/submit', function () {
            return response()->json(['status' => 'success', 'data' => 'attempt_submitted']);
        });
        Route::middleware(['auth:sanctum', 'permission:nilai.view'])->get('/test/student/results', function () {
            return response()->json(['status' => 'success', 'data' => 'result_viewed']);
        });
        Route::middleware(['auth:sanctum', 'permission:announcement.view'])->get('/test/student/announcements', function () {
            return response()->json(['status' => 'success', 'data' => 'announcements_read']);
        });

        // Tenant ownership routes
        Route::middleware(['auth:sanctum', 'tenant_ownership'])->get('/test/instansi/{idkategori}/data', function () {
            return response()->json(['status' => 'success', 'data' => 'tenant_ok']);
        });
        Route::middleware(['auth:sanctum', 'tenant_ownership'])->get('/test/admin/staff/{iduser_bo}', function () {
            return response()->json(['status' => 'success', 'data' => 'staff_ok']);
        });
    }

    // ==========================================
    // 1. RBAC SHADOW VS STRICT ENFORCEMENT
    // ==========================================

    public function test_shadow_mode_allows_access_and_logs_warning_when_enforce_is_false(): void
    {
        config(['rbac.enforce' => false]);

        $teacher = UserBo::create([
            'iduser_bo' => 'teacher-1',
            'idkategori' => 'instansi-a',
            'nama' => 'Pak Guru Budi',
        ]);

        Sanctum::actingAs($teacher);

        // Teacher does NOT have banksoal_global.manage, but in shadow mode it passes (200 OK)
        $response = $this->postJson('/test/teacher/banksoal-global-manage');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'success']);
    }

    public function test_enforced_mode_blocks_unauthorized_user_with_403_forbidden(): void
    {
        config(['rbac.enforce' => true]);

        $teacher = UserBo::create([
            'iduser_bo' => 'teacher-2',
            'idkategori' => 'instansi-a',
            'nama' => 'Pak Guru Budi',
        ]);

        Sanctum::actingAs($teacher);

        // Teacher does NOT have banksoal_global.manage and enforce=true -> returns 403 Forbidden
        $response = $this->postJson('/test/teacher/banksoal-global-manage');
        $response->assertStatus(403);
        $response->assertJson(['code' => 'FORBIDDEN']);
    }

    public function test_authorized_user_with_permission_can_access_route(): void
    {
        config(['rbac.enforce' => true]);

        $perm = Permission::create([
            'key' => 'soal.view',
            'label' => 'Lihat Bank Soal Guru',
            'module' => 'Bank Soal Guru',
            'scope' => 'instansi',
        ]);

        $role = Role::create([
            'name' => 'guru',
            'label' => 'Guru Pengajar',
            'is_system' => true,
        ]);
        $role->permissions()->attach($perm->id);

        $teacher = UserBo::create([
            'iduser_bo' => 'teacher-ok',
            'idkategori' => 'instansi-a',
            'nama' => 'Pak Guru Budi',
        ]);
        $teacher->assignRole('guru');

        Sanctum::actingAs($teacher);

        $response = $this->getJson('/test/teacher/questions');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'success', 'data' => 'questions_list']);
    }

    public function test_super_admin_always_bypasses_permission_checks(): void
    {
        config(['rbac.enforce' => true]);

        $superAdmin = UserBo::create([
            'iduser_bo' => 'sa-1',
            'idkategori' => null,
            'nama' => 'Super Administrator',
            'status_admin' => '1',
            'role_type' => 'super_admin',
        ]);

        Sanctum::actingAs($superAdmin);

        // Super Admin has NO explicit roles/permissions attached in DB, but bypasses everything
        $response = $this->postJson('/test/teacher/banksoal-global-manage');
        $response->assertStatus(200);
    }

    public function test_student_can_access_student_exam_with_permission(): void
    {
        config(['rbac.enforce' => true]);

        $perm = Permission::create([
            'key' => 'ujian.ikut',
            'label' => 'Mengikuti Ujian CBT Online',
            'module' => 'Portal Ujian Siswa',
            'scope' => 'instansi',
        ]);

        $role = Role::create([
            'name' => 'siswa',
            'label' => 'Siswa CBT',
            'is_system' => true,
        ]);
        $role->permissions()->attach($perm->id);

        $student = UserSiswa::create([
            'iduser' => 'siswa-test-1',
            'idkategori' => 'instansi-a',
            'nama' => 'Ahmad Siswa',
        ]);
        $student->assignRole('siswa');

        Sanctum::actingAs($student);

        $response = $this->getJson('/test/student/exams');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'success', 'data' => 'available_exams']);
    }

    // ==========================================
    // 2. TEACHER WORKFLOW TESTS
    // ==========================================

    public function test_teacher_workflow_access_with_permissions(): void
    {
        config(['rbac.enforce' => true]);

        // Setup guru role & permissions
        $permSoal = Permission::create(['key' => 'soal.view', 'label' => 'Lihat Soal', 'module' => 'Bank Soal', 'scope' => 'instansi']);
        $permJadwal = Permission::create(['key' => 'jadwal.manage', 'label' => 'Kelola Jadwal', 'module' => 'Jadwal', 'scope' => 'instansi']);
        $permLaporan = Permission::create(['key' => 'laporan.view', 'label' => 'Lihat Nilai', 'module' => 'Laporan', 'scope' => 'instansi']);

        $roleGuru = Role::create(['name' => 'guru', 'label' => 'Guru Pengajar', 'is_system' => true]);
        $roleGuru->permissions()->attach([$permSoal->id, $permJadwal->id, $permLaporan->id]);

        $teacher = UserBo::create([
            'iduser_bo' => 'guru-1',
            'idkategori' => 'instansi-a',
            'nama' => 'Ibu Siti',
        ]);
        $teacher->assignRole('guru');

        Sanctum::actingAs($teacher);

        // 1. Daftar soal
        $resSoal = $this->getJson('/test/teacher/questions');
        $resSoal->assertStatus(200)->assertJson(['data' => 'questions_list']);

        // 2. Buat jadwal ujian
        $resJadwal = $this->postJson('/test/teacher/exams');
        $resJadwal->assertStatus(200)->assertJson(['data' => 'exam_created']);

        // 3. Lihat laporan nilai
        $resLaporan = $this->getJson('/test/teacher/reports');
        $resLaporan->assertStatus(200)->assertJson(['data' => 'reports_viewed']);

        // 4. Akses rute mutasi global bank soal -> Ditolak 403
        $resGlobal = $this->postJson('/test/teacher/banksoal-global-manage');
        $resGlobal->assertStatus(403);
    }

    // ==========================================
    // 3. STUDENT WORKFLOW TESTS
    // ==========================================

    public function test_student_workflow_access_with_permissions(): void
    {
        config(['rbac.enforce' => true]);

        // Setup siswa role & permissions
        $permUjian = Permission::create(['key' => 'ujian.ikut', 'label' => 'Ikut Ujian', 'module' => 'CBT', 'scope' => 'instansi']);
        $permNilai = Permission::create(['key' => 'nilai.view', 'label' => 'Lihat Nilai', 'module' => 'CBT', 'scope' => 'instansi']);
        $permPengumuman = Permission::create(['key' => 'announcement.view', 'label' => 'Lihat Pengumuman', 'module' => 'Pengumuman', 'scope' => 'instansi']);

        $roleSiswa = Role::create(['name' => 'siswa', 'label' => 'Siswa CBT', 'is_system' => true]);
        $roleSiswa->permissions()->attach([$permUjian->id, $permNilai->id, $permPengumuman->id]);

        $student = UserSiswa::create([
            'iduser' => 'siswa-1',
            'idkategori' => 'instansi-a',
            'nama' => 'Ahmad Siswa',
        ]);
        $student->assignRole('siswa');

        Sanctum::actingAs($student);

        // 1. Daftar ujian
        $resExams = $this->getJson('/test/student/exams');
        $resExams->assertStatus(200)->assertJson(['data' => 'available_exams']);

        // 2. Mulai pengerjaan
        $resStart = $this->postJson('/test/student/attempts/start');
        $resStart->assertStatus(200)->assertJson(['data' => 'attempt_started']);

        // 3. Simpan jawaban
        $resAnswer = $this->patchJson('/test/student/attempts/answer');
        $resAnswer->assertStatus(200)->assertJson(['data' => 'answer_saved']);

        // 4. Submit lembar ujian
        $resSubmit = $this->postJson('/test/student/attempts/submit');
        $resSubmit->assertStatus(200)->assertJson(['data' => 'attempt_submitted']);

        // 5. Lihat nilai hasil ujian
        $resNilai = $this->getJson('/test/student/results');
        $resNilai->assertStatus(200)->assertJson(['data' => 'result_viewed']);

        // 6. Baca pengumuman
        $resAnnounce = $this->getJson('/test/student/announcements');
        $resAnnounce->assertStatus(200)->assertJson(['data' => 'announcements_read']);
    }

    // ==========================================
    // 4. TEACHER ACCESS TO TAHUN SOAL / DROPDOWNS
    // ==========================================

    public function test_teacher_calling_tahun_soal_dropdown_returns_200_when_enforced(): void
    {
        config([
            'rbac.enforce' => true,
            'rbac.tenant_enforce' => true,
        ]);

        // 1. Buat data master tahun soal
        MasterTahunSoal::create(['tahun' => '2025/2026', 'keterangan' => 'Tahun Ajaran Aktif', 'is_active' => true]);
        MasterTahunSoal::create(['tahun' => '2024/2025', 'keterangan' => 'Tahun Ajaran Lampau', 'is_active' => true]);

        // 2. Buat permission soal.view & jadwal.view
        $permSoal = Permission::create(['key' => 'soal.view', 'label' => 'Lihat Soal', 'module' => 'Bank Soal', 'scope' => 'instansi']);
        $permJadwal = Permission::create(['key' => 'jadwal.view', 'label' => 'Lihat Jadwal', 'module' => 'Jadwal', 'scope' => 'instansi']);

        $roleGuru = Role::create(['name' => 'guru', 'label' => 'Guru Pengajar', 'is_system' => true]);
        $roleGuru->permissions()->attach([$permSoal->id, $permJadwal->id]);

        $teacher = UserBo::create([
            'iduser_bo' => 'guru-tahun-soal',
            'idkategori' => 'instansi-a',
            'nama' => 'Guru Matematika',
            'role_type' => 'guru',
        ]);
        $teacher->assignRole('guru');

        Sanctum::actingAs($teacher);

        // A. Panggilan ke /api/admin/tahun-soal?all=true (yang dipanggil oleh QuestionForm & ExamsPage)
        $resAdmin = $this->getJson('/api/admin/tahun-soal?all=true');
        $resAdmin->assertStatus(200);
        $resAdmin->assertJsonStructure(['data']);
        $this->assertCount(2, $resAdmin->json('data'));

        // B. Panggilan ke /api/teacher/tahun-soal
        $resTeacher = $this->getJson('/api/teacher/tahun-soal?all=true');
        $resTeacher->assertStatus(200);
        $this->assertCount(2, $resTeacher->json('data'));

        // C. Siswa tanpa permission mencoba mengakses endpoint master tahun soal -> Ditolak 403
        $student = UserSiswa::create([
            'iduser' => 'siswa-no-perm',
            'idkategori' => 'instansi-a',
            'nama' => 'Siswa Belajar',
        ]);
        Sanctum::actingAs($student);

        $resStudent = $this->getJson('/api/admin/tahun-soal?all=true');
        $resStudent->assertStatus(403);
    }

    // ==========================================
    // 5. TENANT ISOLATION: ASSESSMENT
    // ==========================================

    public function test_assessment_tenant_isolation_with_flag(): void
    {
        // Buat 2 assessment berbeda instansi
        Assessment::create(['idassessment' => 'exam-instansi-a', 'idkategori' => 'instansi-a', 'nama_assessment' => 'Ujian Sekolah A']);
        Assessment::create(['idassessment' => 'exam-instansi-b', 'idkategori' => 'instansi-b', 'nama_assessment' => 'Ujian Sekolah B']);

        $adminA = UserBo::create(['iduser_bo' => 'admin-a', 'idkategori' => 'instansi-a', 'nama' => 'Admin Sekolah A']);
        Sanctum::actingAs($adminA);

        // Saat tenant_enforce = false (shadow): query tidak difilter, mengembalikan seluruh data
        config(['rbac.tenant_enforce' => false]);
        $allAssessments = Assessment::all();
        $this->assertEquals(2, $allAssessments->count());

        // Saat tenant_enforce = true: query difilter strictly oleh idkategori user
        config(['rbac.tenant_enforce' => true]);
        $isolatedAssessments = Assessment::all();
        $this->assertEquals(1, $isolatedAssessments->count());
        $this->assertEquals('exam-instansi-a', $isolatedAssessments->first()->idassessment);
    }

    // ==========================================
    // 6. TENANT ISOLATION: ANNOUNCEMENT
    // ==========================================

    public function test_announcement_reads_own_instansi_and_null_national(): void
    {
        config(['rbac.tenant_enforce' => true]);

        // 1 pengumuman nasional (idkategori = NULL), 1 milik instansi-a, 1 milik instansi-b
        Announcement::create(['title' => 'Pengumuman Nasional', 'content' => 'Info Nasional', 'idkategori' => null]);
        Announcement::create(['title' => 'Pengumuman Sekolah A', 'content' => 'Info Sekolah A', 'idkategori' => 'instansi-a']);
        Announcement::create(['title' => 'Pengumuman Sekolah B', 'content' => 'Info Sekolah B', 'idkategori' => 'instansi-b']);

        $userA = UserBo::create(['iduser_bo' => 'user-a', 'idkategori' => 'instansi-a', 'nama' => 'User Sekolah A']);
        Sanctum::actingAs($userA);

        $visibleAnnouncements = Announcement::all();
        // Harapannya: melihat milik instansi-a DAN pengumuman nasional (idkategori NULL) = total 2
        $this->assertEquals(2, $visibleAnnouncements->count());
        $this->assertTrue($visibleAnnouncements->pluck('title')->contains('Pengumuman Nasional'));
        $this->assertTrue($visibleAnnouncements->pluck('title')->contains('Pengumuman Sekolah A'));
        $this->assertFalse($visibleAnnouncements->pluck('title')->contains('Pengumuman Sekolah B'));
    }

    public function test_announcement_mutation_restrictions(): void
    {
        $nasional = Announcement::create(['title' => 'Info Nasional', 'content' => 'Konten', 'idkategori' => null, 'role' => 'super_admin']);
        $sekolahB = Announcement::create(['title' => 'Info Sekolah B', 'content' => 'Konten B', 'idkategori' => 'instansi-b', 'role' => 'admin']);

        $adminA = UserBo::create(['iduser_bo' => 'admin-a', 'idkategori' => 'instansi-a', 'nama' => 'Admin Sekolah A', 'role_type' => 'admin']);
        Sanctum::actingAs($adminA);

        $controller = new \App\Http\Controllers\Api\AnnouncementController();

        // 1. Admin A mencoba mengedit pengumuman nasional -> Ditolak 403
        $reqUpdateNasional = \Illuminate\Http\Request::create('/api/admin/announcements/' . $nasional->id, 'PUT', ['title' => 'Diubah Admin']);
        $reqUpdateNasional->setUserResolver(fn() => $adminA);
        $resNasional = $controller->update($nasional->id, $reqUpdateNasional);
        $this->assertEquals(403, $resNasional->getStatusCode());

        // 2. Admin A mencoba menghapus pengumuman instansi B -> Ditolak 403
        $reqDeleteB = \Illuminate\Http\Request::create('/api/admin/announcements/' . $sekolahB->id, 'DELETE');
        $reqDeleteB->setUserResolver(fn() => $adminA);
        $resDeleteB = $controller->destroy($sekolahB->id, $reqDeleteB);
        $this->assertEquals(403, $resDeleteB->getStatusCode());

        // 3. Super Admin bebas mengubah pengumuman nasional
        $superAdmin = UserBo::create(['iduser_bo' => 'sa-1', 'idkategori' => null, 'nama' => 'Super Admin', 'status_admin' => '1', 'role_type' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        $reqUpdateSa = \Illuminate\Http\Request::create('/api/admin/announcements/' . $nasional->id, 'PUT', ['title' => 'Diubah Super Admin']);
        $reqUpdateSa->setUserResolver(fn() => $superAdmin);
        $resUpdateSa = $controller->update($nasional->id, $reqUpdateSa);
        $this->assertEquals(200, $resUpdateSa->getStatusCode());
    }

    // ==========================================
    // 7. TENANT OWNERSHIP MIDDLEWARE
    // ==========================================

    public function test_tenant_ownership_shadow_vs_strict_enforcement(): void
    {
        $admin = UserBo::create([
            'iduser_bo' => 'admin-instansi-a',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Sekolah A',
        ]);
        Sanctum::actingAs($admin);

        // Mode Shadow (tenant_enforce = false): request lewat sambil mencatat log
        config(['rbac.tenant_enforce' => false]);
        $resShadow = $this->getJson('/test/instansi/instansi-b/data');
        $resShadow->assertStatus(200);

        // Mode Strict (tenant_enforce = true): diblokir 403 TENANT_FORBIDDEN
        config(['rbac.tenant_enforce' => true]);
        $resStrict = $this->getJson('/test/instansi/instansi-b/data');
        $resStrict->assertStatus(403);
        $resStrict->assertJson(['code' => 'TENANT_FORBIDDEN']);
    }

    public function test_tenant_ownership_blocks_access_to_different_institution(): void
    {
        config(['rbac.tenant_enforce' => true]);

        $admin = UserBo::create([
            'iduser_bo' => 'admin-a-own',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Sekolah A',
        ]);

        Sanctum::actingAs($admin);

        // Mengakses rute berparameter {idkategori} 'instansi-b' saat login sebagai 'instansi-a'
        $response = $this->getJson('/test/instansi/instansi-b/data');
        $response->assertStatus(403);
        $response->assertJson(['code' => 'TENANT_FORBIDDEN']);
    }

    public function test_tenant_ownership_blocks_tampering_with_foreign_staff_id(): void
    {
        config(['rbac.tenant_enforce' => true]);

        $admin = UserBo::create([
            'iduser_bo' => 'admin-a-staff',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Sekolah A',
        ]);

        $foreignStaff = UserBo::create([
            'iduser_bo' => 'staff-foreign-b',
            'idkategori' => 'instansi-b',
            'nama' => 'Staff Sekolah B',
        ]);

        Sanctum::actingAs($admin);

        // Mencoba mengakses staf instansi lain melalui route parameter {iduser_bo}
        $response = $this->getJson('/test/admin/staff/staff-foreign-b');
        $response->assertStatus(403);
        $response->assertJson(['code' => 'TENANT_FORBIDDEN']);
    }

    public function test_super_admin_is_exempt_from_tenant_ownership_restrictions(): void
    {
        config(['rbac.tenant_enforce' => true]);

        $superAdmin = UserBo::create([
            'iduser_bo' => 'sa-tenant-exempt',
            'idkategori' => null,
            'nama' => 'Super Administrator',
            'status_admin' => '1',
            'role_type' => 'super_admin',
        ]);

        Sanctum::actingAs($superAdmin);

        // Super Admin bebas mengakses rute instansi manapun
        $response = $this->getJson('/test/instansi/instansi-b/data');
        $response->assertStatus(200);
        $response->assertJson(['status' => 'success', 'data' => 'tenant_ok']);
    }

    public function test_tenant_scope_does_not_cause_recursion_during_sanctum_resolution(): void
    {
        $teacher = UserBo::create([
            'iduser_bo' => 'teacher-loop-test',
            'idkategori' => 'instansi-a',
            'nama' => 'Teacher Safe Resolution',
        ]);

        Sanctum::actingAs($teacher);

        // Resolusi user via Sanctum guard tidak menyebabkan rekursi pada TenantScope
        $response = $this->getJson('/test/instansi/instansi-a/data');
        $response->assertStatus(200);
    }

    // ==========================================
    // 8. LOGIN & /api/auth/me WITH TENANT SCOPE
    // ==========================================

    public function test_auth_me_and_session_with_active_tenant_scope(): void
    {
        config(['rbac.tenant_enforce' => true]);

        $perm = Permission::create(['key' => 'soal.view', 'label' => 'Lihat Soal', 'module' => 'Bank Soal', 'scope' => 'instansi']);
        $role = Role::create(['name' => 'guru', 'label' => 'Guru Pengajar', 'is_system' => true]);
        $role->permissions()->attach($perm->id);

        $teacher = UserBo::create([
            'iduser_bo' => 'guru-auth-test',
            'idkategori' => 'instansi-a',
            'nama' => 'Guru Safe Auth',
            'role_type' => 'guru',
        ]);
        $teacher->assignRole('guru');

        Sanctum::actingAs($teacher);

        $sessionController = new \App\Http\Controllers\Api\Auth\SessionController();
        $request = \Illuminate\Http\Request::create('/api/auth/me', 'GET');
        $request->setUserResolver(fn() => $teacher);

        $response = $sessionController->me($request);
        $this->assertEquals(200, $response->getStatusCode());

        $data = $response->getData(true);
        $this->assertArrayHasKey('roles', $data);
        $this->assertArrayHasKey('permissions', $data);
        $this->assertContains('guru', $data['roles']);
        $this->assertContains('soal.view', $data['permissions']);
    }

    // ==========================================
    // 9. FASE 4: RBAC MANAGEMENT ENDPOINT TESTS
    // ==========================================

    public function test_permissions_endpoint_filters_by_scope_and_caller_permissions(): void
    {
        config(['rbac.enforce' => true]);

        // Setup permissions
        $permPlatform = Permission::create(['key' => 'dashboard_platform.view', 'label' => 'Dashboard Platform', 'module' => 'Platform', 'scope' => 'platform']);
        $permGuruView = Permission::create(['key' => 'guru.view', 'label' => 'Lihat Guru', 'module' => 'Kelola Guru', 'scope' => 'instansi']);
        $permMapelView = Permission::create(['key' => 'mapel.view', 'label' => 'Lihat Mapel', 'module' => 'Master Akademik', 'scope' => 'instansi']);
        $permRoleInstansi = Permission::create(['key' => 'role_instansi.view', 'label' => 'Lihat Role Instansi', 'module' => 'Manajemen Role', 'scope' => 'instansi']);

        // 1. Admin Instansi with role_instansi.view and guru.view (does NOT have mapel.view)
        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true]);
        $roleAdmin->permissions()->attach([$permRoleInstansi->id, $permGuruView->id]);

        $admin = UserBo::create([
            'iduser_bo' => 'admin-inst-perms',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Perms Test',
            'role_type' => 'admin',
        ]);
        $admin->assignRole('admin_instansi');

        Sanctum::actingAs($admin);

        $resAdmin = $this->getJson('/api/permissions');
        $resAdmin->assertStatus(200);

        $data = $resAdmin->json('data');
        // Admin Instansi must see guru.view and role_instansi.view
        $this->assertArrayHasKey('Kelola Guru', $data);
        $this->assertEquals('guru.view', $data['Kelola Guru'][0]['key']);

        // Admin Instansi MUST NOT see platform permission
        $this->assertArrayNotHasKey('Platform', $data);

        // Admin Instansi MUST NOT see permission they do not possess (Anti Privilege Escalation filter)
        $this->assertArrayNotHasKey('Master Akademik', $data);

        // 2. Super Admin sees all permissions
        $superAdmin = UserBo::create([
            'iduser_bo' => 'sa-perms-test',
            'idkategori' => null,
            'nama' => 'Super Admin Perms',
            'status_admin' => '1',
            'role_type' => 'super_admin',
        ]);
        Sanctum::actingAs($superAdmin);

        $resSa = $this->getJson('/api/permissions');
        $resSa->assertStatus(200);
        $saData = $resSa->json('data');
        $this->assertArrayHasKey('Platform', $saData);
        $this->assertArrayHasKey('Kelola Guru', $saData);
        $this->assertArrayHasKey('Master Akademik', $saData);
    }

    public function test_roles_endpoint_scopes_roles_per_institution(): void
    {
        config(['rbac.enforce' => true]);

        $permView = Permission::create(['key' => 'role_instansi.view', 'label' => 'Lihat Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);

        // System roles
        $saRole = Role::create(['name' => 'super_admin', 'label' => 'Super Admin', 'is_system' => true, 'instansi_id' => null]);
        $aiRole = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true, 'instansi_id' => null]);
        $aiRole->permissions()->attach($permView->id);

        // Custom roles in Instansi A and Instansi B
        $roleA = Role::create(['name' => 'staf_tu_a', 'label' => 'Staf TU A', 'instansi_id' => 'instansi-a', 'is_system' => false]);
        $roleB = Role::create(['name' => 'staf_tu_b', 'label' => 'Staf TU B', 'instansi_id' => 'instansi-b', 'is_system' => false]);

        $adminA = UserBo::create([
            'iduser_bo' => 'admin-inst-a',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Instansi A',
            'role_type' => 'admin',
        ]);
        $adminA->assignRole('admin_instansi');

        Sanctum::actingAs($adminA);

        // Admin A calls GET /api/roles
        $res = $this->getJson('/api/roles');
        $res->assertStatus(200);
        $names = collect($res->json('data'))->pluck('name')->all();

        $this->assertContains('admin_instansi', $names);
        $this->assertContains('staf_tu_a', $names);
        $this->assertNotContains('staf_tu_b', $names); // Instansi B role is excluded
        $this->assertNotContains('super_admin', $names); // super_admin is excluded

        // Admin A tries to access Instansi B role directly -> 403 Forbidden
        $resDirectB = $this->getJson('/api/roles/' . $roleB->id);
        $resDirectB->assertStatus(403);

        // Super Admin sees all roles
        $superAdmin = UserBo::create(['iduser_bo' => 'sa-roles-all', 'idkategori' => null, 'status_admin' => '1', 'role_type' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        $resSa = $this->getJson('/api/roles');
        $saNames = collect($resSa->json('data'))->pluck('name')->all();
        $this->assertContains('super_admin', $saNames);
        $this->assertContains('staf_tu_a', $saNames);
        $this->assertContains('staf_tu_b', $saNames);
    }

    public function test_post_roles_auto_assigns_caller_instansi_and_validates_name(): void
    {
        config(['rbac.enforce' => true]);

        $permManage = Permission::create(['key' => 'role_instansi.manage', 'label' => 'Kelola Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);
        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true]);
        $roleAdmin->permissions()->attach($permManage->id);

        $adminA = UserBo::create([
            'iduser_bo' => 'admin-creator',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Creator',
            'role_type' => 'admin',
        ]);
        $adminA->assignRole('admin_instansi');

        Sanctum::actingAs($adminA);

        // 1. Post role with spoofed instansi_id in request body
        $res = $this->postJson('/api/roles', [
            'name' => 'wali_santri',
            'label' => 'Wali Santri CBT',
            'instansi_id' => 'instansi-b', // Spoofed
        ]);
        $res->assertStatus(201);
        $createdRole = Role::where('name', 'wali_santri')->first();
        $this->assertNotNull($createdRole);
        $this->assertEquals('instansi-a', $createdRole->instansi_id); // Overridden with caller instansi!

        // 2. Reject reserved system names
        $resReserved = $this->postJson('/api/roles', [
            'name' => 'admin_instansi',
            'label' => 'Duplikat Admin',
        ]);
        $resReserved->assertStatus(422);
        $resReserved->assertJson(['code' => 'RESERVED_ROLE_NAME']);

        // 3. Reject duplicate name within same instansi
        $resDup = $this->postJson('/api/roles', [
            'name' => 'wali_santri',
            'label' => 'Wali Santri Lagi',
        ]);
        $resDup->assertStatus(422);
        $resDup->assertJson(['code' => 'ROLE_EXISTS']);
    }

    public function test_rule_1_anti_privilege_escalation(): void
    {
        config(['rbac.enforce' => true]);

        // Permissions
        $permManage = Permission::create(['key' => 'role_instansi.manage', 'label' => 'Kelola Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);
        $permSoal = Permission::create(['key' => 'soal.view', 'label' => 'Lihat Soal', 'module' => 'Bank Soal', 'scope' => 'instansi']);
        $permUnowned = Permission::create(['key' => 'laporan.export', 'label' => 'Export Nilai', 'module' => 'Laporan', 'scope' => 'instansi']);

        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true]);
        $roleAdmin->permissions()->attach([$permManage->id, $permSoal->id]);

        $customRole = Role::create(['name' => 'custom_a', 'label' => 'Custom Role A', 'instansi_id' => 'instansi-a']);

        $adminA = UserBo::create([
            'iduser_bo' => 'admin-anti-escalate',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Anti Escalate',
            'role_type' => 'admin',
        ]);
        $adminA->assignRole('admin_instansi');

        Sanctum::actingAs($adminA);

        // Admin tries to grant unowned permission 'laporan.export' -> 403 Forbidden
        $response = $this->putJson('/api/roles/' . $customRole->id . '/permissions', [
            'permissions' => ['soal.view', 'laporan.export'],
        ]);

        $response->assertStatus(403);
        $response->assertJson(['code' => 'PRIVILEGE_ESCALATION_BLOCKED']);
    }

    public function test_rule_2_admin_instansi_cannot_modify_foreign_or_global_roles(): void
    {
        config(['rbac.enforce' => true]);

        $permManage = Permission::create(['key' => 'role_instansi.manage', 'label' => 'Kelola Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);
        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true]);
        $roleAdmin->permissions()->attach($permManage->id);

        $globalRole = Role::create(['name' => 'global_template', 'label' => 'Global Role', 'instansi_id' => null]);
        $roleForeign = Role::create(['name' => 'foreign_role', 'label' => 'Foreign Role', 'instansi_id' => 'instansi-b']);

        $adminA = UserBo::create([
            'iduser_bo' => 'admin-rule-2',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Instansi A',
            'role_type' => 'admin',
        ]);
        $adminA->assignRole('admin_instansi');

        Sanctum::actingAs($adminA);

        // 1. Update foreign role -> 403
        $this->putJson('/api/roles/' . $roleForeign->id, ['label' => 'Hacked'])->assertStatus(403);

        // 2. Delete foreign role -> 403
        $this->deleteJson('/api/roles/' . $roleForeign->id)->assertStatus(403);

        // 3. Sync permissions of global role -> 403
        $this->putJson('/api/roles/' . $globalRole->id . '/permissions', ['permissions' => []])->assertStatus(403);
    }

    public function test_rule_3_platform_scope_permission_cannot_enter_instansi_role(): void
    {
        config(['rbac.enforce' => true]);

        $permPlatform = Permission::create(['key' => 'instansi.create', 'label' => 'Tambah Instansi', 'module' => 'Instansi', 'scope' => 'platform']);
        $roleInstansi = Role::create(['name' => 'staff_a', 'label' => 'Staff A', 'instansi_id' => 'instansi-a']);

        $superAdmin = UserBo::create(['iduser_bo' => 'sa-scope-test', 'idkategori' => null, 'status_admin' => '1', 'role_type' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        // Attempt to assign platform-scope permission to instansi-scoped role
        $response = $this->putJson('/api/roles/' . $roleInstansi->id . '/permissions', [
            'permissions' => ['instansi.create'],
        ]);

        $response->assertStatus(422);
        $response->assertJson(['code' => 'INVALID_SCOPE']);
    }

    public function test_rule_4_system_role_rename_and_delete_protection(): void
    {
        config(['rbac.enforce' => true]);

        $systemRole = Role::create(['name' => 'protected_system', 'label' => 'System Protected', 'is_system' => true, 'instansi_id' => null]);

        $superAdmin = UserBo::create(['iduser_bo' => 'sa-system-protect', 'idkategori' => null, 'status_admin' => '1', 'role_type' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        // 1. Rename is_system role -> 422
        $resRename = $this->putJson('/api/roles/' . $systemRole->id, [
            'name' => 'renamed_system',
            'label' => 'Label Baru',
        ]);
        $resRename->assertStatus(422);
        $resRename->assertJson(['code' => 'SYSTEM_ROLE_PROTECTED']);

        // 2. Delete is_system role -> 422
        $resDelete = $this->deleteJson('/api/roles/' . $systemRole->id);
        $resDelete->assertStatus(422);
        $resDelete->assertJson(['code' => 'SYSTEM_ROLE_PROTECTED']);
    }

    public function test_rule_4_super_admin_permissions_cannot_be_reduced(): void
    {
        config(['rbac.enforce' => true]);

        $permA = Permission::create(['key' => 'perm.a', 'label' => 'Perm A', 'module' => 'M', 'scope' => 'platform']);
        $saRole = Role::create(['name' => 'super_admin', 'label' => 'Super Administrator', 'is_system' => true, 'instansi_id' => null]);
        $saRole->permissions()->attach($permA->id);

        $superAdmin = UserBo::create(['iduser_bo' => 'sa-cannot-reduce', 'idkategori' => null, 'status_admin' => '1', 'role_type' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        // Attempting to remove perm.a from super_admin role -> 422
        $response = $this->putJson('/api/roles/' . $saRole->id . '/permissions', [
            'permissions' => [], // Emptying permissions
        ]);

        $response->assertStatus(422);
        $response->assertJson(['code' => 'SUPER_ADMIN_PROTECTED']);
    }

    public function test_rule_4_minimal_one_active_super_admin_required(): void
    {
        config(['rbac.enforce' => true]);

        $saRole = Role::create(['name' => 'super_admin', 'label' => 'Super Administrator', 'is_system' => true]);
        $guruRole = Role::create(['name' => 'guru', 'label' => 'Guru', 'is_system' => true]);

        // Create the ONLY super admin
        $soleSa = UserBo::create(['iduser_bo' => 'sole-sa', 'idkategori' => null, 'status_admin' => '1', 'role_type' => 'super_admin']);
        $soleSa->assignRole('super_admin');

        Sanctum::actingAs($soleSa);

        // Attempt to remove super_admin role from sole active super admin -> 422
        $response = $this->putJson('/api/users/sole-sa/roles', [
            'roles' => ['guru'],
        ]);

        $response->assertStatus(422);
        $response->assertJson(['code' => 'MINIMAL_SUPER_ADMIN_REQUIRED']);
    }

    public function test_rule_5_anti_lockout_prevents_self_disenfranchisement(): void
    {
        config(['rbac.enforce' => true]);

        $permManage = Permission::create(['key' => 'role_instansi.manage', 'label' => 'Kelola Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);
        $permView = Permission::create(['key' => 'role_instansi.view', 'label' => 'Lihat Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);

        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true, 'instansi_id' => 'instansi-a']);
        $roleAdmin->permissions()->attach([$permManage->id, $permView->id]);

        $roleGuru = Role::create(['name' => 'guru', 'label' => 'Guru', 'is_system' => true, 'instansi_id' => null]);

        $admin = UserBo::create([
            'iduser_bo' => 'admin-self-lockout',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Lockout Test',
            'role_type' => 'admin',
        ]);
        $admin->assignRole($roleAdmin);

        Sanctum::actingAs($admin);

        // 1. Caller tries to revoke role_instansi.manage from the role they are using
        $resPerm = $this->putJson('/api/roles/' . $roleAdmin->id . '/permissions', [
            'permissions' => ['role_instansi.view'], // Omits role_instansi.manage
        ]);
        $resPerm->assertStatus(422);
        $resPerm->assertJson(['code' => 'ANTI_LOCKOUT']);

        // 2. Caller tries to remove their own admin role
        $resRole = $this->putJson('/api/users/admin-self-lockout/roles', [
            'roles' => ['guru'], // Does not have role_instansi.manage
        ]);
        $resRole->assertStatus(422);
        $resRole->assertJson(['code' => 'ANTI_LOCKOUT']);
    }

    public function test_rule_6_role_assigned_to_users_cannot_be_deleted(): void
    {
        config(['rbac.enforce' => true]);

        $permManage = Permission::create(['key' => 'role_instansi.manage', 'label' => 'Kelola Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);
        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true]);
        $roleAdmin->permissions()->attach($permManage->id);

        $customRole = Role::create(['name' => 'operator_ujian', 'label' => 'Operator Ujian', 'instansi_id' => 'instansi-a']);

        $assignedUser = UserBo::create([
            'iduser_bo' => 'user-assigned',
            'idkategori' => 'instansi-a',
            'nama' => 'Staf Operator',
        ]);
        $assignedUser->assignRole($customRole);

        $admin = UserBo::create([
            'iduser_bo' => 'admin-deleter',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Deleter',
            'role_type' => 'admin',
        ]);
        $admin->assignRole('admin_instansi');

        Sanctum::actingAs($admin);

        // Attempting to delete role in active use -> 422
        $res = $this->deleteJson('/api/roles/' . $customRole->id);
        $res->assertStatus(422);
        $res->assertJson(['code' => 'ROLE_IN_USE']);

        // Unassign user, then delete succeeds
        $assignedUser->removeRole($customRole);
        $resSuccess = $this->deleteJson('/api/roles/' . $customRole->id);
        $resSuccess->assertStatus(200);
        $this->assertNull(Role::find($customRole->id));
    }

    public function test_rule_7_dashboard_role_alignment(): void
    {
        config(['rbac.enforce' => true]);

        $permManage = Permission::create(['key' => 'role_instansi.manage', 'label' => 'Kelola Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);
        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true]);
        $roleAdmin->permissions()->attach($permManage->id);

        $roleGuru = Role::create(['name' => 'guru', 'label' => 'Guru', 'is_system' => true]);

        $teacherUser = UserBo::create([
            'iduser_bo' => 'guru-align-test',
            'idkategori' => 'instansi-a',
            'nama' => 'Guru Budi',
            'role_type' => 'guru',
        ]);
        $teacherUser->assignRole('guru');

        $admin = UserBo::create([
            'iduser_bo' => 'admin-align-test',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Align',
            'role_type' => 'admin',
        ]);
        $admin->assignRole('admin_instansi');

        Sanctum::actingAs($admin);

        // Attempting to assign admin role to a teacher user -> 422 Incompatible
        $res = $this->putJson('/api/users/guru-align-test/roles', [
            'roles' => ['admin_instansi'],
        ]);

        $res->assertStatus(422);
        $res->assertJson(['code' => 'INCOMPATIBLE_ROLE_TYPE']);
    }

    public function test_rule_8_student_role_restriction(): void
    {
        config(['rbac.enforce' => true]);

        $permManage = Permission::create(['key' => 'role_instansi.manage', 'label' => 'Kelola Role', 'module' => 'Manajemen Role', 'scope' => 'instansi']);
        $roleAdmin = Role::create(['name' => 'admin_instansi', 'label' => 'Admin Instansi', 'is_system' => true]);
        $roleAdmin->permissions()->attach($permManage->id);

        $roleSiswa = Role::create(['name' => 'siswa', 'label' => 'Siswa', 'is_system' => true]);
        $roleGuru = Role::create(['name' => 'guru', 'label' => 'Guru', 'is_system' => true]);

        $student = UserSiswa::create([
            'iduser' => 'siswa-restr-test',
            'idkategori' => 'instansi-a',
            'nama' => 'Siswa Joko',
        ]);
        $student->assignRole('siswa');

        $admin = UserBo::create([
            'iduser_bo' => 'admin-restr-test',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Restr',
            'role_type' => 'admin',
        ]);
        $admin->assignRole('admin_instansi');

        Sanctum::actingAs($admin);

        // 1. Attempting to assign guru role to student -> 422
        $resInvalid = $this->putJson('/api/users/siswa-restr-test/roles', [
            'roles' => ['guru'],
        ]);
        $resInvalid->assertStatus(422);
        $resInvalid->assertJson(['code' => 'STUDENT_ROLE_RESTRICTED']);

        // 2. Assigning siswa role -> 200 OK
        $resValid = $this->putJson('/api/users/siswa-restr-test/roles', [
            'roles' => ['siswa'],
        ]);
        $resValid->assertStatus(200);
    }

    public function test_rule_9_all_mutations_create_audit_logs(): void
    {
        config(['rbac.enforce' => true]);

        $superAdmin = UserBo::create(['iduser_bo' => 'sa-audit-test', 'idkategori' => null, 'status_admin' => '1', 'role_type' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        // 1. Create Role
        $resPost = $this->postJson('/api/roles', [
            'name' => 'role_audit_test',
            'label' => 'Role Audit Test',
        ]);
        $resPost->assertStatus(201);
        $roleId = $resPost->json('data.id');
        $this->assertTrue(AuditLog::where('action', 'CREATE_ROLE')->where('target_id', (string)$roleId)->exists());

        // 2. Update Role
        $this->putJson('/api/roles/' . $roleId, ['label' => 'Label Updated'])->assertStatus(200);
        $this->assertTrue(AuditLog::where('action', 'UPDATE_ROLE')->where('target_id', (string)$roleId)->exists());

        // 3. Sync Permissions
        $perm = Permission::create(['key' => 'perm.audit', 'label' => 'Perm Audit', 'module' => 'M', 'scope' => 'platform']);
        $this->putJson('/api/roles/' . $roleId . '/permissions', ['permissions' => ['perm.audit']])->assertStatus(200);
        $this->assertTrue(AuditLog::where('action', 'SYNC_ROLE_PERMISSIONS')->where('target_id', (string)$roleId)->exists());

        // 4. Assign Roles
        $targetBo = UserBo::create(['iduser_bo' => 'bo-audit-test', 'idkategori' => null, 'status_admin' => '0', 'role_type' => 'admin']);
        $this->putJson('/api/users/bo-audit-test/roles', ['roles' => ['role_audit_test']])->assertStatus(200);
        $this->assertTrue(AuditLog::where('action', 'ASSIGN_USER_ROLES')->where('target_id', 'bo-audit-test')->exists());

        // 5. Delete Role (unassign first)
        $targetBo->removeRole('role_audit_test');
        $this->deleteJson('/api/roles/' . $roleId)->assertStatus(200);
        $this->assertTrue(AuditLog::where('action', 'DELETE_ROLE')->where('target_id', (string)$roleId)->exists());
    }

    public function test_rule_10_permission_cache_invalidation_takes_immediate_effect(): void
    {
        $permView = Permission::create(['key' => 'soal.view', 'label' => 'Lihat Soal', 'module' => 'Bank Soal', 'scope' => 'instansi']);
        $permManage = Permission::create(['key' => 'soal.manage', 'label' => 'Kelola Soal', 'module' => 'Bank Soal', 'scope' => 'instansi']);

        $role = Role::create(['name' => 'guru_dynamic', 'label' => 'Guru Dynamic', 'instansi_id' => 'instansi-a']);
        $role->permissions()->attach($permView->id);

        $teacher = UserBo::create([
            'iduser_bo' => 'teacher-cache-user',
            'idkategori' => 'instansi-a',
            'nama' => 'Teacher Dynamic Cache',
        ]);
        $teacher->assignRole($role);

        // Before update: has soal.view, does NOT have soal.manage
        $this->assertTrue($teacher->hasPermission('soal.view'));
        $this->assertFalse($teacher->hasPermission('soal.manage'));

        // Super Admin updates role permissions adding soal.manage
        $superAdmin = UserBo::create(['iduser_bo' => 'sa-cache-updater', 'idkategori' => null, 'status_admin' => '1', 'role_type' => 'super_admin']);
        Sanctum::actingAs($superAdmin);

        $this->putJson('/api/roles/' . $role->id . '/permissions', [
            'permissions' => ['soal.view', 'soal.manage'],
        ])->assertStatus(200);

        // WITHOUT logging in again or recreating $teacher, permissions immediately reflect changes
        $this->assertTrue($teacher->hasPermission('soal.manage'));
    }

    public function test_menus_endpoint_structure_and_scope_protection(): void
    {
        // Setup permissions & menus
        $permA = Permission::create(['key' => 'menu.a', 'label' => 'Menu A', 'module' => 'M', 'scope' => 'instansi']);
        $permB = Permission::create(['key' => 'menu.b', 'label' => 'Menu B', 'module' => 'M', 'scope' => 'instansi']);

        Menu::create(['label' => 'Platform Root', 'scope' => 'platform', 'path' => '/super-admin/dashboard', 'is_active' => true]);
        Menu::create(['label' => 'Instansi Root A', 'scope' => 'instansi', 'path' => '/admin/a', 'permission_key' => 'menu.a', 'is_active' => true]);
        Menu::create(['label' => 'Instansi Root B', 'scope' => 'instansi', 'path' => '/admin/b', 'permission_key' => 'menu.b', 'is_active' => true]);

        $roleAdmin = Role::create(['name' => 'admin_test_menu', 'label' => 'Admin Menu Test', 'instansi_id' => 'instansi-a']);
        $roleAdmin->permissions()->attach($permA->id);

        $admin = UserBo::create([
            'iduser_bo' => 'admin-menu-user',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Menu',
            'role_type' => 'admin',
        ]);
        $admin->assignRole($roleAdmin);

        Sanctum::actingAs($admin);

        // 1. Admin Instansi requesting platform menu -> 403 Forbidden
        $resPlatform = $this->getJson('/api/menus?scope=platform');
        $resPlatform->assertStatus(403);

        // 2. Admin Instansi requesting instansi menu -> 200 OK (only sees Instansi Root A, NOT Root B)
        $resInstansi = $this->getJson('/api/menus');
        $resInstansi->assertStatus(200);
        $labels = collect($resInstansi->json('data'))->pluck('label')->all();
        $this->assertContains('Instansi Root A', $labels);
        $this->assertNotContains('Instansi Root B', $labels);
        $this->assertNotContains('Platform Root', $labels);
    }

    // ==========================================
    // 10. AUTO-ASSIGN DEFAULT RBAC ROLE, FALLBACK & AUDIT TESTS
    // ==========================================

    protected function seedGlobalSystemRolesWithBasicPerms(): array
    {
        $permSoal = Permission::firstOrCreate(['key' => 'soal.view'], ['label' => 'Lihat Soal', 'module' => 'Bank Soal', 'scope' => 'instansi']);
        $permGuruCreate = Permission::firstOrCreate(['key' => 'guru.create'], ['label' => 'Tambah Guru', 'module' => 'Kelola Guru', 'scope' => 'instansi']);
        $permGuruImport = Permission::firstOrCreate(['key' => 'guru.import'], ['label' => 'Import Guru', 'module' => 'Kelola Guru', 'scope' => 'instansi']);
        $permSiswaCreate = Permission::firstOrCreate(['key' => 'siswa.create'], ['label' => 'Tambah Siswa', 'module' => 'Kelola Siswa', 'scope' => 'instansi']);
        $permSiswaImport = Permission::firstOrCreate(['key' => 'siswa.import'], ['label' => 'Import Siswa', 'module' => 'Kelola Siswa', 'scope' => 'instansi']);
        $permUjian = Permission::firstOrCreate(['key' => 'ujian.ikut'], ['label' => 'Ikut Ujian', 'module' => 'CBT', 'scope' => 'instansi']);
        $permNilai = Permission::firstOrCreate(['key' => 'nilai.view'], ['label' => 'Lihat Nilai', 'module' => 'CBT', 'scope' => 'instansi']);

        $saRole = Role::firstOrCreate(['name' => 'super_admin', 'instansi_id' => null], ['label' => 'Super Administrator', 'is_system' => true]);
        $aiRole = Role::firstOrCreate(['name' => 'admin_instansi', 'instansi_id' => null], ['label' => 'Admin Instansi', 'is_system' => true]);
        $guruRole = Role::firstOrCreate(['name' => 'guru', 'instansi_id' => null], ['label' => 'Guru Pengajar', 'is_system' => true]);
        $siswaRole = Role::firstOrCreate(['name' => 'siswa', 'instansi_id' => null], ['label' => 'Siswa CBT', 'is_system' => true]);

        $aiRole->permissions()->syncWithoutDetaching([
            $permGuruCreate->id,
            $permGuruImport->id,
            $permSiswaCreate->id,
            $permSiswaImport->id,
        ]);
        $guruRole->permissions()->syncWithoutDetaching([$permSoal->id]);
        $siswaRole->permissions()->syncWithoutDetaching([$permUjian->id, $permNilai->id]);

        return compact('saRole', 'aiRole', 'guruRole', 'siswaRole');
    }

    public function test_creating_new_teacher_via_admin_auto_assigns_guru_role_and_passes_enforced_route(): void
    {
        config(['rbac.enforce' => true]);
        $roles = $this->seedGlobalSystemRolesWithBasicPerms();

        $admin = UserBo::create([
            'iduser_bo' => 'admin-buat-guru',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Instansi A',
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
        ]);

        Sanctum::actingAs($admin);

        // Admin creates a new teacher via POST /api/admin/teachers
        $resCreate = $this->postJson('/api/admin/teachers', [
            'name' => 'Guru Baru Hebat',
            'email' => 'gurubaru@sekolah.sch.id',
            'username' => 'gurubaru',
            'password' => 'Secret123!',
            'role_type' => 'guru',
        ]);
        $resCreate->assertStatus(201);

        $newTeacherId = $resCreate->json('data.iduser_bo');
        $newTeacher = UserBo::findOrFail($newTeacherId);

        // Assert row exists in user_roles with 'guru' role
        $this->assertTrue(
            DB::table('user_roles')
                ->where('user_type', UserBo::class)
                ->where('user_id', $newTeacherId)
                ->where('role_id', $roles['guruRole']->id)
                ->exists()
        );

        // New teacher immediately accesses teacher route under enforce=true without manual migration
        Sanctum::actingAs($newTeacher);
        $resTeacherRoute = $this->getJson('/test/teacher/questions');
        $resTeacherRoute->assertStatus(200);
    }

    public function test_creating_new_student_auto_assigns_siswa_role_and_passes_enforced_route(): void
    {
        config(['rbac.enforce' => true]);
        $roles = $this->seedGlobalSystemRolesWithBasicPerms();

        $admin = UserBo::create([
            'iduser_bo' => 'admin-buat-siswa',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Instansi A',
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
        ]);

        Sanctum::actingAs($admin);

        // Admin creates a new student via POST /api/admin/students
        $resCreate = $this->postJson('/api/admin/students', [
            'name' => 'Siswa Baru Cerdas',
            'email' => 'siswabaru@sekolah.sch.id',
            'password' => 'Secret123!',
            'nisn' => '0099887766',
        ]);
        $resCreate->assertStatus(201);

        $newStudentId = $resCreate->json('data.iduser');
        $newStudent = UserSiswa::findOrFail($newStudentId);

        // Assert row exists in user_roles with 'siswa' role
        $this->assertTrue(
            DB::table('user_roles')
                ->where('user_type', UserSiswa::class)
                ->where('user_id', $newStudentId)
                ->where('role_id', $roles['siswaRole']->id)
                ->exists()
        );

        // New student immediately accesses student exam route under enforce=true
        Sanctum::actingAs($newStudent);
        $resStudentRoute = $this->getJson('/test/student/exams');
        $resStudentRoute->assertStatus(200);
    }

    public function test_creating_new_school_admin_via_super_admin_assigns_admin_instansi_role(): void
    {
        config(['rbac.enforce' => true]);
        $roles = $this->seedGlobalSystemRolesWithBasicPerms();

        \App\Models\KategoriUserBo::create([
            'idkategori' => 'instansi-baru',
            'nama_kategori' => 'SMA Negeri Baru',
        ]);

        $superAdmin = UserBo::create([
            'iduser_bo' => 'sa-buat-admin',
            'idkategori' => null,
            'nama' => 'Super Admin',
            'status_admin' => '1',
            'role_type' => 'super_admin',
        ]);

        Sanctum::actingAs($superAdmin);

        $res = $this->postJson('/api/super-admin/users', [
            'nama' => 'Admin Sekolah Baru',
            'username' => 'admin_baru_01',
            'password' => 'Admin1234!',
            'email' => 'adminbaru@sekolah.sch.id',
            'role' => 'admin',
            'idkategori' => 'instansi-baru',
        ]);
        $res->assertStatus(201);

        $newAdminId = $res->json('data.iduser_bo');

        $this->assertTrue(
            DB::table('user_roles')
                ->where('user_type', UserBo::class)
                ->where('user_id', $newAdminId)
                ->where('role_id', $roles['aiRole']->id)
                ->exists()
        );
    }

    public function test_bulk_import_teachers_and_students_assigns_roles_without_duplicates(): void
    {
        config(['rbac.enforce' => true]);
        $roles = $this->seedGlobalSystemRolesWithBasicPerms();

        $admin = UserBo::create([
            'iduser_bo' => 'admin-importer',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Importer',
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
        ]);
        Sanctum::actingAs($admin);

        // 1. Bulk import 3 teachers
        $resGuru = $this->postJson('/api/admin/teachers/import', [
            'rows' => [
                ['row_number' => 1, 'data' => ['nama' => 'Guru Imp 1', 'email' => 'g1@sch.id', 'username' => 'gimp1']],
                ['row_number' => 2, 'data' => ['nama' => 'Guru Imp 2', 'email' => 'g2@sch.id', 'username' => 'gimp2']],
                ['row_number' => 3, 'data' => ['nama' => 'Guru Imp 3', 'email' => 'g3@sch.id', 'username' => 'gimp3']],
            ],
        ]);
        $resGuru->assertStatus(200);
        $this->assertEquals(3, $resGuru->json('saved_count'));

        $importedTeachers = UserBo::whereIn('login_username', ['gimp1', 'gimp2', 'gimp3'])->get();
        $this->assertCount(3, $importedTeachers);
        foreach ($importedTeachers as $t) {
            $count = DB::table('user_roles')
                ->where('user_type', UserBo::class)
                ->where('user_id', $t->iduser_bo)
                ->count();
            $this->assertEquals(1, $count);
            $this->assertTrue($t->hasRbacRole('guru'));
        }

        // 2. Bulk import 3 students
        $resSiswa = $this->postJson('/api/admin/students/import', [
            'rows' => [
                ['row_number' => 1, 'data' => ['nama' => 'Siswa Imp 1', 'nisn' => '11110001']],
                ['row_number' => 2, 'data' => ['nama' => 'Siswa Imp 2', 'nisn' => '11110002']],
                ['row_number' => 3, 'data' => ['nama' => 'Siswa Imp 3', 'nisn' => '11110003']],
            ],
        ]);
        $resSiswa->assertStatus(200);
        $this->assertEquals(3, $resSiswa->json('saved_count'));

        $importedStudents = UserSiswa::whereIn('nisn', ['11110001', '11110002', '11110003'])->get();
        $this->assertCount(3, $importedStudents);
        foreach ($importedStudents as $s) {
            $count = DB::table('user_roles')
                ->where('user_type', UserSiswa::class)
                ->where('user_id', $s->iduser)
                ->count();
            $this->assertEquals(1, $count);
            $this->assertTrue($s->hasRbacRole('siswa'));
        }
    }

    public function test_assign_default_role_is_idempotent_without_duplicates(): void
    {
        $this->seedGlobalSystemRolesWithBasicPerms();

        $teacher = UserBo::create([
            'iduser_bo' => 'guru-idempotent',
            'idkategori' => 'instansi-a',
            'nama' => 'Guru Idempotent',
            'status_admin' => '2',
            'role_type' => 'guru',
        ]);

        $service = app(RbacAssignmentService::class);
        $service->assignDefaultRole($teacher);
        $service->assignDefaultRole($teacher);

        $rowCount = DB::table('user_roles')
            ->where('user_type', UserBo::class)
            ->where('user_id', 'guru-idempotent')
            ->count();

        $this->assertEquals(1, $rowCount);
    }

    public function test_account_type_change_syncs_system_role_while_preserving_custom_roles(): void
    {
        $roles = $this->seedGlobalSystemRolesWithBasicPerms();
        $customRole = Role::create([
            'name' => 'koordinator_ujian',
            'label' => 'Koordinator Ujian',
            'instansi_id' => 'instansi-a',
            'is_system' => false,
        ]);

        $user = UserBo::create([
            'iduser_bo' => 'bo-type-change',
            'idkategori' => 'instansi-a',
            'nama' => 'Pak Promosi',
            'status_admin' => '2',
            'role_type' => 'guru',
        ]);
        $user->assignRole($customRole);

        // Initially has guru + koordinator_ujian
        $this->assertTrue($user->hasRbacRole('guru'));
        $this->assertTrue($user->hasRbacRole('koordinator_ujian'));

        // Promote from guru to admin_sekolah (triggers updated model event -> syncSystemRoleOnTypeChange)
        $user->update(['role_type' => 'admin_sekolah']);

        $assignedRoleNames = $user->roles()->pluck('roles.name')->all();
        $this->assertContains('admin_instansi', $assignedRoleNames);
        $this->assertContains('koordinator_ujian', $assignedRoleNames); // Custom role preserved!
        $this->assertNotContains('guru', $assignedRoleNames); // Old system role replaced!
    }

    public function test_permanent_delete_user_detaches_all_user_roles(): void
    {
        $this->seedGlobalSystemRolesWithBasicPerms();

        $teacher = UserBo::create([
            'iduser_bo' => 'guru-hard-delete',
            'idkategori' => 'instansi-a',
            'nama' => 'Guru Akan Dihapus',
            'status_admin' => '2',
            'role_type' => 'guru',
        ]);

        $this->assertEquals(
            1,
            DB::table('user_roles')->where('user_type', UserBo::class)->where('user_id', 'guru-hard-delete')->count()
        );

        // Permanent hard delete triggers detachAllRoles
        $teacher->delete();

        $this->assertEquals(
            0,
            DB::table('user_roles')->where('user_type', UserBo::class)->where('user_id', 'guru-hard-delete')->count()
        );
    }

    public function test_runtime_fallback_allows_type_permissions_and_logs_warning_without_db_write(): void
    {
        config(['rbac.enforce' => true]);
        $this->seedGlobalSystemRolesWithBasicPerms();

        // Create a teacher WITHOUT auto-assigning user_roles (simulating missed account)
        $teacher = RbacAssignmentService::withoutAutoAssign(function () {
            return UserBo::create([
                'iduser_bo' => 'guru-tanpa-row',
                'idkategori' => 'instansi-a',
                'nama' => 'Guru Tanpa Baris RBAC',
                'status_admin' => '2',
                'role_type' => 'guru',
            ]);
        });

        // Confirm zero rows in user_roles before request
        $this->assertEquals(
            0,
            DB::table('user_roles')->where('user_type', UserBo::class)->where('user_id', 'guru-tanpa-row')->count()
        );

        // Spy on Log::warning to verify USER_WITHOUT_RBAC_ROLE is logged
        Log::spy();

        Sanctum::actingAs($teacher);

        // 1. Allowed route for guru (soal.view) -> passes 200 via read-only fallback!
        $resOk = $this->getJson('/test/teacher/questions');
        $resOk->assertStatus(200);

        // 2. Forbidden route beyond guru role (banksoal_global.manage) -> still blocked 403!
        $resDenied = $this->postJson('/test/teacher/banksoal-global-manage');
        $resDenied->assertStatus(403);

        // 3. Verify read-only fallback did NOT write to DB
        $this->assertEquals(
            0,
            DB::table('user_roles')->where('user_type', UserBo::class)->where('user_id', 'guru-tanpa-row')->count()
        );

        // 4. Verify USER_WITHOUT_RBAC_ROLE warning was logged
        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($message) => str_contains($message, 'USER_WITHOUT_RBAC_ROLE'))
            ->atLeast()->once();
    }

    public function test_audit_rbac_users_command_detects_missing_and_mismatched_without_modifying_unless_fix(): void
    {
        $roles = $this->seedGlobalSystemRolesWithBasicPerms();

        // Create 1 teacher without user_roles row
        $missingGuru = RbacAssignmentService::withoutAutoAssign(function () {
            return UserBo::create([
                'iduser_bo' => 'guru-audit-missing',
                'idkategori' => 'instansi-a',
                'nama' => 'Guru Belum Ada Role',
                'login_username' => 'guru_missing',
                'status_admin' => '2',
                'role_type' => 'guru',
            ]);
        });

        // Create 1 student manually given an admin role directly in DB (mismatch)
        $mismatchedSiswa = RbacAssignmentService::withoutAutoAssign(function () {
            return UserSiswa::create([
                'iduser' => 'siswa-audit-mismatch',
                'idkategori' => 'instansi-a',
                'nama' => 'Siswa Salah Role',
                'nisn' => '99990000',
            ]);
        });
        DB::table('user_roles')->insert([
            'user_type' => UserSiswa::class,
            'user_id' => $mismatchedSiswa->iduser,
            'role_id' => $roles['aiRole']->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 1. Run dry-run (default without --fix) -> detects both, modifies NOTHING
        $exitDry = Artisan::call('rbac:audit-users');
        $outputDry = Artisan::output();
        $this->assertEquals(0, $exitDry);
        $this->assertStringContainsString('guru-audit-missing', $outputDry);
        $this->assertStringContainsString('siswa-audit-mismatch', $outputDry);
        $this->assertEquals(
            0,
            DB::table('user_roles')->where('user_type', UserBo::class)->where('user_id', $missingGuru->iduser_bo)->count()
        );

        // 2. Run with --fix -> adds default role ONLY for missing user, does not touch mismatched user
        $exitFix = Artisan::call('rbac:audit-users', ['--fix' => true]);
        $this->assertEquals(0, $exitFix);
        $this->assertEquals(
            1,
            DB::table('user_roles')
                ->where('user_type', UserBo::class)
                ->where('user_id', $missingGuru->iduser_bo)
                ->where('role_id', $roles['guruRole']->id)
                ->count()
        );
    }

    public function test_student_account_never_receives_non_siswa_role_automatically(): void
    {
        $roles = $this->seedGlobalSystemRolesWithBasicPerms();

        $student = UserSiswa::create([
            'iduser' => 'siswa-strict-auto',
            'idkategori' => 'instansi-a',
            'nama' => 'Siswa Strict',
            'nisn' => '88887777',
        ]);

        // Call service methods explicitly as well
        $service = app(RbacAssignmentService::class);
        $this->assertEquals('siswa', $service->resolveDefaultRoleName($student));
        $service->assignDefaultRole($student);
        $service->syncSystemRoleOnTypeChange($student);

        $assignedRoleNames = $student->roles()->pluck('roles.name')->all();
        $this->assertEquals(['siswa'], $assignedRoleNames);
        $this->assertNotContains('admin_instansi', $assignedRoleNames);
        $this->assertNotContains('guru', $assignedRoleNames);
        $this->assertNotContains('super_admin', $assignedRoleNames);
    }
}
