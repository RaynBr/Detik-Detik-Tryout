<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentSoalPilgan extends Model
{
    use HasFactory;

    protected $table = 'assessment_soal_pilgan';
    protected $primaryKey = 'idassessment_soal_pilgan';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'idassessment_soal_pilgan',
        'idassessment',
        'idjenjang',
        'idmapel',
        'idkurikulum',
        'id_tahun_ajaran',
        'semester_id',
        'idtingkat',
        'idkelas',
        'bab',
        'tingkat_kesulitan',
        'source_type',
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
        'tahun_soal_id',
        'status_aktif',
        'status_publikasi',
        'iduser_bo',
        'created_by',
        'updated_by',
        'tanggal_input',
        'is_annulled',
        'annulled_at',
        'annulled_reason',
        'urutan',
    ];

    protected $casts = [
        'is_annulled' => 'boolean',
        'annulled_at' => 'datetime',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class, 'idassessment', 'idassessment');
    }

    public function kurikulum(): BelongsTo
    {
        return $this->belongsTo(MasterKurikulum::class, 'idkurikulum', 'id');
    }

    public function tingkat(): BelongsTo
    {
        return $this->belongsTo(MasterTingkatKelas::class, 'idtingkat', 'id');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function mapel(): BelongsTo
    {
        return $this->belongsTo(MasterMataPelajaran::class, 'idmapel', 'id');
    }

    public function tahunSoal(): BelongsTo
    {
        return $this->belongsTo(MasterTahunSoal::class, 'tahun_soal_id', 'id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'iduser_bo', 'iduser_bo');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'id_tahun_ajaran', 'id');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(MasterSemester::class, 'semester_id', 'id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas', 'id');
    }
}
