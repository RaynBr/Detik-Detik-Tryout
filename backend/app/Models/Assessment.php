<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToInstansi;

class Assessment extends Model
{
    use HasFactory, SoftDeletes, BelongsToInstansi;

    protected $table = 'assessment';
    protected $primaryKey = 'idassessment';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'idassessment',
        'nama_assessment',
        'idassessment_kategori',
        'idkategori',
        'deskripsi_assessment',
        'tanggal_mulai_assessment',
        'tanggal_batas_assessment',
        'waktu_pengerjaan',
        'tanggal_input',
        'url_image_panjang',
        'url_image_kotak',
        'url_sertifikat_depan_template',
        'url_sertifikat_belakang_template',
        'idsertifikat_kategori',
        'url_logo_sponsor',
        'harga_assessment',
        'diskon_assessment',
        'status_diskon',
        'tampil_assessment_pilgan',
        'tampil_assessment_essay',
        'iduser_bo',
        'point_assessment',
        'point_assessment_nama',
        'idjenjang',
        'tingkat',
        'idtingkat',
        'idkelas',
        'idmapel',
        'id_tahun_ajaran',
        'tahun_soal_id',
        'idkurikulum',
        'source_type',
        'acak_soal',
        'acak_opsi',
        'status_aktif',
        'status_paket',
        'is_locked',
        'locked_at',
    ];

    protected $casts = [
        'is_locked' => 'boolean',
        'locked_at' => 'datetime',
    ];

    protected $attributes = [
        'idassessment_kategori' => '27733030223218728',
        'url_image_panjang' => '',
        'url_image_kotak' => '',
        'url_sertifikat_depan_template' => '',
        'url_sertifikat_belakang_template' => '',
        'idsertifikat_kategori' => null,
        'url_logo_sponsor' => '',
        'harga_assessment' => 0,
        'diskon_assessment' => 0,
        'status_diskon' => '0',
        'tampil_assessment_pilgan' => 50,
        'tampil_assessment_essay' => 0,
        'point_assessment' => 0,
        'point_assessment_nama' => 'JPtest',
        'status_aktif' => 'Y',
        'status_paket' => 'draft',
        'is_locked' => false,
    ];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->tanggal_mulai_assessment)) {
                $model->tanggal_mulai_assessment = now()->toDateString();
            }
            if (empty($model->tanggal_batas_assessment)) {
                $model->tanggal_batas_assessment = now()->addYear()->toDateString();
            }
            if (empty($model->waktu_pengerjaan)) {
                $model->waktu_pengerjaan = 90;
            }
        });
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'id_tahun_ajaran', 'id');
    }

    public function tahunSoal(): BelongsTo
    {
        return $this->belongsTo(MasterTahunSoal::class, 'tahun_soal_id', 'id');
    }

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function masterTingkat(): BelongsTo
    {
        return $this->belongsTo(MasterTingkatKelas::class, 'idtingkat', 'id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas', 'id');
    }

    public function mapel(): BelongsTo
    {
        return $this->belongsTo(MasterMataPelajaran::class, 'idmapel', 'id');
    }

    public function kurikulum(): BelongsTo
    {
        return $this->belongsTo(MasterKurikulum::class, 'idkurikulum', 'id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(MasterMataPelajaran::class, 'idmapel', 'id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'iduser_bo', 'iduser_bo');
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function soal(): HasMany
    {
        return $this->hasMany(AssessmentSoalPilgan::class, 'idassessment', 'idassessment');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(AssessmentJawabanPilgan::class, 'idassessment', 'idassessment');
    }

    public function examGroups(): HasMany
    {
        return $this->hasMany(ExamGroup::class, 'exam_id', 'idassessment');
    }
}
