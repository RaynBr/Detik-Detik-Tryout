<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankSoalGuru extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'bank_soal_guru';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'id_guru',
        'id_instansi',
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
    ];

    public function soal(): HasMany
    {
        return $this->hasMany(BankSoalGuruDetail::class, 'bank_soal_guru_id', 'id')->orderBy('urutan', 'asc');
    }

    public function details(): HasMany
    {
        return $this->hasMany(BankSoalGuruDetail::class, 'bank_soal_guru_id', 'id')->orderBy('urutan', 'asc');
    }

    public function guru(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'id_guru', 'iduser_bo');
    }

    public function instansi(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'id_instansi', 'idkategori');
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

    public function syncTotalSoal(): int
    {
        $count = $this->soal()->count();
        $this->update(['total_soal' => $count]);
        return $count;
    }
}

