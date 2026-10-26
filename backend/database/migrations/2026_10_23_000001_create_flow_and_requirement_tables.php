<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Master Tahun Ajaran (Academic Years)
        if (!Schema::hasTable('academic_years')) {
            Schema::create('academic_years', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // e.g. 2026/2027
                $table->enum('semester', ['odd', 'even'])->default('odd'); // Ganjil / Genap
                $table->boolean('is_active')->default(false);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('master_tahun_ajaran')) {
            Schema::create('master_tahun_ajaran', function (Blueprint $table) {
                $table->id('idtahun_ajaran');
                $table->string('nama_tahun_ajaran', 50); // e.g. 2026/2027
                $table->enum('semester', ['Ganjil', 'Genap'])->default('Ganjil');
                $table->boolean('status_aktif')->default(false);
                $table->timestamps();
            });
        }

        // 2. Test Task Manager (Testing internal CRUD terisolasi dari CBT)
        if (!Schema::hasTable('test_tasks')) {
            Schema::create('test_tasks', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
                $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->string('creator_name')->nullable();
                $table->timestamps();
            });
        }

        // 3. Update assessment table: add id_tahun_ajaran and make waktu_pengerjaan nullable
        if (Schema::hasTable('assessment')) {
            Schema::table('assessment', function (Blueprint $table) {
                if (!Schema::hasColumn('assessment', 'id_tahun_ajaran')) {
                    $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->after('idmapel');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('test_tasks');
        Schema::dropIfExists('master_tahun_ajaran');
        Schema::dropIfExists('academic_years');
    }
};
