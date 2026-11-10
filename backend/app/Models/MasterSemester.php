<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterSemester extends Model
{
    use HasFactory;

    protected $table = 'master_semester';

    protected $fillable = [
        'idkategori',
        'academic_year_id',
        'nama_semester',
        'kode_semester',
        'urutan',
        'keterangan',
        'status_aktif',
    ];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function classes(): HasMany
    {
        return $this->hasMany(MasterKelas::class, 'semester_id');
    }
}
