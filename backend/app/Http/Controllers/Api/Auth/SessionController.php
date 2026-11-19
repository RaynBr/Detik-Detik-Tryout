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

            $instansiId = $user->idkategori ?? $user->kelas?->idkategori;

            // Flow Requirement (mod-siswa-profile):
            // Informasi Profile Siswa: - Nomor Induk - Kelas - Guru yang Mengajar
            $teachers = [];
            if ($user->idkelas) {
                $teachingAssignments = \App\Models\GuruMataPelajaran::with(['guru', 'mataPelajaran'])
                    ->where('idkelas', $user->idkelas)
                    ->get();

                foreach ($teachingAssignments as $asg) {
                    if ($asg->guru) {
                        $teachers[] = [
                            'id' => $asg->guru->iduser_bo,
                            'name' => $asg->guru->nama,
                            'nuptk' => $asg->guru->nuptk ?: '-',
                            'subject' => $asg->mataPelajaran?->nama_mapel ?? 'Mata Pelajaran',
                            'email' => $asg->guru->login_email,
                            'phone' => $asg->guru->telp,
                        ];
                    }
                }
            }

            // Fallback or additional teachers from same institution
            if (empty($teachers) && $instansiId) {
                $instansiTeachers = UserBo::where('idkategori', $instansiId)
                    ->where(function ($q) {
                        $q->where('status_admin', '2')->orWhere('role_type', 'guru');
                    })
                    ->where('status_remove', 'N')
                    ->limit(20)
                    ->get();

                foreach ($instansiTeachers as $gt) {
                    $teachers[] = [
                        'id' => $gt->iduser_bo,
                        'name' => $gt->nama,
                        'nuptk' => $gt->nuptk ?: '-',
                        'subject' => 'Guru Pengampu',
                        'email' => $gt->login_email,
                        'phone' => $gt->telp,
                    ];
                }
            }

            $profile = [
                'id' => $user->iduser,
                'nisn' => $user->nisn,
                'nis' => $user->nis,
                'nomor_induk' => $user->nisn ?: ($user->nis ?: $user->username),
                'institution' => $institutionName,
                'idkategori' => $instansiId,
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
                'teachers' => $teachers,
            ];
            $id = $user->iduser;
        } else {
            $id = $user->id ?? 1;
            $profile = null;
        }

        // Resolve RBAC roles, permissions, and hierarchical menus
        $isSuperAdmin = method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : ($role === 'super_admin');
        
        try {
            $roles = [];
            if (method_exists($user, 'roles')) {
                $roles = $user->roles()->pluck('name')->all();
            }
            if (empty($roles)) {
                $roles = [$role];
            }

            $permissions = [];
            if (method_exists($user, 'permissions')) {
                $permissions = $user->permissions();
            }

            $menuScope = $isSuperAdmin ? 'platform' : 'instansi';
            $menus = \App\Models\Menu::getTreeForUser($permissions, $menuScope, $isSuperAdmin);
        } catch (\Throwable $e) {
            $roles = [$role];
            $permissions = [];
            $menus = [];
        }

        return response()->json([
            'user' => [
                'id' => $id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'role' => $role,
                'idkategori' => $user->idkategori ?? null,
                'profile' => $profile,
                'roles' => $roles,
                'permissions' => $permissions,
            ],
            'roles' => $roles,
            'permissions' => $permissions,
            'menus' => $menus,
        ]);
    }
}
