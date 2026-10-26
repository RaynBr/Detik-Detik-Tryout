<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_tahun_soal', function (Blueprint $table) {
            $table->id();
            $table->string('tahun', 20)->unique(); // e.g. "2024", "2025", "2026/2027"
            $table->string('keterangan')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Add tahun_soal_id column to assessment_soal_pilgan
        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment_soal_pilgan', 'tahun_soal_id')) {
                    $table->unsignedBigInteger('tahun_soal_id')->nullable()->after('idmapel');
                    $table->index('tahun_soal_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('assessment_soal_pilgan') && Schema::hasColumn('assessment_soal_pilgan', 'tahun_soal_id')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                $table->dropIndex(['tahun_soal_id']);
                $table->dropColumn('tahun_soal_id');
            });
        }

        Schema::dropIfExists('master_tahun_soal');
    }
};
