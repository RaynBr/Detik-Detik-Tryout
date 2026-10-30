<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('guru_mata_pelajaran') && !Schema::hasColumn('guru_mata_pelajaran', 'status')) {
            Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
                $table->string('status', 20)->default('aktif')->after('tahun_ajaran');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('guru_mata_pelajaran') && Schema::hasColumn('guru_mata_pelajaran', 'status')) {
            Schema::table('guru_mata_pelajaran', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
