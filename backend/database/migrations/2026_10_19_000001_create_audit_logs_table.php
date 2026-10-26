<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('user_id')->nullable();
            $table->string('user_name')->nullable();
            $table->string('user_role', 50)->nullable();
            $table->string('action', 100)->index();
            // action values: CREATE_INSTANSI, EDIT_INSTANSI, CREATE_SUPER_ADMIN,
            // CREATE_ADMIN_INSTANSI, CREATE_BANK_SOAL, EDIT_BANK_SOAL,
            // CREATE_GURU, CREATE_SISWA, EDIT_PROFIL, CHANGE_PASSWORD, etc.
            $table->string('target_type', 100)->nullable(); // e.g. 'instansi', 'user_bo', 'assessment_soal_pilgan'
            $table->string('target_id')->nullable();
            $table->string('target_label')->nullable(); // human-readable label
            $table->json('metadata')->nullable(); // extra context data
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'action']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
