<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruMataPelajaran;
use App\Models\UserBo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = UserBo::with(['kategori', 'mapelAjar.mataPelajaran'])
            ->where('status_remove', '!=', 'Y')
            ->where(function ($q) {
                $q->where('role_type', 'guru')
                  ->orWhere('role_type', 'admin_sekolah')
                  ->orWhere('status_admin', '2')
                  ->orWhereNull('role_type');
            });

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        }

        $teachers = $query->get();

        $mapped = $teachers->map(function ($t) {
            return [
                'id' => $t->iduser_bo,
                'name' => $t->name,
                'email' => $t->email,
                'username' => $t->username,
                'phone' => $t->telp,
                'role' => $t->role,
                'institution' => $t->kategori?->nama_kategori,
                'is_active' => $t->status_aktif === 'Y',
                'teacher' => [
                    'id' => $t->iduser_bo,
                    'user_id' => $t->iduser_bo,
                    'nip' => $t->iduser_bo,
                    'subjects' => $t->mapelAjar->map(function ($m) {
                        return [
                            'id' => $m->mataPelajaran?->id,
                            'name' => $m->mataPelajaran?->nama_mapel,
                            'code' => $m->mataPelajaran?->kode_mapel,
                        ];
                    })->filter(fn($s) => !empty($s['id']))->values()
                ]
            ];
        });

        return response()->json($mapped);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'username' => 'nullable|string',
            'password' => 'required|string|min:4',
            'phone' => 'nullable|string',
            'subject_ids' => 'nullable|array',
            'role_type' => 'nullable|in:guru,admin_sekolah',
        ]);

        $user = $request->user();
        $idkategori = ($user && $user->role === 'admin' && !empty($user->idkategori)) 
            ? $user->idkategori 
            : ($request->idkategori ?? $user?->idkategori);

        $id = (string) (time() . rand(1000, 9999));
        $username = $request->username ?: strtolower(explode('@', $request->email)[0]);

        // Base64 x5 encoded password for user_bo compatibility
        $pwd = $request->password;
        for ($i = 0; $i < 5; $i++) {
            $pwd = base64_encode($pwd);
        }

        $userBo = UserBo::create([
            'iduser_bo' => $id,
            'idkategori' => $idkategori,
            'nama' => $request->name,
            'login_email' => $request->email,
            'login_username' => $username,
            'login_password' => $pwd,
            'telp' => $request->phone ?? null,
            'status_admin' => '2',
            'role_type' => $request->role_type ?? 'guru',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
            'tanggal_input' => now(),
        ]);

        if ($request->filled('subject_ids')) {
            foreach ($request->subject_ids as $mapelId) {
                GuruMataPelajaran::create([
                    'iduser_bo' => $userBo->iduser_bo,
                    'idmapel' => $mapelId,
                    'tahun_ajaran' => '2026/2027',
                ]);
            }
        }

        return response()->json([
            'message' => 'Guru berhasil ditambahkan.',
            'data' => $userBo
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $userBo = UserBo::where('iduser_bo', $id)->firstOrFail();

        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$userBo->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah guru instansi lain.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'password' => 'nullable|string|min:4',
            'subject_ids' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $updateData = [
            'nama' => $request->name,
            'login_email' => $request->email,
            'telp' => $request->phone ?? $userBo->telp,
            'tanggal_update' => now(),
        ];

        if ($request->has('is_active')) {
            $updateData['status_aktif'] = $request->is_active ? 'Y' : 'N';
        }

        if ($request->filled('password')) {
            $pwd = $request->password;
            for ($i = 0; $i < 5; $i++) {
                $pwd = base64_encode($pwd);
            }
            $updateData['login_password'] = $pwd;
        }

        $userBo->update($updateData);

        if ($request->has('subject_ids')) {
            GuruMataPelajaran::where('iduser_bo', $userBo->iduser_bo)->delete();
            foreach ($request->subject_ids as $mapelId) {
                GuruMataPelajaran::create([
                    'iduser_bo' => $userBo->iduser_bo,
                    'idmapel' => $mapelId,
                    'tahun_ajaran' => '2026/2027',
                ]);
            }
        }

        return response()->json([
            'message' => 'Data guru berhasil diperbarui.',
            'data' => $userBo
        ]);
    }

    public function destroy($id)
    {
        $user = request()->user();
        $userBo = UserBo::where('iduser_bo', $id)->firstOrFail();

        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$userBo->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus guru instansi lain.'], 403);
        }

        $userBo->update(['status_remove' => 'Y', 'status_aktif' => 'N']);

        return response()->json([
            'message' => 'Guru berhasil dinonaktifkan/dihapus.'
        ]);
    }
}
