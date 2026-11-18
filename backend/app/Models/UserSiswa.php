<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\HasDynamicRbac;

class UserSiswa extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasDynamicRbac;

    protected $table = 'user';
    protected $primaryKey = 'iduser';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'iduser',
        'nama',
        'nisn',
        'nis',
        'jenis_kelamin',
        'tempat_lahir',
        'tanggal_lahir',
        'agama',
        'nomor_absen',
        'idkelas',
        'id_tahun_ajaran',
        'idjenjang',
        'idkategori',
        'telp',
        'alamat',
        'login_email',
        'login_password',
        'status_aktif',
        'url_image',
        'myreferal_code',
        'kode_referal',
        'active_session_token',
        'last_login_at',
        'force_change_password',
    ];

    protected $hidden = [
        'login_password',
        'active_session_token',
    ];

    public function getAuthIdentifierName()
    {
        return 'iduser';
    }

    public function getAuthPasswordName()
    {
        return 'login_password';
    }

    public function getNameAttribute(): string
    {
        return (string) ($this->attributes['nama'] ?? 'Siswa');
    }

    public function getEmailAttribute(): ?string
    {
        return $this->attributes['login_email'] ?? null;
    }

    public function getUsernameAttribute(): ?string
    {
        return $this->attributes['nisn'] ?? $this->attributes['iduser'] ?? null;
    }

    public function getRoleAttribute(): string
    {
        return 'siswa';
    }

    public function verifyPassword(string $plainPassword): bool
    {
        $raw = (string) $this->login_password;

        // 1. Check if stored password is a standard bcrypt hash
        $isBcrypt = str_starts_with($raw, '$2y$') || str_starts_with($raw, '$2a$') || str_starts_with($raw, '$2b$');
        if ($isBcrypt) {
            try {
                if (\Illuminate\Support\Facades\Hash::check($plainPassword, $raw)) {
                    return true;
                }
            } catch (\Throwable $e) {
                // Not a valid bcrypt hash, fall through to migration check
            }
        }

        // 2. Migration helper: if legacy 5x base64 or plaintext matches,
        // automatically upgrade stored password to standard bcrypt hash upon first login.
        $decoded = $raw;
        for ($i = 0; $i < 5; $i++) {
            $step = @base64_decode($decoded, true);
            if ($step !== false && preg_match('//u', $step)) {
                $decoded = $step;
            } else {
                break;
            }
        }

        if ($decoded === $plainPassword || $raw === $plainPassword) {
            $this->update(['login_password' => \Illuminate\Support\Facades\Hash::make($plainPassword)]);
            return true;
        }

        return false;
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas', 'id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'id_tahun_ajaran', 'id');
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function riwayatKelas(): HasMany
    {
        return $this->hasMany(SiswaKelas::class, 'iduser', 'iduser');
    }
}
