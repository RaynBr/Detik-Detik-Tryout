<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentJawabanPilganDetail extends Model
{
    use HasFactory;

    protected $table = 'assessment_jawaban_pilgan_detail';
    protected $primaryKey = 'idassessment_jawaban_pilgan_detail';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'idassessment_jawaban_pilgan_detail',
        'idassessment_jawaban_pilgan',
        'idassessment_soal_pilgan',
        'jawaban',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(AssessmentJawabanPilgan::class, 'idassessment_jawaban_pilgan', 'idassessment_jawaban_pilgan');
    }

    public function soal(): BelongsTo
    {
        return $this->belongsTo(AssessmentSoalPilgan::class, 'idassessment_soal_pilgan', 'idassessment_soal_pilgan');
    }
}
