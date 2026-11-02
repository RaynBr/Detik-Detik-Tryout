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
    ];

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class, 'idkategori', 'idkategori');
    }

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

    public function academicYears(): HasMany
    {
        return $this->hasMany(AcademicYear::class, 'idkategori', 'idkategori');
    }

    public function semesters(): HasMany
    {
        return $this->hasMany(MasterSemester::class, 'idkategori', 'idkategori');
    }

    public function kurikulums(): HasMany
    {
        return $this->hasMany(MasterKurikulum::class, 'idkategori', 'idkategori');
    }

    public function jenjangs(): HasMany
    {
        return $this->hasMany(MasterJenjang::class, 'idkategori', 'idkategori');
    }

    public function majors(): HasMany
    {
        return $this->hasMany(Major::class, 'idkategori', 'idkategori');
    }

    public function tingkatKelas(): HasMany
    {
        return $this->hasMany(MasterTingkatKelas::class, 'idkategori', 'idkategori');
    }

    public function mataPelajaran(): HasMany
    {
        return $this->hasMany(MasterMataPelajaran::class, 'idkategori', 'idkategori');
    }
}
