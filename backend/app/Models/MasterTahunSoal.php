<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterTahunSoal extends Model
{
    protected $table = 'master_tahun_soal';

    protected $fillable = [
        'tahun',
        'keterangan',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function soal()
    {
        return $this->hasMany(AssessmentSoalPilgan::class, 'tahun_soal_id', 'id');
    }
}
