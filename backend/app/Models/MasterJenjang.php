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
        'idkategori',
        'kode_jenjang',
        'nama_jenjang',
        'urutan',
        'keterangan',
        'status_aktif',
    ];

    public function kategori()
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function majors(): HasMany
    {
        return $this->hasMany(Major::class, 'idjenjang');
    }

    public function tingkatKelas(): HasMany
    {
        return $this->hasMany(MasterTingkatKelas::class, 'idjenjang');
    }

    public function kelas(): HasMany
    {
        return $this->hasMany(MasterKelas::class, 'idjenjang', 'id');
    }

    public function mataPelajaran(): HasMany
    {
        return $this->hasMany(MasterMataPelajaran::class, 'idjenjang', 'id');
    }
}
