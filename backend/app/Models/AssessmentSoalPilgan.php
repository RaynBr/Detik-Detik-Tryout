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
        'tanggal_input',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class, 'idassessment', 'idassessment');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function mapel(): BelongsTo
    {
        return $this->belongsTo(MasterMataPelajaran::class, 'idmapel', 'id');
    }
}
