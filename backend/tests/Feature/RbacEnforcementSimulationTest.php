<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\KategoriUserBo;
use App\Models\MasterKelas;
use App\Models\Role;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Services\RbacAssignmentService;
use Database\Seeders\DynamicRbacSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

/**
 * Simulasi Enforcement Penuh RBAC (rbac.enforce = true & rbac.tenant_enforce = true)
 * Menggunakan permission & role ASLI dari DynamicRbacSeeder pada SQLite :memory:.
 */
class RbacEnforcementSimulationTest extends BaseTestCase
{
    protected UserBo $superAdmin;
    protected UserBo $adminInstansiA;
    protected UserBo $adminInstansiB;
    protected UserBo $guruA;
    protected UserSiswa $siswaA;
    protected Assessment $assessmentA;

    protected function setUp(): void
    {
        parent::setUp();

        // Paksa SQLite :memory: agar database live sertidemi TIDAK tersentuh
        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.foreign_key_constraints' => false,
            'rbac.enforce' => true,
            'rbac.tenant_enforce' => true,
            'rbac.log_denied' => true,
            'rbac.auto_assign_on_create' => true,
        ]);

        RbacAssignmentService::enableAutoAssign();
        DB::purge('mysql');
        DB::purge('sqlite');

        $this->createSimulationSchemas();

        // Seed seluruh 62 permissions, 4 role sistem, dan 33 menus ASLI dari DynamicRbacSeeder
        (new DynamicRbacSeeder())->run();

        $this->seedSimulationFixtures();
    }

    protected function tearDown(): void
    {
        RbacAssignmentService::enableAutoAssign();
        DB::purge('sqlite');
        parent::tearDown();
    }

    protected function createSimulationSchemas(): void
    {
        // --- RBAC Tables ---
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
            $table->id();
            $table->string('user_type');
            $table->string('user_id', 50);
            $table->unsignedBigInteger('role_id');
            $table->timestamps();
            $table->unique(['user_type', 'user_id', 'role_id']);
        });

        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('label');
            $table->string('icon')->nullable();
            $table->string('path')->nullable();
            $table->string('permission_key')->nullable();
            $table->enum('scope', ['platform', 'instansi'])->default('instansi');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // --- Core Auth & Tenant Tables ---
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

        Schema::create('kategori_user_bo', function (Blueprint $table) {
            $table->string('idkategori', 25)->primary();
            $table->string('nama_kategori');
            $table->string('kode_instansi')->nullable();
            $table->string('npsn')->nullable();
            $table->string('jenjang')->nullable();
            $table->string('alamat')->nullable();
            $table->string('email')->nullable();
            $table->string('telepon')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->string('status_remove')->default('N');
            $table->string('subscription_status')->default('aktif');
            $table->date('tanggal_berakhir')->nullable();
            $table->date('subscription_end_date')->nullable();
            $table->integer('max_siswa')->default(500);
            $table->integer('max_guru')->default(100);
            $table->integer('max_ujian')->default(100);
            $table->string('paket_langganan')->default('pro');
            $table->timestamps();
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
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
            $table->string('active_session_token')->nullable();
            $table->timestamp('last_login_at')->nullable();
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
            $table->string('status_remove')->default('N');
            $table->string('url_image')->nullable();
            $table->string('active_session_token')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('tanggal_input')->nullable();
            $table->timestamps();
        });

        // --- Academic Masters ---
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('master_semester', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('nama_semester');
            $table->string('kode')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('master_jenjang', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('nama_jenjang');
            $table->string('kode_jenjang')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->timestamps();
        });

        Schema::create('master_kurikulum', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('nama_kurikulum');
            $table->string('kode')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('master_tingkat_kelas', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->string('nama_tingkat');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('master_kelas', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('id_tahun_ajaran')->nullable();
            $table->unsignedBigInteger('idtingkat')->nullable();
            $table->unsignedBigInteger('major_id')->nullable();
            $table->string('wali_kelas_id', 36)->nullable();
            $table->string('nama_kelas')->nullable();
            $table->string('tingkat')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->timestamps();
        });

        Schema::create('master_mata_pelajaran', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('id_tahun_ajaran')->nullable();
            $table->string('kode_mapel')->nullable();
            $table->string('nama_mapel');
            $table->integer('kkm')->default(75);
            $table->string('status_aktif')->default('Y');
            $table->timestamps();
        });

        Schema::create('master_tahun_soal', function (Blueprint $table) {
            $table->id();
            $table->string('tahun');
            $table->string('keterangan')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('majors', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('name')->nullable();
            $table->string('code')->nullable();
            $table->timestamps();
        });

        Schema::create('guru_mata_pelajaran', function (Blueprint $table) {
            $table->id();
            $table->string('iduser_bo', 36);
            $table->unsignedBigInteger('idmapel');
            $table->unsignedBigInteger('idkelas')->nullable();
            $table->unsignedBigInteger('id_tahun_ajaran')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->timestamps();
        });

        Schema::create('siswa_kelas', function (Blueprint $table) {
            $table->id();
            $table->string('iduser', 36);
            $table->unsignedBigInteger('idkelas');
            $table->unsignedBigInteger('id_tahun_ajaran')->nullable();
            $table->timestamps();
        });

        // --- CBT Exams, Questions, Attempts, Announcements & Audit ---
        Schema::create('assessment_kategori', function (Blueprint $table) {
            $table->string('idassessment_kategori', 36)->primary();
            $table->string('nama_assessment_kategori')->nullable();
            $table->timestamps();
        });

        Schema::create('assessment', function (Blueprint $table) {
            $table->string('idassessment', 36)->primary();
            $table->string('idkategori', 25)->nullable();
            $table->string('iduser_bo', 36)->nullable();
            $table->unsignedBigInteger('idmapel')->nullable();
            $table->unsignedBigInteger('idkelas')->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('id_tahun_ajaran')->nullable();
            $table->unsignedBigInteger('idsemester')->nullable();
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
            $table->string('tingkat')->nullable();
            $table->integer('tampil_assessment_pilgan')->default(10);
            $table->integer('tampil_assessment_essay')->default(0);
            $table->integer('point_assessment')->default(100);
            $table->string('point_assessment_nama')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->string('status_paket')->default('published');
            $table->integer('is_locked')->default(0);
            $table->date('tanggal_mulai_assessment')->nullable();
            $table->date('tanggal_batas_assessment')->nullable();
            $table->integer('waktu_pengerjaan')->default(60);
            $table->string('token_ujian')->nullable();
            $table->timestamp('tanggal_input')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('exam_groups', function (Blueprint $table) {
            $table->id();
            $table->string('exam_id', 36)->nullable();
            $table->string('idkategori', 25)->nullable();
            $table->unsignedBigInteger('idkelas')->nullable();
            $table->string('name')->nullable();
            $table->timestamp('start_time')->nullable();
            $table->timestamp('end_time')->nullable();
            $table->timestamps();
        });

        Schema::create('exam_group_students', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('exam_group_id')->nullable();
            $table->string('student_id', 36)->nullable();
            $table->string('iduser', 36)->nullable();
            $table->timestamps();
        });

        Schema::create('assessment_soal_pilgan', function (Blueprint $table) {
            $table->string('idsoal', 36)->primary();
            $table->string('idassessment', 36)->nullable();
            $table->string('idkategori', 25)->nullable();
            $table->string('iduser_bo', 36)->nullable();
            $table->unsignedBigInteger('idmapel')->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('idkurikulum')->nullable();
            $table->unsignedBigInteger('idtingkat')->nullable();
            $table->string('tahun_soal')->nullable();
            $table->text('soal')->nullable();
            $table->text('pilihan_a')->nullable();
            $table->text('pilihan_b')->nullable();
            $table->text('pilihan_c')->nullable();
            $table->text('pilihan_d')->nullable();
            $table->text('pilihan_e')->nullable();
            $table->string('jawaban_benar')->default('A');
            $table->string('status_aktif')->default('Y');
            $table->boolean('is_annulled')->default(false);
            $table->timestamps();
        });

        Schema::create('bank_soal_global', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('idmapel')->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('idkurikulum')->nullable();
            $table->unsignedBigInteger('idtingkat')->nullable();
            $table->string('tahun_soal')->nullable();
            $table->text('pertanyaan')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->timestamps();
        });

        Schema::create('bank_soal_guru', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('iduser_bo', 36)->nullable();
            $table->unsignedBigInteger('idmapel')->nullable();
            $table->unsignedBigInteger('idjenjang')->nullable();
            $table->unsignedBigInteger('idtingkat')->nullable();
            $table->string('tahun_soal')->nullable();
            $table->text('pertanyaan')->nullable();
            $table->string('status_aktif')->default('Y');
            $table->timestamps();
        });

        Schema::create('cbt_exam_groups', function (Blueprint $table) {
            $table->id();
            $table->string('idkategori', 25)->nullable();
            $table->string('idassessment', 36)->nullable();
            $table->unsignedBigInteger('idkelas')->nullable();
            $table->string('nama_grup')->nullable();
            $table->timestamps();
        });

        Schema::create('assessment_jawaban_pilgan', function (Blueprint $table) {
            $table->id();
            $table->string('idtransaksi', 50)->nullable();
            $table->string('idassessment', 36)->nullable();
            $table->string('iduser', 36)->nullable();
            $table->string('idsoal', 36)->nullable();
            $table->string('jawaban')->nullable();
            $table->integer('nilai')->default(0);
            $table->string('status_pengerjaan')->default('sedang');
            $table->timestamps();
        });

        Schema::create('transaksi', function (Blueprint $table) {
            $table->string('idtransaksi', 50)->primary();
            $table->string('iduser', 36)->nullable();
            $table->string('idassessment', 36)->nullable();
            $table->string('status_transaksi')->default('Lunas');
            $table->string('status_pengerjaan')->default('Sedang Mengerjakan');
            $table->integer('nilai_akhir')->default(0);
            $table->timestamp('waktu_mulai')->nullable();
            $table->timestamp('waktu_selesai')->nullable();
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
    }

    protected function seedSimulationFixtures(): void
    {
        KategoriUserBo::create(['idkategori' => 'instansi-a', 'nama_kategori' => 'SMA Negeri A']);
        KategoriUserBo::create(['idkategori' => 'instansi-b', 'nama_kategori' => 'SMA Negeri B']);

        // Auto-assign dari HasDynamicRbac akan langsung memasang role sistem dari DynamicRbacSeeder
        $this->superAdmin = UserBo::create([
            'iduser_bo' => 'sim-sa-1',
            'idkategori' => null,
            'nama' => 'Super Admin Simulasi',
            'login_username' => 'sim_superadmin',
            'login_email' => 'sa@sim.test',
            'login_password' => Hash::make('Password123!'),
            'status_admin' => '1',
            'role_type' => 'super_admin',
        ]);

        $this->adminInstansiA = UserBo::create([
            'iduser_bo' => 'sim-admin-a',
            'idkategori' => 'instansi-a',
            'nama' => 'Admin Sekolah A',
            'login_username' => 'sim_admin_a',
            'login_email' => 'admin_a@sim.test',
            'login_password' => Hash::make('Password123!'),
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
        ]);

        $this->adminInstansiB = UserBo::create([
            'iduser_bo' => 'sim-admin-b',
            'idkategori' => 'instansi-b',
            'nama' => 'Admin Sekolah B',
            'login_username' => 'sim_admin_b',
            'login_email' => 'admin_b@sim.test',
            'login_password' => Hash::make('Password123!'),
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
        ]);

        $this->guruA = UserBo::create([
            'iduser_bo' => 'sim-guru-a',
            'idkategori' => 'instansi-a',
            'nama' => 'Guru Matematika A',
            'login_username' => 'sim_guru_a',
            'login_email' => 'guru_a@sim.test',
            'login_password' => Hash::make('Password123!'),
            'status_admin' => '2',
            'role_type' => 'guru',
        ]);

        $this->siswaA = UserSiswa::create([
            'iduser' => 'sim-siswa-a',
            'idkategori' => 'instansi-a',
            'nama' => 'Siswa Kelas XII A',
            'nisn' => '0012345678',
            'login_email' => 'siswa_a@sim.test',
            'login_password' => Hash::make('Password123!'),
            'status_aktif' => 'Y',
        ]);

        $this->assessmentA = Assessment::create([
            'idassessment' => 'sim-exam-a1',
            'idkategori' => 'instansi-a',
            'iduser_bo' => 'sim-guru-a',
            'nama_assessment' => 'TryOut UTBK Simulasi',
            'status_aktif' => 'Y',
            'status_paket' => 'published',
        ]);
    }

    /**
     * Helper: memastikan rute tidak ditolak 403 (RBAC/Role/Tenant lolos).
     */
    protected function assertAuthorizedNot403(string $method, string $uri, array $payload = []): void
    {
        $response = $this->json($method, $uri, $payload);
        $this->assertNotEquals(
            403,
            $response->status(),
            "Route {$method} {$uri} seharusnya DIIZINKAN (bukan 403), namun mendapat 403. Body: " . $response->getContent()
        );
        $this->assertNotEquals(
            401,
            $response->status(),
            "Route {$method} {$uri} mengembalikan 401 Unauthenticated."
        );
    }

    public function test_simulation_super_admin_main_routes_pass_under_full_enforce(): void
    {
        $this->assertTrue($this->superAdmin->hasRbacRole('super_admin'));
        Sanctum::actingAs($this->superAdmin);

        $routes = [
            ['GET', '/api/auth/me'],
            ['GET', '/api/super-admin/dashboard/stats'],
            ['GET', '/api/super-admin/instansi'],
            ['GET', '/api/super-admin/users'],
            ['GET', '/api/super-admin/question-bank'],
            ['GET', '/api/super-admin/audit-logs'],
            ['GET', '/api/roles'],
            ['GET', '/api/permissions'],
            ['GET', '/api/menus?scope=platform'],
        ];

        foreach ($routes as [$method, $uri]) {
            $this->assertAuthorizedNot403($method, $uri);
        }
    }

    public function test_simulation_admin_instansi_main_routes_pass_under_full_enforce(): void
    {
        $this->assertTrue($this->adminInstansiA->hasRbacRole('admin_instansi'));
        Sanctum::actingAs($this->adminInstansiA);

        $routes = [
            ['GET', '/api/auth/me'],
            ['GET', '/api/admin/dashboard/stats'],
            ['GET', '/api/admin/students'],
            ['GET', '/api/admin/teachers'],
            ['GET', '/api/admin/classes'],
            ['GET', '/api/admin/subjects'],
            ['GET', '/api/admin/exams'],
            ['GET', '/api/admin/dashboard/reports'],
            ['GET', '/api/roles'],
            ['GET', '/api/permissions'],
            ['GET', '/api/menus'],
        ];

        foreach ($routes as [$method, $uri]) {
            $this->assertAuthorizedNot403($method, $uri);
        }
    }

    public function test_simulation_guru_main_routes_pass_under_full_enforce(): void
    {
        $this->assertTrue($this->guruA->hasRbacRole('guru'));
        Sanctum::actingAs($this->guruA);

        $examId = $this->assessmentA->idassessment;

        $routes = [
            ['GET', '/api/auth/me'],
            ['GET', '/api/teacher/dashboard/stats'],
            ['GET', '/api/teacher/questions'],
            ['GET', '/api/teacher/exams'],
            ['GET', "/api/teacher/exams/{$examId}/results"],
            ['GET', "/api/teacher/exams/{$examId}/report"],
            ['GET', '/api/teacher/announcements'],
            ['GET', '/api/teacher/tahun-soal'],
            ['GET', '/api/admin/tahun-soal'],
            ['GET', '/api/teacher/semesters'],
            ['GET', '/api/teacher/academic-years'],
        ];

        foreach ($routes as [$method, $uri]) {
            $this->assertAuthorizedNot403($method, $uri);
        }
    }

    public function test_simulation_siswa_main_routes_pass_under_full_enforce(): void
    {
        $this->assertTrue($this->siswaA->hasRbacRole('siswa'));
        Sanctum::actingAs($this->siswaA);

        // Semua rute utama siswa lolos middleware role:siswa & permission asli seeder (bukan 403)
        $this->assertAuthorizedNot403('GET', '/api/auth/me');
        $this->assertAuthorizedNot403('GET', '/api/student/exams');
        $this->assertAuthorizedNot403('POST', '/api/student/attempts/start', [
            'exam_id' => $this->assessmentA->idassessment,
        ]);
        $this->assertAuthorizedNot403('PATCH', '/api/student/attempts/999/answers', [
            'question_id' => 'soal-1',
            'answer' => 'A',
        ]);
        $this->assertAuthorizedNot403('POST', '/api/student/attempts/999/submit');
        $this->assertAuthorizedNot403('GET', '/api/student/results/999');
        $this->assertAuthorizedNot403('GET', '/api/student/announcements');
        $this->assertAuthorizedNot403('POST', '/api/student/change-password', [
            'current_password' => 'Password123!',
            'new_password' => 'NewSecret123!',
            'new_password_confirmation' => 'NewSecret123!',
        ]);
    }

    public function test_simulation_cross_role_access_is_strictly_blocked_403_under_full_enforce(): void
    {
        // 1. Siswa mencoba akses rute Admin, Guru, Super Admin, dan RBAC -> WAJIB 403
        Sanctum::actingAs($this->siswaA);
        $this->getJson('/api/admin/students')->assertStatus(403);
        $this->getJson('/api/teacher/questions')->assertStatus(403);
        $this->getJson('/api/super-admin/dashboard/stats')->assertStatus(403);
        $this->getJson('/api/roles')->assertStatus(403);

        // 2. Guru mencoba akses rute Admin, Super Admin, mutasi Bank Soal Global, dan RBAC -> WAJIB 403
        Sanctum::actingAs($this->guruA);
        $this->getJson('/api/admin/students')->assertStatus(403);
        $this->getJson('/api/super-admin/instansi')->assertStatus(403);
        $this->postJson('/api/teacher/global-question-bank', [])->assertStatus(403);
        $this->getJson('/api/roles')->assertStatus(403);

        // 3. Admin Instansi mencoba akses rute Super Admin, Siswa, dan mutasi Bank Soal Global -> WAJIB 403
        Sanctum::actingAs($this->adminInstansiA);
        $this->getJson('/api/super-admin/dashboard/stats')->assertStatus(403);
        $this->getJson('/api/super-admin/instansi')->assertStatus(403);
        $this->getJson('/api/student/exams')->assertStatus(403);
        $this->postJson('/api/teacher/global-question-bank', [])->assertStatus(403);
        $this->getJson('/api/menus?scope=platform')->assertStatus(403);
    }

    public function test_simulation_tenant_enforce_blocks_cross_instansi_access(): void
    {
        // Admin Instansi A mencoba menyentuh endpoint milik Instansi B -> WAJIB 403 (EnsureTenantOwnership)
        Sanctum::actingAs($this->adminInstansiA);

        $this->postJson('/api/admin/instansi/instansi-b/gurus', [
            'nama' => 'Guru Penyusup',
        ])->assertStatus(403);

        // Role milik Instansi B juga tidak boleh diakses Admin Instansi A
        $roleB = Role::create([
            'name' => 'operator_b',
            'label' => 'Operator Sekolah B',
            'instansi_id' => 'instansi-b',
            'is_system' => false,
        ]);
        $this->getJson('/api/roles/' . $roleB->id)->assertStatus(403);
    }

    public function test_real_login_bearer_token_flow_with_17_digit_instansi_and_file_cache(): void
    {
        // Gunakan cache driver file + enforce=true + tenant_enforce=true seperti kondisi live
        config([
            'cache.default' => 'file',
            'rbac.enforce' => true,
            'rbac.tenant_enforce' => true,
        ]);
        \Illuminate\Support\Facades\Cache::flush();

        // Data menyerupai live: ID numerik string 17-digit (> JS MAX_SAFE_INTEGER)
        $instansi17 = '27830150842287772';
        $instansi17Other = '27830150842287773';
        KategoriUserBo::create(['idkategori' => $instansi17, 'nama_kategori' => 'PGRI SLCC']);
        KategoriUserBo::create(['idkategori' => $instansi17Other, 'nama_kategori' => 'Sekolah Lain']);

        UserBo::create([
            'iduser_bo' => '27733030223216640',
            'idkategori' => null,
            'nama' => 'Admin SertiDemi LiveLike',
            'login_username' => 'live_sa_17',
            'login_password' => Hash::make('LivePass123!'),
            'status_admin' => '1',
            'role_type' => 'super_admin',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
        ]);

        UserBo::create([
            'iduser_bo' => '27830150842287773',
            'idkategori' => $instansi17,
            'nama' => 'Admin Sekolah 17 Digit',
            'login_username' => 'live_admin_17',
            'login_password' => Hash::make('LivePass123!'),
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
        ]);

        UserBo::create([
            'iduser_bo' => '17949936654844687',
            'idkategori' => $instansi17,
            'nama' => 'Guru 17 Digit',
            'login_username' => 'live_guru_17',
            'login_password' => Hash::make('LivePass123!'),
            'status_admin' => '2',
            'role_type' => 'guru',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
        ]);

        UserSiswa::create([
            'iduser' => '27830150842299999',
            'idkategori' => $instansi17,
            'nama' => 'Siswa 17 Digit',
            'nisn' => '0099112233',
            'login_password' => Hash::make('LivePass123!'),
            'status_aktif' => 'Y',
        ]);

        $cases = [
            ['login' => 'live_sa_17', 'dashboard' => '/api/super-admin/dashboard/stats', 'expectedRole' => 'super_admin'],
            ['login' => 'live_admin_17', 'dashboard' => '/api/admin/dashboard/stats', 'expectedRole' => 'admin_instansi'],
            ['login' => 'live_guru_17', 'dashboard' => '/api/teacher/dashboard/stats', 'expectedRole' => 'guru'],
            ['login' => '0099112233', 'dashboard' => '/api/student/exams', 'expectedRole' => 'siswa'],
        ];

        $adminBearer = null;
        $adminSession = null;

        foreach ($cases as $c) {
            // Reset auth guards to simulate pure stateless Bearer token requests (NO Sanctum::actingAs)
            $this->app['auth']->forgetGuards();

            $resLogin = $this->postJson('/api/auth/login', [
                'login' => $c['login'],
                'password' => 'LivePass123!',
            ]);
            $resLogin->assertStatus(200);
            $token = $resLogin->json('token');
            $sessionToken = $resLogin->json('session_token');
            $this->assertNotEmpty($token);
            $this->assertContains($c['expectedRole'], $resLogin->json('roles'));

            if ($c['expectedRole'] === 'admin_instansi') {
                $adminBearer = $token;
                $adminSession = $sessionToken;
            }

            // 1. Call GET /api/auth/me with real Authorization: Bearer header
            $this->app['auth']->forgetGuards();
            $resMe = $this->withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Session-Token' => $sessionToken,
            ])->getJson('/api/auth/me');
            $resMe->assertStatus(200);
            $this->assertNotEmpty($resMe->json('permissions'));

            // 2. Call dashboard stats/exams with real Authorization: Bearer header
            $this->app['auth']->forgetGuards();
            $resDash = $this->withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-Session-Token' => $sessionToken,
            ])->getJson($c['dashboard']);
            $this->assertNotEquals(403, $resDash->status(), "Dashboard {$c['dashboard']} untuk {$c['login']} terkena 403!");
            $this->assertNotEquals(401, $resDash->status(), "Dashboard {$c['dashboard']} untuk {$c['login']} terkena 401!");
            $resDash->assertStatus(200);
        }

        // 3. Verifikasi perbandingan string 17-digit pada EnsureTenantOwnership (tidak terpotong jadi float)
        $this->app['auth']->forgetGuards();
        $resSame17 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $adminBearer,
            'X-Session-Token' => $adminSession,
        ])->postJson("/api/admin/instansi/{$instansi17}/gurus", []);
        $this->assertNotEquals(403, $resSame17->status(), '17-digit idkategori yang sama tidak boleh ditolak 403!');

        $this->app['auth']->forgetGuards();
        $resDiff17 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $adminBearer,
            'X-Session-Token' => $adminSession,
        ])->postJson("/api/admin/instansi/{$instansi17Other}/gurus", []);
        $resDiff17->assertStatus(403);
        $resDiff17->assertJson(['code' => 'TENANT_FORBIDDEN']);
    }

    public function test_real_login_custom_role_operator_ujian_reproduces_dashboard_403_and_allows_assigned_routes(): void
    {
        config([
            'cache.default' => 'file',
            'rbac.enforce' => true,
            'rbac.tenant_enforce' => true,
        ]);
        \Illuminate\Support\Facades\Cache::flush();

        $instansi17 = '27830150842287772';
        KategoriUserBo::create(['idkategori' => $instansi17, 'nama_kategori' => 'PGRI SLCC']);

        $opRole = Role::create([
            'name' => 'operator_ujian',
            'label' => 'Operator Ujian Sekolah',
            'instansi_id' => $instansi17,
            'scope_key' => $instansi17,
            'is_system' => false,
        ]);
        $permIds = DB::table('permissions')
            ->whereIn('key', ['jadwal.view', 'jadwal.manage', 'monitoring.view', 'proctoring.view'])
            ->pluck('id')
            ->all();
        $opRole->permissions()->sync($permIds);

        $opUser = UserBo::create([
            'iduser_bo' => '17949937923282656',
            'idkategori' => $instansi17,
            'nama' => 'Operator Uji',
            'login_username' => 'operator_uji_live',
            'login_password' => Hash::make('LivePass123!'),
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
        ]);
        $opUser->syncRoles([$opRole->id]);

        $this->app['auth']->forgetGuards();
        $resLogin = $this->postJson('/api/auth/login', [
            'login' => 'operator_uji_live',
            'password' => 'LivePass123!',
        ]);
        $resLogin->assertStatus(200);
        $token = $resLogin->json('token');
        $sessionToken = $resLogin->json('session_token');

        // user.role tetap 'admin', tetapi permissions tidak memiliki dashboard_sekolah.view
        $this->assertEquals('admin', $resLogin->json('user.role'));
        $this->assertNotContains('dashboard_sekolah.view', $resLogin->json('permissions'));
        $this->assertContains('jadwal.view', $resLogin->json('permissions'));

        // /api/admin/dashboard/stats -> 403 (karena tidak punya dashboard_sekolah.view)
        $this->app['auth']->forgetGuards();
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Session-Token' => $sessionToken,
        ])->getJson('/api/admin/dashboard/stats')->assertStatus(403);

        // /api/admin/exams -> 200 OK (sesuai permission jadwal.view)
        $this->app['auth']->forgetGuards();
        $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'X-Session-Token' => $sessionToken,
        ])->getJson('/api/admin/exams')->assertStatus(200);
    }

    public function test_tenant_scope_isolates_17_digit_instansi_ids_strictly_as_strings(): void
    {
        config(['rbac.tenant_enforce' => true]);

        // Dua ID numerik 17-digit yang HANYA berbeda di digit terakhir (rentan tabrakan jika cast ke float)
        $instansi1 = '27830150842287772';
        $instansi2 = '27830150842287773';

        KategoriUserBo::create(['idkategori' => $instansi1, 'nama_kategori' => 'Sekolah 17-Digit A']);
        KategoriUserBo::create(['idkategori' => $instansi2, 'nama_kategori' => 'Sekolah 17-Digit B']);

        $admin1 = UserBo::create([
            'iduser_bo' => '27830150842288801',
            'idkategori' => $instansi1,
            'nama' => 'Admin 17-Digit A',
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
        ]);

        // Seed data di kedua instansi 17-digit tanpa global scope
        MasterKelas::withoutGlobalScopes()->create(['idkategori' => $instansi1, 'nama_kelas' => 'XII IPA A']);
        MasterKelas::withoutGlobalScopes()->create(['idkategori' => $instansi2, 'nama_kelas' => 'XII IPA B']);

        Assessment::withoutGlobalScopes()->create([
            'idassessment' => 'exam-17-a',
            'idkategori' => $instansi1,
            'nama_assessment' => 'Ujian Sekolah A',
            'status_aktif' => 'Y',
        ]);
        Assessment::withoutGlobalScopes()->create([
            'idassessment' => 'exam-17-b',
            'idkategori' => $instansi2,
            'nama_assessment' => 'Ujian Sekolah B',
            'status_aktif' => 'Y',
        ]);

        Announcement::withoutGlobalScopes()->create([
            'title' => 'Pengumuman A',
            'content' => 'Konten A',
            'idkategori' => $instansi1,
        ]);
        Announcement::withoutGlobalScopes()->create([
            'title' => 'Pengumuman B',
            'content' => 'Konten B',
            'idkategori' => $instansi2,
        ]);
        Announcement::withoutGlobalScopes()->create([
            'title' => 'Pengumuman Nasional',
            'content' => 'Konten Nasional',
            'idkategori' => null,
        ]);

        // Login sebagai admin instansi 27830150842287772
        Sanctum::actingAs($admin1);

        // 1. MasterKelas hanya mengembalikan milik 27830150842287772 (tidak bocor 27830150842287773)
        $kelasNames = MasterKelas::pluck('nama_kelas')->all();
        $this->assertEquals(['XII IPA A'], $kelasNames);

        // 2. Assessment hanya mengembalikan milik 27830150842287772
        $examIds = Assessment::pluck('idassessment')->all();
        $this->assertEquals(['exam-17-a'], $examIds);

        // 3. Announcement mengembalikan milik 27830150842287772 + nasional (NULL), bukan 27830150842287773
        $annTitles = Announcement::pluck('title')->all();
        $this->assertContains('Pengumuman A', $annTitles);
        $this->assertContains('Pengumuman Nasional', $annTitles);
        $this->assertNotContains('Pengumuman B', $annTitles);
    }
}
