<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Handle an incoming request and attach standard security hardening HTTP headers.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Standard OWASP Security Headers (Temuan 19)
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');

        // Content Security Policy (allows self, fonts, and local dev network connections)
        $csp = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; "
             . "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
             . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
             . "font-src 'self' https://fonts.gstatic.com data:; "
             . "img-src 'self' data: blob: https: http:; "
             . "connect-src * 'self' http: ws: https: wss:; "
             . "frame-ancestors 'self';";
        $response->headers->set('Content-Security-Policy', $csp);

        // HSTS: Only active on secure HTTPS in production
        if (app()->environment('production') && $request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        return $response;
    }
}
