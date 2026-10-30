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
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('user_bo', 'force_change_password')) {
                    $table->boolean('force_change_password')->default(false)->after('login_password');
                }
            });

            // Migrate legacy hardcoded usernames so their admin role is stored in DB
            DB::table('user_bo')
                ->whereIn('login_username', ['testingpenyelenggara', 'pgrislcc', 'edulab.id', 'andioffset38'])
                ->where(function ($query) {
                    $query->whereNull('role_type')->orWhere('role_type', '');
                })
                ->update(['role_type' => 'admin_sekolah']);
        }

        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (!Schema::hasColumn('user', 'force_change_password')) {
                    $table->boolean('force_change_password')->default(false)->after('login_password');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (Schema::hasColumn('user_bo', 'force_change_password')) {
                    $table->dropColumn('force_change_password');
                }
            });
        }

        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (Schema::hasColumn('user', 'force_change_password')) {
                    $table->dropColumn('force_change_password');
                }
            });
        }
    }
};
