<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\KategoriUserBo;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Models\MasterKelas;
use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class InstansiController extends Controller
{
    /**
     * Helper to encode password 5x base64 for UserBo compatibility
     */
    protected function encodePasswordBo(string $plain): string
    {
        $val = $plain;
        for ($i = 0; $i < 5; $i++) {
            $val = base64_encode($val);
        }
        return $val;
    }

    /**
     * Authorize whether the authenticated user can access/manage the given institution.
     * Super Admin has full multi-tenant access.
     * Admin Instansi / Sekolah is STRICTLY limited to their own institution.
     */
    protected function authorizeInstansi(Request $request, string $idkategori): ?\Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Super Admin has unrestricted access to all institutions
        if ($user->role === 'super_admin') {
            return null;
        }

        // Admin instansi / sekolah can only access their own institution
        if ($user->role === 'admin') {
            if (empty($user->idkategori) || (string)$user->idkategori !== (string)$idkategori) {
                return response()->json([
                    'message' => 'Akses ditolak: Admin instansi tidak diizinkan mengakses atau mengelola data instansi lain.'
                ], 403);
            }
            return null;
        }

        return response()->json([
            'message' => 'Akses ditolak: Anda tidak memiliki izin untuk fitur ini.'
        ], 403);
    }

    /**
     * List institutions with aggregated counts.
     * - Super Admin sees all institutions.
     * - Admin Instansi ONLY sees their own institution.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = KategoriUserBo::where('status_remove', 'N');

        // Non-super_admin (Admin Instansi / Guru) CANNOT see or access other institutions
        if ($user && $user->role !== 'super_admin') {
            if (empty($user->idkategori)) {
                return response()->json([]);
            }
            $query->where('idkategori', $user->idkategori);
        }

        if ($request->has('search') && !empty($request->search)) {
            $query->where('nama_kategori', 'like', '%' . $request->search . '%');
        }

        $items = $query->orderBy('nama_kategori', 'asc')->get();

        $result = $items->map(function ($item) {
            $adminCount = UserBo::where('idkategori', $item->idkategori)
                ->where('status_remove', 'N')
                ->where(function ($q) {
                    $q->where('role_type', 'admin_sekolah')->orWhere('role_type', 'admin');
                })->count();

            $guruCount = UserBo::where('idkategori', $item->idkategori)
                ->where('status_remove', 'N')
                ->where('role_type', 'guru')
                ->count();

            $siswaCount = UserSiswa::where('idkategori', $item->idkategori)
                ->orWhereHas('kelas', function ($q) use ($item) {
                    $q->where('idkategori', $item->idkategori);
                })->count();

            $kelasCount = MasterKelas::where('idkategori', $item->idkategori)->count();

            return [
                'idkategori' => $item->idkategori,
                'nama_kategori' => $item->nama_kategori,
                'tgl_input' => $item->tgl_input,
                'admin_count' => $adminCount,
                'guru_count' => $guruCount,
                'siswa_count' => $siswaCount,
                'kelas_count' => $kelasCount,
            ];
        });

        return response()->json($result);
    }

    /**
     * Create a new institution.
     * ONLY Super Admin can create institutions.
     * Supports: Kode/Nama, Email, Telp, Alamat, Status, Masa Berlaku, Encrypt ID, and First Admin creation.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Super Administrator IP yang berhak menambahkan instansi baru.'
            ], 403);
        }

        $request->validate([
            'nama_kategori' => 'required|string|max:255',
            'kode_instansi' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            'telp' => 'nullable|string|max:50',
            'alamat' => 'nullable|string|max:500',
            'masa_berlaku' => 'nullable|date',
            'encrypt_id' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:aktif,nonaktif',
            'admin_username' => 'nullable|string|max:100|unique:user_bo,login_username',
            'admin_password' => 'nullable|string|min:4',
            'admin_name' => 'nullable|string|max:255',
        ]);

        $idkategori = $request->input('kode_instansi') ?: (string) (time() . rand(1000000, 9999999));
        $encryptId = $request->input('encrypt_id') ?: md5($idkategori . '_' . time());

        $instansiData = [
            'idkategori' => $idkategori,
            'nama_kategori' => $request->nama_kategori,
            'tgl_input' => now(),
            'status_remove' => ($request->input('status') === 'nonaktif') ? 'Y' : 'N',
        ];

        if (Schema::hasColumn('kategori_user_bo', 'masa_berlaku') && $request->filled('masa_berlaku')) {
            $instansiData['masa_berlaku'] = $request->input('masa_berlaku');
        }
        if (Schema::hasColumn('kategori_user_bo', 'encrypt_id')) {
            $instansiData['encrypt_id'] = $encryptId;
        }

        $item = KategoriUserBo::create($instansiData);

        // Optional first admin creation
        $createdAdmin = null;
        if ($request->filled('admin_username') && $request->filled('admin_password')) {
            $adminId = (string) (time() . rand(1000000, 9999999));
            $createdAdmin = UserBo::create([
                'iduser_bo' => $adminId,
                'idkategori' => $idkategori,
                'nama' => $request->input('admin_name') ?: ('Admin ' . $request->nama_kategori),
                'login_username' => $request->admin_username,
                'login_email' => $request->email ?? '',
                'login_password' => $this->encodePasswordBo($request->admin_password),
                'telp' => $request->telp ?? '',
                'alamat' => $request->alamat ?? '',
                'status_admin' => '2',
                'role_type' => 'admin_sekolah',
                'status_aktif' => 'Y',
                'status_remove' => 'N',
                'tanggal_input' => now(),
            ]);
        }

        // Audit Trail: CREATE_INSTANSI & ADMIN
        AuditLog::record(
            'CREATE_INSTANSI & ADMIN',
            'kategori_user_bo',
            $idkategori,
            $request->nama_kategori,
            [
                'created_by' => $user->name,
                'masa_berlaku' => $request->input('masa_berlaku'),
                'encrypt_id' => $encryptId,
                'admin_created' => $createdAdmin ? $createdAdmin->login_username : null,
            ]
        );

        return response()->json([
            'message' => 'Instansi berhasil ditambahkan' . ($createdAdmin ? ' beserta akun Admin Instansi pertama' : ''),
            'data' => $item,
            'admin' => $createdAdmin,
        ], 201);
    }

    /**
     * Show detail of an institution and all its members.
     * Admin Instansi can only view their own institution.
     */
    public function show(Request $request, $idkategori)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $instansi = KategoriUserBo::where('idkategori', $idkategori)
            ->where('status_remove', 'N')
            ->firstOrFail();

        $admins = UserBo::where('idkategori', $idkategori)
            ->where('status_remove', 'N')
            ->where(function ($q) {
                $q->where('role_type', 'admin_sekolah')->orWhere('role_type', 'admin');
            })
            ->get(['iduser_bo', 'nama', 'login_username', 'login_email', 'telp', 'alamat', 'status_aktif', 'role_type'])
            ->map(function ($a) {
                return [
                    'iduser_bo' => $a->iduser_bo,
                    'nama' => $a->nama,
                    'login_username' => $a->login_username,
                    'login_email' => $a->login_email,
                    'telp' => $a->telp,
                    'alamat' => $a->alamat,
                    'status_aktif' => $a->status_aktif,
                    'role_type' => $a->role_type,
                    'created_by' => 'Super Admin',
                ];
            });

        $gurus = UserBo::where('idkategori', $idkategori)
            ->where('status_remove', 'N')
            ->where('role_type', 'guru')
            ->with(['mapelAjar.mataPelajaran'])
            ->get(['iduser_bo', 'nama', 'login_username', 'login_email', 'telp', 'alamat', 'status_aktif', 'role_type'])
            ->map(function ($g) use ($instansi) {
                return [
                    'iduser_bo' => $g->iduser_bo,
                    'nama' => $g->nama,
                    'login_username' => $g->login_username,
                    'login_email' => $g->login_email,
                    'telp' => $g->telp,
                    'alamat' => $g->alamat,
                    'status_aktif' => $g->status_aktif,
                    'role_type' => $g->role_type,
                    'created_by' => 'Admin ' . $instansi->nama_kategori,
                    'mapel_ajar' => $g->mapelAjar->map(fn($m) => $m->mataPelajaran?->nama_mapel)->filter()->values(),
                ];
            });

        $siswas = UserSiswa::where('idkategori', $idkategori)
            ->with(['kelas.jenjang'])
            ->get(['iduser', 'nama', 'nisn', 'login_email', 'idkelas', 'telp', 'status_aktif'])
            ->map(function ($s) use ($instansi) {
                return [
                    'iduser' => $s->iduser,
                    'nama' => $s->nama,
                    'nisn' => $s->nisn,
                    'login_email' => $s->login_email,
                    'idkelas' => $s->idkelas,
                    'kelas_name' => $s->kelas?->nama_kelas ?? '-',
                    'telp' => $s->telp,
                    'status_aktif' => $s->status_aktif,
                    'created_by' => 'Admin ' . $instansi->nama_kategori,
                ];
            });

        $kelas = MasterKelas::where('idkategori', $idkategori)
            ->with(['jenjang', 'waliKelas'])
            ->withCount('siswa')
            ->get();

        // 4 Dimensi Statistik Instansi: Total Guru, Siswa, Bank Soal, Paket Soal
        $totalGuru = $gurus->count();
        $totalSiswa = $siswas->count();
        $totalPaketSoal = Assessment::where('idkategori', $idkategori)->count();
        $totalBankSoal = AssessmentSoalPilgan::whereHas('assessment', function ($q) use ($idkategori) {
            $q->where('idkategori', $idkategori);
        })->count();

        return response()->json([
            'instansi' => [
                'idkategori' => $instansi->idkategori,
                'nama_kategori' => $instansi->nama_kategori,
                'masa_berlaku' => $instansi->masa_berlaku ?? null,
                'encrypt_id' => $instansi->encrypt_id ?? md5($instansi->idkategori),
                'tgl_input' => $instansi->tgl_input,
                'status' => ($instansi->status_remove === 'Y') ? 'nonaktif' : 'aktif',
            ],
            'statistics' => [
                'total_guru' => $totalGuru,
                'total_siswa' => $totalSiswa,
                'total_bank_soal' => $totalBankSoal,
                'total_paket_soal' => $totalPaketSoal,
                'total_kelas' => $kelas->count(),
            ],
            'admins' => $admins,
            'gurus' => $gurus,
            'siswas' => $siswas,
            'kelas' => $kelas,
        ]);
    }

    /**
     * Update an institution.
     * ONLY Super Admin can update master institution details.
     * Supports: Status Aktif/Nonaktif, Masa Berlaku & Encrypt ID.
     */
    public function update(Request $request, $idkategori)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Super Administrator IP yang berhak mengubah nama master instansi.'
            ], 403);
        }

        $request->validate([
            'nama_kategori' => 'required|string|max:255',
            'status' => 'nullable|string|in:aktif,nonaktif',
            'masa_berlaku' => 'nullable|date',
            'encrypt_id' => 'nullable|string|max:100',
        ]);

        $instansi = KategoriUserBo::where('idkategori', $idkategori)->firstOrFail();
        $updates = [
            'nama_kategori' => $request->nama_kategori,
        ];

        if ($request->has('status')) {
            $updates['status_remove'] = ($request->status === 'nonaktif') ? 'Y' : 'N';
        }
        if (Schema::hasColumn('kategori_user_bo', 'masa_berlaku') && $request->filled('masa_berlaku')) {
            $updates['masa_berlaku'] = $request->masa_berlaku;
        }
        if (Schema::hasColumn('kategori_user_bo', 'encrypt_id') && $request->filled('encrypt_id')) {
            $updates['encrypt_id'] = $request->encrypt_id;
        }

        $instansi->update($updates);

        // Audit Trail: EDIT_INSTANSI
        AuditLog::record(
            'EDIT_INSTANSI',
            'kategori_user_bo',
            $idkategori,
            $instansi->nama_kategori,
            [
                'updated_by' => $user->name,
                'masa_berlaku' => $instansi->masa_berlaku ?? null,
                'encrypt_id' => $instansi->encrypt_id ?? null,
                'status' => ($instansi->status_remove === 'Y') ? 'nonaktif' : 'aktif',
            ]
        );

        return response()->json([
            'message' => 'Data instansi berhasil diperbarui',
            'data' => $instansi
        ]);
    }

    /**
     * Delete an institution (soft delete).
     * ONLY Super Admin can deactivate an institution.
     */
    public function destroy(Request $request, $idkategori)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Super Administrator IP yang berhak menonaktifkan instansi.'
            ], 403);
        }

        $instansi = KategoriUserBo::where('idkategori', $idkategori)->firstOrFail();
        $instansi->update(['status_remove' => 'Y']);

        AuditLog::record(
            'EDIT_INSTANSI',
            'kategori_user_bo',
            $idkategori,
            $instansi->nama_kategori,
            ['action' => 'deactivate', 'deactivated_by' => $user->name]
        );

        return response()->json([
            'message' => 'Instansi berhasil dinonaktifkan'
        ]);
    }

    // ==========================================
    // CRUD ADMIN INSTANSI / SEKOLAH
    // ==========================================

    public function storeAdmin(Request $request, $idkategori)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'login_username' => 'required|string|max:50',
            'login_email' => 'required|email|max:100',
            'password' => 'required|string|min:4',
            'telp' => 'nullable|string|max:25',
            'alamat' => 'nullable|string',
        ]);

        $iduser_bo = (string) (time() . rand(1000000, 9999999));

        $admin = UserBo::create([
            'iduser_bo' => $iduser_bo,
            'idkategori' => $idkategori,
            'nama' => $request->nama,
            'login_username' => $request->login_username,
            'login_email' => $request->login_email,
            'login_password' => $this->encodePasswordBo($request->password),
            'telp' => $request->telp ?? '',
            'alamat' => $request->alamat ?? '',
            'status_admin' => '2',
            'role_type' => 'admin_sekolah',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
            'tanggal_input' => now(),
        ]);

        AuditLog::record(
            'CREATE_ADMIN_INSTANSI',
            'user_bo',
            $iduser_bo,
            $request->nama,
            ['username' => $request->login_username, 'idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Admin instansi berhasil dibuat',
            'data' => $admin
        ], 201);
    }

    public function updateAdmin(Request $request, $idkategori, $iduser_bo)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'login_username' => 'required|string|max:50',
            'login_email' => 'required|email|max:100',
            'password' => 'nullable|string|min:4',
            'telp' => 'nullable|string|max:25',
            'alamat' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $admin = UserBo::where('iduser_bo', $iduser_bo)
            ->where('idkategori', $idkategori)
            ->firstOrFail();

        $updateData = [
            'nama' => $request->nama,
            'login_username' => $request->login_username,
            'login_email' => $request->login_email,
            'telp' => $request->telp ?? $admin->telp,
            'alamat' => $request->alamat ?? $admin->alamat,
            'tanggal_update' => now(),
        ];

        if ($request->filled('password')) {
            $updateData['login_password'] = $this->encodePasswordBo($request->password);
        }

        if ($request->filled('status_aktif')) {
            $updateData['status_aktif'] = $request->status_aktif;
        }

        $admin->update($updateData);

        AuditLog::record(
            'EDIT_ADMIN_INSTANSI',
            'user_bo',
            $iduser_bo,
            $admin->nama,
            ['idkategori' => $idkategori, 'username' => $admin->login_username]
        );

        return response()->json([
            'message' => 'Admin instansi berhasil diperbarui',
            'data' => $admin
        ]);
    }

    public function destroyAdmin(Request $request, $idkategori, $iduser_bo)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $admin = UserBo::where('iduser_bo', $iduser_bo)
            ->where('idkategori', $idkategori)
            ->firstOrFail();

        $admin->update(['status_remove' => 'Y']);

        AuditLog::record(
            'DELETE_ADMIN_INSTANSI',
            'user_bo',
            $iduser_bo,
            $admin->nama,
            ['idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Admin instansi berhasil dihapus'
        ]);
    }

    // ==========================================
    // CRUD GURU
    // ==========================================

    public function storeGuru(Request $request, $idkategori)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'login_username' => 'required|string|max:50',
            'login_email' => 'required|email|max:100',
            'password' => 'required|string|min:4',
            'telp' => 'nullable|string|max:25',
            'alamat' => 'nullable|string',
        ]);

        $iduser_bo = (string) (time() . rand(1000000, 9999999));

        $guru = UserBo::create([
            'iduser_bo' => $iduser_bo,
            'idkategori' => $idkategori,
            'nama' => $request->nama,
            'login_username' => $request->login_username,
            'login_email' => $request->login_email,
            'login_password' => $this->encodePasswordBo($request->password),
            'telp' => $request->telp ?? '',
            'alamat' => $request->alamat ?? '',
            'status_admin' => '2',
            'role_type' => 'guru',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
            'tanggal_input' => now(),
        ]);

        AuditLog::record(
            'CREATE_GURU',
            'user_bo',
            $iduser_bo,
            $request->nama,
            ['login_username' => $request->login_username, 'idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Guru berhasil ditambahkan',
            'data' => $guru
        ], 201);
    }

    public function updateGuru(Request $request, $idkategori, $iduser_bo)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'login_username' => 'required|string|max:50',
            'login_email' => 'required|email|max:100',
            'password' => 'nullable|string|min:4',
            'telp' => 'nullable|string|max:25',
            'alamat' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $guru = UserBo::where('iduser_bo', $iduser_bo)
            ->where('idkategori', $idkategori)
            ->firstOrFail();

        $updateData = [
            'nama' => $request->nama,
            'login_username' => $request->login_username,
            'login_email' => $request->login_email,
            'telp' => $request->telp ?? $guru->telp,
            'alamat' => $request->alamat ?? $guru->alamat,
            'tanggal_update' => now(),
        ];

        if ($request->filled('password')) {
            $updateData['login_password'] = $this->encodePasswordBo($request->password);
        }

        if ($request->filled('status_aktif')) {
            $updateData['status_aktif'] = $request->status_aktif;
        }

        $guru->update($updateData);

        AuditLog::record(
            'EDIT_GURU',
            'user_bo',
            $iduser_bo,
            $guru->nama,
            ['login_username' => $guru->login_username, 'idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Data guru berhasil diperbarui',
            'data' => $guru
        ]);
    }

    public function destroyGuru(Request $request, $idkategori, $iduser_bo)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $guru = UserBo::where('iduser_bo', $iduser_bo)
            ->where('idkategori', $idkategori)
            ->firstOrFail();

        $guru->update(['status_remove' => 'Y']);

        AuditLog::record(
            'DELETE_GURU',
            'user_bo',
            $iduser_bo,
            $guru->nama,
            ['idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Guru berhasil dihapus'
        ]);
    }

    // ==========================================
    // CRUD SISWA
    // ==========================================

    public function storeSiswa(Request $request, $idkategori)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'nisn' => 'required|string|max:30',
            'login_email' => 'required|email|max:100',
            'password' => 'required|string|min:4',
            'idkelas' => 'nullable|integer',
            'telp' => 'nullable|string|max:25',
        ]);

        $iduser = 'US' . date('Ymd') . rand(1000000000, 9999999999);

        $siswa = UserSiswa::create([
            'iduser' => $iduser,
            'nama' => $request->nama,
            'nisn' => $request->nisn,
            'login_email' => $request->login_email,
            'login_password' => Hash::make($request->password),
            'idkelas' => $request->idkelas,
            'idkategori' => $idkategori,
            'telp' => $request->telp ?? '',
            'status_aktif' => 'Y',
            'tanggal_input' => now(),
        ]);

        AuditLog::record(
            'CREATE_SISWA',
            'user',
            $iduser,
            $request->nama,
            ['nisn' => $request->nisn, 'idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Siswa berhasil ditambahkan',
            'data' => $siswa
        ], 201);
    }

    public function updateSiswa(Request $request, $idkategori, $iduser)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'nisn' => 'required|string|max:30',
            'login_email' => 'required|email|max:100',
            'password' => 'nullable|string|min:4',
            'idkelas' => 'nullable|integer',
            'telp' => 'nullable|string|max:25',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $siswa = UserSiswa::where('iduser', $iduser)
            ->where('idkategori', $idkategori)
            ->firstOrFail();

        $updateData = [
            'nama' => $request->nama,
            'nisn' => $request->nisn,
            'login_email' => $request->login_email,
            'idkelas' => $request->idkelas ?? $siswa->idkelas,
            'idkategori' => $idkategori,
            'telp' => $request->telp ?? $siswa->telp,
        ];

        if ($request->filled('password')) {
            $updateData['login_password'] = Hash::make($request->password);
        }

        if ($request->filled('status_aktif')) {
            $updateData['status_aktif'] = $request->status_aktif;
        }

        $siswa->update($updateData);

        AuditLog::record(
            'EDIT_SISWA',
            'user',
            $iduser,
            $siswa->nama,
            ['nisn' => $siswa->nisn, 'idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Data siswa berhasil diperbarui',
            'data' => $siswa
        ]);
    }

    public function destroySiswa(Request $request, $idkategori, $iduser)
    {
        if ($deny = $this->authorizeInstansi($request, (string)$idkategori)) {
            return $deny;
        }

        $siswa = UserSiswa::where('iduser', $iduser)
            ->where('idkategori', $idkategori)
            ->firstOrFail();
        $siswa->update(['status_aktif' => 'N']);

        AuditLog::record(
            'DELETE_SISWA',
            'user',
            $iduser,
            $siswa->nama,
            ['idkategori' => $idkategori]
        );

        return response()->json([
            'message' => 'Siswa berhasil dinonaktifkan'
        ]);
    }
}
