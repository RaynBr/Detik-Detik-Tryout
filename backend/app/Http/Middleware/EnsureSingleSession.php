<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSingleSession
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !empty($user->active_session_token)) {
            $clientToken = $request->header('X-Session-Token');

            // Two-way session validation (Temuan 11):
            // Only revoke and reject if a client session token is supplied and does NOT match active session.
            // This prevents race condition logouts on multi-tab/refresh before localStorage attaches the header.
            if ($clientToken && !hash_equals((string) $user->active_session_token, (string) $clientToken)) {
                $request->user()->currentAccessToken()?->delete();

                return response()->json([
                    'message' => 'Sesi Anda telah aktif di perangkat atau tab lain. Anda telah dikeluarkan otomatis.',
                    'code' => 'SESSION_OVERWRITE'
                ], 401);
            }
        }

        return $next($request);
    }
}
