<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankSoalGlobal extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'bank_soal_global';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'kode_paket',
        'nama_paket',
        'deskripsi',
        'idjenjang',
        'tingkat',
        'idtingkat',
        'idkelas',
        'idmapel',
        'idkurikulum',
        'id_tahun_ajaran',
        'tahun_soal_id',
        'total_soal',
        'status_aktif',
        'iduser_bo',
    ];

    public function soal(): HasMany
    {
        return $this->hasMany(BankSoalGlobalDetail::class, 'bank_soal_global_id', 'id')->orderBy('urutan', 'asc');
    }

    public function details(): HasMany
    {
        return $this->hasMany(BankSoalGlobalDetail::class, 'bank_soal_global_id', 'id')->orderBy('urutan', 'asc');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas');
    }

    public function mapel(): BelongsTo
    {
        return $this->belongsTo(MasterMataPelajaran::class, 'idmapel');
    }

    public function kurikulum(): BelongsTo
    {
        return $this->belongsTo(MasterKurikulum::class, 'idkurikulum');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'id_tahun_ajaran');
    }

    public function tahunSoal(): BelongsTo
    {
        return $this->belongsTo(MasterTahunSoal::class, 'tahun_soal_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'iduser_bo', 'iduser_bo');
    }

    /**
     * Recalculate total_soal count
     */
    public function syncTotalSoal(): int
    {
        $count = $this->soal()->count();
        $this->update(['total_soal' => $count]);
        return $count;
    }
}

