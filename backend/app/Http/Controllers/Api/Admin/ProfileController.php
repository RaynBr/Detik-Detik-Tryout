<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use App\Models\AuditLog;
use Illuminate\Http\Request;

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
            'new_password' => 'required|string|min:8|confirmed|different:current_password',
        ], [
            'new_password.min' => 'Password baru minimal 8 karakter.',
            'new_password.confirmed' => 'Konfirmasi password baru tidak cocok.',
            'new_password.different' => 'Password baru tidak boleh sama dengan password lama.',
        ]);

        $user = $request->user();

        if ($user instanceof \App\Models\UserSiswa) {
            if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->login_password)) {
                return response()->json([
                    'message' => 'Password lama tidak sesuai.',
                ], 422);
            }
            $user->update(['login_password' => \Illuminate\Support\Facades\Hash::make($request->new_password)]);
            AuditLog::record('CHANGE_PASSWORD_SISWA', 'user', $user->iduser, $user->nama);
            return response()->json(['message' => 'Password berhasil diperbarui.']);
        }

        if (!$user->verifyPassword($request->current_password)) {
            return response()->json([
                'message' => 'Password lama tidak sesuai.',
            ], 422);
        }

        // Encode new password with 5x base64
        $encoded = $request->new_password;
        for ($i = 0; $i < 5; $i++) {
            $encoded = base64_encode($encoded);
        }

        $user->update(['login_password' => $encoded]);

        AuditLog::record(
            'CHANGE_PASSWORD',
            'user_bo',
            $user->iduser_bo,
            $user->nama
        );

        return response()->json([
            'message' => 'Password berhasil diperbarui.',
        ]);
    }
}
