<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterKurikulum extends Model
{
    use HasFactory;

    protected $table = 'master_kurikulum';

    protected $fillable = [
        'idkategori',
        'nama_kurikulum',
        'kode_kurikulum',
        'tahun',
        'keterangan',
        'status_aktif',
    ];

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function mataPelajaran(): HasMany
    {
        return $this->hasMany(MasterMataPelajaran::class, 'idkurikulum');
    }

    public function classes(): HasMany
    {
        return $this->hasMany(MasterKelas::class, 'kurikulum_id');
    }
}
