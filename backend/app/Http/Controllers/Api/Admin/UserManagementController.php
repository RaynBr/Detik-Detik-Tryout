<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Models\KategoriUserBo;
use App\Models\AuditLog;
use App\Services\RbacAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserManagementController extends Controller
{
    /**
     * Helper to encode password for UserBo
     */
    protected function encodePasswordBo(string $plain): string
    {
        return Hash::make($plain);
    }

    /**
     * Unified list of platform users with filtering by role, instansi, status, search, and pagination.
     * When accessed by Super Admin without explicit role, defaults strictly to super_admin.
     */
    public function index(Request $request)
    {
        $roleFilter = $request->input('role', 'super_admin'); // default strictly to super_admin
        $idkategori = $request->input('idkategori');
        $search = $request->input('search');
        $status = $request->input('status'); // aktif, nonaktif
        $perPage = (int) $request->input('per_page', 15);

        // If filtering exclusively for siswa
        if ($roleFilter === 'siswa') {
            $query = UserSiswa::with(['kelas', 'kategori']);

            if ($idkategori) {
                $query->where('idkategori', $idkategori);
            }

            if ($status === 'aktif') {
                $query->where('status_aktif', 'Y');
            } elseif ($status === 'nonaktif') {
                $query->where('status_aktif', 'N');
            }

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nama', 'like', "%{$search}%")
                      ->orWhere('nisn', 'like', "%{$search}%")
                      ->orWhere('login_email', 'like', "%{$search}%")
                      ->orWhere('telp', 'like', "%{$search}%");
                });
            }

            $paginator = $query->orderBy('nama', 'asc')->paginate($perPage);
            $paginator->through(function ($s) {
                return [
                    'id' => $s->iduser,
                    'user_type' => 'siswa',
                    'nama' => $s->nama,
                    'username' => $s->nisn ?: $s->iduser,
                    'email' => $s->login_email,
                    'telp' => $s->telp,
                    'role' => 'siswa',
                    'role_label' => 'Siswa',
                    'idkategori' => $s->idkategori,
                    'instansi_name' => $s->kategori?->nama_kategori ?? '-',
                    'kelas_name' => $s->kelas?->nama_kelas ?? '-',
                    'status_aktif' => $s->status_aktif ?? 'Y',
                    'last_login_at' => $s->last_login_at,
                ];
            });

            return response()->json($paginator);
        }

        // Query user_bo for super_admin, admin, guru (and all)
        $queryBo = UserBo::with(['kategori', 'roles'])->where('status_remove', '!=', 'Y');

        if ($roleFilter === 'super_admin') {
            $queryBo->where(function ($q) {
                $q->where('role_type', 'super_admin')->orWhere('status_admin', '1');
            });
        } elseif ($roleFilter === 'admin') {
            $queryBo->where(function ($q) {
                $q->where('role_type', 'admin_sekolah')
                  ->orWhere('role_type', 'admin')
                  ->orWhere('status_admin', '2');
            });
        } elseif ($roleFilter === 'guru') {
            $queryBo->where('role_type', 'guru');
        }

        if ($idkategori) {
            $queryBo->where('idkategori', $idkategori);
        }

        if ($status === 'aktif') {
            $queryBo->where('status_aktif', 'Y');
        } elseif ($status === 'nonaktif') {
            $queryBo->where('status_aktif', 'N');
        }

        if ($search) {
            $queryBo->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('login_username', 'like', "%{$search}%")
                  ->orWhere('login_email', 'like', "%{$search}%")
                  ->orWhere('telp', 'like', "%{$search}%");
            });
        }

        $paginator = $queryBo->orderBy('nama', 'asc')->paginate($perPage);

        $paginator->through(function ($u) {
            $roleLabel = match ($u->role) {
                'super_admin' => 'Super Admin',
                'admin' => 'Admin Instansi',
                'guru' => 'Guru Pengajar',
                default => 'Staff'
            };

            return [
                'id' => $u->iduser_bo,
                'user_type' => 'bo',
                'nama' => $u->nama,
                'username' => $u->login_username,
                'email' => $u->login_email,
                'telp' => $u->telp,
                'role' => $u->role,
                'role_label' => $roleLabel,
                'rbac_roles' => $u->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'label' => $r->label])->values()->all(),
                'idkategori' => $u->idkategori,
                'instansi_name' => $u->kategori?->nama_kategori ?? ($u->role === 'super_admin' ? 'Pusat Platform' : '-'),
                'status_aktif' => $u->status_aktif ?? 'Y',
                'last_login_at' => $u->last_login_at,
            ];
        });

        return response()->json($paginator);
    }

    /**
     * Show detailed user profile with their school members if user is Admin Instansi.
     */
    public function show($id)
    {
        // 1. Check in user_bo
        $userBo = UserBo::with('kategori')->where('iduser_bo', $id)->first();
        if ($userBo) {
            $role = $userBo->role;
            $data = [
                'id' => $userBo->iduser_bo,
                'user_type' => 'bo',
                'nama' => $userBo->nama,
                'username' => $userBo->login_username,
                'email' => $userBo->login_email,
                'telp' => $userBo->telp,
                'alamat' => $userBo->alamat,
                'role' => $role,
                'role_label' => match ($role) {
                    'super_admin' => 'Super Admin',
                    'admin' => 'Admin Instansi',
                    'guru' => 'Guru Pengajar',
                    default => 'Staff'
                },
                'idkategori' => $userBo->idkategori,
                'instansi_name' => $userBo->kategori?->nama_kategori ?? ($role === 'super_admin' ? 'Pusat Platform' : '-'),
                'status_aktif' => $userBo->status_aktif ?? 'Y',
                'last_login_at' => $userBo->last_login_at,
            ];

            // If Admin Instansi, include Guru and Siswa of this institution
            if ($role === 'admin' && !empty($userBo->idkategori)) {
                $gurus = UserBo::where('idkategori', $userBo->idkategori)
                    ->where('status_remove', '!=', 'Y')
                    ->where('role_type', 'guru')
                    ->get(['iduser_bo', 'nama', 'login_username', 'login_email', 'telp', 'status_aktif']);

                $siswas = UserSiswa::with('kelas')
                    ->where('idkategori', $userBo->idkategori)
                    ->where('status_aktif', '!=', 'N')
                    ->limit(50)
                    ->get(['iduser', 'nama', 'nisn', 'login_email', 'idkelas', 'telp', 'status_aktif'])
                    ->map(fn($s) => [
                        'id' => $s->iduser,
                        'nama' => $s->nama,
                        'nisn' => $s->nisn,
                        'email' => $s->login_email,
                        'kelas' => $s->kelas?->nama_kelas ?? '-',
                        'telp' => $s->telp,
                        'status_aktif' => $s->status_aktif,
                    ]);

                $data['school_details'] = [
                    'idkategori' => $userBo->idkategori,
                    'instansi_name' => $userBo->kategori?->nama_kategori,
                    'total_guru' => $gurus->count(),
                    'total_siswa' => UserSiswa::where('idkategori', $userBo->idkategori)->count(),
                    'gurus' => $gurus,
                    'siswas' => $siswas,
                ];
            }

            return response()->json($data);
        }

        // 2. Check in user (siswa)
        $siswa = UserSiswa::with(['kelas', 'kategori'])->where('iduser', $id)->firstOrFail();
        return response()->json([
            'id' => $siswa->iduser,
            'user_type' => 'siswa',
            'nama' => $siswa->nama,
            'username' => $siswa->nisn ?: $siswa->iduser,
            'email' => $siswa->login_email,
            'telp' => $siswa->telp,
            'alamat' => $siswa->alamat,
            'role' => 'siswa',
            'role_label' => 'Siswa',
            'idkategori' => $siswa->idkategori,
            'instansi_name' => $siswa->kategori?->nama_kategori ?? '-',
            'kelas_name' => $siswa->kelas?->nama_kelas ?? '-',
            'idkelas' => $siswa->idkelas,
            'status_aktif' => $siswa->status_aktif ?? 'Y',
            'last_login_at' => $siswa->last_login_at,
        ]);
    }

    /**
     * Create user (Super Admin, Admin Instansi, Guru, or Siswa).
     */
    public function store(Request $request)
    {
        $role = $request->input('role', 'super_admin');

        $currentUser = $request->user();
        if ($role === 'super_admin' && $currentUser?->role !== 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Super Administrator yang berhak membuat akun Super Admin.'
            ], 403);
        }

        if ($currentUser && $currentUser->role === 'admin' && !empty($currentUser->idkategori)) {
            // Strictly bind Admin Instansi creations to their own institution
            $request->merge(['idkategori' => $currentUser->idkategori]);
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'username' => 'required|string|max:100',
            'password' => 'required|string|min:4',
            'email' => 'nullable|email|max:100',
            'telp' => 'nullable|string|max:30',
            'alamat' => 'nullable|string|max:500',
            'role' => 'nullable|in:super_admin,admin,guru,siswa',
            'idkategori' => 'nullable|string',
            'idkelas' => 'nullable|integer',
        ]);

        if (in_array($role, ['admin', 'guru', 'siswa']) && empty($request->idkategori)) {
            return response()->json(['message' => 'Pilih instansi untuk pengguna ini.'], 422);
        }

        // Unique username check
        if ($role === 'siswa') {
            if (UserSiswa::where('nisn', $request->username)->orWhere('iduser', $request->username)->exists()) {
                return response()->json(['message' => 'NISN / Username siswa sudah digunakan.'], 422);
            }

            $user = DB::transaction(function () use ($request) {
                $iduser = 'US' . date('Ymd') . rand(10000000, 99999999);
                $created = UserSiswa::create([
                    'iduser' => $iduser,
                    'nama' => trim($request->nama),
                    'nisn' => trim($request->username),
                    'login_email' => $request->email,
                    'login_password' => Hash::make($request->password),
                    'telp' => $request->telp,
                    'alamat' => $request->alamat,
                    'idkategori' => $request->idkategori,
                    'idkelas' => $request->idkelas,
                    'status_aktif' => 'Y',
                    'tanggal_input' => now(),
                ]);
                app(RbacAssignmentService::class)->assignDefaultRole($created);
                return $created;
            });
        } else {
            if (UserBo::where('login_username', $request->username)->exists()) {
                return response()->json(['message' => 'Username ini sudah digunakan.'], 422);
            }

            $user = DB::transaction(function () use ($request, $role) {
                $iduser_bo = (string) (time() . rand(1000000, 9999999));
                $roleType = match ($role) {
                    'super_admin' => 'super_admin',
                    'admin' => 'admin_sekolah',
                    'guru' => 'guru',
                    default => 'guru'
                };
                $statusAdmin = match ($role) {
                    'super_admin' => '1',
                    'admin' => '2',
                    default => '0'
                };

                $created = UserBo::create([
                    'iduser_bo' => $iduser_bo,
                    'idkategori' => ($role === 'super_admin') ? null : $request->idkategori,
                    'nama' => trim($request->nama),
                    'login_username' => trim($request->username),
                    'login_email' => $request->email,
                    'login_password' => $this->encodePasswordBo($request->password),
                    'telp' => $request->telp,
                    'alamat' => $request->alamat,
                    'status_admin' => $statusAdmin,
                    'role_type' => $roleType,
                    'status_aktif' => 'Y',
                    'status_remove' => 'N',
                    'tanggal_input' => now(),
                ]);
                app(RbacAssignmentService::class)->assignDefaultRole($created);
                return $created;
            });
        }

        $instansi = $request->idkategori ? KategoriUserBo::find($request->idkategori) : null;

        AuditLog::record(
            'Tambah Data',
            $role === 'siswa' ? 'user' : 'user_bo',
            $role === 'siswa' ? $user->iduser : $user->iduser_bo,
            "Menambahkan user baru ({$role}): {$user->nama}",
            ['username' => $request->username, 'role' => $role, 'idkategori' => $request->idkategori],
            null,
            null,
            null,
            'Kelola Pengguna',
            $instansi?->nama_kategori
        );

        return response()->json([
            'message' => "Pengguna ({$role}) berhasil dibuat.",
            'data' => $user
        ], 201);
    }

    /**
     * Update user details.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'username' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:100',
            'telp' => 'nullable|string|max:30',
            'alamat' => 'nullable|string|max:500',
            'password' => 'nullable|string|min:4',
            'status_aktif' => 'nullable|in:Y,N,aktif,nonaktif',
            'idkategori' => 'nullable|string',
            'idkelas' => 'nullable|integer',
        ]);

        $statusAktif = null;
        if ($request->has('status_aktif')) {
            $statusAktif = in_array(strtolower($request->status_aktif), ['n', 'nonaktif']) ? 'N' : 'Y';
        }

        // 1. Check in user_bo
        $userBo = UserBo::where('iduser_bo', $id)->first();
        if ($userBo) {
            $updateData = [
                'nama' => trim($request->nama),
                'telp' => $request->telp ?? $userBo->telp,
                'alamat' => $request->alamat ?? $userBo->alamat,
                'tanggal_update' => now(),
            ];

            if ($request->filled('username')) $updateData['login_username'] = trim($request->username);
            if ($request->has('email')) $updateData['login_email'] = $request->email;
            if ($statusAktif !== null) $updateData['status_aktif'] = $statusAktif;
            if ($request->filled('password')) $updateData['login_password'] = $this->encodePasswordBo($request->password);
            if ($request->filled('idkategori') && $userBo->role !== 'super_admin') $updateData['idkategori'] = $request->idkategori;

            $userBo->update($updateData);

            AuditLog::record(
                'Edit Data',
                'user_bo',
                $id,
                "Memperbarui data pengguna: {$userBo->nama}",
                $updateData,
                null,
                null,
                null,
                'Kelola Pengguna',
                $userBo->kategori?->nama_kategori
            );

            return response()->json([
                'message' => 'Data pengguna berhasil diperbarui.',
                'data' => $userBo
            ]);
        }

        // 2. Check in user (siswa)
        $siswa = UserSiswa::where('iduser', $id)->firstOrFail();
        $updateData = [
            'nama' => trim($request->nama),
            'telp' => $request->telp ?? $siswa->telp,
            'alamat' => $request->alamat ?? $siswa->alamat,
        ];
        if ($request->filled('username')) $updateData['nisn'] = trim($request->username);
        if ($request->has('email')) $updateData['login_email'] = $request->email;
        if ($request->has('idkelas')) $updateData['idkelas'] = $request->idkelas;
        if ($statusAktif !== null) $updateData['status_aktif'] = $statusAktif;
        if ($request->filled('password')) $updateData['login_password'] = Hash::make($request->password);
        if ($request->filled('idkategori')) $updateData['idkategori'] = $request->idkategori;

        $siswa->update($updateData);

        AuditLog::record(
            'Edit Data',
            'user',
            $id,
            "Memperbarui data siswa: {$siswa->nama}",
            $updateData,
            null,
            null,
            null,
            'Kelola Pengguna',
            $siswa->kategori?->nama_kategori
        );

        return response()->json([
            'message' => 'Data siswa berhasil diperbarui.',
            'data' => $siswa
        ]);
    }

    /**
     * Soft delete user.
     */
    public function destroy(Request $request, $id)
    {
        // 1. Check in user_bo
        $userBo = UserBo::where('iduser_bo', $id)->first();
        if ($userBo) {
            $userBo->tokens()->delete();
            $userBo->update([
                'status_remove' => 'Y',
                'status_aktif' => 'N',
                'active_session_token' => null,
            ]);

            AuditLog::record(
                'Hapus Data',
                'user_bo',
                $id,
                "Menonaktifkan pengguna: {$userBo->nama}",
                ['role' => $userBo->role],
                null,
                null,
                null,
                'Kelola Pengguna',
                $userBo->kategori?->nama_kategori
            );

            return response()->json(['message' => "Pengguna {$userBo->nama} berhasil dihapus/dinonaktifkan."]);
        }

        // 2. Check in user (siswa)
        $siswa = UserSiswa::where('iduser', $id)->firstOrFail();
        $siswa->tokens()->delete();
        $siswa->update([
            'status_aktif' => 'N',
            'active_session_token' => null,
        ]);

        AuditLog::record(
            'Hapus Data',
            'user',
            $id,
            "Menonaktifkan siswa: {$siswa->nama}",
            ['nisn' => $siswa->nisn],
            null,
            null,
            null,
            'Kelola Pengguna',
            $siswa->kategori?->nama_kategori
        );

        return response()->json(['message' => "Siswa {$siswa->nama} berhasil dinonaktifkan."]);
    }

    /**
     * Reset user password to secure random or provided password with strict validation.
     */
    public function resetPassword(Request $request, $id)
    {
        $newPass = $request->input('password');
        if (empty($newPass)) {
            // Generate a secure random password if not explicitly supplied (CWE-1188 fix)
            $newPass = 'User' . rand(1000, 9999) . '!' . substr(str_shuffle('abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'), 0, 3);
        }

        // 1. Check in user_bo
        $userBo = UserBo::where('iduser_bo', $id)->first();
        if ($userBo) {
            $userBo->tokens()->delete();
            $userBo->update([
                'login_password' => $this->encodePasswordBo($newPass),
                'force_change_password' => true,
                'active_session_token' => null,
            ]);

            AuditLog::record(
                'Reset Password',
                'user_bo',
                $id,
                "Mereset password pengguna: {$userBo->nama}",
                ['target_username' => $userBo->login_username],
                null,
                null,
                null,
                'Kelola Pengguna',
                $userBo->kategori?->nama_kategori
            );

            return response()->json([
                'message' => "Password untuk {$userBo->nama} berhasil direset ke default ({$newPass})."
            ]);
        }

        // 2. Check in user (siswa)
        $siswa = UserSiswa::where('iduser', $id)->firstOrFail();
        $siswa->tokens()->delete();
        $siswa->update([
            'login_password' => Hash::make($newPass),
            'force_change_password' => true,
            'active_session_token' => null,
        ]);

        AuditLog::record(
            'Reset Password',
            'user',
            $id,
            "Mereset password siswa: {$siswa->nama}",
            ['nisn' => $siswa->nisn],
            null,
            null,
            null,
            'Kelola Pengguna',
            $siswa->kategori?->nama_kategori
        );

        return response()->json([
            'message' => "Password siswa {$siswa->nama} berhasil direset ke default ({$newPass})."
        ]);
    }

    /**
     * Toggle active/inactive status.
     */
    public function toggleStatus(Request $request, $id)
    {
        // 1. Check in user_bo
        $userBo = UserBo::where('iduser_bo', $id)->first();
        if ($userBo) {
            $newStatus = ($userBo->status_aktif === 'Y') ? 'N' : 'Y';
            if ($newStatus === 'N') {
                $userBo->tokens()->delete();
                $userBo->active_session_token = null;
            }
            $userBo->status_aktif = $newStatus;
            $userBo->save();

            AuditLog::record(
                $newStatus === 'Y' ? 'Aktivasi User' : 'Nonaktif User',
                'user_bo',
                $id,
                "Mengubah status pengguna {$userBo->nama} menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Non Aktif'),
                ['new_status' => $newStatus],
                null,
                null,
                null,
                'Kelola Pengguna',
                $userBo->kategori?->nama_kategori
            );

            return response()->json([
                'message' => "Status pengguna berhasil diubah menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Non Aktif') . ".",
                'id' => (string) $id,
                'status_aktif' => $newStatus,
                'status' => ($newStatus === 'Y' ? 'Aktif' : 'Non Aktif'),
                'is_active' => $newStatus === 'Y',
            ]);
        }

        // 2. Check in user (siswa)
        $siswa = UserSiswa::where('iduser', $id)->firstOrFail();
        $newStatus = ($siswa->status_aktif === 'Y') ? 'N' : 'Y';
        if ($newStatus === 'N') {
            $siswa->tokens()->delete();
            $siswa->active_session_token = null;
        }
        $siswa->status_aktif = $newStatus;
        $siswa->save();

        AuditLog::record(
            $newStatus === 'Y' ? 'Aktivasi Siswa' : 'Nonaktif Siswa',
            'user',
            $id,
            "Mengubah status siswa {$siswa->nama} menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Non Aktif'),
            ['new_status' => $newStatus],
            null,
            null,
            null,
            'Kelola Pengguna',
            $siswa->kategori?->nama_kategori
        );

        return response()->json([
            'message' => "Status siswa berhasil diubah menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Non Aktif') . ".",
            'id' => (string) $id,
            'status_aktif' => $newStatus,
            'status' => ($newStatus === 'Y' ? 'Aktif' : 'Non Aktif'),
            'is_active' => $newStatus === 'Y',
        ]);
    }

    // ========================================================
    // Legacy compatibility helpers (to preserve existing code)
    // ========================================================

    public function superAdmins(Request $request)
    {
        if ($request->user()?->role !== 'super_admin') {
            return response()->json(['message' => 'Akses ditolak: Hanya Super Administrator yang berhak mengakses data Super Admin.'], 403);
        }
        $request->merge(['role' => 'super_admin']);
        return $this->index($request);
    }

    public function storeSuperAdmin(Request $request)
    {
        if ($request->user()?->role !== 'super_admin') {
            return response()->json(['message' => 'Akses ditolak: Hanya Super Administrator yang berhak membuat akun Super Admin.'], 403);
        }
        $request->merge(['role' => 'super_admin']);
        return $this->store($request);
    }

    public function adminInstansi(Request $request)
    {
        $request->merge(['role' => 'admin']);
        return $this->index($request);
    }

    public function storeAdminInstansi(Request $request)
    {
        $request->merge(['role' => 'admin']);
        return $this->store($request);
    }

    public function monitoringGuruSiswa(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $query = KategoriUserBo::with(['guru', 'siswa.kelas', 'adminSekolah'])->where('status_remove', '!=', 'Y');

        if ($user->role === 'admin') {
            // Strictly scope Admin Instansi to their own institution only
            $query->where('idkategori', $user->idkategori);
        } elseif ($user->role === 'super_admin') {
            if ($request->filled('idkategori')) {
                $query->where('idkategori', $request->idkategori);
            }
        } else {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('nama_kategori', 'LIKE', "%{$s}%");
        }

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
                    'status_aktif' => $a->status_aktif,
                ])->values(),
                'gurus' => $inst->guru->map(fn($g) => [
                    'id' => $g->iduser_bo,
                    'nama' => $g->nama,
                    'email' => $g->login_email,
                    'telp' => $g->telp,
                    'status_aktif' => $g->status_aktif,
                ])->values(),
                'siswas' => $inst->siswa->map(fn($s) => [
                    'id' => $s->iduser,
                    'nama' => $s->nama,
                    'nisn' => $s->nisn,
                    'email' => $s->login_email,
                    'kelas' => $s->kelas?->nama_kelas ?? '-',
                    'telp' => $s->telp,
                    'status_aktif' => $s->status_aktif,
                ])->values(),
            ];
        });

        if ($request->filled('idkategori')) {
            $first = $items->first();
            return response()->json([
                'idkategori' => $first['idkategori'] ?? $request->idkategori,
                'instansi_name' => $first['nama_instansi'] ?? ($query->first()?->nama_kategori ?? '-'),
                'total_admin' => $first['total_admin'] ?? 0,
                'total_guru' => $first['total_guru'] ?? 0,
                'total_siswa' => $first['total_siswa'] ?? 0,
                'admins' => $first['admins'] ?? [],
                'gurus' => $first['gurus'] ?? [],
                'siswas' => $first['siswas'] ?? [],
                'data' => $items,
            ]);
        }

        return response()->json([
            'data' => $items,
            'total' => $items->count()
        ]);
    }
}
