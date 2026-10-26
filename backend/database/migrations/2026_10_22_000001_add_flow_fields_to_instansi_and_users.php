<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Kategori User BO (Instansi): masa_berlaku & encrypt_id
        if (Schema::hasTable('kategori_user_bo')) {
            Schema::table('kategori_user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('kategori_user_bo', 'masa_berlaku')) {
                    $table->date('masa_berlaku')->nullable()->after('nama_kategori');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'encrypt_id')) {
                    $table->string('encrypt_id', 100)->nullable()->after('masa_berlaku');
                }
            });
        }

        // 2. User BO (Staff/Admin/Guru): jenis_kelamin & nuptk
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('user_bo', 'jenis_kelamin')) {
                    $table->enum('jenis_kelamin', ['L', 'P'])->nullable()->after('alamat');
                }
                if (!Schema::hasColumn('user_bo', 'nuptk')) {
                    $table->string('nuptk', 50)->nullable()->after('jenis_kelamin');
                }
            });
        }

        // 3. User (Siswa): jenis_kelamin & nis
        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (!Schema::hasColumn('user', 'jenis_kelamin')) {
                    $table->enum('jenis_kelamin', ['L', 'P'])->nullable()->after('alamat');
                }
                if (!Schema::hasColumn('user', 'nis')) {
                    $table->string('nis', 50)->nullable()->after('nisn');
                }
            });
        }

        // 4. Assessment Soal Pilgan: status_aktif & iduser_bo
        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment_soal_pilgan', 'status_aktif')) {
                    $table->enum('status_aktif', ['Y', 'N'])->default('Y')->after('penjelasan_jawaban');
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'iduser_bo')) {
                    $table->string('iduser_bo', 50)->nullable()->after('status_aktif');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('kategori_user_bo')) {
            Schema::table('kategori_user_bo', function (Blueprint $table) {
                if (Schema::hasColumn('kategori_user_bo', 'masa_berlaku')) {
                    $table->dropColumn('masa_berlaku');
                }
                if (Schema::hasColumn('kategori_user_bo', 'encrypt_id')) {
                    $table->dropColumn('encrypt_id');
                }
            });
        }

        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (Schema::hasColumn('user_bo', 'jenis_kelamin')) {
                    $table->dropColumn('jenis_kelamin');
                }
                if (Schema::hasColumn('user_bo', 'nuptk')) {
                    $table->dropColumn('nuptk');
                }
            });
        }

        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (Schema::hasColumn('user', 'jenis_kelamin')) {
                    $table->dropColumn('jenis_kelamin');
                }
                if (Schema::hasColumn('user', 'nis')) {
                    $table->dropColumn('nis');
                }
            });
        }
    }
};
