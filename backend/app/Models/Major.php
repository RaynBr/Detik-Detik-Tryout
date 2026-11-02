<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Major extends Model
{
    use HasFactory;

    protected $fillable = [
        'idkategori',
        'name',
        'code',
        'jenjang',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function kategori()
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function classes(): HasMany
    {
        return $this->hasMany(ClassRoom::class, 'major_id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'major_id');
    }
}
