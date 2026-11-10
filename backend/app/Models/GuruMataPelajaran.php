<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuruMataPelajaran extends Model
{
    use HasFactory;

    protected $table = 'guru_mata_pelajaran';

    protected $fillable = [
        'iduser_bo',
        'idmapel',
        'idkelas',
        'academic_year_id',
        'semester_id',
        'tahun_ajaran',
        'status',
    ];

    public function guru(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'iduser_bo', 'iduser_bo');
    }

    public function mataPelajaran(): BelongsTo
    {
        return $this->belongsTo(MasterMataPelajaran::class, 'idmapel', 'id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas', 'id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id', 'id');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(MasterSemester::class, 'semester_id', 'id');
    }
}
