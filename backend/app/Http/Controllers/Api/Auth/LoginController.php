<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Models\AuditLog;
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
        $expectedRole = $request->input('expected_role');

        // Enforce credential rule from flow: Email is strictly for profile info, NOT for login
        if (str_contains($loginInput, '@')) {
            return response()->json([
                'message' => 'Sesuai ketentuan sistem, Email hanya digunakan untuk informasi profil akun (tidak dapat digunakan untuk login). Silakan masuk menggunakan Username atau Nomor Induk (NUPTK / NISN / NIS) Anda.',
            ], 422);
        }

        // 1. Attempt to authenticate as Back Office User (Super Admin IP, Admin Instansi, Guru)
        $userBo = UserBo::with('kategori')
            ->where(function ($q) use ($loginInput) {
                $q->where('login_username', $loginInput)
                  ->orWhere('iduser_bo', $loginInput);
                if (\Illuminate\Support\Facades\Schema::hasColumn('user_bo', 'nuptk')) {
                    $q->orWhere('nuptk', $loginInput);
                }
            })
            ->where('status_remove', '!=', 'Y')
            ->first();

        if ($userBo && $userBo->verifyPassword($password)) {
            if ($userBo->status_aktif !== 'Y') {
                return response()->json([
                    'message' => 'Akun staff/guru Anda sedang dinonaktifkan. Silakan hubungi super administrator.',
                ], 403);
            }

            $role = $userBo->role; // 'super_admin' | 'admin' | 'guru'

            // Enforce expected role if passed from UI
            if ($expectedRole) {
                if ($expectedRole === 'siswa') {
                    return response()->json([
                        'message' => 'Kredensial ini bukan akun siswa. Silakan gunakan portal login Staf/Guru/Admin.'
                    ], 403);
                }
                if ($expectedRole === 'super_admin' && $role !== 'super_admin') {
                    return response()->json([
                        'message' => 'Akun ini bukan akun Super Administrator.'
                    ], 403);
                }
                if ($expectedRole === 'admin' && $role !== 'admin') {
                    return response()->json([
                        'message' => 'Akun ini bukan akun Admin Instansi / Sekolah.'
                    ], 403);
                }
                if ($expectedRole === 'guru' && $role !== 'guru') {
                    return response()->json([
                        'message' => 'Akun ini bukan akun Guru pengajar.'
                    ], 403);
                }
            }

            $sessionToken = Str::random(40);
            $userBo->update([
                'active_session_token' => $sessionToken,
                'last_login_at' => now(),
            ]);

            // Revoke previous tokens
            $userBo->tokens()->delete();
            $apiToken = $userBo->createToken('cbt_auth_token')->plainTextToken;

            AuditLog::record(
                'LOGIN',
                'user_bo',
                $userBo->iduser_bo,
                "Staff {$userBo->name} berhasil login ({$role})",
                ['username' => $userBo->username, 'role' => $role, 'idkategori' => $userBo->idkategori],
                $userBo->iduser_bo,
                $userBo->name,
                $role
            );

            return response()->json([
                'token' => $apiToken,
                'session_token' => $sessionToken,
                'user' => [
                    'id' => $userBo->iduser_bo,
                    'name' => $userBo->name,
                    'email' => $userBo->email,
                    'username' => $userBo->username,
                    'role' => $role,
                    'idkategori' => $userBo->idkategori,
                    'category' => $userBo->kategori?->nama_kategori,
                    'profile' => [
                        'id' => $userBo->iduser_bo,
                        'name' => $userBo->name,
                        'phone' => $userBo->telp,
                        'address' => $userBo->alamat,
                        'idkategori' => $userBo->idkategori,
                        'institution' => $userBo->kategori?->nama_kategori,
                    ]
                ]
            ]);
        }

        // 2. Attempt to authenticate as Student (Siswa from `user` table)
        $userSiswa = UserSiswa::with(['kelas.jenjang', 'kelas.kategori', 'kategori'])
            ->where(function ($q) use ($loginInput) {
                $q->where('nisn', $loginInput)
                  ->orWhere('iduser', $loginInput);
                if (\Illuminate\Support\Facades\Schema::hasColumn('user', 'nis')) {
                    $q->orWhere('nis', $loginInput);
                }
            })
            ->first();

        if ($userSiswa && $userSiswa->verifyPassword($password)) {
            if ($userSiswa->status_aktif !== 'Y') {
                return response()->json([
                    'message' => 'Akun siswa Anda belum aktif atau telah dinonaktifkan.',
                ], 403);
            }

            // Enforce expected role if passed
            if ($expectedRole && $expectedRole !== 'siswa') {
                return response()->json([
                    'message' => 'Kredensial ini adalah akun Siswa. Silakan gunakan portal Login Siswa.'
                ], 403);
            }

            $sessionToken = Str::random(40);
            $userSiswa->update([
                'active_session_token' => $sessionToken,
                'last_login_at' => now(),
            ]);

            $userSiswa->tokens()->delete();
            $apiToken = $userSiswa->createToken('cbt_auth_token')->plainTextToken;

            AuditLog::record(
                'LOGIN',
                'user',
                $userSiswa->iduser,
                "Siswa {$userSiswa->name} berhasil login",
                ['nisn' => $userSiswa->nisn, 'idkelas' => $userSiswa->idkelas, 'idkategori' => $userSiswa->idkategori],
                $userSiswa->iduser,
                $userSiswa->name,
                'siswa'
            );

            $institutionName = $userSiswa->kategori?->nama_kategori 
                ?? $userSiswa->kelas?->kategori?->nama_kategori 
                ?? 'Sekolah Mitra';

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
                        'institution' => $institutionName,
                        'idkategori' => $userSiswa->idkategori ?? $userSiswa->kelas?->idkategori,
                        'jenjang' => $userSiswa->kelas?->jenjang?->nama_jenjang ?? 'Umum',
                        'class_id' => $userSiswa->idkelas,
                        'class_name' => $userSiswa->kelas?->nama_kelas ?? 'Belum Ditentukan',
                        'class_room' => $userSiswa->kelas ? [
                            'id' => $userSiswa->kelas->id,
                            'name' => $userSiswa->kelas->nama_kelas,
                            'level' => $userSiswa->kelas->tingkat,
                            'jenjang' => $userSiswa->kelas->jenjang?->nama_jenjang,
                            'institution' => $institutionName,
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
            AuditLog::record(
                'LOGOUT',
                $user instanceof UserBo ? 'user_bo' : 'user',
                $user->getAuthIdentifier(),
                "Pengguna {$user->name} berhasil keluar sistem",
                ['role' => $user->role]
            );

            $user->update(['active_session_token' => null]);
            $user->currentAccessToken()?->delete();
        }

        return response()->json([
            'message' => 'Berhasil keluar.'
        ]);
    }
}
