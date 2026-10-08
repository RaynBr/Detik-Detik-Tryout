<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        // Roles can be passed like 'super_admin|admin' or ['super_admin', 'admin']
        $allowedRoles = [];
        foreach ($roles as $roleGroup) {
            foreach (explode('|', $roleGroup) as $r) {
                $allowedRoles[] = trim($r);
            }
        }

        // Determine user role
        $userRole = null;
        if (isset($user->role)) {
            $userRole = $user->role;
        } elseif (method_exists($user, 'getRoleNames')) {
            $userRole = $user->getRoleNames()->first();
        }

        if (!$userRole || !in_array($userRole, $allowedRoles)) {
            return response()->json([
                'message' => 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.',
                'user_role' => $userRole,
                'allowed_roles' => $allowedRoles
            ], 403);
        }

        return $next($request);
    }
}
