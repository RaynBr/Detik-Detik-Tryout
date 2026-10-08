<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Master Mata Pelajaran (Relasi ke Jenjang)
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

        // 2. Relasi Guru Pengampu Mata Pelajaran & Kelas (user_bo -> master_mata_pelajaran & master_kelas)
        if (!Schema::hasTable('guru_mata_pelajaran')) {
            Schema::create('guru_mata_pelajaran', function (Blueprint $table) {
                $table->increments('id');
                $table->string('iduser_bo', 25)->index(); // index matching user_bo collation
                $table->unsignedInteger('idmapel');
                $table->unsignedInteger('idkelas')->nullable();
                $table->string('tahun_ajaran', 20)->default('2026/2027');
                $table->timestamps();

                $table->foreign('idmapel')->references('id')->on('master_mata_pelajaran')->onDelete('cascade');
                $table->foreign('idkelas')->references('id')->on('master_kelas')->onDelete('cascade');
            });
        }

        // 3. Relasi Siswa ke Kelas (user -> master_kelas)
        if (!Schema::hasTable('siswa_kelas')) {
            Schema::create('siswa_kelas', function (Blueprint $table) {
                $table->increments('id');
                $table->string('iduser', 36)->index(); // index matching user collation
                $table->unsignedInteger('idkelas');
                $table->string('nisn', 30)->nullable();
                $table->string('tahun_ajaran', 20)->default('2026/2027');
                $table->enum('status', ['aktif', 'lulus', 'mutasi'])->default('aktif');
                $table->timestamps();

                $table->foreign('idkelas')->references('id')->on('master_kelas')->onDelete('cascade');
            });
        }

        // 4. Kolom pendukung di user_bo jika belum ada
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('user_bo', 'role_type')) {
                    $table->string('role_type', 30)->nullable();
                }
                if (!Schema::hasColumn('user_bo', 'active_session_token')) {
                    $table->string('active_session_token', 100)->nullable();
                }
                if (!Schema::hasColumn('user_bo', 'last_login_at')) {
                    $table->dateTime('last_login_at')->nullable();
                }
            });
        }

        // 5. Kolom pendukung di user (siswa) jika belum ada
        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (!Schema::hasColumn('user', 'nisn')) {
                    $table->string('nisn', 30)->nullable();
                }
                if (!Schema::hasColumn('user', 'idkelas')) {
                    $table->unsignedInteger('idkelas')->nullable();
                }
                if (!Schema::hasColumn('user', 'active_session_token')) {
                    $table->string('active_session_token', 100)->nullable();
                }
                if (!Schema::hasColumn('user', 'last_login_at')) {
                    $table->dateTime('last_login_at')->nullable();
                }
            });
        }

        // 6. Kolom kurikulum pendukung di assessment jika belum ada
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

    public function down(): void
    {
        Schema::dropIfExists('siswa_kelas');
        Schema::dropIfExists('guru_mata_pelajaran');
        Schema::dropIfExists('master_mata_pelajaran');
    }
};
