<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Models\KategoriUserBo;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserManagementController extends Controller
{
    /**
     * List Super Admins
     */
    public function superAdmins(Request $request)
    {
        $query = UserBo::where(function ($q) {
                $q->where('role_type', 'super_admin')
                  ->orWhere('status_admin', '1');
            })
            ->where('status_remove', '!=', 'Y');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nama', 'LIKE', "%{$s}%")
                  ->orWhere('login_email', 'LIKE', "%{$s}%")
                  ->orWhere('login_username', 'LIKE', "%{$s}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $admins = $query->orderBy('nama', 'asc')->get()->map(function ($u) {
                return [
                    'iduser_bo' => $u->iduser_bo,
                    'nama' => $u->nama,
                    'username' => $u->login_username,
                    'email' => $u->login_email,
                    'jenis_kelamin' => $u->jenis_kelamin,
                    'telp' => $u->telp,
                    'alamat' => $u->alamat,
                    'role' => $u->role,
                    'status_aktif' => $u->status_aktif,
                    'last_login_at' => $u->last_login_at,
                ];
            });

            return response()->json([
                'data' => $admins,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $admins->count(),
                'total' => $admins->count(),
                'from' => $admins->count() > 0 ? 1 : null,
                'to' => $admins->count() > 0 ? $admins->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama', 'asc')->paginate($perPage);

        $paginator->through(function ($u) {
            return [
                'iduser_bo' => $u->iduser_bo,
                'nama' => $u->nama,
                'username' => $u->login_username,
                'email' => $u->login_email,
                'jenis_kelamin' => $u->jenis_kelamin,
                'telp' => $u->telp,
                'alamat' => $u->alamat,
                'role' => $u->role,
                'status_aktif' => $u->status_aktif,
                'last_login_at' => $u->last_login_at,
            ];
        });

        return response()->json($paginator);
    }

    /**
     * Create new Super Admin (by Super Admin)
     */
    public function storeSuperAdmin(Request $request)
    {
        if ($request->user()?->role !== 'super_admin') {
            return response()->json(['message' => 'Hanya Super Admin yang berhak menambahkan Super Admin baru.'], 403);
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'username' => 'required|string|max:100|unique:user_bo,login_username',
            'email' => 'nullable|email|max:255',
            'jenis_kelamin' => 'nullable|in:L,P',
            'telp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:500',
            'password' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        $encoded = Hash::make($request->password);

        $id = Str::uuid()->toString();
        $user = UserBo::create([
            'iduser_bo' => $id,
            'idkategori' => null, // Super Admin has no institution
            'nama' => $request->nama,
            'login_username' => $request->username,
            'login_email' => $request->email,
            'login_password' => $encoded,
            'jenis_kelamin' => $request->jenis_kelamin,
            'telp' => $request->telp,
            'alamat' => $request->alamat,
            'role_type' => 'super_admin',
            'status_admin' => '1',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
        ]);

        AuditLog::record(
            'CREATE_SUPER_ADMIN',
            'user_bo',
            $id,
            $request->nama,
            ['created_by' => $request->user()?->name ?? 'Super Admin', 'username' => $request->username]
        );

        return response()->json([
            'message' => 'Super Admin berhasil dibuat.',
            'data' => $user,
        ], 201);
    }

    /**
     * List Admin Instansi (all institutions)
     */
    public function adminInstansi(Request $request)
    {
        $query = UserBo::where(function ($q) {
                $q->where('role_type', 'admin_sekolah')
                  ->orWhere('role_type', 'admin');
            })
            ->where('status_remove', '!=', 'Y')
            ->with('kategori');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nama', 'LIKE', "%{$s}%")
                  ->orWhere('login_email', 'LIKE', "%{$s}%")
                  ->orWhere('login_username', 'LIKE', "%{$s}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $admins = $query->orderBy('nama', 'asc')->get()->map(function ($u) {
                return [
                    'iduser_bo' => $u->iduser_bo,
                    'nama' => $u->nama,
                    'username' => $u->login_username,
                    'email' => $u->login_email,
                    'jenis_kelamin' => $u->jenis_kelamin,
                    'telp' => $u->telp,
                    'alamat' => $u->alamat,
                    'role' => $u->role,
                    'instansi' => $u->kategori?->nama_kategori ?? '-',
                    'idkategori' => $u->idkategori,
                    'status_aktif' => $u->status_aktif,
                    'last_login_at' => $u->last_login_at,
                ];
            });

            return response()->json([
                'data' => $admins,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $admins->count(),
                'total' => $admins->count(),
                'from' => $admins->count() > 0 ? 1 : null,
                'to' => $admins->count() > 0 ? $admins->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama', 'asc')->paginate($perPage);

        $paginator->through(function ($u) {
            return [
                'iduser_bo' => $u->iduser_bo,
                'nama' => $u->nama,
                'username' => $u->login_username,
                'email' => $u->login_email,
                'jenis_kelamin' => $u->jenis_kelamin,
                'telp' => $u->telp,
                'alamat' => $u->alamat,
                'role' => $u->role,
                'instansi' => $u->kategori?->nama_kategori ?? '-',
                'idkategori' => $u->idkategori,
                'status_aktif' => $u->status_aktif,
                'last_login_at' => $u->last_login_at,
            ];
        });

        return response()->json($paginator);
    }

    /**
     * Create new Admin Instansi (by Super Admin)
     */
    public function storeAdminInstansi(Request $request)
    {
        if ($request->user()?->role !== 'super_admin') {
            return response()->json(['message' => 'Hanya Super Admin yang berhak menambahkan Admin Instansi.'], 403);
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'username' => 'required|string|max:100|unique:user_bo,login_username',
            'email' => 'nullable|email|max:255',
            'jenis_kelamin' => 'nullable|in:L,P',
            'telp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:500',
            'password' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'idkategori' => 'required|string|exists:kategori_user_bo,idkategori',
        ]);

        $encoded = Hash::make($request->password);

        $id = Str::uuid()->toString();
        $user = UserBo::create([
            'iduser_bo' => $id,
            'idkategori' => $request->idkategori,
            'nama' => $request->nama,
            'login_username' => $request->username,
            'login_email' => $request->email,
            'login_password' => $encoded,
            'jenis_kelamin' => $request->jenis_kelamin,
            'telp' => $request->telp,
            'alamat' => $request->alamat,
            'role_type' => 'admin_sekolah',
            'status_admin' => '2',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
        ]);

        $instansi = KategoriUserBo::find($request->idkategori);

        AuditLog::record(
            'CREATE_ADMIN_INSTANSI',
            'user_bo',
            $id,
            $request->nama,
            [
                'created_by' => $request->user()?->name ?? 'Super Admin',
                'instansi' => $instansi?->nama_kategori,
                'username' => $request->username,
            ]
        );

        return response()->json([
            'message' => 'Admin Instansi berhasil dibuat.',
            'data' => $user,
        ], 201);
    }

    /**
     * Monitoring Guru & Siswa Nasional (Read-Only)
     */
    public function monitoringGuruSiswa(Request $request)
    {
        $query = KategoriUserBo::with(['guru', 'siswa', 'adminSekolah'])->where('status_remove', 'N');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('nama_kategori', 'LIKE', "%{$s}%");
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('nama_kategori', 'asc')->get()->map(function ($inst) {
                return [
                    'idkategori' => $inst->idkategori,
                    'nama_instansi' => $inst->nama_kategori,
                    'total_admin' => $inst->adminSekolah->count(),
                    'total_guru' => $inst->guru->count(),
                    'total_siswa' => $inst->siswa->count(),
                    'admins' => $inst->adminSekolah->map(fn($a) => [
                        'id' => $a->iduser_bo,
                        'nama' => $a->nama,
                        'username' => $a->login_username,
                    ])->values(),
                    'gurus' => $inst->guru->map(fn($g) => [
                        'id' => $g->iduser_bo,
                        'nama' => $g->nama,
                        'email' => $g->login_email,
                        'telp' => $g->telp,
                    ])->values(),
                ];
            });

            return response()->json([
                'data' => $items,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $items->count(),
                'total' => $items->count(),
                'from' => $items->count() > 0 ? 1 : null,
                'to' => $items->count() > 0 ? $items->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama_kategori', 'asc')->paginate($perPage);

        $paginator->through(function ($inst) {
            return [
                'idkategori' => $inst->idkategori,
                'nama_instansi' => $inst->nama_kategori,
                'total_admin' => $inst->adminSekolah->count(),
                'total_guru' => $inst->guru->count(),
                'total_siswa' => $inst->siswa->count(),
                'admins' => $inst->adminSekolah->map(fn($a) => [
                    'id' => $a->iduser_bo,
                    'nama' => $a->nama,
                    'username' => $a->login_username,
                ])->values(),
                'gurus' => $inst->guru->map(fn($g) => [
                    'id' => $g->iduser_bo,
                    'nama' => $g->nama,
                    'email' => $g->login_email,
                    'telp' => $g->telp,
                ])->values(),
            ];
        });

        return response()->json($paginator);
    }
}
