<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterKelas extends Model
{
    use HasFactory;

    protected $table = 'master_kelas';

    protected $fillable = [
        'idjenjang',
        'idkategori',
        'nama_kelas',
        'tingkat',
        'jurusan',
        'wali_kelas_id',
        'kapasitas',
        'keterangan',
        'status_aktif',
    ];

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function waliKelas(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'wali_kelas_id', 'iduser_bo');
    }

    public function siswa(): HasMany
    {
        return $this->hasMany(SiswaKelas::class, 'idkelas', 'id');
    }

    public function guruMataPelajaran(): HasMany
    {
        return $this->hasMany(GuruMataPelajaran::class, 'idkelas', 'id');
    }
}
