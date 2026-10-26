<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class UserSiswa extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

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
        'idkelas',
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

        if (password_verify($plainPassword, $raw)) {
            return true;
        }

        return $raw === $plainPassword;
    }

    public function kelas(): BelongsTo
    {
        return $this->belongsTo(MasterKelas::class, 'idkelas', 'id');
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
