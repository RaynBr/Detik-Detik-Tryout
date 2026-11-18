<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\BelongsToInstansi;

class MasterKelas extends Model
{
    use HasFactory, BelongsToInstansi;

    protected $table = 'master_kelas';

    protected $fillable = [
        'idjenjang',
        'idkategori',
        'academic_year_id',
        'semester_id',
        'kurikulum_id',
        'idjurusan',
        'idtingkat',
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

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id', 'id');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(MasterSemester::class, 'semester_id', 'id');
    }

    public function kurikulum(): BelongsTo
    {
        return $this->belongsTo(MasterKurikulum::class, 'kurikulum_id', 'id');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function jurusanRelation(): BelongsTo
    {
        return $this->belongsTo(Major::class, 'idjurusan', 'id');
    }

    public function tingkatKelas(): BelongsTo
    {
        return $this->belongsTo(MasterTingkatKelas::class, 'idtingkat', 'id');
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
