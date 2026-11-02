<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterTingkatKelas extends Model
{
    use HasFactory;

    protected $table = 'master_tingkat_kelas';

    protected $fillable = [
        'idkategori',
        'tingkat',
        'nama_tingkat',
        'idjenjang',
        'keterangan',
        'status_aktif',
    ];

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang');
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }
}
