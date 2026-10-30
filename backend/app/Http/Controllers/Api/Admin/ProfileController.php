<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    /**
     * Get current user profile
     */
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'iduser_bo' => $user->iduser_bo,
            'nama' => $user->nama,
            'username' => $user->login_username,
            'email' => $user->login_email,
            'telp' => $user->telp,
            'alamat' => $user->alamat,
            'role' => $user->role,
            'instansi' => $user->kategori?->nama_kategori,
            'last_login_at' => $user->last_login_at,
        ]);
    }

    /**
     * Update profile (nama, email, telp, alamat)
     */
    public function update(Request $request)
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'telp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $user->update([
            'nama' => $request->nama,
            'login_email' => $request->email,
            'telp' => $request->telp,
            'alamat' => $request->alamat,
        ]);

        AuditLog::record(
            'EDIT_PROFIL',
            'user_bo',
            $user->iduser_bo,
            $user->nama,
            ['fields_updated' => array_keys($request->only(['nama', 'email', 'telp', 'alamat']))]
        );

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'data' => $user->fresh(),
        ]);
    }

    /**
     * Change password (verify old password first)
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => [
                'required',
                'string',
                Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
                'confirmed',
                'different:current_password'
            ],
        ], [
            'new_password.confirmed' => 'Konfirmasi password baru tidak cocok.',
            'new_password.different' => 'Password baru tidak boleh sama dengan password lama.',
        ]);

        $user = $request->user();

        if ($user instanceof \App\Models\UserSiswa) {
            if (!$user->verifyPassword($request->current_password)) {
                return response()->json([
                    'message' => 'Password lama tidak sesuai.',
                ], 422);
            }

            $user->update([
                'login_password' => Hash::make($request->new_password),
                'force_change_password' => false,
                'active_session_token' => null,
            ]);

            // Revoke all Sanctum tokens on password change (Requirement 5)
            $user->tokens()->delete();

            AuditLog::record('CHANGE_PASSWORD_SISWA', 'user', $user->iduser, $user->nama);
            return response()->json(['message' => 'Password berhasil diperbarui. Silakan login kembali dengan password baru Anda.']);
        }

        if (!$user->verifyPassword($request->current_password)) {
            return response()->json([
                'message' => 'Password lama tidak sesuai.',
            ], 422);
        }

        // Store new password with standard Hash::make() - no Base64 (Requirement 4)
        $user->update([
            'login_password' => Hash::make($request->new_password),
            'force_change_password' => false,
            'active_session_token' => null,
        ]);

        // Revoke all Sanctum tokens on password change (Requirement 5)
        $user->tokens()->delete();

        AuditLog::record(
            'CHANGE_PASSWORD',
            'user_bo',
            $user->iduser_bo,
            $user->nama
        );

        return response()->json([
            'message' => 'Password berhasil diperbarui. Silakan login kembali dengan password baru Anda.',
        ]);
    }
}
