<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterMataPelajaran extends Model
{
    use HasFactory;

    protected $table = 'master_mata_pelajaran';

    protected $fillable = [
        'idkategori',
        'academic_year_id',
        'semester_id',
        'idkurikulum',
        'idjenjang',
        'idjurusan',
        'idtingkat',
        'tahun_ajaran',
        'kode_mapel',
        'nama_mapel',
        'kelompok',
        'kkm',
        'deskripsi',
        'status_aktif',
    ];

    protected $casts = [
        'kkm' => 'float',
    ];

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
        return $this->belongsTo(MasterKurikulum::class, 'idkurikulum', 'id');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function jurusan(): BelongsTo
    {
        return $this->belongsTo(Major::class, 'idjurusan', 'id');
    }

    public function tingkatKelas(): BelongsTo
    {
        return $this->belongsTo(MasterTingkatKelas::class, 'idtingkat', 'id');
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function guruPengampu(): HasMany
    {
        return $this->hasMany(GuruMataPelajaran::class, 'idmapel', 'id');
    }
}
