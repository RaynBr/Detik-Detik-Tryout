<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterMataPelajaran extends Model
{
    use HasFactory;

    protected $table = 'master_mata_pelajaran';

    protected $fillable = [
        'idjenjang',
        'tahun_ajaran',
        'kode_mapel',
        'nama_mapel',
        'kelompok',
        'kkm',
        'deskripsi',
        'status_aktif',
    ];

    protected $casts = [
        'kkm' => 'float',
    ];

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function guruPengampu(): HasMany
    {
        return $this->hasMany(GuruMataPelajaran::class, 'idmapel', 'id');
    }
}
