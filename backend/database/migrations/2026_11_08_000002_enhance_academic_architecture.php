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
        // 1. Add academic_year_id and semester_id to master_mata_pelajaran
        Schema::table('master_mata_pelajaran', function (Blueprint $table) {
            if (!Schema::hasColumn('master_mata_pelajaran', 'academic_year_id')) {
                $table->unsignedBigInteger('academic_year_id')->nullable()->after('idkategori');
                $table->index('academic_year_id', 'idx_m_mapel_academic_year');
            }
            if (!Schema::hasColumn('master_mata_pelajaran', 'semester_id')) {
                $table->unsignedBigInteger('semester_id')->nullable()->after('academic_year_id');
                $table->index('semester_id', 'idx_m_mapel_semester');
            }
        });

        // 2. Add status_publikasi, created_by, updated_by to assessment_soal_pilgan
        Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
            if (!Schema::hasColumn('assessment_soal_pilgan', 'status_publikasi')) {
                $table->string('status_publikasi', 20)->default('published')->after('status_aktif');
            }
            if (!Schema::hasColumn('assessment_soal_pilgan', 'created_by')) {
                $table->string('created_by', 100)->nullable()->after('iduser_bo');
            }
            if (!Schema::hasColumn('assessment_soal_pilgan', 'updated_by')) {
                $table->string('updated_by', 100)->nullable()->after('created_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_mata_pelajaran', function (Blueprint $table) {
            if (Schema::hasColumn('master_mata_pelajaran', 'academic_year_id')) {
                $table->dropIndex('idx_m_mapel_academic_year');
                $table->dropColumn('academic_year_id');
            }
            if (Schema::hasColumn('master_mata_pelajaran', 'semester_id')) {
                $table->dropIndex('idx_m_mapel_semester');
                $table->dropColumn('semester_id');
            }
        });

        Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
            if (Schema::hasColumn('assessment_soal_pilgan', 'status_publikasi')) {
                $table->dropColumn('status_publikasi');
            }
            if (Schema::hasColumn('assessment_soal_pilgan', 'created_by')) {
                $table->dropColumn('created_by');
            }
            if (Schema::hasColumn('assessment_soal_pilgan', 'updated_by')) {
                $table->dropColumn('updated_by');
            }
        });
    }
};

