<?php

namespace App\Traits;

use App\Models\Role;
use App\Models\Permission;
use App\Models\UserBo;
use App\Services\RbacAssignmentService;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

trait HasDynamicRbac
{
    /**
     * Boot automatic RBAC safety hooks on UserBo & UserSiswa models:
     * - created: idempotently assigns default global system role unless disabled via flag/config.
     * - updated: syncs system role if UserBo role_type/status_admin changed (preserving custom roles).
     * - deleted: detaches all user_roles rows on permanent hard delete.
     */
    public static function bootHasDynamicRbac(): void
    {
        static::created(function ($model) {
            if (!RbacAssignmentService::isAutoAssignEnabled()) {
                return;
            }
            app(RbacAssignmentService::class)->assignDefaultRole($model);
        });

        static::updated(function ($model) {
            if (!RbacAssignmentService::isAutoAssignEnabled()) {
                return;
            }
            if ($model instanceof UserBo && $model->wasChanged(['role_type', 'status_admin'])) {
                app(RbacAssignmentService::class)->syncSystemRoleOnTypeChange($model);
            }
        });

        static::deleted(function ($model) {
            app(RbacAssignmentService::class)->detachAllRoles($model);
        });
    }

    public static function disableAutoAssignRoles(): void
    {
        RbacAssignmentService::disableAutoAssign();
    }

    public static function enableAutoAssignRoles(): void
    {
        RbacAssignmentService::enableAutoAssign();
    }

    public static function withoutAutoAssignRoles(callable $callback): mixed
    {
        return RbacAssignmentService::withoutAutoAssign($callback);
    }
    /**
     * Polymorphic relation to roles via user_roles.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'user_roles',
            'user_id',
            'role_id'
        )->wherePivot('user_type', static::class)
         ->withTimestamps();
    }

    /**
     * Get unique cache key for user permissions.
     */
    public function getPermissionCacheKey(): string
    {
        $type = static::class;
        $id = $this->getKey();
        return "user_permissions_{$type}_{$id}";
    }

    /**
     * Clear cached permissions for this user instance.
     */
    public function clearPermissionCache(): void
    {
        Cache::forget($this->getPermissionCacheKey());
    }

    /**
     * Returns a unique list of permission keys granted through all assigned roles.
     * Cached per user with automatic invalidation.
     *
     * @return array<string>
     */
    public function permissions(): array
    {
        $cacheTtl = config('rbac.cache_ttl', 3600);

        return Cache::remember($this->getPermissionCacheKey(), $cacheTtl, function () {
            // Check assigned roles in user_roles
            $roleIds = $this->roles()->pluck('roles.id');

            // Runtime fallback (read-only): if user has NO rows in user_roles yet,
            // derive permissions strictly from the default system role for their account type
            // without writing to DB, and log USER_WITHOUT_RBAC_ROLE warning.
            if ($roleIds->isEmpty()) {
                return app(RbacAssignmentService::class)->getFallbackPermissionsForUser($this);
            }

            // If user explicitly has super_admin role in user_roles, resolve all permissions
            if ($this->roles()->where('roles.name', 'super_admin')->exists()) {
                return Permission::pluck('key')->all();
            }

            return DB::table('role_permissions')
                ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.id')
                ->whereIn('role_permissions.role_id', $roleIds)
                ->distinct()
                ->pluck('permissions.key')
                ->all();
        });
    }

    /**
     * Check if user is assigned any of the given RBAC role names.
     */
    public function hasRbacRole(string|array $roleNames): bool
    {
        $names = is_array($roleNames) ? $roleNames : explode('|', $roleNames);
        return $this->roles()->whereIn('roles.name', $names)->exists();
    }

    /**
     * Check if user is Super Administrator.
     */
    public function isSuperAdmin(): bool
    {
        // 1. Check direct role assignment in RBAC
        $hasSuperAdminRole = $this->roles()->where('roles.name', 'super_admin')->exists();
        if ($hasSuperAdminRole) {
            return true;
        }

        // 2. Fallback check for legacy user_bo fields during transition
        if (isset($this->status_admin) && $this->status_admin === '1') {
            return true;
        }
        if (isset($this->role_type) && $this->role_type === 'super_admin') {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user has any of the given permissions (OR logic).
     * Super Admin bypasses all checks and always returns true.
     *
     * @param string|array<string> $keys
     */
    public function hasPermission(string|array $keys): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $checkKeys = is_array($keys) ? $keys : explode('|', $keys);
        $userPerms = $this->permissions();

        foreach ($checkKeys as $key) {
            if (in_array(trim($key), $userPerms, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Assign a role to this user.
     */
    public function assignRole(string|Role $role): void
    {
        $roleModel = is_string($role) ? Role::where('name', $role)->firstOrFail() : $role;

        DB::table('user_roles')->updateOrInsert([
            'user_type' => static::class,
            'user_id' => (string) $this->getKey(),
            'role_id' => $roleModel->id,
        ], [
            'updated_at' => now(),
            'created_at' => now(),
        ]);

        $this->clearPermissionCache();
    }

    /**
     * Remove a role from this user.
     */
    public function removeRole(string|Role $role): void
    {
        $roleId = is_string($role) ? Role::where('name', $role)->value('id') : $role->id;

        if ($roleId) {
            DB::table('user_roles')
                ->where('user_type', static::class)
                ->where('user_id', (string) $this->getKey())
                ->where('role_id', $roleId)
                ->delete();

            $this->clearPermissionCache();
        }
    }

    /**
     * Sync roles for this user.
     *
     * @param array<int|string> $roleIdentifiers Names or IDs
     */
    public function syncRoles(array $roleIdentifiers): void
    {
        $roleIds = [];
        foreach ($roleIdentifiers as $identifier) {
            if (is_numeric($identifier)) {
                $roleIds[] = (int) $identifier;
            } else {
                $id = Role::where('name', $identifier)->value('id');
                if ($id) $roleIds[] = $id;
            }
        }

        DB::transaction(function () use ($roleIds) {
            DB::table('user_roles')
                ->where('user_type', static::class)
                ->where('user_id', (string) $this->getKey())
                ->delete();

            $now = now();
            $inserts = [];
            foreach ($roleIds as $rId) {
                $inserts[] = [
                    'user_type' => static::class,
                    'user_id' => (string) $this->getKey(),
                    'role_id' => $rId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($inserts)) {
                DB::table('user_roles')->insert($inserts);
            }
        });

        $this->clearPermissionCache();
    }
}
