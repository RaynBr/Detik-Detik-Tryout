<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('announcements')) {
            Schema::create('announcements', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('content');
                $table->string('category', 50)->default('info'); // info, warning, exam, urgent
                $table->string('badge_text', 50)->nullable();
                $table->string('target_role', 50)->default('all'); // all, siswa, guru, admin
                $table->string('idkategori', 50)->nullable();
                $table->boolean('is_active')->default(true);
                $table->string('created_by', 50)->nullable();
                $table->timestamps();
            });

            // Seed initial announcements
            DB::table('announcements')->insert([
                [
                    'title' => 'Tata Tertib Pelaksanaan Ujian CBT 2026/2027',
                    'content' => 'Selamat datang di Portal Ujian Online Detik Detik TryOut. Pastikan perangkat Anda terhubung ke internet stabil, mode layar penuh (fullscreen) diaktifkan, dan kerjakan butir soal secara mandiri dan jujur.',
                    'category' => 'info',
                    'badge_text' => 'Informasi Resmi',
                    'target_role' => 'all',
                    'idkategori' => null,
                    'is_active' => true,
                    'created_by' => 'adminnyaadmin',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'Pemberitahuan Sistem Keamanan Anti-Cheat Aktif',
                    'content' => 'Sistem dilengkapi pemantauan perpindahan tab dan aplikasi. Melebihi batas toleransi perpindahan layar (Alt+Tab / minimize) akan menyebabkan lembar ujian terkunci atau diskualifikasi otomatis.',
                    'category' => 'warning',
                    'badge_text' => 'Peringatan Ketat',
                    'target_role' => 'siswa',
                    'idkategori' => null,
                    'is_active' => true,
                    'created_by' => 'adminnyaadmin',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'Paket TryOut Simulasi Semester Telah Siap',
                    'content' => 'Paket TryOut simulasi 50 butir soal acak telah diterbitkan oleh dewan guru. Anda dapat mengerjakan paket ujian yang berlabel "Tersedia" sesuai rentang waktu yang tertera pada kartu jadwal.',
                    'category' => 'exam',
                    'badge_text' => 'Ujian Aktif',
                    'target_role' => 'siswa',
                    'idkategori' => null,
                    'is_active' => true,
                    'created_by' => 'edismulyanta',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};

