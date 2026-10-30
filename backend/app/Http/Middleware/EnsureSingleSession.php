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

            // Two-way validation:
            // If user has active_session_token, request MUST supply X-Session-Token and it MUST match.
            // If header is missing or does not match active_session_token, immediately revoke token and logout.
            if (!$clientToken || !hash_equals((string) $user->active_session_token, (string) $clientToken)) {
                $request->user()->currentAccessToken()?->delete();

                return response()->json([
                    'message' => 'Sesi Anda tidak valid atau telah aktif di perangkat lain. Anda telah dikeluarkan otomatis.',
                    'code' => 'SESSION_OVERWRITE'
                ], 401);
            }
        }

        return $next($request);
    }
}
