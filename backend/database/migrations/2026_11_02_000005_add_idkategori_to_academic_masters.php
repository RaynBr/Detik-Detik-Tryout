<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add idkategori to all Master Akademik tables for strict multi-tenant school isolation.
     */
    public function up(): void
    {
        $defaultInstansi = '27830150842287772';

        // 1. academic_years
        if (Schema::hasTable('academic_years') && !Schema::hasColumn('academic_years', 'idkategori')) {
            Schema::table('academic_years', function (Blueprint $table) {
                $table->string('idkategori', 50)->nullable()->after('id')->index();
            });
            DB::table('academic_years')->whereNull('idkategori')->update(['idkategori' => $defaultInstansi]);
        }

        // 2. master_semester
        if (Schema::hasTable('master_semester')) {
            if (!Schema::hasColumn('master_semester', 'idkategori')) {
                Schema::table('master_semester', function (Blueprint $table) {
                    $table->string('idkategori', 50)->nullable()->after('id')->index();
                });
            }
            try {
                Schema::table('master_semester', function (Blueprint $table) {
                    $table->dropUnique('master_semester_kode_semester_unique');
                });
            } catch (\Throwable $e) {}

            DB::table('master_semester')->whereNull('idkategori')->update(['idkategori' => $defaultInstansi]);
        }

        // 3. master_kurikulum
        if (Schema::hasTable('master_kurikulum')) {
            if (!Schema::hasColumn('master_kurikulum', 'idkategori')) {
                Schema::table('master_kurikulum', function (Blueprint $table) {
                    $table->string('idkategori', 50)->nullable()->after('id')->index();
                });
            }
            try {
                Schema::table('master_kurikulum', function (Blueprint $table) {
                    $table->dropUnique('master_kurikulum_kode_kurikulum_unique');
                });
            } catch (\Throwable $e) {}

            DB::table('master_kurikulum')->whereNull('idkategori')->update(['idkategori' => $defaultInstansi]);
        }

        // 4. master_jenjang
        if (Schema::hasTable('master_jenjang')) {
            if (!Schema::hasColumn('master_jenjang', 'idkategori')) {
                Schema::table('master_jenjang', function (Blueprint $table) {
                    $table->string('idkategori', 50)->nullable()->after('id')->index();
                });
            }
            try {
                Schema::table('master_jenjang', function (Blueprint $table) {
                    $table->dropUnique('master_jenjang_kode_jenjang_unique');
                });
            } catch (\Throwable $e) {}

            DB::table('master_jenjang')->whereNull('idkategori')->update(['idkategori' => $defaultInstansi]);
        }

        // 5. majors
        if (Schema::hasTable('majors')) {
            if (!Schema::hasColumn('majors', 'idkategori')) {
                Schema::table('majors', function (Blueprint $table) {
                    $table->string('idkategori', 50)->nullable()->after('id')->index();
                });
            }
            try {
                Schema::table('majors', function (Blueprint $table) {
                    $table->dropUnique('majors_code_unique');
                });
            } catch (\Throwable $e) {}

            DB::table('majors')->whereNull('idkategori')->update(['idkategori' => $defaultInstansi]);
        }

        // 6. master_tingkat_kelas
        if (Schema::hasTable('master_tingkat_kelas')) {
            if (!Schema::hasColumn('master_tingkat_kelas', 'idkategori')) {
                Schema::table('master_tingkat_kelas', function (Blueprint $table) {
                    $table->string('idkategori', 50)->nullable()->after('id')->index();
                });
            }
            try {
                Schema::table('master_tingkat_kelas', function (Blueprint $table) {
                    $table->dropUnique('master_tingkat_kelas_tingkat_nama_tingkat_unique');
                });
            } catch (\Throwable $e) {}

            DB::table('master_tingkat_kelas')->whereNull('idkategori')->update(['idkategori' => $defaultInstansi]);
        }

        // 7. master_mata_pelajaran
        if (Schema::hasTable('master_mata_pelajaran')) {
            if (!Schema::hasColumn('master_mata_pelajaran', 'idkategori')) {
                Schema::table('master_mata_pelajaran', function (Blueprint $table) {
                    $table->string('idkategori', 50)->nullable()->after('id')->index();
                });
            }
            try {
                Schema::table('master_mata_pelajaran', function (Blueprint $table) {
                    $table->dropUnique('master_mata_pelajaran_kode_mapel_unique');
                });
            } catch (\Throwable $e) {}

            DB::table('master_mata_pelajaran')->whereNull('idkategori')->update(['idkategori' => $defaultInstansi]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'academic_years',
            'master_semester',
            'master_kurikulum',
            'master_jenjang',
            'majors',
            'master_tingkat_kelas',
            'master_mata_pelajaran',
        ];

        foreach ($tables as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'idkategori')) {
                Schema::table($t, function (Blueprint $table) {
                    $table->dropColumn('idkategori');
                });
            }
        }
    }
};
