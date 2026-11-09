<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AcademicYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'idkategori',
        'name',
        'semester',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function semesters(): HasMany
    {
        return $this->hasMany(MasterSemester::class, 'academic_year_id');
    }

    public function activeSemester(): HasOne
    {
        return $this->hasOne(MasterSemester::class, 'academic_year_id')->where('status_aktif', 'Y');
    }

    public function classes(): HasMany
    {
        return $this->hasMany(MasterKelas::class, 'academic_year_id');
    }
}
