<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Majors (Jurusan SMA/SMK)
        if (!Schema::hasTable('majors')) {
            Schema::create('majors', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->string('jenjang', 50)->default('SMA');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });

            // Default majors
            $majors = [
                ['name' => 'Ilmu Pengetahuan Alam (IPA / MIPA)', 'code' => 'MIPA', 'jenjang' => 'SMA'],
                ['name' => 'Ilmu Pengetahuan Sosial (IPS / IPS)', 'code' => 'IPS', 'jenjang' => 'SMA'],
                ['name' => 'Bahasa dan Budaya', 'code' => 'BAHASA', 'jenjang' => 'SMA'],
                ['name' => 'Teknik Komputer dan Jaringan', 'code' => 'TKJ', 'jenjang' => 'SMK'],
                ['name' => 'Rekayasa Perangkat Lunak', 'code' => 'RPL', 'jenjang' => 'SMK'],
                ['name' => 'Akuntansi dan Keuangan Lembaga', 'code' => 'AKL', 'jenjang' => 'SMK'],
                ['name' => 'Umum / Reguler', 'code' => 'UMUM', 'jenjang' => 'Semua'],
            ];
            foreach ($majors as $m) {
                DB::table('majors')->insert(array_merge($m, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 2. Master Semester
        if (!Schema::hasTable('master_semester')) {
            Schema::create('master_semester', function (Blueprint $table) {
                $table->id();
                $table->string('nama_semester', 50);
                $table->string('kode_semester', 20)->unique();
                $table->integer('urutan')->default(1);
                $table->text('keterangan')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y');
                $table->timestamps();
            });

            // Default semesters
            DB::table('master_semester')->insert([
                ['nama_semester' => 'Semester Ganjil', 'kode_semester' => 'ganjil', 'urutan' => 1, 'keterangan' => 'Semester 1 (Juli - Desember)', 'status_aktif' => 'Y', 'created_at' => now(), 'updated_at' => now()],
                ['nama_semester' => 'Semester Genap', 'kode_semester' => 'genap', 'urutan' => 2, 'keterangan' => 'Semester 2 (Januari - Juni)', 'status_aktif' => 'Y', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // 3. Master Kurikulum
        if (!Schema::hasTable('master_kurikulum')) {
            Schema::create('master_kurikulum', function (Blueprint $table) {
                $table->id();
                $table->string('nama_kurikulum', 100);
                $table->string('kode_kurikulum', 30)->unique();
                $table->string('tahun', 10)->nullable();
                $table->text('keterangan')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y');
                $table->timestamps();
            });

            // Default kurikulum
            DB::table('master_kurikulum')->insert([
                ['nama_kurikulum' => 'Kurikulum Merdeka', 'kode_kurikulum' => 'KM', 'tahun' => '2024', 'keterangan' => 'Kurikulum Nasional berbasis capaian pembelajaran mandiri', 'status_aktif' => 'Y', 'created_at' => now(), 'updated_at' => now()],
                ['nama_kurikulum' => 'Kurikulum 2013 (K13 Revisi)', 'kode_kurikulum' => 'K13', 'tahun' => '2013', 'keterangan' => 'Kurikulum Nasional tematik dan saintifik terpadu', 'status_aktif' => 'Y', 'created_at' => now(), 'updated_at' => now()],
                ['nama_kurikulum' => 'Kurikulum Tingkat Satuan Pendidikan (KTSP)', 'kode_kurikulum' => 'KTSP', 'tahun' => '2006', 'keterangan' => 'Kurikulum operasional satuan pendidikan', 'status_aktif' => 'N', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // 4. Master Tingkat Kelas
        if (!Schema::hasTable('master_tingkat_kelas')) {
            Schema::create('master_tingkat_kelas', function (Blueprint $table) {
                $table->id();
                $table->integer('tingkat');
                $table->string('nama_tingkat', 50);
                $table->unsignedInteger('idjenjang')->nullable();
                $table->text('keterangan')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y');
                $table->timestamps();

                $table->unique(['tingkat', 'nama_tingkat']);
            });

            // Default tingkat kelas (SD 1-6, SMP 7-9, SMA 10-12)
            $levels = [
                ['tingkat' => 1, 'nama_tingkat' => 'Kelas 1 (SD)', 'idjenjang' => 1],
                ['tingkat' => 2, 'nama_tingkat' => 'Kelas 2 (SD)', 'idjenjang' => 1],
                ['tingkat' => 3, 'nama_tingkat' => 'Kelas 3 (SD)', 'idjenjang' => 1],
                ['tingkat' => 4, 'nama_tingkat' => 'Kelas 4 (SD)', 'idjenjang' => 1],
                ['tingkat' => 5, 'nama_tingkat' => 'Kelas 5 (SD)', 'idjenjang' => 1],
                ['tingkat' => 6, 'nama_tingkat' => 'Kelas 6 (SD)', 'idjenjang' => 1],
                ['tingkat' => 7, 'nama_tingkat' => 'Kelas 7 (SMP)', 'idjenjang' => 2],
                ['tingkat' => 8, 'nama_tingkat' => 'Kelas 8 (SMP)', 'idjenjang' => 2],
                ['tingkat' => 9, 'nama_tingkat' => 'Kelas 9 (SMP)', 'idjenjang' => 2],
                ['tingkat' => 10, 'nama_tingkat' => 'Kelas 10 (SMA/SMK)', 'idjenjang' => 3],
                ['tingkat' => 11, 'nama_tingkat' => 'Kelas 11 (SMA/SMK)', 'idjenjang' => 3],
                ['tingkat' => 12, 'nama_tingkat' => 'Kelas 12 (SMA/SMK)', 'idjenjang' => 3],
            ];
            foreach ($levels as $lvl) {
                DB::table('master_tingkat_kelas')->insert(array_merge($lvl, [
                    'keterangan' => 'Tingkat pendidikan kelas ' . $lvl['tingkat'],
                    'status_aktif' => 'Y',
                    'created_at' => now(),
                    'updated_at' => now()
                ]));
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('master_tingkat_kelas');
        Schema::dropIfExists('master_kurikulum');
        Schema::dropIfExists('master_semester');
        Schema::dropIfExists('majors');
    }
};
