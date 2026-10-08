<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentJawabanPilgan extends Model
{
    use HasFactory;

    protected $table = 'assessment_jawaban_pilgan';
    protected $primaryKey = 'idassessment_jawaban_pilgan';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'idassessment_jawaban_pilgan',
        'idassessment',
        'iduser',
        'idtransaksi',
        'nilai',
        'komentar',
        'lama_dikerjakan',
        'tgl_input_time',
    ];

    protected $attributes = [
        'idtransaksi' => 'TRX000',
        'nilai' => 0,
        'komentar' => '',
        'lama_dikerjakan' => '00:00:00',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class, 'idassessment', 'idassessment');
    }

    public function siswa(): BelongsTo
    {
        return $this->belongsTo(UserSiswa::class, 'iduser', 'iduser');
    }

    public function details(): HasMany
    {
        return $this->hasMany(AssessmentJawabanPilganDetail::class, 'idassessment_jawaban_pilgan', 'idassessment_jawaban_pilgan');
    }
}
