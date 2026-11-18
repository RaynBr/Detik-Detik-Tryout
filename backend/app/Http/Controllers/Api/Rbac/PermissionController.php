<?php

namespace App\Http\Controllers\Api\Rbac;

use App\Http\Controllers\Controller;
use App\Http\Resources\Rbac\PermissionResource;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * Display a listing of permissions grouped by module.
     * Filtered according to caller's scope and permissions.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        $query = Permission::query();

        if ($isSuperAdmin) {
            // Super Admin can see all scopes, or filter by ?scope=platform|instansi
            if ($request->filled('scope')) {
                $query->where('scope', $request->query('scope'));
            }
        } else {
            // Admin Instansi CANNOT see platform scope permissions
            $query->where('scope', 'instansi');

            // Anti privilege escalation: user can only see permissions they themselves possess
            $userPerms = method_exists($user, 'permissions') ? $user->permissions() : [];
            $query->whereIn('key', $userPerms);
        }

        $permissions = $query->orderBy('module')->orderBy('id')->get();

        // Group permissions by module
        $grouped = [];
        foreach ($permissions as $perm) {
            $module = $perm->module ?: 'Lainnya';
            if (!isset($grouped[$module])) {
                $grouped[$module] = [];
            }
            $grouped[$module][] = (new PermissionResource($perm))->resolve();
        }

        return response()->json([
            'status' => 'success',
            'data' => $grouped,
            'total_count' => $permissions->count(),
        ]);
    }
}

