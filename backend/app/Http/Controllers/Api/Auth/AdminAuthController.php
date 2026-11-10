<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminAuthController extends Controller
{
    /**
     * Handle admin login request.
     * Accessible by Super Admin and Admin Instansi.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login'    => 'required|string',
            'password' => 'required|string',
        ]);

        $loginIdentifier = trim($request->input('login'));
        $password = (string) $request->input('password');

        // Cari user di tabel user_bo berdasarkan login_username atau login_email
        $user = UserBo::with('kategori')
            ->where(function ($query) use ($loginIdentifier) {
                $query->where('login_username', $loginIdentifier)
                      ->orWhere('login_email', $loginIdentifier);
            })
            ->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password yang Anda masukkan salah.',
            ], 401);
        }

        // Cek status aktif
        if ($user->status_aktif === 'N' || $user->status_remove === 'Y') {
            return response()->json([
                'success' => false,
                'message' => 'Akun administrator Anda sedang non-aktif. Silakan hubungi Super Admin.',
            ], 403);
        }

        // Verifikasi password (mendukung Bcrypt & legacy base64 migration)
        if (! $user->verifyPassword($password)) {
            return response()->json([
                'success' => false,
                'message' => 'Username atau password yang Anda masukkan salah.',
            ], 401);
        }

        // Buat Sanctum token untuk sesi administrator
        $token = $user->createToken('admin-api-token', ['role:admin'])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login administrator berhasil.',
            'token'   => $token,
            'user'    => [
                'id_user_bo'   => $user->iduser_bo,
                'username'     => $user->username,
                'nama'         => $user->nama,
                'email'        => $user->email,
                'role'         => $user->role,
                'id_instansi'  => $user->idkategori,
                'instansi'     => $user->kategori ? [
                    'id_instansi'   => $user->kategori->idkategori,
                    'nama_instansi' => $user->kategori->nama_kategori,
                ] : null,
            ],
        ]);
    }

    /**
     * Get authenticated admin user profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user instanceof UserBo) {
            $user->loadMissing('kategori');
        }

        return response()->json([
            'success' => true,
            'user'    => [
                'id_user_bo'   => $user->iduser_bo,
                'username'     => $user->username,
                'nama'         => $user->nama,
                'email'        => $user->email,
                'role'         => $user->role,
                'id_instansi'  => $user->idkategori,
                'instansi'     => $user->kategori ? [
                    'id_instansi'   => $user->kategori->idkategori,
                    'nama_instansi' => $user->kategori->nama_kategori,
                ] : null,
            ],
        ]);
    }

    /**
     * Revoke current token upon logout.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user && $user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }
}