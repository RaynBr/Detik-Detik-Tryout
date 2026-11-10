<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AdminAuthController;

/*
|--------------------------------------------------------------------------
| API Routes - Admin Authentication Service
|--------------------------------------------------------------------------
| Khusus melayani autentikasi login Super Admin dan Admin Instansi.
*/

// Public Authentication Endpoints
Route::prefix('auth')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login'])->middleware('throttle:60,1');

    // Authenticated Endpoints for Admin (Sanctum Protected)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AdminAuthController::class, 'me']);
        Route::post('/logout', [AdminAuthController::class, 'logout']);
    });
});

// Health check endpoint
Route::get('/ping', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Detik Detik Tryout - Admin Auth API',
        'time' => now()->toIso8601String(),
    ]);
});

