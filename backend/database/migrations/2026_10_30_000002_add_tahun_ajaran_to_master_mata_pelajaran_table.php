<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('master_mata_pelajaran')) {
            if (!Schema::hasColumn('master_mata_pelajaran', 'tahun_ajaran')) {
                Schema::table('master_mata_pelajaran', function (Blueprint $table) {
                    $table->string('tahun_ajaran', 20)->nullable()->default('2026/2027')->after('idjenjang');
                });
            }

            // Populate existing rows
            DB::table('master_mata_pelajaran')
                ->whereNull('tahun_ajaran')
                ->orWhere('tahun_ajaran', '')
                ->update(['tahun_ajaran' => '2026/2027']);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('master_mata_pelajaran') && Schema::hasColumn('master_mata_pelajaran', 'tahun_ajaran')) {
            Schema::table('master_mata_pelajaran', function (Blueprint $table) {
                $table->dropColumn('tahun_ajaran');
            });
        }
    }
};
