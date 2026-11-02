<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterSemester extends Model
{
    use HasFactory;

    protected $table = 'master_semester';

    protected $fillable = [
        'idkategori',
        'nama_semester',
        'kode_semester',
        'urutan',
        'keterangan',
        'status_aktif',
    ];

    public function kategori()
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }
}
