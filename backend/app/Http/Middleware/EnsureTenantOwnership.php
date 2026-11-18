<?php

namespace App\Http\Middleware;

use App\Models\Assessment;
use App\Models\MasterKelas;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantOwnership
{
    /**
     * Handle an incoming request.
     *
     * Validates that route parameters ({idkategori}, {iduser_bo}, {iduser}, {masterKela}, {idassessment})
     * match the caller's institution to prevent cross-tenant parameter tampering.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Super Admin is fully exempt from tenant ownership checks
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }
        if (isset($user->role) && $user->role === 'super_admin') {
            return $next($request);
        }

        $callerInstansi = (string) ($user->idkategori ?? '');
        $isEnforced = (bool) config('rbac.tenant_enforce', false);

        $deniedMessage = null;

        // 1. Check {idkategori} parameter
        $paramIdkategori = $request->route('idkategori');
        if ($paramIdkategori !== null && (string) $paramIdkategori !== $callerInstansi) {
            $deniedMessage = "Parameter idkategori [{$paramIdkategori}] tidak sesuai dengan instansi Anda [{$callerInstansi}].";
        }

        // 2. Check {iduser_bo} parameter
        if (!$deniedMessage) {
            $paramUserBo = $request->route('iduser_bo');
            if ($paramUserBo !== null) {
                $targetBo = UserBo::withoutGlobalScopes()->where('iduser_bo', $paramUserBo)->first();
                if ($targetBo && (string) $targetBo->idkategori !== $callerInstansi) {
                    $deniedMessage = "Staf/Guru [{$paramUserBo}] bukan bagian dari instansi Anda.";
                }
            }
        }

        // 3. Check {iduser} parameter
        if (!$deniedMessage) {
            $paramUserSiswa = $request->route('iduser');
            if ($paramUserSiswa !== null) {
                $targetSiswa = UserSiswa::withoutGlobalScopes()->where('iduser', $paramUserSiswa)->first();
                if ($targetSiswa && (string) $targetSiswa->idkategori !== $callerInstansi) {
                    $deniedMessage = "Siswa [{$paramUserSiswa}] bukan bagian dari instansi Anda.";
                }
            }
        }

        // 4. Check {masterKela} or {classes} parameter
        if (!$deniedMessage) {
            $paramKelas = $request->route('masterKela') ?? $request->route('classes');
            if ($paramKelas !== null) {
                $kelasId = is_object($paramKelas) ? $paramKelas->id : $paramKelas;
                $targetKelas = MasterKelas::withoutGlobalScopes()->find($kelasId);
                if ($targetKelas && (string) $targetKelas->idkategori !== $callerInstansi) {
                    $deniedMessage = "Kelas [{$kelasId}] bukan bagian dari instansi Anda.";
                }
            }
        }

        // 5. Check {idassessment} or {exam} parameter
        if (!$deniedMessage) {
            $paramExam = $request->route('idassessment') ?? $request->route('exam') ?? $request->route('exams');
            if ($paramExam !== null) {
                $examId = is_object($paramExam) ? $paramExam->id : $paramExam;
                $targetExam = Assessment::withoutGlobalScopes()->find($examId);
                if ($targetExam && !empty($targetExam->idkategori) && (string) $targetExam->idkategori !== $callerInstansi) {
                    $deniedMessage = "Jadwal ujian [{$examId}] bukan bagian dari instansi Anda.";
                }
            }
        }

        if ($deniedMessage) {
            $userId = method_exists($user, 'getAuthIdentifier') ? $user->getAuthIdentifier() : ($user->id ?? 'unknown');
            \Illuminate\Support\Facades\Log::warning("TENANT_OWNERSHIP SHADOW: Pengguna [ID: {$userId}] dari instansi [{$callerInstansi}] mencoba mengakses rute [{$request->method()} {$request->path()}]. Alasan: {$deniedMessage}. Enforce: " . ($isEnforced ? 'STRICT (403)' : 'SHADOW (DIIZINKAN)'));

            if ($isEnforced) {
                // Temporary diagnostic logging (ONLY active when tenant_enforce=true in non-testing/local env)
                if (!app()->runningUnitTests() && !app()->environment('testing')) {
                    $ownedPerms = method_exists($user, 'permissions') ? $user->permissions() : [];
                    $ownedRoles = method_exists($user, 'roles') ? $user->roles()->pluck('name')->all() : [];
                    \Illuminate\Support\Facades\Log::warning('RBAC_ENFORCE_403_DIAGNOSTIC', [
                        'middleware' => 'EnsureTenantOwnership',
                        'user_type' => get_class($user),
                        'user_id' => (string) $userId,
                        'user_role' => $user->role ?? 'unknown',
                        'caller_instansi' => $callerInstansi,
                        'route' => $request->method() . ' /' . ltrim($request->path(), '/'),
                        'reason' => $deniedMessage,
                        'required_permissions' => ['tenant_ownership:' . $callerInstansi],
                        'owned_roles' => $ownedRoles,
                        'owned_permissions' => $ownedPerms,
                    ]);
                }

                return response()->json([
                    'message' => 'Akses ditolak: Anda tidak memiliki akses ke data instansi ini.',
                    'detail' => $deniedMessage,
                    'code' => 'TENANT_FORBIDDEN',
                ], 403);
            }
        }

        return $next($request);
    }
}

