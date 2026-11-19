<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Enforce strict Master Akademik relations for Admin Instansi & CBT Bank Soal.
     */
    public function up(): void
    {
        // 1. master_semester -> add academic_year_id
        if (Schema::hasTable('master_semester')) {
            Schema::table('master_semester', function (Blueprint $table) {
                if (!Schema::hasColumn('master_semester', 'academic_year_id')) {
                    $table->unsignedBigInteger('academic_year_id')->nullable()->after('idkategori')->index();
                }
            });

            // Backfill academic_year_id for existing records from active academic_years
            $defaultAy = DB::table('academic_years')->where('is_active', 1)->value('id')
                ?? DB::table('academic_years')->value('id');
            if ($defaultAy) {
                DB::table('master_semester')->whereNull('academic_year_id')->update(['academic_year_id' => $defaultAy]);
            }
        }

        // 2. majors -> add idjenjang
        if (Schema::hasTable('majors')) {
            Schema::table('majors', function (Blueprint $table) {
                if (!Schema::hasColumn('majors', 'idjenjang')) {
                    $table->unsignedInteger('idjenjang')->nullable()->after('idkategori')->index();
                }
            });

            // Backfill idjenjang based on jenjang name (only if jenjang column exists)
            if (Schema::hasColumn('majors', 'jenjang')) {
                $smaId = DB::table('master_jenjang')->where('kode_jenjang', 'SMA')->orWhere('nama_jenjang', 'like', '%SMA%')->value('id');
                $smkId = DB::table('master_jenjang')->where('kode_jenjang', 'SMK')->orWhere('nama_jenjang', 'like', '%SMK%')->value('id') ?? $smaId;
                if ($smaId) {
                    DB::table('majors')->where('jenjang', 'SMA')->whereNull('idjenjang')->update(['idjenjang' => $smaId]);
                }
                if ($smkId) {
                    DB::table('majors')->where('jenjang', 'SMK')->whereNull('idjenjang')->update(['idjenjang' => $smkId]);
                }
            }
        }

        // 3. master_tingkat_kelas -> add idjurusan
        if (Schema::hasTable('master_tingkat_kelas')) {
            Schema::table('master_tingkat_kelas', function (Blueprint $table) {
                if (!Schema::hasColumn('master_tingkat_kelas', 'idjurusan')) {
                    $table->unsignedBigInteger('idjurusan')->nullable()->after('idjenjang')->index();
                }
            });
        }

        // 4. master_mata_pelajaran -> add idkurikulum, idjurusan, idtingkat
        if (Schema::hasTable('master_mata_pelajaran')) {
            Schema::table('master_mata_pelajaran', function (Blueprint $table) {
                if (!Schema::hasColumn('master_mata_pelajaran', 'idkurikulum')) {
                    $table->unsignedBigInteger('idkurikulum')->nullable()->after('idkategori')->index();
                }
                if (!Schema::hasColumn('master_mata_pelajaran', 'idjurusan')) {
                    $table->unsignedBigInteger('idjurusan')->nullable()->after('idjenjang')->index();
                }
                if (!Schema::hasColumn('master_mata_pelajaran', 'idtingkat')) {
                    $table->unsignedBigInteger('idtingkat')->nullable()->after('idjurusan')->index();
                }
            });

            // Backfill default active kurikulum
            $defaultKurikulum = DB::table('master_kurikulum')->where('status_aktif', 'Y')->value('id')
                ?? DB::table('master_kurikulum')->value('id');
            if ($defaultKurikulum) {
                DB::table('master_mata_pelajaran')->whereNull('idkurikulum')->update(['idkurikulum' => $defaultKurikulum]);
            }

            // Backfill default tingkat based on idjenjang
            $defaultTingkat = DB::table('master_tingkat_kelas')->where('status_aktif', 'Y')->value('id');
            if ($defaultTingkat) {
                DB::table('master_mata_pelajaran')->whereNull('idtingkat')->update(['idtingkat' => $defaultTingkat]);
            }
        }

        // 5. assessment_soal_pilgan -> add idkurikulum, idtingkat, bab, tingkat_kesulitan, source_type
        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment_soal_pilgan', 'idkurikulum')) {
                    $table->unsignedBigInteger('idkurikulum')->nullable()->after('idmapel')->index();
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'idtingkat')) {
                    $table->unsignedBigInteger('idtingkat')->nullable()->after('idkurikulum')->index();
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'bab')) {
                    $table->string('bab', 150)->nullable()->after('idtingkat')->index();
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'tingkat_kesulitan')) {
                    $table->string('tingkat_kesulitan', 20)->default('Sedang')->after('bab')->index();
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'source_type')) {
                    $table->string('source_type', 20)->default('nasional')->after('tingkat_kesulitan')->index();
                }
            });

            // Populate source_type: if created by guru / user_bo with role guru -> 'guru', otherwise 'nasional'
            DB::table('assessment_soal_pilgan')->whereNull('source_type')->update(['source_type' => 'nasional']);
        }

        // 6. assessment -> add source_type, idkurikulum, acak_soal, acak_opsi
        if (Schema::hasTable('assessment')) {
            Schema::table('assessment', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment', 'source_type')) {
                    $table->string('source_type', 20)->default('nasional')->after('idkategori')->index();
                }
                if (!Schema::hasColumn('assessment', 'idkurikulum')) {
                    $table->unsignedBigInteger('idkurikulum')->nullable()->after('idmapel')->index();
                }
                if (!Schema::hasColumn('assessment', 'acak_soal')) {
                    $table->boolean('acak_soal')->default(false)->after('waktu_pengerjaan');
                }
                if (!Schema::hasColumn('assessment', 'acak_opsi')) {
                    $table->boolean('acak_opsi')->default(false)->after('acak_soal');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('master_semester') && Schema::hasColumn('master_semester', 'academic_year_id')) {
            Schema::table('master_semester', function (Blueprint $table) {
                $table->dropColumn('academic_year_id');
            });
        }

        if (Schema::hasTable('majors') && Schema::hasColumn('majors', 'idjenjang')) {
            Schema::table('majors', function (Blueprint $table) {
                $table->dropColumn('idjenjang');
            });
        }

        if (Schema::hasTable('master_tingkat_kelas') && Schema::hasColumn('master_tingkat_kelas', 'idjurusan')) {
            Schema::table('master_tingkat_kelas', function (Blueprint $table) {
                $table->dropColumn('idjurusan');
            });
        }

        if (Schema::hasTable('master_mata_pelajaran')) {
            Schema::table('master_mata_pelajaran', function (Blueprint $table) {
                if (Schema::hasColumn('master_mata_pelajaran', 'idkurikulum')) $table->dropColumn('idkurikulum');
                if (Schema::hasColumn('master_mata_pelajaran', 'idjurusan')) $table->dropColumn('idjurusan');
                if (Schema::hasColumn('master_mata_pelajaran', 'idtingkat')) $table->dropColumn('idtingkat');
            });
        }

        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (Schema::hasColumn('assessment_soal_pilgan', 'idkurikulum')) $table->dropColumn('idkurikulum');
                if (Schema::hasColumn('assessment_soal_pilgan', 'idtingkat')) $table->dropColumn('idtingkat');
                if (Schema::hasColumn('assessment_soal_pilgan', 'bab')) $table->dropColumn('bab');
                if (Schema::hasColumn('assessment_soal_pilgan', 'tingkat_kesulitan')) $table->dropColumn('tingkat_kesulitan');
                if (Schema::hasColumn('assessment_soal_pilgan', 'source_type')) $table->dropColumn('source_type');
            });
        }

        if (Schema::hasTable('assessment')) {
            Schema::table('assessment', function (Blueprint $table) {
                if (Schema::hasColumn('assessment', 'source_type')) $table->dropColumn('source_type');
                if (Schema::hasColumn('assessment', 'idkurikulum')) $table->dropColumn('idkurikulum');
                if (Schema::hasColumn('assessment', 'acak_soal')) $table->dropColumn('acak_soal');
                if (Schema::hasColumn('assessment', 'acak_opsi')) $table->dropColumn('acak_opsi');
            });
        }
    }
};

