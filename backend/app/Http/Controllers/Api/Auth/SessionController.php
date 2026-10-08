<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $role = $user->role ?? 'siswa';
        $profile = null;

        if ($user instanceof UserBo) {
            $user->load('kategori');
            $profile = [
                'id' => $user->iduser_bo,
                'name' => $user->name,
                'phone' => $user->telp,
                'address' => $user->alamat,
                'idkategori' => $user->idkategori,
                'institution' => $user->kategori?->nama_kategori,
            ];
            $id = $user->iduser_bo;
        } elseif ($user instanceof UserSiswa) {
            $user->load(['kelas.jenjang', 'kelas.kategori', 'kategori']);
            $institutionName = $user->kategori?->nama_kategori 
                ?? $user->kelas?->kategori?->nama_kategori 
                ?? 'Sekolah Mitra';

            $profile = [
                'id' => $user->iduser,
                'nisn' => $user->nisn,
                'institution' => $institutionName,
                'idkategori' => $user->idkategori ?? $user->kelas?->idkategori,
                'jenjang' => $user->kelas?->jenjang?->nama_jenjang ?? 'Umum',
                'class_id' => $user->idkelas,
                'class_name' => $user->kelas?->nama_kelas ?? 'Belum Ditentukan',
                'class_room' => $user->kelas ? [
                    'id' => $user->kelas->id,
                    'name' => $user->kelas->nama_kelas,
                    'level' => $user->kelas->tingkat,
                    'jenjang' => $user->kelas->jenjang?->nama_jenjang,
                    'institution' => $institutionName,
                ] : null,
            ];
            $id = $user->iduser;
        } else {
            $id = $user->id ?? 1;
            $profile = null;
        }

        return response()->json([
            'user' => [
                'id' => $id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'role' => $role,
                'idkategori' => $user->idkategori ?? null,
                'profile' => $profile
            ]
        ]);
    }
}
