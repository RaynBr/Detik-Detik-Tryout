<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiswaKelas extends Model
{
    use HasFactory;

    protected $table = 'siswa_kelas';

    protected $fillable = [
        'iduser',
        'idkelas',
        'nisn',
        'tahun_ajaran',
        'status',
    ];

    public function siswa(): BelongsTo
    {
        return $this->belongsTo(UserSiswa::class, 'iduser', 'iduser');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas', 'id');
    }
}
