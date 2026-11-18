<?php

namespace App\Http\Controllers\Api\Rbac;

use App\Http\Controllers\Controller;
use App\Http\Resources\Rbac\MenuResource;
use App\Models\Menu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    /**
     * Display menu tree structured according to user scope and permissions.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        $requestedScope = $request->query('scope');

        if ($requestedScope === 'platform' && !$isSuperAdmin) {
            return response()->json([
                'message' => 'Akses ditolak. Anda tidak memiliki izin untuk melihat menu platform.',
                'code' => 'FORBIDDEN',
            ], 403);
        }

        $scope = $requestedScope ?: ($isSuperAdmin ? 'platform' : 'instansi');
        $userPermissions = method_exists($user, 'permissions') ? $user->permissions() : [];

        $menuTree = Menu::getTreeForUser($userPermissions, $scope, $isSuperAdmin);

        return response()->json([
            'status' => 'success',
            'scope' => $scope,
            'data' => MenuResource::collection($menuTree),
        ]);
    }
}

