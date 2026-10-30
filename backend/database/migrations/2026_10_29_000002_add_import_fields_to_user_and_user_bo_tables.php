<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('user_bo', 'nip')) {
                    $table->string('nip', 30)->nullable()->after('nuptk');
                }
                if (!Schema::hasColumn('user_bo', 'idjenjang')) {
                    $table->unsignedInteger('idjenjang')->nullable()->after('idkategori');
                }
            });
        }

        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (!Schema::hasColumn('user', 'tempat_lahir')) {
                    $table->string('tempat_lahir', 100)->nullable()->after('alamat');
                }
                if (!Schema::hasColumn('user', 'tanggal_lahir')) {
                    $table->date('tanggal_lahir')->nullable()->after('tempat_lahir');
                }
                if (!Schema::hasColumn('user', 'agama')) {
                    $table->string('agama', 30)->nullable()->after('tanggal_lahir');
                }
                if (!Schema::hasColumn('user', 'nomor_absen')) {
                    $table->integer('nomor_absen')->nullable()->after('agama');
                }
                if (!Schema::hasColumn('user', 'idjenjang')) {
                    $table->unsignedInteger('idjenjang')->nullable()->after('idkelas');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('user_bo')) {
            Schema::table('user_bo', function (Blueprint $table) {
                if (Schema::hasColumn('user_bo', 'nip')) $table->dropColumn('nip');
                if (Schema::hasColumn('user_bo', 'idjenjang')) $table->dropColumn('idjenjang');
            });
        }

        if (Schema::hasTable('user')) {
            Schema::table('user', function (Blueprint $table) {
                if (Schema::hasColumn('user', 'tempat_lahir')) $table->dropColumn('tempat_lahir');
                if (Schema::hasColumn('user', 'tanggal_lahir')) $table->dropColumn('tanggal_lahir');
                if (Schema::hasColumn('user', 'agama')) $table->dropColumn('agama');
                if (Schema::hasColumn('user', 'nomor_absen')) $table->dropColumn('nomor_absen');
                if (Schema::hasColumn('user', 'idjenjang')) $table->dropColumn('idjenjang');
            });
        }
    }
};
