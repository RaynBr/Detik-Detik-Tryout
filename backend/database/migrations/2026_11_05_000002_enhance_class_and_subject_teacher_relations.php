<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Establish Kelola Kelas & Rombel as the central relational hub for Master Akademik, Guru, and Siswa.
     */
    public function up(): void
    {
        // 1. master_kelas
        if (Schema::hasTable('master_kelas')) {
            Schema::table('master_kelas', function (Blueprint $table) {
                if (!Schema::hasColumn('master_kelas', 'academic_year_id')) {
                    $table->unsignedBigInteger('academic_year_id')->nullable()->after('idkategori')->index();
                }
                if (!Schema::hasColumn('master_kelas', 'semester_id')) {
                    $table->unsignedBigInteger('semester_id')->nullable()->after('academic_year_id')->index();
                }
                if (!Schema::hasColumn('master_kelas', 'kurikulum_id')) {
                    $table->unsignedBigInteger('kurikulum_id')->nullable()->after('semester_id')->index();
                }
                if (!Schema::hasColumn('master_kelas', 'idjurusan')) {
                    $table->unsignedBigInteger('idjurusan')->nullable()->after('idjenjang')->index();
                }
                if (!Schema::hasColumn('master_kelas', 'idtingkat')) {
                    $table->unsignedBigInteger('idtingkat')->nullable()->after('idjurusan')->index();
                }
            });

            // Backfill default academic references for existing classes
            $activeAy = DB::table('academic_years')->where('is_active', 1)->first()
                ?? DB::table('academic_years')->first();
            $activeSem = DB::table('master_semester')->where('status_aktif', 'Y')->first()
                ?? DB::table('master_semester')->first();
            $activeKur = DB::table('master_kurikulum')->where('status_aktif', 'Y')->first()
                ?? DB::table('master_kurikulum')->first();

            if ($activeAy) {
                DB::table('master_kelas')->whereNull('academic_year_id')->update(['academic_year_id' => $activeAy->id]);
            }
            if ($activeSem) {
                DB::table('master_kelas')->whereNull('semester_id')->update(['semester_id' => $activeSem->id]);
            }
            if ($activeKur) {
                DB::table('master_kelas')->whereNull('kurikulum_id')->update(['kurikulum_id' => $activeKur->id]);
            }

            // Backfill idtingkat by matching tingkat level
            $tingkats = DB::table('master_tingkat_kelas')->get();
            foreach ($tingkats as $t) {
                DB::table('master_kelas')
                    ->whereNull('idtingkat')
                    ->where('idjenjang', $t->idjenjang)
                    ->where('tingkat', $t->tingkat)
                    ->update(['idtingkat' => $t->id]);
            }

            // Backfill idjurusan by matching jurusan name
            $majors = DB::table('majors')->get();
            foreach ($majors as $m) {
                DB::table('master_kelas')
                    ->whereNull('idjurusan')
                    ->where('jurusan', $m->name)
                    ->update(['idjurusan' => $m->id]);
            }
        }

        // 2. guru_mata_pelajaran
        if (Schema::hasTable('guru_mata_pelajaran')) {
            Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
                if (!Schema::hasColumn('guru_mata_pelajaran', 'academic_year_id')) {
                    $table->unsignedBigInteger('academic_year_id')->nullable()->after('idkelas')->index();
                }
                if (!Schema::hasColumn('guru_mata_pelajaran', 'semester_id')) {
                    $table->unsignedBigInteger('semester_id')->nullable()->after('academic_year_id')->index();
                }
            });

            // Sync from master_kelas where possible
            $classes = DB::table('master_kelas')->select('id', 'academic_year_id', 'semester_id')->get();
            foreach ($classes as $c) {
                DB::table('guru_mata_pelajaran')
                    ->where('idkelas', $c->id)
                    ->whereNull('academic_year_id')
                    ->update([
                        'academic_year_id' => $c->academic_year_id,
                        'semester_id' => $c->semester_id,
                    ]);
            }
        }

        // 3. siswa_kelas
        if (Schema::hasTable('siswa_kelas')) {
            Schema::table('siswa_kelas', function (Blueprint $table) {
                if (!Schema::hasColumn('siswa_kelas', 'academic_year_id')) {
                    $table->unsignedBigInteger('academic_year_id')->nullable()->after('idkelas')->index();
                }
                if (!Schema::hasColumn('siswa_kelas', 'semester_id')) {
                    $table->unsignedBigInteger('semester_id')->nullable()->after('academic_year_id')->index();
                }
            });

            // Sync from master_kelas where possible
            $classes = DB::table('master_kelas')->select('id', 'academic_year_id', 'semester_id')->get();
            foreach ($classes as $c) {
                DB::table('siswa_kelas')
                    ->where('idkelas', $c->id)
                    ->whereNull('academic_year_id')
                    ->update([
                        'academic_year_id' => $c->academic_year_id,
                        'semester_id' => $c->semester_id,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('master_kelas')) {
            Schema::table('master_kelas', function (Blueprint $table) {
                $columns = ['academic_year_id', 'semester_id', 'kurikulum_id', 'idjurusan', 'idtingkat'];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('master_kelas', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('guru_mata_pelajaran')) {
            Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
                $columns = ['academic_year_id', 'semester_id'];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('guru_mata_pelajaran', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('siswa_kelas')) {
            Schema::table('siswa_kelas', function (Blueprint $table) {
                $columns = ['academic_year_id', 'semester_id'];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('siswa_kelas', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};

