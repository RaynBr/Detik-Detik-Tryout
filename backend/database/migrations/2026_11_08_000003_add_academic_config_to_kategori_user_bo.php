<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('kategori_user_bo') && !Schema::hasColumn('kategori_user_bo', 'academic_config')) {
            Schema::table('kategori_user_bo', function (Blueprint $table) {
                $table->json('academic_config')->nullable()->after('status_remove');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('kategori_user_bo') && Schema::hasColumn('kategori_user_bo', 'academic_config')) {
            Schema::table('kategori_user_bo', function (Blueprint $table) {
                $table->dropColumn('academic_config');
            });
        }
    }
};

