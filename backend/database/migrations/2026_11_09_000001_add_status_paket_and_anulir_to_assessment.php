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
        Schema::table('assessment', function (Blueprint $table) {
            if (!Schema::hasColumn('assessment', 'status_paket')) {
                $table->string('status_paket', 20)->default('draft')->after('status_aktif')->index();
            }
            if (!Schema::hasColumn('assessment', 'is_locked')) {
                $table->boolean('is_locked')->default(false)->after('status_paket');
            }
            if (!Schema::hasColumn('assessment', 'locked_at')) {
                $table->timestamp('locked_at')->nullable()->after('is_locked');
            }
        });

        Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
            if (!Schema::hasColumn('assessment_soal_pilgan', 'is_annulled')) {
                $table->boolean('is_annulled')->default(false)->after('status_publikasi')->index();
            }
            if (!Schema::hasColumn('assessment_soal_pilgan', 'annulled_at')) {
                $table->timestamp('annulled_at')->nullable()->after('is_annulled');
            }
            if (!Schema::hasColumn('assessment_soal_pilgan', 'annulled_reason')) {
                $table->string('annulled_reason', 255)->nullable()->after('annulled_at');
            }
            if (!Schema::hasColumn('assessment_soal_pilgan', 'urutan')) {
                $table->unsignedInteger('urutan')->default(1)->after('annulled_reason');
            }
        });

        // Initialize existing assessments safely
        DB::statement("
            UPDATE assessment a
            LEFT JOIN (
                SELECT idassessment, COUNT(*) as att_count 
                FROM assessment_jawaban_pilgan 
                GROUP BY idassessment
            ) j ON a.idassessment = j.idassessment
            SET 
                a.is_locked = IF(COALESCE(j.att_count, 0) > 0, 1, 0),
                a.locked_at = IF(COALESCE(j.att_count, 0) > 0, NOW(), NULL),
                a.status_paket = CASE 
                    WHEN COALESCE(j.att_count, 0) > 0 THEN 'terkunci'
                    WHEN a.status_aktif = 'Y' THEN 'aktif'
                    ELSE 'draft'
                END
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessment', function (Blueprint $table) {
            $table->dropColumn(['status_paket', 'is_locked', 'locked_at']);
        });

        Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
            $table->dropColumn(['is_annulled', 'annulled_at', 'annulled_reason', 'urutan']);
        });
    }
};

