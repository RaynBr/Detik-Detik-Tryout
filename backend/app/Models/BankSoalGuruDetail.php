<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\BelongsToInstansi;

class BankSoalGuruDetail extends Model
{
    use HasFactory, BelongsToInstansi;

    protected $instansiColumn = 'id_instansi';

    protected $table = 'bank_soal_guru_detail';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'bank_soal_guru_id',
        'id_guru',
        'id_instansi',
        'idjenjang',
        'idmapel',
        'idkurikulum',
        'id_tahun_ajaran',
        'semester_id',
        'idtingkat',
        'idkelas',
        'bab',
        'tingkat_kesulitan',
        'tahun_soal_id',
        'soal_text',
        'soal_gambar',
        'pilihan_a_text',
        'pilihan_a_gambar',
        'pilihan_b_text',
        'pilihan_b_gambar',
        'pilihan_c_text',
        'pilihan_c_gambar',
        'pilihan_d_text',
        'pilihan_d_gambar',
        'pilihan_e_text',
        'pilihan_e_gambar',
        'jawaban',
        'penjelasan_jawaban',
        'status_aktif',
        'urutan',
        'created_by',
        'updated_by',
    ];

    public function paket(): BelongsTo
    {
        return $this->belongsTo(BankSoalGuru::class, 'bank_soal_guru_id', 'id');
    }

    public function guru(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'id_guru', 'iduser_bo');
    }

    public function instansi(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'id_instansi', 'idkategori');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang');
    }

    public function mapel(): BelongsTo
    {
        return $this->belongsTo(MasterMataPelajaran::class, 'idmapel');
    }

    public function kurikulum(): BelongsTo
    {
        return $this->belongsTo(MasterKurikulum::class, 'idkurikulum');
    }

    public function tingkat(): BelongsTo
    {
        return $this->belongsTo(MasterTingkatKelas::class, 'idtingkat');
    }

    public function tahunSoal(): BelongsTo
    {
        return $this->belongsTo(MasterTahunSoal::class, 'tahun_soal_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'id_tahun_ajaran');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas');
    }
}

