<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $loginInput = trim($request->login);
        $password = (string) $request->password;

        // 1. Attempt to authenticate as Back Office User (Super Admin IP, Admin Sekolah, Guru)
        $userBo = UserBo::with('kategori')
            ->where(function ($q) use ($loginInput) {
                $q->where('login_email', $loginInput)
                  ->orWhere('login_username', $loginInput)
                  ->orWhere('iduser_bo', $loginInput);
            })
            ->where('status_remove', '!=', 'Y')
            ->first();

        if ($userBo && $userBo->verifyPassword($password)) {
            if ($userBo->status_aktif !== 'Y') {
                return response()->json([
                    'message' => 'Akun staff/guru Anda sedang dinonaktifkan. Silakan hubungi super administrator.',
                ], 403);
            }

            $sessionToken = Str::random(40);
            $userBo->update([
                'active_session_token' => $sessionToken,
                'last_login_at' => now(),
            ]);

            // Revoke previous tokens
            $userBo->tokens()->delete();
            $apiToken = $userBo->createToken('cbt_auth_token')->plainTextToken;

            $role = $userBo->role; // 'super_admin' | 'admin' | 'guru'

            return response()->json([
                'token' => $apiToken,
                'session_token' => $sessionToken,
                'user' => [
                    'id' => $userBo->iduser_bo,
                    'name' => $userBo->name,
                    'email' => $userBo->email,
                    'username' => $userBo->username,
                    'role' => $role,
                    'category' => $userBo->kategori?->nama_kategori,
                    'profile' => [
                        'id' => $userBo->iduser_bo,
                        'name' => $userBo->name,
                        'phone' => $userBo->telp,
                        'address' => $userBo->alamat,
                        'institution' => $userBo->kategori?->nama_kategori,
                    ]
                ]
            ]);
        }

        // 2. Attempt to authenticate as Student (Siswa from `user` table)
        $userSiswa = UserSiswa::with('kelas.jenjang')
            ->where(function ($q) use ($loginInput) {
                $q->where('login_email', $loginInput)
                  ->orWhere('nisn', $loginInput)
                  ->orWhere('iduser', $loginInput)
                  ->orWhere('telp', $loginInput);
            })
            ->first();

        if ($userSiswa && $userSiswa->verifyPassword($password)) {
            if ($userSiswa->status_aktif !== 'Y') {
                return response()->json([
                    'message' => 'Akun siswa Anda belum aktif atau telah dinonaktifkan.',
                ], 403);
            }

            $sessionToken = Str::random(40);
            $userSiswa->update([
                'active_session_token' => $sessionToken,
                'last_login_at' => now(),
            ]);

            $userSiswa->tokens()->delete();
            $apiToken = $userSiswa->createToken('cbt_auth_token')->plainTextToken;

            return response()->json([
                'token' => $apiToken,
                'session_token' => $sessionToken,
                'user' => [
                    'id' => $userSiswa->iduser,
                    'name' => $userSiswa->name,
                    'email' => $userSiswa->email,
                    'username' => $userSiswa->username,
                    'role' => 'siswa',
                    'profile' => [
                        'id' => $userSiswa->iduser,
                        'nisn' => $userSiswa->nisn,
                        'class_id' => $userSiswa->idkelas,
                        'class_room' => $userSiswa->kelas ? [
                            'id' => $userSiswa->kelas->id,
                            'name' => $userSiswa->kelas->nama_kelas,
                            'level' => $userSiswa->kelas->tingkat,
                            'jenjang' => $userSiswa->kelas->jenjang?->nama_jenjang,
                        ] : null,
                    ]
                ]
            ]);
        }

        throw ValidationException::withMessages([
            'login' => ['Kredensial yang Anda masukkan salah.'],
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->update(['active_session_token' => null]);
            $user->currentAccessToken()?->delete();
        }

        return response()->json([
            'message' => 'Berhasil keluar.'
        ]);
    }
}
