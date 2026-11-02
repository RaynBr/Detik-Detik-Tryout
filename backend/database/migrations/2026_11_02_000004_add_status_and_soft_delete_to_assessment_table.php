<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessment', function (Blueprint $table) {
            if (!Schema::hasColumn('assessment', 'tahun_soal_id')) {
                $table->unsignedBigInteger('tahun_soal_id')->nullable()->after('id_tahun_ajaran');
            }
            if (!Schema::hasColumn('assessment', 'status_aktif')) {
                $table->string('status_aktif', 10)->default('Y')->after('tahun_soal_id');
            }
            if (!Schema::hasColumn('assessment', 'deleted_at')) {
                $table->softDeletes()->after('status_aktif');
            }
        });

        // Backfill id_tahun_ajaran and status_aktif for legacy assessments
        DB::table('assessment')->whereNull('status_aktif')->update(['status_aktif' => 'Y']);
        $activeTa = DB::table('academic_years')->where('is_active', 1)->value('id') ?? 1;
        DB::table('assessment')->whereNull('id_tahun_ajaran')->update(['id_tahun_ajaran' => $activeTa]);
        $activeTahunSoal = DB::table('master_tahun_soal')->where('is_active', 1)->value('id') ?? 1;
        DB::table('assessment')->whereNull('tahun_soal_id')->update(['tahun_soal_id' => $activeTahunSoal]);

        // Backfill tahun_soal_id for questions if null
        $activeTahunSoal = DB::table('master_tahun_soal')->where('is_active', 1)->value('id') ?? 1;
        DB::table('assessment_soal_pilgan')->whereNull('tahun_soal_id')->update(['tahun_soal_id' => $activeTahunSoal]);
    }

    public function down(): void
    {
        Schema::table('assessment', function (Blueprint $table) {
            if (Schema::hasColumn('assessment', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
            if (Schema::hasColumn('assessment', 'status_aktif')) {
                $table->dropColumn('status_aktif');
            }
        });
    }
};
