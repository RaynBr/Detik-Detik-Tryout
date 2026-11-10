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
        // 1. Add missing academic relationships to assessment_soal_pilgan
        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment_soal_pilgan', 'id_tahun_ajaran')) {
                    $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->after('idkurikulum')->index();
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'semester_id')) {
                    $table->unsignedBigInteger('semester_id')->nullable()->after('id_tahun_ajaran')->index();
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'idkelas')) {
                    $table->unsignedBigInteger('idkelas')->nullable()->after('idtingkat')->index();
                }
            });
        }

        // 2. Add id_tahun_ajaran to user_bo (Teachers / Staff)
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('user_bo', 'id_tahun_ajaran')) {
                    $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->after('idjenjang')->index();
                }
            });
        }

        // 3. Add id_tahun_ajaran to user (Students)
        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (!Schema::hasColumn('user', 'id_tahun_ajaran')) {
                    $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->after('idkelas')->index();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (Schema::hasColumn('assessment_soal_pilgan', 'idkelas')) {
                    $table->dropColumn('idkelas');
                }
                if (Schema::hasColumn('assessment_soal_pilgan', 'semester_id')) {
                    $table->dropColumn('semester_id');
                }
                if (Schema::hasColumn('assessment_soal_pilgan', 'id_tahun_ajaran')) {
                    $table->dropColumn('id_tahun_ajaran');
                }
            });
        }

        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (Schema::hasColumn('user_bo', 'id_tahun_ajaran')) {
                    $table->dropColumn('id_tahun_ajaran');
                }
            });
        }

        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (Schema::hasColumn('user', 'id_tahun_ajaran')) {
                    $table->dropColumn('id_tahun_ajaran');
                }
            });
        }
    }
};

