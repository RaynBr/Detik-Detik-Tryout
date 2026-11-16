<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('announcements')) {
            Schema::table('announcements', function (Blueprint $table) {
                if (!Schema::hasColumn('announcements', 'role')) {
                    $table->string('role', 50)->default('admin')->after('created_by');
                }
                if (!Schema::hasColumn('announcements', 'created_by_user_id')) {
                    $table->unsignedBigInteger('created_by_user_id')->nullable()->after('role');
                }
                if (!Schema::hasColumn('announcements', 'id_guru')) {
                    $table->unsignedBigInteger('id_guru')->nullable()->after('created_by_user_id');
                }
                if (!Schema::hasColumn('announcements', 'target_type')) {
                    $table->string('target_type', 50)->default('all')->after('target_role');
                }
                if (!Schema::hasColumn('announcements', 'target_id')) {
                    $table->string('target_id', 100)->nullable()->after('target_type');
                }
                if (!Schema::hasColumn('announcements', 'priority')) {
                    $table->string('priority', 50)->default('Normal')->after('category');
                }
                if (!Schema::hasColumn('announcements', 'status')) {
                    $table->string('status', 50)->default('Aktif')->after('priority');
                }
                if (!Schema::hasColumn('announcements', 'publish_at')) {
                    $table->timestamp('publish_at')->nullable()->after('status');
                }
                if (!Schema::hasColumn('announcements', 'expired_at')) {
                    $table->timestamp('expired_at')->nullable()->after('publish_at');
                }
                if (!Schema::hasColumn('announcements', 'attachment_url')) {
                    $table->text('attachment_url')->nullable()->after('content');
                }
                if (!Schema::hasColumn('announcements', 'attachment_name')) {
                    $table->string('attachment_name', 255)->nullable()->after('attachment_url');
                }
            });

            // Set default values for existing rows
            DB::table('announcements')->whereNull('priority')->orWhere('priority', '')->update(['priority' => 'Normal']);
            DB::table('announcements')->whereNull('status')->orWhere('status', '')->update(['status' => 'Aktif']);
            DB::table('announcements')->whereNull('target_type')->orWhere('target_type', '')->update(['target_type' => 'all']);
            DB::table('announcements')->whereNull('role')->orWhere('role', '')->update(['role' => 'admin']);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('announcements')) {
            Schema::table('announcements', function (Blueprint $table) {
                $columns = [
                    'role', 'created_by_user_id', 'id_guru', 'target_type', 'target_id',
                    'priority', 'status', 'publish_at', 'expired_at', 'attachment_url', 'attachment_name'
                ];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('announcements', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};

