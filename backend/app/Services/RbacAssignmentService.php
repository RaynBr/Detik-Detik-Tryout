<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class RbacAssignmentService
{
    /**
     * Global system role names managed by this service.
     */
    public const SYSTEM_ROLES = [
        'super_admin',
        'admin_instansi',
        'guru',
        'siswa',
    ];

    /**
     * Global toggle to disable automatic model-event role assignment (useful in tests, seeders, or bulk batching).
     */
    public static bool $autoAssignEnabled = true;

    public static function isAutoAssignEnabled(): bool
    {
        return self::$autoAssignEnabled && (bool) config('rbac.auto_assign_on_create', true);
    }

    public static function disableAutoAssign(): void
    {
        self::$autoAssignEnabled = false;
    }

    public static function enableAutoAssign(): void
    {
        self::$autoAssignEnabled = true;
    }

    public static function withoutAutoAssign(callable $callback): mixed
    {
        $previous = self::$autoAssignEnabled;
        self::$autoAssignEnabled = false;
        try {
            return $callback();
        } finally {
            self::$autoAssignEnabled = $previous;
        }
    }

    /**
     * Resolve the default global system role name strictly from account type.
     *
     * Rules:
     * - UserSiswa (table `user`) -> ALWAYS 'siswa'
     * - UserBo (`user_bo`):
     *     - status_admin = '1' OR role_type = 'super_admin' -> 'super_admin'
     *     - role_type = 'guru' -> 'guru'
     *     - role_type in ['admin_sekolah', 'admin', 'admin_instansi'] OR status_admin = '2' -> 'admin_instansi'
     *     - fallback -> 'guru'
     */
    public function resolveDefaultRoleName(Model $user): ?string
    {
        if ($user instanceof UserSiswa) {
            return 'siswa';
        }

        if ($user instanceof UserBo) {
            $statusAdmin = (string) ($user->status_admin ?? '');
            $roleType = strtolower(trim((string) ($user->role_type ?? '')));

            if ($statusAdmin === '1' || $roleType === 'super_admin') {
                return 'super_admin';
            }

            if ($roleType === 'guru') {
                return 'guru';
            }

            if (in_array($roleType, ['admin_sekolah', 'admin', 'admin_instansi'], true) || $statusAdmin === '2') {
                return 'admin_instansi';
            }

            return 'guru';
        }

        return null;
    }

    /**
     * Assign the default global system role to a single user idempotently.
     * Uses global system roles (instansi_id IS NULL).
     * Never throws if the system role is missing in DB — logs an error instead so user creation does not fail.
     */
    public function assignDefaultRole(Model $user): bool
    {
        $roleName = $this->resolveDefaultRoleName($user);
        if (!$roleName) {
            Log::error('RBAC_ASSIGN_SKIPPED: Tidak dapat menentukan role default untuk model ' . get_class($user));
            return false;
        }

        if (!$this->rbacTablesReady()) {
            Log::warning("RBAC_TABLES_NOT_READY: Tabel roles/user_roles belum tersedia saat assignDefaultRole({$roleName}).");
            return false;
        }

        $role = Role::where('name', $roleName)->whereNull('instansi_id')->first();
        if (!$role) {
            $userId = (string) $user->getKey();
            Log::error("RBAC_SYSTEM_ROLE_MISSING: Role sistem global '{$roleName}' (instansi_id NULL) tidak ditemukan di database saat pembuatan user [type=" . get_class($user) . ", id={$userId}].");
            return false;
        }

        $userType = get_class($user);
        $userId = (string) $user->getKey();
        $now = now();

        DB::table('user_roles')->insertOrIgnore([
            'user_type' => $userType,
            'user_id' => $userId,
            'role_id' => $role->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->flushUserCache($user);

        return true;
    }

    /**
     * Batch-assign default global system roles for bulk imports (Excel/CSV) in chunked insertOrIgnore queries.
     *
     * @param array<int, Model> $users
     */
    public function assignDefaultRoleBatch(array $users): int
    {
        if (empty($users)) {
            return 0;
        }

        if (!$this->rbacTablesReady()) {
            Log::warning('RBAC_TABLES_NOT_READY: Tabel roles/user_roles belum tersedia saat assignDefaultRoleBatch.');
            return 0;
        }

        // Load all global system roles once
        $globalRoles = Role::whereNull('instansi_id')
            ->whereIn('name', self::SYSTEM_ROLES)
            ->pluck('id', 'name');

        $now = now();
        $rowsToInsert = [];
        $missingRolesLogged = [];
        $processedUsers = [];

        foreach ($users as $user) {
            if (!$user instanceof Model) {
                continue;
            }

            $roleName = $this->resolveDefaultRoleName($user);
            if (!$roleName) {
                continue;
            }

            if (!isset($globalRoles[$roleName])) {
                if (!isset($missingRolesLogged[$roleName])) {
                    Log::error("RBAC_SYSTEM_ROLE_MISSING: Role sistem global '{$roleName}' (instansi_id NULL) tidak ditemukan saat batch import.");
                    $missingRolesLogged[$roleName] = true;
                }
                continue;
            }

            $rowsToInsert[] = [
                'user_type' => get_class($user),
                'user_id' => (string) $user->getKey(),
                'role_id' => (int) $globalRoles[$roleName],
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $processedUsers[] = $user;
        }

        if (empty($rowsToInsert)) {
            return 0;
        }

        foreach (array_chunk($rowsToInsert, 500) as $chunk) {
            DB::table('user_roles')->insertOrIgnore($chunk);
        }

        foreach ($processedUsers as $user) {
            $this->flushUserCache($user);
        }

        return count($processedUsers);
    }

    /**
     * Synchronize ONLY the global system role when a user's account type changes (e.g., guru <-> admin_sekolah).
     * Preserves all custom / non-system roles attached to the user.
     */
    public function syncSystemRoleOnTypeChange(Model $user): bool
    {
        $newRoleName = $this->resolveDefaultRoleName($user);
        if (!$newRoleName) {
            return false;
        }

        if (!$this->rbacTablesReady()) {
            return false;
        }

        $systemRolesMap = Role::whereNull('instansi_id')
            ->whereIn('name', self::SYSTEM_ROLES)
            ->pluck('id', 'name');

        if (!isset($systemRolesMap[$newRoleName])) {
            Log::error("RBAC_SYSTEM_ROLE_MISSING: Role sistem global '{$newRoleName}' tidak ditemukan saat syncSystemRoleOnTypeChange untuk user [type=" . get_class($user) . ", id=" . $user->getKey() . "].");
            return false;
        }

        $newRoleId = (int) $systemRolesMap[$newRoleName];
        $otherSystemRoleIds = $systemRolesMap
            ->except([$newRoleName])
            ->values()
            ->map(fn ($id) => (int) $id)
            ->all();

        $userType = get_class($user);
        $userId = (string) $user->getKey();
        $now = now();

        DB::transaction(function () use ($userType, $userId, $newRoleId, $otherSystemRoleIds, $now) {
            if (!empty($otherSystemRoleIds)) {
                DB::table('user_roles')
                    ->where('user_type', $userType)
                    ->where('user_id', $userId)
                    ->whereIn('role_id', $otherSystemRoleIds)
                    ->delete();
            }

            DB::table('user_roles')->insertOrIgnore([
                'user_type' => $userType,
                'user_id' => $userId,
                'role_id' => $newRoleId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        $this->flushUserCache($user);

        return true;
    }

    /**
     * Remove all rows from user_roles when a user is permanently deleted.
     * (Not called on soft-delete / status_remove = 'Y').
     */
    public function detachAllRoles(Model $user): int
    {
        if (!$this->rbacTablesReady()) {
            return 0;
        }

        $deleted = DB::table('user_roles')
            ->where('user_type', get_class($user))
            ->where('user_id', (string) $user->getKey())
            ->delete();

        $this->flushUserCache($user);

        return $deleted;
    }

    /**
     * Read-only runtime fallback permissions for a user who has NO rows in `user_roles`.
     * Does NOT write to database. Logs warning 'USER_WITHOUT_RBAC_ROLE'.
     * Never grants permissions beyond the global system role matching the user's account type.
     *
     * @return array<int, string>
     */
    public function getFallbackPermissionsForUser(Model $user): array
    {
        $roleName = $this->resolveDefaultRoleName($user);
        $userType = get_class($user);
        $userId = (string) $user->getKey();
        $userName = $user->name ?? $user->nama ?? 'unknown';

        Log::warning("USER_WITHOUT_RBAC_ROLE: Pengguna [type={$userType}, id={$userId}, nama={$userName}] belum memiliki baris di user_roles. Menggunakan fallback read-only role sistem '{$roleName}'.");

        if (!$roleName || !$this->rbacTablesReady()) {
            return [];
        }

        $role = Role::where('name', $roleName)->whereNull('instansi_id')->first();
        if (!$role) {
            return [];
        }

        if ($roleName === 'super_admin') {
            return Permission::pluck('key')->all();
        }

        return DB::table('role_permissions')
            ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.id')
            ->where('role_permissions.role_id', $role->id)
            ->distinct()
            ->pluck('permissions.key')
            ->all();
    }

    protected function flushUserCache(Model $user): void
    {
        if (method_exists($user, 'clearPermissionCache')) {
            $user->clearPermissionCache();
        } else {
            Cache::forget('user_permissions_' . get_class($user) . '_' . $user->getKey());
        }
    }

    protected function rbacTablesReady(): bool
    {
        try {
            return Schema::hasTable('roles') && Schema::hasTable('user_roles');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
