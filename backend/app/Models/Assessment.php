<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assessment extends Model
{
    use HasFactory;

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
        'idkelas',
        'idmapel',
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
    ];

    public function jenjang(): BelongsTo
    {
        return $this->belongsTo(MasterJenjang::class, 'idjenjang', 'id');
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas', 'id');
    }

    public function mapel(): BelongsTo
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
}
