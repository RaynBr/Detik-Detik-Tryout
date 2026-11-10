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
        'jenis_instansi',
        'npsn',
        'email',
        'telp',
        'alamat',
        'kota',
        'provinsi',
        'status_aktif',
        'logo',
        'tanggal_aktif',
        'tanggal_berakhir',
        'keterangan_subscription',
        'subscription_status',
        'masa_berlaku',
        'encrypt_id',
        'tgl_input',
        'status_remove',
        'academic_config',
    ];

    protected $casts = [
        'academic_config' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(UserBo::class, 'idkategori', 'idkategori');
    }
}