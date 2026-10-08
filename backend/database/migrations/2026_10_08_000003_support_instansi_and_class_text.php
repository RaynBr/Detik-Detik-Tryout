<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add idkategori to master_kelas if not exists
        if (Schema::hasTable('master_kelas')) {
            Schema::table('master_kelas', function (Blueprint $table) {
                if (!Schema::hasColumn('master_kelas', 'idkategori')) {
                    $table->string('idkategori', 25)->nullable()->after('idjenjang')->index();
                }
            });
        }

        // 2. Add idkategori to user (siswa) if not exists
        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (!Schema::hasColumn('user', 'idkategori')) {
                    $table->string('idkategori', 25)->nullable()->after('idkelas')->index();
                }
            });
        }

        // 3. Add idkategori to assessment if not exists
        if (Schema::hasTable('assessment')) {
            Schema::table('assessment', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment', 'idkategori')) {
                    $table->string('idkategori', 25)->nullable()->after('idassessment_kategori')->index();
                }
            });
        }

        // 4. Add idjenjang & idmapel to assessment_soal_pilgan for universal Bank Soal categorization
        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment_soal_pilgan', 'idjenjang')) {
                    $table->unsignedInteger('idjenjang')->nullable()->after('idassessment')->index();
                }
                if (!Schema::hasColumn('assessment_soal_pilgan', 'idmapel')) {
                    $table->unsignedInteger('idmapel')->nullable()->after('idjenjang')->index();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('master_kelas')) {
            Schema::table('master_kelas', function (Blueprint $table) {
                if (Schema::hasColumn('master_kelas', 'idkategori')) {
                    $table->dropColumn('idkategori');
                }
            });
        }

        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (Schema::hasColumn('user', 'idkategori')) {
                    $table->dropColumn('idkategori');
                }
            });
        }

        if (Schema::hasTable('assessment')) {
            Schema::table('assessment', function (Blueprint $table) {
                if (Schema::hasColumn('assessment', 'idkategori')) {
                    $table->dropColumn('idkategori');
                }
            });
        }

        if (Schema::hasTable('assessment_soal_pilgan')) {
            Schema::table('assessment_soal_pilgan', function (Blueprint $table) {
                if (Schema::hasColumn('assessment_soal_pilgan', 'idjenjang')) {
                    $table->dropColumn('idjenjang');
                }
                if (Schema::hasColumn('assessment_soal_pilgan', 'idmapel')) {
                    $table->dropColumn('idmapel');
                }
            });
        }
    }
};
