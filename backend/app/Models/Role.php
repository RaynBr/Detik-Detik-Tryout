<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;

class Role extends Model
{
    use HasFactory;

    protected $table = 'roles';

    protected $fillable = [
        'name',
        'label',
        'instansi_id',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(
            Permission::class,
            'role_permissions',
            'role_id',
            'permission_id'
        );
    }

    public function instansi(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'instansi_id', 'idkategori');
    }

    public function isGlobal(): bool
    {
        return empty($this->instansi_id);
    }

    public function isSystem(): bool
    {
        return (bool) $this->is_system;
    }

    /**
     * Clear cached permissions for all users assigned to this role.
     */
    public function flushUserPermissionCaches(): void
    {
        $userAssignments = \Illuminate\Support\Facades\DB::table('user_roles')
            ->where('role_id', $this->id)
            ->get(['user_type', 'user_id']);

        foreach ($userAssignments as $assignment) {
            Cache::forget("user_permissions_{$assignment->user_type}_{$assignment->user_id}");
        }
    }

    protected static function booted(): void
    {
        static::saved(function (Role $role) {
            $role->flushUserPermissionCaches();
        });

        static::deleted(function (Role $role) {
            $role->flushUserPermissionCaches();
        });
    }
}

