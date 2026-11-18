<?php

namespace App\Http\Controllers\Api\Rbac;

use App\Http\Controllers\Controller;
use App\Http\Requests\Rbac\StoreRoleRequest;
use App\Http\Requests\Rbac\SyncRolePermissionsRequest;
use App\Http\Requests\Rbac\UpdateRoleRequest;
use App\Http\Resources\Rbac\RoleResource;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    /**
     * Display a listing of roles.
     * Super Admin sees all roles.
     * Admin Instansi sees relevant system templates (read-only) and roles of their institution.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        $query = Role::with('permissions');

        if ($isSuperAdmin) {
            if ($request->filled('instansi_id')) {
                $query->where('instansi_id', $request->query('instansi_id'));
            } elseif ($request->query('scope') === 'global') {
                $query->whereNull('instansi_id');
            } elseif ($request->query('scope') === 'instansi') {
                $query->whereNotNull('instansi_id');
            }
        } else {
            // Admin instansi only sees:
            // 1. Relevant default global roles (is_system = true, instansi_id = null, name != 'super_admin')
            // 2. Roles belonging to their own instansi (instansi_id = $user->idkategori)
            $userInstansiId = $user->idkategori;
            $query->where(function ($q) use ($userInstansiId) {
                $q->where(function ($sys) {
                    $sys->whereNull('instansi_id')
                        ->where('is_system', true)
                        ->where('name', '!=', 'super_admin');
                })->orWhere(function ($inst) use ($userInstansiId) {
                    $inst->where('instansi_id', $userInstansiId);
                });
            });
        }

        $roles = $query->orderBy('is_system', 'desc')->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'data' => RoleResource::collection($roles),
            'total_count' => $roles->count(),
        ]);
    }

    /**
     * Display the specified role.
     */
    public function show($id, Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        $role = Role::with('permissions')->findOrFail($id);

        if (!$isSuperAdmin) {
            // Rule #2: Admin instansi cannot access super_admin or roles of other institutions
            $isAllowedSystem = ($role->is_system && empty($role->instansi_id) && $role->name !== 'super_admin');
            $isOwnInstansi = ($role->instansi_id === $user->idkategori);

            if (!$isAllowedSystem && !$isOwnInstansi) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda tidak memiliki izin untuk melihat role ini.',
                    'code' => 'FORBIDDEN',
                ], 403);
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => new RoleResource($role),
        ]);
    }

    /**
     * Store a newly created custom role.
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        // Determine instansi_id: Admin instansi ALWAYS uses their own instansi_id
        if ($isSuperAdmin) {
            $instansiId = $request->input('instansi_id');
        } else {
            $instansiId = $user->idkategori;
            if (empty($instansiId)) {
                return response()->json([
                    'message' => 'Akun Anda tidak terikat dengan instansi yang valid.',
                    'code' => 'NO_INSTANSI',
                ], 403);
            }
        }

        $name = trim($request->input('name'));

        // Prevent reserved system role names collision
        if (in_array(strtolower($name), ['super_admin', 'admin', 'admin_instansi', 'guru', 'siswa'], true)) {
            return response()->json([
                'message' => "Nama role '{$name}' adalah nama sistem yang dilindungi.",
                'code' => 'RESERVED_ROLE_NAME',
            ], 422);
        }

        // Check uniqueness within the target scope
        $existsQuery = Role::where('name', $name);
        if (empty($instansiId)) {
            $existsQuery->whereNull('instansi_id');
        } else {
            $existsQuery->where('instansi_id', $instansiId);
        }
        if ($existsQuery->exists()) {
            return response()->json([
                'message' => "Role dengan nama '{$name}' sudah terdaftar pada instansi ini.",
                'code' => 'ROLE_EXISTS',
            ], 422);
        }

        // Validate permissions if provided
        $permKeys = $request->input('permissions', []);
        if (!empty($permKeys)) {
            // Rule #3: Platform scope permissions cannot enter instansi role
            if (!empty($instansiId)) {
                $hasPlatformPerm = Permission::whereIn('key', $permKeys)->where('scope', 'platform')->exists();
                if ($hasPlatformPerm) {
                    return response()->json([
                        'message' => 'Permission ber-scope platform tidak dapat diberikan kepada role instansi.',
                        'code' => 'INVALID_SCOPE',
                    ], 422);
                }
            }

            // Rule #1: Anti privilege escalation (caller can only grant permissions they themselves possess)
            if (!$isSuperAdmin) {
                $callerPerms = method_exists($user, 'permissions') ? $user->permissions() : [];
                $unauthorized = array_diff($permKeys, $callerPerms);
                if (!empty($unauthorized)) {
                    return response()->json([
                        'message' => 'Anti Privilege Escalation: Anda tidak dapat memberikan permission yang tidak Anda miliki: ' . implode(', ', $unauthorized),
                        'code' => 'PRIVILEGE_ESCALATION_BLOCKED',
                    ], 403);
                }
            }
        }

        $role = DB::transaction(function () use ($name, $request, $instansiId, $permKeys) {
            $created = Role::create([
                'name' => $name,
                'label' => $request->input('label'),
                'instansi_id' => $instansiId,
                'is_system' => false,
            ]);

            if (!empty($permKeys)) {
                $permIds = Permission::whereIn('key', $permKeys)->pluck('id')->all();
                $created->permissions()->sync($permIds);
            }

            return $created;
        });

        // Rule #9: Audit Log
        AuditLog::record(
            'CREATE_ROLE',
            'roles',
            (string) $role->id,
            $role->name,
            [
                'after' => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'label' => $role->label,
                    'instansi_id' => $role->instansi_id,
                    'permissions' => $permKeys,
                ],
            ],
            null, null, null,
            'Manajemen Role'
        );

        return response()->json([
            'status' => 'success',
            'message' => "Role '{$role->name}' berhasil dibuat.",
            'data' => new RoleResource($role->load('permissions')),
        ], 201);
    }

    /**
     * Update role details.
     */
    public function update($id, UpdateRoleRequest $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        $role = Role::findOrFail($id);

        // Rule #2: Admin instansi cannot update global/platform roles or foreign roles
        if (!$isSuperAdmin) {
            if (empty($role->instansi_id) || $role->instansi_id !== $user->idkategori) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda hanya dapat mengubah role milik instansi Anda.',
                    'code' => 'FORBIDDEN',
                ], 403);
            }
        }

        // Rule #4: is_system roles CANNOT be renamed
        if ($role->is_system && $request->filled('name') && $request->input('name') !== $role->name) {
            return response()->json([
                'message' => 'Role sistem bawaan tidak dapat diubah namanya.',
                'code' => 'SYSTEM_ROLE_PROTECTED',
            ], 422);
        }

        $before = [
            'name' => $role->name,
            'label' => $role->label,
        ];

        // If name changes, verify uniqueness
        if ($request->filled('name') && $request->input('name') !== $role->name) {
            $newName = trim($request->input('name'));
            $existsQuery = Role::where('name', $newName)->where('id', '!=', $role->id);
            if (empty($role->instansi_id)) {
                $existsQuery->whereNull('instansi_id');
            } else {
                $existsQuery->where('instansi_id', $role->instansi_id);
            }
            if ($existsQuery->exists()) {
                return response()->json([
                    'message' => "Role dengan nama '{$newName}' sudah digunakan.",
                    'code' => 'ROLE_EXISTS',
                ], 422);
            }
            $role->name = $newName;
        }

        $role->label = $request->input('label');
        $role->save();

        // Rule #9: Audit Log
        AuditLog::record(
            'UPDATE_ROLE',
            'roles',
            (string) $role->id,
            $role->name,
            [
                'before' => $before,
                'after' => [
                    'name' => $role->name,
                    'label' => $role->label,
                ],
            ],
            null, null, null,
            'Manajemen Role'
        );

        return response()->json([
            'status' => 'success',
            'message' => "Role '{$role->name}' berhasil diperbarui.",
            'data' => new RoleResource($role->load('permissions')),
        ]);
    }

    /**
     * Delete custom role.
     */
    public function destroy($id, Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        $role = Role::findOrFail($id);

        // Rule #2: Admin instansi cannot delete global or foreign roles
        if (!$isSuperAdmin) {
            if (empty($role->instansi_id) || $role->instansi_id !== $user->idkategori) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda hanya dapat menghapus role milik instansi Anda.',
                    'code' => 'FORBIDDEN',
                ], 403);
            }
        }

        // Rule #4: is_system roles CANNOT be deleted
        if ($role->is_system) {
            return response()->json([
                'message' => 'Role sistem bawaan tidak dapat dihapus.',
                'code' => 'SYSTEM_ROLE_PROTECTED',
            ], 422);
        }

        // Rule #6: Role that is still assigned to users CANNOT be deleted
        $assignedCount = DB::table('user_roles')->where('role_id', $role->id)->count();
        if ($assignedCount > 0) {
            return response()->json([
                'message' => "Role '{$role->name}' tidak dapat dihapus karena masih digunakan oleh {$assignedCount} pengguna aktif.",
                'code' => 'ROLE_IN_USE',
                'assigned_users_count' => $assignedCount,
            ], 422);
        }

        DB::transaction(function () use ($role) {
            $role->permissions()->detach();
            $role->delete();
        });

        // Rule #9: Audit Log
        AuditLog::record(
            'DELETE_ROLE',
            'roles',
            (string) $role->id,
            $role->name,
            [
                'deleted_role' => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'label' => $role->label,
                    'instansi_id' => $role->instansi_id,
                ],
            ],
            null, null, null,
            'Manajemen Role'
        );

        return response()->json([
            'status' => 'success',
            'message' => "Role '{$role->name}' berhasil dihapus.",
        ]);
    }

    /**
     * Sync permissions to role.
     */
    public function syncPermissions($id, SyncRolePermissionsRequest $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        $role = Role::findOrFail($id);

        // Rule #2: Admin instansi cannot edit global roles or foreign roles
        if (!$isSuperAdmin) {
            if (empty($role->instansi_id) || $role->instansi_id !== $user->idkategori) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda hanya dapat mengelola permission role milik instansi Anda.',
                    'code' => 'FORBIDDEN',
                ], 403);
            }
        }

        $targetKeys = array_values(array_unique($request->input('permissions', [])));

        // Rule #4: super_admin permissions CANNOT be reduced
        if ($role->name === 'super_admin') {
            $existingKeys = $role->permissions()->pluck('key')->all();
            $missing = array_diff($existingKeys, $targetKeys);
            if (!empty($missing)) {
                return response()->json([
                    'message' => 'Permission pada role super_admin dilindungi dan tidak boleh dikurangi.',
                    'code' => 'SUPER_ADMIN_PROTECTED',
                ], 422);
            }
        }

        // Rule #3: Platform scope permissions CANNOT be assigned to instansi role
        if (!empty($role->instansi_id)) {
            $platformPerms = Permission::whereIn('key', $targetKeys)->where('scope', 'platform')->pluck('key')->all();
            if (!empty($platformPerms)) {
                return response()->json([
                    'message' => 'Permission ber-scope platform tidak dapat diberikan kepada role instansi: ' . implode(', ', $platformPerms),
                    'code' => 'INVALID_SCOPE',
                ], 422);
            }
        }

        // Rule #1: Anti privilege escalation (caller can only grant permissions they themselves possess)
        if (!$isSuperAdmin) {
            $callerPerms = method_exists($user, 'permissions') ? $user->permissions() : [];
            $unauthorized = array_diff($targetKeys, $callerPerms);
            if (!empty($unauthorized)) {
                return response()->json([
                    'message' => 'Anti Privilege Escalation: Anda tidak dapat memberikan permission yang tidak Anda miliki: ' . implode(', ', $unauthorized),
                    'code' => 'PRIVILEGE_ESCALATION_BLOCKED',
                ], 403);
            }
        }

        // Rule #5: Anti lockout (cannot revoke role_*.manage from the role currently used by caller)
        $callerRoleIds = method_exists($user, 'roles') ? $user->roles()->pluck('roles.id')->all() : [];
        if (in_array($role->id, $callerRoleIds, true)) {
            $requiredManage = $isSuperAdmin ? 'role_platform.manage' : 'role_instansi.manage';
            if (!in_array($requiredManage, $targetKeys, true)) {
                return response()->json([
                    'message' => "Anti Lockout: Anda tidak dapat mencabut permission '{$requiredManage}' dari role yang sedang Anda gunakan.",
                    'code' => 'ANTI_LOCKOUT',
                ], 422);
            }
        }

        $beforeKeys = $role->permissions()->pluck('key')->all();

        // Perform sync
        $permIds = Permission::whereIn('key', $targetKeys)->pluck('id')->all();
        $role->permissions()->sync($permIds);

        // Rule #10: Invalidate permission caches immediately
        $role->flushUserPermissionCaches();

        // Rule #9: Audit Log
        AuditLog::record(
            'SYNC_ROLE_PERMISSIONS',
            'roles',
            (string) $role->id,
            $role->name,
            [
                'before' => $beforeKeys,
                'after' => $targetKeys,
            ],
            null, null, null,
            'Manajemen Role'
        );

        return response()->json([
            'status' => 'success',
            'message' => "Permission untuk role '{$role->name}' berhasil diperbarui.",
            'data' => new RoleResource($role->load('permissions')),
        ]);
    }
}

