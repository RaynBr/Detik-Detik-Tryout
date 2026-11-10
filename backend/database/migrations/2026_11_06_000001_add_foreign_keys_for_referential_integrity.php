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
        $existingConstraints = collect(DB::select("
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
        "))->pluck('CONSTRAINT_NAME')->all();

        // 1. user.idkelas -> master_kelas.id
        if (!in_array('fk_user_master_kelas', $existingConstraints)) {
            Schema::table('user', function (Blueprint $table) {
                $table->foreign('idkelas', 'fk_user_master_kelas')
                    ->references('id')
                    ->on('master_kelas')
                    ->onDelete('set null');
            });
        }

        // 2. user.idkategori -> kategori_user_bo.idkategori
        if (!in_array('fk_user_kategori_user_bo', $existingConstraints)) {
            Schema::table('user', function (Blueprint $table) {
                $table->foreign('idkategori', 'fk_user_kategori_user_bo')
                    ->references('idkategori')
                    ->on('kategori_user_bo')
                    ->onDelete('set null');
            });
        }

        // 3-6. master_kelas foreign keys
        if (!in_array('fk_master_kelas_academic_year', $existingConstraints)) {
            Schema::table('master_kelas', function (Blueprint $table) {
                $table->foreign('academic_year_id', 'fk_master_kelas_academic_year')
                    ->references('id')
                    ->on('academic_years')
                    ->onDelete('set null');
            });
        }

        if (!in_array('fk_master_kelas_semester', $existingConstraints)) {
            Schema::table('master_kelas', function (Blueprint $table) {
                $table->foreign('semester_id', 'fk_master_kelas_semester')
                    ->references('id')
                    ->on('master_semester')
                    ->onDelete('set null');
            });
        }

        if (!in_array('fk_master_kelas_kurikulum', $existingConstraints)) {
            Schema::table('master_kelas', function (Blueprint $table) {
                $table->foreign('kurikulum_id', 'fk_master_kelas_kurikulum')
                    ->references('id')
                    ->on('master_kurikulum')
                    ->onDelete('set null');
            });
        }

        if (!in_array('fk_master_kelas_wali', $existingConstraints)) {
            DB::statement("ALTER TABLE master_kelas MODIFY wali_kelas_id VARCHAR(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL");
            Schema::table('master_kelas', function (Blueprint $table) {
                $table->foreign('wali_kelas_id', 'fk_master_kelas_wali')
                    ->references('iduser_bo')
                    ->on('user_bo')
                    ->onDelete('set null');
            });
        }

        // 7-9. guru_mata_pelajaran foreign keys
        if (!in_array('fk_guru_mapel_user_bo', $existingConstraints)) {
            DB::statement("ALTER TABLE guru_mata_pelajaran MODIFY iduser_bo VARCHAR(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL");
            Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
                $table->foreign('iduser_bo', 'fk_guru_mapel_user_bo')
                    ->references('iduser_bo')
                    ->on('user_bo')
                    ->onDelete('cascade');
            });
        }

        if (!in_array('fk_guru_mapel_academic_year', $existingConstraints)) {
            Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
                $table->foreign('academic_year_id', 'fk_guru_mapel_academic_year')
                    ->references('id')
                    ->on('academic_years')
                    ->onDelete('set null');
            });
        }

        if (!in_array('fk_guru_mapel_semester', $existingConstraints)) {
            Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
                $table->foreign('semester_id', 'fk_guru_mapel_semester')
                    ->references('id')
                    ->on('master_semester')
                    ->onDelete('set null');
            });
        }

        // 10-13. assessment foreign keys
        if (!in_array('fk_assessment_master_mapel', $existingConstraints)) {
            Schema::table('assessment', function (Blueprint $table) {
                $table->foreign('idmapel', 'fk_assessment_master_mapel')
                    ->references('id')
                    ->on('master_mata_pelajaran')
                    ->onDelete('set null');
            });
        }

        if (!in_array('fk_assessment_master_jenjang', $existingConstraints)) {
            Schema::table('assessment', function (Blueprint $table) {
                $table->foreign('idjenjang', 'fk_assessment_master_jenjang')
                    ->references('id')
                    ->on('master_jenjang')
                    ->onDelete('set null');
            });
        }

        if (!in_array('fk_assessment_academic_year', $existingConstraints)) {
            Schema::table('assessment', function (Blueprint $table) {
                $table->foreign('id_tahun_ajaran', 'fk_assessment_academic_year')
                    ->references('id')
                    ->on('academic_years')
                    ->onDelete('set null');
            });
        }

        if (!in_array('fk_assessment_master_kurikulum', $existingConstraints)) {
            Schema::table('assessment', function (Blueprint $table) {
                $table->foreign('idkurikulum', 'fk_assessment_master_kurikulum')
                    ->references('id')
                    ->on('master_kurikulum')
                    ->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessment', function (Blueprint $table) {
            $table->dropForeign('fk_assessment_master_mapel');
            $table->dropForeign('fk_assessment_master_jenjang');
            $table->dropForeign('fk_assessment_academic_year');
            $table->dropForeign('fk_assessment_master_kurikulum');
        });

        Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
            $table->dropForeign('fk_guru_mapel_user_bo');
            $table->dropForeign('fk_guru_mapel_academic_year');
            $table->dropForeign('fk_guru_mapel_semester');
        });

        Schema::table('master_kelas', function (Blueprint $table) {
            $table->dropForeign('fk_master_kelas_academic_year');
            $table->dropForeign('fk_master_kelas_semester');
            $table->dropForeign('fk_master_kelas_kurikulum');
            $table->dropForeign('fk_master_kelas_wali');
        });

        Schema::table('user', function (Blueprint $table) {
            $table->dropForeign('fk_user_master_kelas');
            $table->dropForeign('fk_user_kategori_user_bo');
        });
    }
};
