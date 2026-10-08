<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'kode_referal',
        'sharing_fee_persen',
        'active_session_token',
        'last_login_at',
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
        if ($this->status_admin === '1' || $this->role_type === 'super_admin') {
            return 'super_admin';
        }

        if ($this->role_type === 'admin_sekolah') {
            return 'admin';
        }

        if ($this->role_type === 'guru') {
            return 'guru';
        }

        // Heuristic fallback for status_admin = '2'
        $adminUsernames = ['testingpenyelenggara', 'pgrislcc', 'edulab.id', 'andioffset38'];
        if (in_array(strtolower((string)$this->login_username), $adminUsernames)) {
            return 'admin';
        }

        return 'guru';
    }

    /**
     * Decode 5x base64 or check bcrypt hash
     */
    public function verifyPassword(string $plainPassword): bool
    {
        $raw = (string) $this->login_password;

        // 1. Try 5x base64 decode
        $decoded = $raw;
        for ($i = 0; $i < 5; $i++) {
            $step = @base64_decode($decoded, true);
            if ($step !== false && preg_match('//u', $step)) {
                $decoded = $step;
            } else {
                break;
            }
        }

        if ($decoded === $plainPassword) {
            return true;
        }

        // 2. Try standard bcrypt hash
        if (password_verify($plainPassword, $raw)) {
            return true;
        }

        // 3. Fallback direct comparison if raw plaintext
        return $raw === $plainPassword;
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function kelasWali(): HasMany
    {
        return $this->hasMany(MasterKelas::class, 'wali_kelas_id', 'iduser_bo');
    }

    public function mapelAjar(): HasMany
    {
        return $this->hasMany(GuruMataPelajaran::class, 'iduser_bo', 'iduser_bo');
    }
}
