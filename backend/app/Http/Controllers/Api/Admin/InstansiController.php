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
use Illuminate\Validation\Rules\Password;

class InstansiController extends Controller
{
    /**
     * Helper to encode password using standard Hash::make() - no Base64 (Requirement 4)
     */
    protected function encodePasswordBo(string $plain): string
    {
        return Hash::make($plain);
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

        if ($request->filled('search')) {
            $query->where('nama_kategori', 'like', '%' . $request->search . '%');
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('nama_kategori', 'asc')->get();
            $idkategoriList = $items->pluck('idkategori')->filter()->toArray();

            $adminCounts = UserBo::whereIn('idkategori', $idkategoriList)
                ->where('status_remove', 'N')
                ->where(function ($q) {
                    $q->where('role_type', 'admin_sekolah')->orWhere('role_type', 'admin');
                })
                ->groupBy('idkategori')
                ->selectRaw('idkategori, count(*) as count')
                ->pluck('count', 'idkategori');

            $guruCounts = UserBo::whereIn('idkategori', $idkategoriList)
                ->where('status_remove', 'N')
                ->where('role_type', 'guru')
                ->groupBy('idkategori')
                ->selectRaw('idkategori, count(*) as count')
                ->pluck('count', 'idkategori');

            $kelasCounts = MasterKelas::whereIn('idkategori', $idkategoriList)
                ->groupBy('idkategori')
                ->selectRaw('idkategori, count(*) as count')
                ->pluck('count', 'idkategori');

            $siswaCounts = UserSiswa::whereIn('idkategori', $idkategoriList)
                ->groupBy('idkategori')
                ->selectRaw('idkategori, count(*) as count')
                ->pluck('count', 'idkategori');

            $result = $items->map(function ($item) use ($adminCounts, $guruCounts, $kelasCounts, $siswaCounts) {
                return [
                    'idkategori' => $item->idkategori,
                    'nama_kategori' => $item->nama_kategori,
                    'tgl_input' => $item->tgl_input,
                    'admin_count' => (int) ($adminCounts->get($item->idkategori) ?? 0),
                    'guru_count' => (int) ($guruCounts->get($item->idkategori) ?? 0),
                    'siswa_count' => (int) ($siswaCounts->get($item->idkategori) ?? 0),
                    'kelas_count' => (int) ($kelasCounts->get($item->idkategori) ?? 0),
                ];
            });

            return response()->json([
                'data' => $result,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $result->count(),
                'total' => $result->count(),
                'from' => $result->count() > 0 ? 1 : null,
                'to' => $result->count() > 0 ? $result->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama_kategori', 'asc')->paginate($perPage);

        $idkategoriList = $paginator->getCollection()->pluck('idkategori')->filter()->toArray();

        $adminCounts = UserBo::whereIn('idkategori', $idkategoriList)
            ->where('status_remove', 'N')
            ->where(function ($q) {
                $q->where('role_type', 'admin_sekolah')->orWhere('role_type', 'admin');
            })
            ->groupBy('idkategori')
            ->selectRaw('idkategori, count(*) as count')
            ->pluck('count', 'idkategori');

        $guruCounts = UserBo::whereIn('idkategori', $idkategoriList)
            ->where('status_remove', 'N')
            ->where('role_type', 'guru')
            ->groupBy('idkategori')
            ->selectRaw('idkategori, count(*) as count')
            ->pluck('count', 'idkategori');

        $kelasCounts = MasterKelas::whereIn('idkategori', $idkategoriList)
            ->groupBy('idkategori')
            ->selectRaw('idkategori, count(*) as count')
            ->pluck('count', 'idkategori');

        $siswaCounts = UserSiswa::whereIn('idkategori', $idkategoriList)
            ->groupBy('idkategori')
            ->selectRaw('idkategori, count(*) as count')
            ->pluck('count', 'idkategori');

        $paginator->through(function ($item) use ($adminCounts, $guruCounts, $kelasCounts, $siswaCounts) {
            return [
                'idkategori' => $item->idkategori,
                'nama_kategori' => $item->nama_kategori,
                'tgl_input' => $item->tgl_input,
                'admin_count' => (int) ($adminCounts->get($item->idkategori) ?? 0),
                'guru_count' => (int) ($guruCounts->get($item->idkategori) ?? 0),
                'siswa_count' => (int) ($siswaCounts->get($item->idkategori) ?? 0),
                'kelas_count' => (int) ($kelasCounts->get($item->idkategori) ?? 0),
            ];
        });

        return response()->json($paginator);
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

        $admin->tokens()->delete();
        $admin->update(['status_remove' => 'Y', 'status_aktif' => 'N', 'active_session_token' => null]);

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

        $guru->tokens()->delete();
        $guru->update(['status_remove' => 'Y', 'status_aktif' => 'N', 'active_session_token' => null]);

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
        $siswa->tokens()->delete();
        $siswa->update(['status_aktif' => 'N', 'active_session_token' => null]);

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

    /**
     * Standard Server-Side Paginated list of users in the school (Admin, Guru, Siswa).
     * Accepts: page, per_page (default 15), role (all|guru|siswa|admin), search, sort_by, sort_order.
     */
    public function schoolUsers(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $idkategori = ($user->role === 'super_admin' && $request->filled('idkategori'))
            ? $request->input('idkategori')
            : $user->idkategori;

        if (!$idkategori) {
            return response()->json(['message' => 'ID Instansi diperlukan.'], 400);
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 15;
        }

        $roleFilter = $request->input('role', 'all');
        $search = trim((string) $request->input('search', ''));
        $sortBy = $request->input('sort_by', 'nama');
        $sortOrder = strtolower($request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';

        // 1. If role is 'guru'
        if ($roleFilter === 'guru') {
            $q = UserBo::with(['mapelAjar.mataPelajaran'])
                ->where('idkategori', $idkategori)
                ->where('status_remove', '!=', 'Y')
                ->where('role_type', 'guru');

            if ($search !== '') {
                $q->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                          ->orWhere('login_username', 'like', "%{$search}%")
                          ->orWhere('login_email', 'like', "%{$search}%")
                          ->orWhere('nuptk', 'like', "%{$search}%")
                          ->orWhere('nip', 'like', "%{$search}%")
                          ->orWhere('telp', 'like', "%{$search}%");
                });
            }

            $paginator = $q->orderBy($sortBy === 'nama' ? 'nama' : 'iduser_bo', $sortOrder)
                           ->paginate($perPage);

            $paginator->through(function ($g) {
                return [
                    'id' => $g->iduser_bo,
                    'user_type' => 'guru',
                    'nama' => $g->nama,
                    'identifier' => $g->nuptk ?: ($g->nip ?: $g->login_username),
                    'username' => $g->login_username,
                    'email' => $g->login_email,
                    'telp' => $g->telp,
                    'alamat' => $g->alamat,
                    'status_aktif' => $g->status_aktif,
                    'role' => 'guru',
                    'mapel' => $g->mapelAjar->map(fn($m) => $m->mataPelajaran?->nama_mapel)->filter()->values(),
                ];
            });

            return response()->json($paginator);
        }

        // 2. If role is 'admin'
        if ($roleFilter === 'admin') {
            $q = UserBo::where('idkategori', $idkategori)
                ->where('status_remove', '!=', 'Y')
                ->where(function ($query) {
                    $query->where('role_type', 'admin_sekolah')
                          ->orWhere('role_type', 'admin');
                });

            if ($search !== '') {
                $q->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                          ->orWhere('login_username', 'like', "%{$search}%")
                          ->orWhere('login_email', 'like', "%{$search}%")
                          ->orWhere('telp', 'like', "%{$search}%");
                });
            }

            $paginator = $q->orderBy($sortBy === 'nama' ? 'nama' : 'iduser_bo', $sortOrder)
                           ->paginate($perPage);

            $paginator->through(function ($a) {
                return [
                    'id' => $a->iduser_bo,
                    'user_type' => 'admin',
                    'nama' => $a->nama,
                    'identifier' => $a->login_username,
                    'username' => $a->login_username,
                    'email' => $a->login_email,
                    'telp' => $a->telp,
                    'alamat' => $a->alamat,
                    'status_aktif' => $a->status_aktif,
                    'role' => 'admin',
                    'mapel' => [],
                ];
            });

            return response()->json($paginator);
        }

        // 3. If role is 'siswa'
        if ($roleFilter === 'siswa') {
            $q = UserSiswa::with(['kelas.jenjang'])
                ->where('idkategori', $idkategori);

            if ($search !== '') {
                $q->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                          ->orWhere('nisn', 'like', "%{$search}%")
                          ->orWhere('login_email', 'like', "%{$search}%")
                          ->orWhere('telp', 'like', "%{$search}%");
                });
            }

            $paginator = $q->orderBy($sortBy === 'nama' ? 'nama' : 'iduser', $sortOrder)
                           ->paginate($perPage);

            $paginator->through(function ($s) {
                return [
                    'id' => $s->iduser,
                    'user_type' => 'siswa',
                    'nama' => $s->nama,
                    'identifier' => $s->nisn ?: $s->iduser,
                    'username' => $s->nisn ?: $s->iduser,
                    'email' => $s->login_email,
                    'telp' => $s->telp,
                    'alamat' => $s->alamat,
                    'status_aktif' => $s->status_aktif,
                    'role' => 'siswa',
                    'class_name' => $s->kelas?->nama_kelas ?? '-',
                    'mapel' => [],
                ];
            });

            return response()->json($paginator);
        }

        // 4. If role is 'all', query across both tables via DB query union
        $boQuery = DB::table('user_bo')
            ->select([
                'iduser_bo as id',
                DB::raw("'user_bo' as source_table"),
                'nama',
                'login_username as username',
                'login_email as email',
                DB::raw("COALESCE(nuptk, nip, login_username) as identifier"),
                'telp',
                'alamat',
                'status_aktif',
                'role_type as role',
                DB::raw("NULL as class_name"),
            ])
            ->where('idkategori', $idkategori)
            ->where('status_remove', '!=', 'Y')
            ->where(function ($q) {
                $q->where('role_type', 'guru')
                  ->orWhere('role_type', 'admin_sekolah')
                  ->orWhere('role_type', 'admin');
            });

        if ($search !== '') {
            $boQuery->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('login_username', 'like', "%{$search}%")
                  ->orWhere('login_email', 'like', "%{$search}%")
                  ->orWhere('nuptk', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%")
                  ->orWhere('telp', 'like', "%{$search}%");
            });
        }

        $siswaQuery = DB::table('user')
            ->leftJoin('master_kelas', 'user.idkelas', '=', 'master_kelas.id')
            ->select([
                'user.iduser as id',
                DB::raw("'user' as source_table"),
                'user.nama',
                'user.nisn as username',
                'user.login_email as email',
                DB::raw("COALESCE(user.nisn, user.iduser) as identifier"),
                'user.telp',
                'user.alamat',
                'user.status_aktif',
                DB::raw("'siswa' as role"),
                'master_kelas.nama_kelas as class_name',
            ])
            ->where('user.idkategori', $idkategori);

        if ($search !== '') {
            $siswaQuery->where(function ($q) use ($search) {
                $q->where('user.nama', 'like', "%{$search}%")
                  ->orWhere('user.nisn', 'like', "%{$search}%")
                  ->orWhere('user.login_email', 'like', "%{$search}%")
                  ->orWhere('user.telp', 'like', "%{$search}%");
            });
        }

        $union = $boQuery->unionAll($siswaQuery);

        $paginator = DB::query()->fromSub($union, 'u')
            ->orderBy($sortBy === 'nama' ? 'nama' : 'id', $sortOrder)
            ->paginate($perPage);

        $paginator->through(function ($item) {
            return [
                'id' => $item->id,
                'user_type' => $item->role === 'guru' ? 'guru' : ($item->role === 'siswa' ? 'siswa' : 'admin'),
                'nama' => $item->nama,
                'identifier' => $item->identifier,
                'username' => $item->username,
                'email' => $item->email,
                'telp' => $item->telp,
                'alamat' => $item->alamat,
                'status_aktif' => $item->status_aktif,
                'role' => $item->role,
                'class_name' => $item->class_name ?? '-',
                'mapel' => [],
            ];
        });

        return response()->json($paginator);
    }
}
