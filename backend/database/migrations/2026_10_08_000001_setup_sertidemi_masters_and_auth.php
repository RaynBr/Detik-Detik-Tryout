<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Personal Access Tokens for Sanctum (VARCHAR tokenable_id for user & user_bo)
        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->string('tokenable_type');
                $table->string('tokenable_id', 64);
                $table->index(['tokenable_type', 'tokenable_id']);
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamps();
            });
        }

        // 2. Master Jenjang
        if (!Schema::hasTable('master_jenjang')) {
            Schema::create('master_jenjang', function (Blueprint $table) {
                $table->increments('id');
                $table->string('kode_jenjang', 20)->unique();
                $table->string('nama_jenjang', 100);
                $table->integer('urutan')->default(1);
                $table->text('keterangan')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y');
                $table->timestamps();
            });
        }

        // 3. Master Kelas (Relasi ke Jenjang & Wali Kelas di user_bo)
        if (!Schema::hasTable('master_kelas')) {
            Schema::create('master_kelas', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('idjenjang');
                $table->string('nama_kelas', 50);
                $table->integer('tingkat')->default(10);
                $table->string('jurusan', 100)->nullable()->default('Umum');
                $table->string('wali_kelas_id', 25)->nullable();
                $table->integer('kapasitas')->default(36);
                $table->text('keterangan')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y');
                $table->timestamps();

                $table->foreign('idjenjang')->references('id')->on('master_jenjang')->onDelete('cascade');
                $table->foreign('wali_kelas_id')->references('iduser_bo')->on('user_bo')->onDelete('set null');
            });
        }

        // 4. Master Mata Pelajaran (Relasi ke Jenjang)
        if (!Schema::hasTable('master_mata_pelajaran')) {
            Schema::create('master_mata_pelajaran', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('idjenjang');
                $table->string('kode_mapel', 30)->unique();
                $table->string('nama_mapel', 100);
                $table->string('kelompok', 50)->default('Wajib'); // Wajib, Peminatan, Muatan Lokal, Keahlian
                $table->decimal('kkm', 5, 2)->default(75.00);
                $table->text('deskripsi')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y');
                $table->timestamps();

                $table->foreign('idjenjang')->references('id')->on('master_jenjang')->onDelete('cascade');
            });
        }

        // 5. Relasi Guru Pengampu Mata Pelajaran (user_bo -> master_mata_pelajaran & master_kelas)
        if (!Schema::hasTable('guru_mata_pelajaran')) {
            Schema::create('guru_mata_pelajaran', function (Blueprint $table) {
                $table->increments('id');
                $table->string('iduser_bo', 25);
                $table->unsignedInteger('idmapel');
                $table->unsignedInteger('idkelas')->nullable();
                $table->string('tahun_ajaran', 20)->default('2026/2027');
                $table->timestamps();

                $table->foreign('iduser_bo')->references('iduser_bo')->on('user_bo')->onDelete('cascade');
                $table->foreign('idmapel')->references('id')->on('master_mata_pelajaran')->onDelete('cascade');
                $table->foreign('idkelas')->references('id')->on('master_kelas')->onDelete('cascade');
            });
        }

        // 6. Relasi Siswa ke Kelas (user -> master_kelas)
        if (!Schema::hasTable('siswa_kelas')) {
            Schema::create('siswa_kelas', function (Blueprint $table) {
                $table->increments('id');
                $table->string('iduser', 36);
                $table->unsignedInteger('idkelas');
                $table->string('nisn', 30)->nullable();
                $table->string('tahun_ajaran', 20)->default('2026/2027');
                $table->enum('status', ['aktif', 'lulus', 'mutasi'])->default('aktif');
                $table->timestamps();

                $table->foreign('iduser')->references('iduser')->on('user')->onDelete('cascade');
                $table->foreign('idkelas')->references('id')->on('master_kelas')->onDelete('cascade');
            });
        }

        // 7. Tambahkan kolom pendukung di user_bo jika belum ada
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('user_bo', 'role_type')) {
                    $table->string('role_type', 30)->nullable()->after('status_admin');
                }
                if (!Schema::hasColumn('user_bo', 'active_session_token')) {
                    $table->string('active_session_token', 100)->nullable();
                }
                if (!Schema::hasColumn('user_bo', 'last_login_at')) {
                    $table->dateTime('last_login_at')->nullable();
                }
            });
        }

        // 8. Tambahkan kolom pendukung di user (siswa) jika belum ada
        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (!Schema::hasColumn('user', 'nisn')) {
                    $table->string('nisn', 30)->nullable()->after('nama');
                }
                if (!Schema::hasColumn('user', 'idkelas')) {
                    $table->unsignedInteger('idkelas')->nullable()->after('nisn');
                }
                if (!Schema::hasColumn('user', 'active_session_token')) {
                    $table->string('active_session_token', 100)->nullable();
                }
                if (!Schema::hasColumn('user', 'last_login_at')) {
                    $table->dateTime('last_login_at')->nullable();
                }
            });
        }

        // 9. Tambahkan kolom jenjang/kelas/mapel di assessment jika belum ada (opsional untuk menghubungkan exam ke kurikulum)
        if (Schema::hasTable('assessment')) {
            Schema::table('assessment', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment', 'idjenjang')) {
                    $table->unsignedInteger('idjenjang')->nullable();
                }
                if (!Schema::hasColumn('assessment', 'idkelas')) {
                    $table->unsignedInteger('idkelas')->nullable();
                }
                if (!Schema::hasColumn('assessment', 'idmapel')) {
                    $table->unsignedInteger('idmapel')->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('siswa_kelas');
        Schema::dropIfExists('guru_mata_pelajaran');
        Schema::dropIfExists('master_mata_pelajaran');
        Schema::dropIfExists('master_kelas');
        Schema::dropIfExists('master_jenjang');
        Schema::dropIfExists('personal_access_tokens');
    }
};
