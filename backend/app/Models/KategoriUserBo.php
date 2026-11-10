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

    /**
     * Scope for institutions with active access to the platform (Single Source of Truth).
     * Criteria:
     * - status_remove != 'Y' (not deleted)
     * - status_aktif != 'N' (not deactivated)
     * - subscription_status == 'aktif'
     * - tanggal_berakhir is null OR tanggal_berakhir >= today (not expired)
     */
    public function scopeActiveAccess($query, ?\Carbon\Carbon $today = null)
    {
        $today = $today ?: now()->startOfDay();
        return $query->where('status_remove', '!=', 'Y')
            ->where('status_aktif', '!=', 'N')
            ->where(function ($sq) {
                $sq->whereNull('subscription_status')->orWhere('subscription_status', 'aktif');
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('tanggal_berakhir')
                  ->orWhere('tanggal_berakhir', '>=', $today->toDateString());
            });
    }

    /**
     * Scope for expired institutions.
     */
    public function scopeExpiredAccess($query, ?\Carbon\Carbon $today = null)
    {
        $today = $today ?: now()->startOfDay();
        return $query->whereNotNull('tanggal_berakhir')
            ->where('tanggal_berakhir', '<', $today->toDateString());
    }

    /**
     * Scope for institutions whose access will expire within 7 days.
     */
    public function scopeWarningAccess($query, ?\Carbon\Carbon $today = null)
    {
        $today = $today ?: now()->startOfDay();
        return $query->activeAccess($today)
            ->whereNotNull('tanggal_berakhir')
            ->where('tanggal_berakhir', '>=', $today->toDateString())
            ->where('tanggal_berakhir', '<=', $today->copy()->addDays(7)->toDateString());
    }

    /**
     * Scope for inactive institutions (disabled, suspended, or expired).
     */
    public function scopeInactiveAccess($query, ?\Carbon\Carbon $today = null)
    {
        $today = $today ?: now()->startOfDay();
        return $query->where(function ($q) use ($today) {
            $q->where('status_remove', 'Y')
              ->orWhere('status_aktif', 'N')
              ->orWhere('subscription_status', 'nonaktif')
              ->orWhere(function ($sub) use ($today) {
                  $sub->whereNotNull('tanggal_berakhir')
                      ->where('tanggal_berakhir', '<', $today->toDateString());
              });
        });
    }

    /**
     * Synchronize database flags for expired institutions.
     */
    public static function syncExpiredSubscriptions(?\Carbon\Carbon $today = null): int
    {
        $today = $today ?: now()->startOfDay();
        return self::whereNotNull('tanggal_berakhir')
            ->where('tanggal_berakhir', '<', $today->toDateString())
            ->where(function ($q) {
                $q->where('subscription_status', 'aktif')
                  ->orWhere('status_aktif', 'Y');
            })
            ->update([
                'subscription_status' => 'nonaktif',
                'status_aktif' => 'N',
            ]);
    }

    /**
     * Single Source of Truth for Platform Access Statistics across Dashboard & Subscriptions.
     */
    public static function getPlatformAccessSummary(): array
    {
        $today = now()->startOfDay();
        self::syncExpiredSubscriptions($today);

        $totalInstansi = self::count();
        $totalExpired = self::expiredAccess($today)->count();
        $totalWarning = self::warningAccess($today)->count();
        $totalAktif = self::activeAccess($today)->count();
        $totalNonaktif = max(0, $totalInstansi - $totalAktif);

        return [
            'total_instansi' => $totalInstansi,
            'total_institutions' => $totalInstansi,
            'total_aktif' => $totalAktif,
            'instansi_aktif' => $totalAktif,
            'active_subscriptions' => $totalAktif,
            'total_warning' => $totalWarning,
            'instansi_warning' => $totalWarning,
            'warning_subscriptions' => $totalWarning,
            'total_expired' => $totalExpired,
            'instansi_expired' => $totalExpired,
            'expired_subscriptions' => $totalExpired,
            'total_nonaktif' => $totalNonaktif,
            'instansi_non_aktif' => $totalNonaktif,
            'instansi_nonaktif' => $totalNonaktif,
            'inactive_subscriptions' => $totalNonaktif,
        ];
    }
}
