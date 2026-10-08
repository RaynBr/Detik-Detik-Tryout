<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KategoriUserBo extends Model
{
    use HasFactory;

    protected $table = 'kategori_user_bo';
    protected $primaryKey = 'idkategori';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'idkategori',
        'nama_kategori',
        'tgl_input',
        'status_remove',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(UserBo::class, 'idkategori', 'idkategori');
    }

    public function adminSekolah(): HasMany
    {
        return $this->hasMany(UserBo::class, 'idkategori', 'idkategori')
            ->where(function ($q) {
                $q->where('role_type', 'admin_sekolah')->orWhere('role_type', 'admin');
            });
    }

    public function guru(): HasMany
    {
        return $this->hasMany(UserBo::class, 'idkategori', 'idkategori')
            ->where('role_type', 'guru');
    }

    public function siswa(): HasMany
    {
        return $this->hasMany(UserSiswa::class, 'idkategori', 'idkategori');
    }

    public function kelas(): HasMany
    {
        return $this->hasMany(MasterKelas::class, 'idkategori', 'idkategori');
    }
}
