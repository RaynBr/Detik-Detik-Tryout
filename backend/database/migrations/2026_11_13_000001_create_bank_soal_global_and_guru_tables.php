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
        // 1. Create table bank_soal_global (Milik Super Admin - Master Platform)
        if (!Schema::hasTable('bank_soal_global')) {
            Schema::create('bank_soal_global', function (Blueprint $table) {
                $table->string('id', 30)->primary();
                $table->string('kode_paket', 50)->nullable()->index();
                $table->string('nama_paket', 255);
                $table->text('deskripsi')->nullable();
                $table->unsignedInteger('idjenjang')->nullable()->index();
                $table->unsignedInteger('tingkat')->nullable()->index();
                $table->unsignedBigInteger('idtingkat')->nullable()->index();
                $table->unsignedInteger('idkelas')->nullable()->index();
                $table->unsignedInteger('idmapel')->nullable()->index();
                $table->unsignedBigInteger('idkurikulum')->nullable()->index();
                $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->index();
                $table->unsignedBigInteger('tahun_soal_id')->nullable()->index();
                $table->integer('total_soal')->default(0);
                $table->string('status_aktif', 10)->default('Y')->index();
                $table->string('iduser_bo', 50)->nullable()->index();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Create table bank_soal_global_detail (Butir Soal Global Platform)
        if (!Schema::hasTable('bank_soal_global_detail')) {
            Schema::create('bank_soal_global_detail', function (Blueprint $table) {
                $table->string('id', 30)->primary();
                $table->string('bank_soal_global_id', 30)->index();
                $table->unsignedInteger('idjenjang')->nullable()->index();
                $table->unsignedInteger('idmapel')->nullable()->index();
                $table->unsignedBigInteger('idkurikulum')->nullable()->index();
                $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->index();
                $table->unsignedBigInteger('semester_id')->nullable()->index();
                $table->unsignedBigInteger('idtingkat')->nullable()->index();
                $table->unsignedBigInteger('idkelas')->nullable()->index();
                $table->string('bab', 150)->nullable();
                $table->string('tingkat_kesulitan', 20)->default('Sedang');
                $table->unsignedBigInteger('tahun_soal_id')->nullable()->index();
                $table->text('soal_text');
                $table->text('soal_gambar')->nullable();
                $table->text('pilihan_a_text')->nullable();
                $table->text('pilihan_a_gambar')->nullable();
                $table->text('pilihan_b_text')->nullable();
                $table->text('pilihan_b_gambar')->nullable();
                $table->text('pilihan_c_text')->nullable();
                $table->text('pilihan_c_gambar')->nullable();
                $table->text('pilihan_d_text')->nullable();
                $table->text('pilihan_d_gambar')->nullable();
                $table->text('pilihan_e_text')->nullable();
                $table->text('pilihan_e_gambar')->nullable();
                $table->string('jawaban', 5)->default('A');
                $table->text('penjelasan_jawaban')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y')->index();
                $table->unsignedInteger('urutan')->default(1);
                $table->string('created_by', 100)->nullable();
                $table->string('updated_by', 100)->nullable();
                $table->timestamps();
            });
        }

        // 3. Create table bank_soal_guru (Milik Guru / Instansi Sekolah)
        if (!Schema::hasTable('bank_soal_guru')) {
            Schema::create('bank_soal_guru', function (Blueprint $table) {
                $table->string('id', 30)->primary();
                $table->string('id_guru', 50)->index();
                $table->string('id_instansi', 50)->nullable()->index();
                $table->string('kode_paket', 50)->nullable()->index();
                $table->string('nama_paket', 255);
                $table->text('deskripsi')->nullable();
                $table->unsignedInteger('idjenjang')->nullable()->index();
                $table->unsignedInteger('tingkat')->nullable()->index();
                $table->unsignedBigInteger('idtingkat')->nullable()->index();
                $table->unsignedInteger('idkelas')->nullable()->index();
                $table->unsignedInteger('idmapel')->nullable()->index();
                $table->unsignedBigInteger('idkurikulum')->nullable()->index();
                $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->index();
                $table->unsignedBigInteger('tahun_soal_id')->nullable()->index();
                $table->integer('total_soal')->default(0);
                $table->string('status_aktif', 10)->default('Y')->index();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 4. Create table bank_soal_guru_detail (Butir Soal Buatan Guru)
        if (!Schema::hasTable('bank_soal_guru_detail')) {
            Schema::create('bank_soal_guru_detail', function (Blueprint $table) {
                $table->string('id', 30)->primary();
                $table->string('bank_soal_guru_id', 30)->index();
                $table->string('id_guru', 50)->index();
                $table->string('id_instansi', 50)->nullable()->index();
                $table->unsignedInteger('idjenjang')->nullable()->index();
                $table->unsignedInteger('idmapel')->nullable()->index();
                $table->unsignedBigInteger('idkurikulum')->nullable()->index();
                $table->unsignedBigInteger('id_tahun_ajaran')->nullable()->index();
                $table->unsignedBigInteger('semester_id')->nullable()->index();
                $table->unsignedBigInteger('idtingkat')->nullable()->index();
                $table->unsignedBigInteger('idkelas')->nullable()->index();
                $table->string('bab', 150)->nullable();
                $table->string('tingkat_kesulitan', 20)->default('Sedang');
                $table->unsignedBigInteger('tahun_soal_id')->nullable()->index();
                $table->text('soal_text');
                $table->text('soal_gambar')->nullable();
                $table->text('pilihan_a_text')->nullable();
                $table->text('pilihan_a_gambar')->nullable();
                $table->text('pilihan_b_text')->nullable();
                $table->text('pilihan_b_gambar')->nullable();
                $table->text('pilihan_c_text')->nullable();
                $table->text('pilihan_c_gambar')->nullable();
                $table->text('pilihan_d_text')->nullable();
                $table->text('pilihan_d_gambar')->nullable();
                $table->text('pilihan_e_text')->nullable();
                $table->text('pilihan_e_gambar')->nullable();
                $table->string('jawaban', 5)->default('A');
                $table->text('penjelasan_jawaban')->nullable();
                $table->enum('status_aktif', ['Y', 'N'])->default('Y')->index();
                $table->unsignedInteger('urutan')->default(1);
                $table->string('created_by', 100)->nullable();
                $table->string('updated_by', 100)->nullable();
                $table->timestamps();
            });
        }

        // 5. Data Migration / Seeding: Copy existing National Bank Soal to bank_soal_global & bank_soal_global_detail
        try {
            $assessments = DB::table('assessment')
                ->where(function ($q) {
                    $q->where('source_type', 'nasional')
                      ->orWhere('idkategori', '27830150842287772')
                      ->orWhereNull('iduser_bo');
                })
                ->get();

            $globalPackageIds = [];
            foreach ($assessments as $a) {
                $id = (string) $a->idassessment;
                $globalPackageIds[] = $id;

                $soalCount = DB::table('assessment_soal_pilgan')
                    ->where('idassessment', $id)
                    ->count();

                DB::table('bank_soal_global')->updateOrInsert(
                    ['id' => $id],
                    [
                        'kode_paket' => 'BSG-' . substr($id, -6),
                        'nama_paket' => $a->nama_assessment,
                        'deskripsi' => $a->deskripsi_assessment,
                        'idjenjang' => $a->idjenjang,
                        'tingkat' => $a->tingkat,
                        'idtingkat' => $a->idtingkat,
                        'idkelas' => $a->idkelas,
                        'idmapel' => $a->idmapel,
                        'idkurikulum' => $a->idkurikulum,
                        'id_tahun_ajaran' => $a->id_tahun_ajaran,
                        'tahun_soal_id' => $a->tahun_soal_id,
                        'total_soal' => $soalCount,
                        'status_aktif' => in_array($a->status_aktif, ['Y', 'aktif']) ? 'Y' : 'N',
                        'iduser_bo' => $a->iduser_bo,
                        'created_at' => $a->tanggal_input ?: now(),
                        'updated_at' => now(),
                    ]
                );
            }

            // Copy all questions in those packages or with source_type = 'nasional'
            if (!empty($globalPackageIds)) {
                $questions = DB::table('assessment_soal_pilgan')
                    ->where(function ($q) use ($globalPackageIds) {
                        $q->whereIn('idassessment', $globalPackageIds)
                          ->orWhere('source_type', 'nasional');
                    })
                    ->get();

                foreach ($questions as $q) {
                    $pkgId = in_array((string)$q->idassessment, $globalPackageIds) ? (string)$q->idassessment : ($globalPackageIds[0] ?? '27733030223218733');
                    DB::table('bank_soal_global_detail')->updateOrInsert(
                        ['id' => (string) $q->idassessment_soal_pilgan],
                        [
                            'bank_soal_global_id' => $pkgId,
                            'idjenjang' => $q->idjenjang,
                            'idmapel' => $q->idmapel,
                            'idkurikulum' => $q->idkurikulum,
                            'id_tahun_ajaran' => $q->id_tahun_ajaran,
                            'semester_id' => $q->semester_id,
                            'idtingkat' => $q->idtingkat,
                            'idkelas' => $q->idkelas,
                            'bab' => $q->bab,
                            'tingkat_kesulitan' => $q->tingkat_kesulitan ?: 'Sedang',
                            'tahun_soal_id' => $q->tahun_soal_id,
                            'soal_text' => $q->soal_text ?: 'Pertanyaan',
                            'soal_gambar' => $q->soal_gambar,
                            'pilihan_a_text' => $q->pilihan_a_text,
                            'pilihan_a_gambar' => $q->pilihan_a_gambar,
                            'pilihan_b_text' => $q->pilihan_b_text,
                            'pilihan_b_gambar' => $q->pilihan_b_gambar,
                            'pilihan_c_text' => $q->pilihan_c_text,
                            'pilihan_c_gambar' => $q->pilihan_c_gambar,
                            'pilihan_d_text' => $q->pilihan_d_text,
                            'pilihan_d_gambar' => $q->pilihan_d_gambar,
                            'pilihan_e_text' => $q->pilihan_e_text,
                            'pilihan_e_gambar' => $q->pilihan_e_gambar,
                            'jawaban' => $q->jawaban ?: 'A',
                            'penjelasan_jawaban' => $q->penjelasan_jawaban,
                            'status_aktif' => $q->status_aktif ?: 'Y',
                            'urutan' => $q->urutan ?: 1,
                            'created_by' => $q->created_by,
                            'updated_by' => $q->updated_by,
                            'created_at' => $q->tanggal_input ?: now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }

            // Sync total_soal for all bank_soal_global
            DB::statement("
                UPDATE bank_soal_global g 
                SET g.total_soal = (SELECT COUNT(*) FROM bank_soal_global_detail d WHERE d.bank_soal_global_id = g.id)
            ");
        } catch (\Throwable $ex) {
            // Log notice if partial
            \Illuminate\Support\Facades\Log::warning('Data migration into bank_soal_global notice: ' . $ex->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_soal_guru_detail');
        Schema::dropIfExists('bank_soal_guru');
        Schema::dropIfExists('bank_soal_global_detail');
        Schema::dropIfExists('bank_soal_global');
    }
};

