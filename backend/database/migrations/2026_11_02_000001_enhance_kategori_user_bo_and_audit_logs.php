<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambah detail instansi dan status subscription di kategori_user_bo
        if (Schema::hasTable('kategori_user_bo')) {
            Schema::table('kategori_user_bo', function (Blueprint $table) {
                if (!Schema::hasColumn('kategori_user_bo', 'jenis_instansi')) {
                    $table->string('jenis_instansi', 50)->nullable()->after('nama_kategori');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'npsn')) {
                    $table->string('npsn', 30)->nullable()->after('jenis_instansi');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'email')) {
                    $table->string('email', 100)->nullable()->after('npsn');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'telp')) {
                    $table->string('telp', 30)->nullable()->after('email');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'alamat')) {
                    $table->text('alamat')->nullable()->after('telp');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'kota')) {
                    $table->string('kota', 100)->nullable()->after('alamat');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'provinsi')) {
                    $table->string('provinsi', 100)->nullable()->after('kota');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'status_aktif')) {
                    $table->enum('status_aktif', ['Y', 'N'])->default('Y')->after('provinsi');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'logo')) {
                    $table->string('logo', 255)->nullable()->after('status_aktif');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'tanggal_aktif')) {
                    $table->date('tanggal_aktif')->nullable()->after('logo');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'tanggal_berakhir')) {
                    $table->date('tanggal_berakhir')->nullable()->after('tanggal_aktif');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'keterangan_subscription')) {
                    $table->text('keterangan_subscription')->nullable()->after('tanggal_berakhir');
                }
                if (!Schema::hasColumn('kategori_user_bo', 'subscription_status')) {
                    $table->enum('subscription_status', ['aktif', 'nonaktif'])->default('aktif')->after('keterangan_subscription');
                }
            });
        }

        // 2. Tambah kolom audit logs: module, instansi_name, user_agent
        if (Schema::hasTable('audit_logs')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                if (!Schema::hasColumn('audit_logs', 'module')) {
                    $table->string('module', 100)->nullable()->after('action');
                }
                if (!Schema::hasColumn('audit_logs', 'instansi_name')) {
                    $table->string('instansi_name', 255)->nullable()->after('user_role');
                }
                if (!Schema::hasColumn('audit_logs', 'user_agent')) {
                    $table->text('user_agent')->nullable()->after('ip_address');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('kategori_user_bo')) {
            Schema::table('kategori_user_bo', function (Blueprint $table) {
                $columns = [
                    'jenis_instansi', 'npsn', 'email', 'telp', 'alamat', 'kota', 'provinsi',
                    'status_aktif', 'logo', 'tanggal_aktif', 'tanggal_berakhir',
                    'keterangan_subscription', 'subscription_status'
                ];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('kategori_user_bo', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('audit_logs')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                if (Schema::hasColumn('audit_logs', 'module')) {
                    $table->dropColumn('module');
                }
                if (Schema::hasColumn('audit_logs', 'instansi_name')) {
                    $table->dropColumn('instansi_name');
                }
                if (Schema::hasColumn('audit_logs', 'user_agent')) {
                    $table->dropColumn('user_agent');
                }
            });
        }
    }
};
