<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$permissions  Permission keys with OR logic (comma or pipe separated)
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        // Parse permission keys supporting OR logic: e.g. 'mapel.view|kelas.view' or ['mapel.view', 'kelas.view']
        $requiredPermissions = [];
        foreach ($permissions as $permGroup) {
            foreach (explode('|', $permGroup) as $p) {
                foreach (explode(',', $p) as $singlePerm) {
                    $clean = trim($singlePerm);
                    if (!empty($clean)) {
                        $requiredPermissions[] = $clean;
                    }
                }
            }
        }

        // Super Admin always bypasses permission checks
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }

        // Check user permissions
        $hasAccess = false;
        if (method_exists($user, 'hasPermission')) {
            $hasAccess = $user->hasPermission($requiredPermissions);
        } else {
            // Fallback for models without trait
            $hasAccess = true;
        }

        if (!$hasAccess) {
            $isEnforced = (bool) config('rbac.enforce', false);
            $shouldLog = (bool) config('rbac.log_denied', true);

            if ($shouldLog) {
                $userId = method_exists($user, 'getAuthIdentifier') ? $user->getAuthIdentifier() : ($user->id ?? 'unknown');
                $userRole = $user->role ?? 'unknown';
                $routeInfo = $request->method() . ' ' . $request->path();
                $permStr = implode(', ', $requiredPermissions);

                Log::warning("RBAC SHADOW DENIED: Pengguna [ID: {$userId}, Role: {$userRole}] mencoba mengakses rute [{$routeInfo}] yang membutuhkan permission [{$permStr}]. Status Enforce: " . ($isEnforced ? 'STRICT (403)' : 'SHADOW (DIIZINKAN)'));
            }

            // Mode Enforce: Blokir dengan 403 Forbidden
            if ($isEnforced) {
                // Temporary diagnostic logging (ONLY active when enforce=true in non-testing/local env)
                if (!app()->runningUnitTests() && !app()->environment('testing')) {
                    $userId = method_exists($user, 'getAuthIdentifier') ? $user->getAuthIdentifier() : ($user->id ?? 'unknown');
                    $ownedPerms = method_exists($user, 'permissions') ? $user->permissions() : [];
                    $ownedRoles = method_exists($user, 'roles') ? $user->roles()->pluck('name')->all() : [];
                    Log::warning('RBAC_ENFORCE_403_DIAGNOSTIC', [
                        'middleware' => 'CheckPermission',
                        'user_type' => get_class($user),
                        'user_id' => (string) $userId,
                        'user_role' => $user->role ?? 'unknown',
                        'idkategori' => $user->idkategori ?? null,
                        'route' => $request->method() . ' /' . ltrim($request->path(), '/'),
                        'required_permissions' => $requiredPermissions,
                        'owned_roles' => $ownedRoles,
                        'owned_permissions' => $ownedPerms,
                    ]);
                }

                return response()->json([
                    'message' => 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.',
                    'required_permissions' => $requiredPermissions,
                    'code' => 'FORBIDDEN',
                ], 403);
            }

            // Mode Shadow (enforce = false): Izinkan request lewat sambil menuliskan audit log
        }

        return $next($request);
    }
}

