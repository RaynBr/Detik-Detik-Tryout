<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class UserBo extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'user_bo';
    protected $primaryKey = 'iduser_bo';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'iduser_bo',
        'idkategori',
        'nama',
        'telp',
        'alamat',
        'login_email',
        'login_username',
        'login_password',
        'status_admin',
        'role_type',
        'status_aktif',
        'status_remove',
        'jenis_kelamin',
        'nuptk',
        'nip',
        'idjenjang',
        'id_tahun_ajaran',
        'kode_referal',
        'sharing_fee_persen',
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
        return 'iduser_bo';
    }

    public function getAuthPasswordName()
    {
        return 'login_password';
    }

    public function getNameAttribute(): string
    {
        return (string) ($this->attributes['nama'] ?? $this->attributes['login_username'] ?? 'User Staff');
    }

    public function getEmailAttribute(): ?string
    {
        return $this->attributes['login_email'] ?? null;
    }

    public function getUsernameAttribute(): ?string
    {
        return $this->attributes['login_username'] ?? null;
    }

    /**
     * Resolves role: 'super_admin' | 'admin' | 'guru'
     */
    public function getRoleAttribute(): string
    {
        if ($this->role_type === 'super_admin' || $this->status_admin === '1') {
            return 'super_admin';
        }

        if ($this->role_type === 'guru') {
            return 'guru';
        }

        if ($this->role_type === 'admin_sekolah' || $this->role_type === 'admin') {
            return 'admin';
        }

        if ($this->status_admin === '2') {
            return 'admin';
        }

        return 'admin';
    }

    /**
     * Verify password using standard Hash::check(), with transparent migration helper for legacy passwords.
     */
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

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }
}