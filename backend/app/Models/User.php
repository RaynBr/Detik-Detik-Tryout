<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'username',
        'password',
        'is_active',
        'last_login_at',
        'active_session_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    public function teacher(): HasOne
    {
        return $this->hasOne(Teacher::class);
    }

    /**
     * Virtual attributes to seamlessly bridge Sanctum User with UserBo / UserSiswa
     */
    public function getRoleAttribute(): string
    {
        if ($this->hasRole('super_admin')) return 'super_admin';
        if ($this->hasRole('admin') || $this->hasRole('admin_instansi')) return 'admin';
        if ($this->hasRole('guru')) return 'guru';
        if ($this->hasRole('siswa')) return 'siswa';

        // Check user_bo
        $bo = UserBo::where('login_email', $this->email)
            ->orWhere('login_username', $this->username)
            ->first();
        if ($bo) {
            if ($bo->status_admin == '1') return 'admin';
            if ($bo->role_type) return $bo->role_type;
            return 'guru';
        }

        return 'siswa';
    }

    public function getIdkategoriAttribute(): ?string
    {
        $bo = UserBo::where('login_email', $this->email)
            ->orWhere('login_username', $this->username)
            ->first();
        if ($bo && !empty($bo->idkategori)) {
            return (string)$bo->idkategori;
        }

        $siswa = UserSiswa::where('login_email', $this->email)
            ->orWhere('nisn', $this->username)
            ->orWhere('iduser', $this->id)
            ->first();
        if ($siswa && !empty($siswa->idkategori)) {
            return (string)$siswa->idkategori;
        }

        return null;
    }

    public function getIduserBoAttribute(): ?int
    {
        $bo = UserBo::where('login_email', $this->email)
            ->orWhere('login_username', $this->username)
            ->first();
        return $bo ? (int)$bo->iduser_bo : null;
    }
}
