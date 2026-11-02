<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function kategori()
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }
}
