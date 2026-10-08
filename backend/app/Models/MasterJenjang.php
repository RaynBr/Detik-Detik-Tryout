<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterJenjang extends Model
{
    use HasFactory;

    protected $table = 'master_jenjang';

    protected $fillable = [
        'kode_jenjang',
        'nama_jenjang',
        'urutan',
        'keterangan',
        'status_aktif',
    ];

    public function kelas(): HasMany
    {
        return $this->hasMany(MasterKelas::class, 'idjenjang', 'id');
    }

    public function mataPelajaran(): HasMany
    {
        return $this->hasMany(MasterMataPelajaran::class, 'idjenjang', 'id');
    }
}
