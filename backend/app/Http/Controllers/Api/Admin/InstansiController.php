<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\KategoriUserBo;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Models\MasterKelas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
     * List all institutions with aggregated counts
     */
    public function index(Request $request)
    {
        $query = KategoriUserBo::where('status_remove', 'N');

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
     * Create a new institution
     */
    public function store(Request $request)
    {
        $request->validate([
            'nama_kategori' => 'required|string|max:255',
        ]);

        $idkategori = (string) (time() . rand(1000000, 9999999));

        $item = KategoriUserBo::create([
            'idkategori' => $idkategori,
            'nama_kategori' => $request->nama_kategori,
            'tgl_input' => now(),
            'status_remove' => 'N',
        ]);

        return response()->json([
            'message' => 'Instansi berhasil ditambahkan',
            'data' => $item
        ], 201);
    }

    /**
     * Show detail of an institution and all its members
     */
    public function show($idkategori)
    {
        $instansi = KategoriUserBo::where('idkategori', $idkategori)
            ->where('status_remove', 'N')
            ->firstOrFail();

        $admins = UserBo::where('idkategori', $idkategori)
            ->where('status_remove', 'N')
            ->where(function ($q) {
                $q->where('role_type', 'admin_sekolah')->orWhere('role_type', 'admin');
            })
            ->get(['iduser_bo', 'nama', 'login_username', 'login_email', 'telp', 'alamat', 'status_aktif', 'role_type']);

        $gurus = UserBo::where('idkategori', $idkategori)
            ->where('status_remove', 'N')
            ->where('role_type', 'guru')
            ->with(['mapelAjar.mataPelajaran'])
            ->get(['iduser_bo', 'nama', 'login_username', 'login_email', 'telp', 'alamat', 'status_aktif', 'role_type']);

        $siswas = UserSiswa::where('idkategori', $idkategori)
            ->with(['kelas.jenjang'])
            ->get(['iduser', 'nama', 'nisn', 'login_email', 'idkelas', 'telp', 'status_aktif']);

        $kelas = MasterKelas::where('idkategori', $idkategori)
            ->with(['jenjang', 'waliKelas'])
            ->withCount('siswa')
            ->get();

        return response()->json([
            'instansi' => $instansi,
            'admins' => $admins,
            'gurus' => $gurus,
            'siswas' => $siswas,
            'kelas' => $kelas,
        ]);
    }

    /**
     * Update an institution
     */
    public function update(Request $request, $idkategori)
    {
        $request->validate([
            'nama_kategori' => 'required|string|max:255',
        ]);

        $instansi = KategoriUserBo::where('idkategori', $idkategori)->firstOrFail();
        $instansi->update([
            'nama_kategori' => $request->nama_kategori
        ]);

        return response()->json([
            'message' => 'Data instansi berhasil diperbarui',
            'data' => $instansi
        ]);
    }

    /**
     * Delete an institution (soft delete)
     */
    public function destroy($idkategori)
    {
        $instansi = KategoriUserBo::where('idkategori', $idkategori)->firstOrFail();
        $instansi->update(['status_remove' => 'Y']);

        return response()->json([
            'message' => 'Instansi berhasil dinonaktifkan'
        ]);
    }

    // ==========================================
    // CRUD ADMIN INSTANSI / SEKOLAH
    // ==========================================

    public function storeAdmin(Request $request, $idkategori)
    {
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

        return response()->json([
            'message' => 'Admin instansi berhasil dibuat',
            'data' => $admin
        ], 201);
    }

    public function updateAdmin(Request $request, $idkategori, $iduser_bo)
    {
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

        return response()->json([
            'message' => 'Admin instansi berhasil diperbarui',
            'data' => $admin
        ]);
    }

    public function destroyAdmin($idkategori, $iduser_bo)
    {
        $admin = UserBo::where('iduser_bo', $iduser_bo)
            ->where('idkategori', $idkategori)
            ->firstOrFail();

        $admin->update(['status_remove' => 'Y']);

        return response()->json([
            'message' => 'Admin instansi berhasil dihapus'
        ]);
    }

    // ==========================================
    // CRUD GURU
    // ==========================================

    public function storeGuru(Request $request, $idkategori)
    {
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

        return response()->json([
            'message' => 'Guru berhasil ditambahkan',
            'data' => $guru
        ], 201);
    }

    public function updateGuru(Request $request, $idkategori, $iduser_bo)
    {
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

        return response()->json([
            'message' => 'Data guru berhasil diperbarui',
            'data' => $guru
        ]);
    }

    public function destroyGuru($idkategori, $iduser_bo)
    {
        $guru = UserBo::where('iduser_bo', $iduser_bo)
            ->where('idkategori', $idkategori)
            ->firstOrFail();

        $guru->update(['status_remove' => 'Y']);

        return response()->json([
            'message' => 'Guru berhasil dihapus'
        ]);
    }

    // ==========================================
    // CRUD SISWA
    // ==========================================

    public function storeSiswa(Request $request, $idkategori)
    {
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

        return response()->json([
            'message' => 'Siswa berhasil ditambahkan',
            'data' => $siswa
        ], 201);
    }

    public function updateSiswa(Request $request, $idkategori, $iduser)
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'nisn' => 'required|string|max:30',
            'login_email' => 'required|email|max:100',
            'password' => 'nullable|string|min:4',
            'idkelas' => 'nullable|integer',
            'telp' => 'nullable|string|max:25',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $siswa = UserSiswa::where('iduser', $iduser)->firstOrFail();

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

        return response()->json([
            'message' => 'Data siswa berhasil diperbarui',
            'data' => $siswa
        ]);
    }

    public function destroySiswa($idkategori, $iduser)
    {
        $siswa = UserSiswa::where('iduser', $iduser)->firstOrFail();
        $siswa->update(['status_aktif' => 'N']);

        return response()->json([
            'message' => 'Siswa berhasil dinonaktifkan'
        ]);
    }
}
