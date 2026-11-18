<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    protected $table = 'permissions';

    protected $fillable = [
        'key',
        'label',
        'module',
        'scope',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'role_permissions',
            'permission_id',
            'role_id'
        );
    }

    protected static function booted(): void
    {
        static::saved(function (Permission $permission) {
            foreach ($permission->roles as $role) {
                $role->flushUserPermissionCaches();
            }
        });

        static::deleted(function (Permission $permission) {
            foreach ($permission->roles as $role) {
                $role->flushUserPermissionCaches();
            }
        });
    }
}

