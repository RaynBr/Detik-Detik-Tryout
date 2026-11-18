<?php

namespace App\Http\Controllers\Api\Rbac;

use App\Http\Controllers\Controller;
use App\Http\Requests\Rbac\AssignUserRolesRequest;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class UserRoleController extends Controller
{
    /**
     * Assign / synchronize roles for a specific user.
     * Supports multiple roles (union).
     */
    public function assignRoles($id, AssignUserRolesRequest $request): JsonResponse
    {
        $caller = $request->user();
        $isSuperAdmin = method_exists($caller, 'isSuperAdmin') && $caller->isSuperAdmin();

        // 1. Resolve Target User
        $userType = $request->input('user_type');
        $targetUser = null;

        if ($userType === 'siswa' || $userType === UserSiswa::class) {
            $targetUser = UserSiswa::where('iduser', $id)->first();
        } elseif ($userType === 'bo' || $userType === UserBo::class) {
            $targetUser = UserBo::where('iduser_bo', $id)->first();
        } else {
            // Auto-detect by searching UserBo then UserSiswa
            $targetUser = UserBo::where('iduser_bo', $id)->first();
            if (!$targetUser) {
                $targetUser = UserSiswa::where('iduser', $id)->first();
            }
        }

        if (!$targetUser) {
            return response()->json([
                'message' => "Pengguna dengan ID '{$id}' tidak ditemukan.",
                'code' => 'USER_NOT_FOUND',
            ], 404);
        }

        $targetUserClass = get_class($targetUser);
        $targetUserId = (string) $targetUser->getKey();
        $callerInstansiId = $caller->idkategori;

        // 2. Tenant Isolation Check
        if (!$isSuperAdmin) {
            $targetInstansiId = $targetUser->idkategori ?? ($targetUser->kelas?->idkategori ?? null);
            if ($targetInstansiId !== $callerInstansiId) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda hanya dapat mengelola role pengguna di instansi Anda.',
                    'code' => 'TENANT_FORBIDDEN',
                ], 403);
            }
        }

        // 3. Resolve Requested Roles
        $requestedRoleInputs = $request->input('roles', []);
        $resolvedRoles = [];

        foreach ($requestedRoleInputs as $roleInput) {
            $roleModel = null;
            if (is_numeric($roleInput)) {
                $roleModel = Role::find($roleInput);
            } else {
                $roleModel = Role::where('name', $roleInput)->where(function ($q) use ($callerInstansiId, $isSuperAdmin) {
                    if ($isSuperAdmin) {
                        // Super Admin can resolve any role
                    } else {
                        $q->whereNull('instansi_id')->orWhere('instansi_id', $callerInstansiId);
                    }
                })->first();
            }

            if (!$roleModel) {
                return response()->json([
                    'message' => "Role '{$roleInput}' tidak ditemukan atau tidak tersedia untuk instansi Anda.",
                    'code' => 'ROLE_NOT_FOUND',
                ], 422);
            }

            // Rule #2: Admin instansi cannot assign super_admin or roles of other instansi
            if (!$isSuperAdmin) {
                if ($roleModel->name === 'super_admin') {
                    return response()->json([
                        'message' => 'Akses ditolak. Hanya Super Admin yang dapat memberikan role super_admin.',
                        'code' => 'SUPER_ADMIN_ASSIGNMENT_FORBIDDEN',
                    ], 403);
                }
                if (!empty($roleModel->instansi_id) && $roleModel->instansi_id !== $callerInstansiId) {
                    return response()->json([
                        'message' => "Akses ditolak. Role '{$roleModel->name}' milik instansi lain.",
                        'code' => 'FOREIGN_ROLE_ASSIGNMENT_FORBIDDEN',
                    ], 403);
                }
            }

            $resolvedRoles[$roleModel->id] = $roleModel;
        }

        $resolvedRoleModels = array_values($resolvedRoles);
        $resolvedRoleNames = array_column($resolvedRoleModels, 'name');

        // 4. Rule #8: Student role restriction
        if ($targetUser instanceof UserSiswa) {
            // "Jangan beri role instansi ke akun siswa selain role siswa, kecuali saya setujui."
            foreach ($resolvedRoleNames as $rName) {
                if ($rName !== 'siswa') {
                    return response()->json([
                        'message' => "Akun siswa hanya dapat diberikan role siswa.",
                        'code' => 'STUDENT_ROLE_RESTRICTED',
                    ], 422);
                }
            }
        }

        // 5. Rule #7: Dashboard role alignment
        if ($targetUser instanceof UserBo) {
            $targetRoleType = $targetUser->role_type ?? ($targetUser->status_admin === '1' ? 'super_admin' : ($targetUser->status_admin === '2' ? 'guru' : 'admin'));

            // Guru cannot be given super_admin or admin_instansi
            if ($targetRoleType === 'guru') {
                if (in_array('super_admin', $resolvedRoleNames, true) || in_array('admin_instansi', $resolvedRoleNames, true)) {
                    return response()->json([
                        'message' => "Pengguna dengan role guru tidak dapat diberikan role admin atau super_admin.",
                        'code' => 'INCOMPATIBLE_ROLE_TYPE',
                    ], 422);
                }
            }

            // Admin cannot be given super_admin unless promoted by Super Admin
            if ($targetRoleType === 'admin' && !$isSuperAdmin && in_array('super_admin', $resolvedRoleNames, true)) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda tidak dapat memberikan role super_admin.',
                    'code' => 'SUPER_ADMIN_PROMOTION_FORBIDDEN',
                ], 403);
            }
        }

        // 6. Rule #4: Minimal 1 Super Admin Aktif
        $targetHasSuperAdmin = $targetUser->roles()->where('roles.name', 'super_admin')->exists()
            || ($targetUser instanceof UserBo && ($targetUser->status_admin === '1' || $targetUser->role_type === 'super_admin'));

        if ($targetHasSuperAdmin && !in_array('super_admin', $resolvedRoleNames, true)) {
            $saRoleId = Role::where('name', 'super_admin')->value('id');
            $saCount = DB::table('user_roles')->where('role_id', $saRoleId)->count();
            if ($saCount <= 1) {
                return response()->json([
                    'message' => 'Sistem harus memiliki minimal satu super_admin aktif. Anda tidak dapat mencabut role super_admin dari akun ini.',
                    'code' => 'MINIMAL_SUPER_ADMIN_REQUIRED',
                ], 422);
            }
        }

        // 7. Rule #5: Anti Lockout for Self-Revocation
        $isSelf = ($caller->getKey() === $targetUser->getKey() && get_class($caller) === $targetUserClass);
        if ($isSelf) {
            $requiredManagePerm = $isSuperAdmin ? 'role_platform.manage' : 'role_instansi.manage';

            $retainedPermissions = DB::table('role_permissions')
                ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.id')
                ->whereIn('role_permissions.role_id', array_keys($resolvedRoles))
                ->pluck('permissions.key')
                ->all();

            if (!in_array($requiredManagePerm, $retainedPermissions, true)) {
                return response()->json([
                    'message' => "Anti Lockout: Anda tidak dapat mencabut role yang memberikan akses '{$requiredManagePerm}' dari diri Anda sendiri.",
                    'code' => 'ANTI_LOCKOUT',
                ], 422);
            }
        }

        // 8. Execute Sync
        $beforeRoleNames = $targetUser->roles()->pluck('roles.name')->all();

        DB::transaction(function () use ($targetUserClass, $targetUserId, $resolvedRoleModels) {
            DB::table('user_roles')
                ->where('user_type', $targetUserClass)
                ->where('user_id', $targetUserId)
                ->delete();

            $now = now();
            $inserts = [];
            foreach ($resolvedRoleModels as $roleModel) {
                $inserts[] = [
                    'user_type' => $targetUserClass,
                    'user_id' => $targetUserId,
                    'role_id' => $roleModel->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($inserts)) {
                DB::table('user_roles')->insert($inserts);
            }
        });

        // 9. Rule #10: Flush permission cache immediately
        $targetUser->clearPermissionCache();

        // 10. Rule #9: Audit Log
        AuditLog::record(
            'ASSIGN_USER_ROLES',
            $targetUserClass,
            $targetUserId,
            $targetUser->name ?? $targetUserId,
            [
                'target_user_id' => $targetUserId,
                'target_user_type' => $targetUserClass,
                'before_roles' => $beforeRoleNames,
                'after_roles' => $resolvedRoleNames,
            ],
            null, null, null,
            'Manajemen Role'
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Role pengguna berhasil diperbarui.',
            'data' => [
                'user_id' => $targetUserId,
                'user_type' => $targetUserClass,
                'roles' => $resolvedRoleNames,
            ],
        ]);
    }
}

