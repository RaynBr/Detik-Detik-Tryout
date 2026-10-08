<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterKelas;
use App\Models\SiswaKelas;
use App\Models\UserSiswa;
use Illuminate\Http\Request;

class MasterKelasController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterKelas::with(['jenjang', 'waliKelas', 'kategori'])
            ->withCount('siswa');

        if ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        } elseif ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('tingkat')) {
            $query->where('tingkat', $request->tingkat);
        }

        $classes = $query->orderBy('nama_kelas', 'asc')
            ->get();

        // Also add aliases for frontend compatibility
        $mapped = $classes->map(function ($c) {
            $c->name = $c->nama_kelas;
            $c->level = $c->tingkat;
            $c->institution = $c->kategori?->nama_kategori ?? 'Semua';
            $c->major = [
                'id' => $c->idjenjang,
                'name' => $c->jenjang?->nama_jenjang ?? $c->jurusan,
                'code' => $c->jenjang?->kode_jenjang ?? $c->jurusan
            ];
            return $c;
        });

        return response()->json($mapped);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_kelas' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100', // fallback alias
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'major_id' => 'nullable', // fallback alias
            'idkategori' => 'nullable|string|max:25',
            'tingkat' => 'nullable|integer',
            'level' => 'nullable|integer', // fallback alias
            'jurusan' => 'nullable|string|max:100',
            'wali_kelas_id' => 'nullable|exists:user_bo,iduser_bo',
            'kapasitas' => 'nullable|integer',
            'keterangan' => 'nullable|string',
        ]);

        $namaKelas = $validated['nama_kelas'] ?? $validated['name'] ?? 'Kelas Baru';
        $tingkat = $validated['tingkat'] ?? $validated['level'] ?? 10;
        $idjenjang = $validated['idjenjang'] ?? $validated['major_id'] ?? 1;

        $user = $request->user();
        $idkategori = $validated['idkategori'] ?? ($user && !empty($user->idkategori) ? $user->idkategori : '27830150842287772');

        $kelas = MasterKelas::create([
            'nama_kelas' => trim($namaKelas),
            'idjenjang' => $idjenjang,
            'idkategori' => $idkategori,
            'tingkat' => $tingkat,
            'jurusan' => $validated['jurusan'] ?? 'Umum',
            'wali_kelas_id' => $validated['wali_kelas_id'] ?? null,
            'kapasitas' => $validated['kapasitas'] ?? 36,
            'keterangan' => $validated['keterangan'] ?? null,
            'status_aktif' => 'Y',
        ]);

        $kelas->load(['jenjang', 'waliKelas']);
        $kelas->loadCount('siswa');
        $kelas->name = $kelas->nama_kelas;
        $kelas->level = $kelas->tingkat;
        $kelas->major = [
            'id' => $kelas->idjenjang,
            'name' => $kelas->jenjang?->nama_jenjang ?? $kelas->jurusan,
            'code' => $kelas->jenjang?->kode_jenjang ?? $kelas->jurusan
        ];

        return response()->json([
            'message' => 'Kelas berhasil ditambahkan.',
            'data' => $kelas
        ], 201);
    }

    public function show(MasterKelas $masterKela)
    {
        $masterKela->load([
            'jenjang',
            'waliKelas',
            'siswa.siswa',
            'guruMataPelajaran.mataPelajaran',
            'guruMataPelajaran.guru'
        ]);
        $masterKela->loadCount('siswa');

        $masterKela->name = $masterKela->nama_kelas;
        $masterKela->level = $masterKela->tingkat;
        $masterKela->major = [
            'id' => $masterKela->idjenjang,
            'name' => $masterKela->jenjang?->nama_jenjang ?? $masterKela->jurusan,
            'code' => $masterKela->jenjang?->kode_jenjang ?? $masterKela->jurusan
        ];

        return response()->json($masterKela);
    }

    public function update(Request $request, MasterKelas $masterKela)
    {
        $validated = $request->validate([
            'nama_kelas' => 'nullable|string|max:50',
            'name' => 'nullable|string|max:50',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'major_id' => 'nullable',
            'tingkat' => 'nullable|integer',
            'level' => 'nullable|integer',
            'jurusan' => 'nullable|string|max:100',
            'wali_kelas_id' => 'nullable|exists:user_bo,iduser_bo',
            'kapasitas' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $masterKela->update([
            'nama_kelas' => $validated['nama_kelas'] ?? $validated['name'] ?? $masterKela->nama_kelas,
            'idjenjang' => $validated['idjenjang'] ?? $validated['major_id'] ?? $masterKela->idjenjang,
            'tingkat' => $validated['tingkat'] ?? $validated['level'] ?? $masterKela->tingkat,
            'jurusan' => $validated['jurusan'] ?? $masterKela->jurusan,
            'wali_kelas_id' => array_key_exists('wali_kelas_id', $validated) ? $validated['wali_kelas_id'] : $masterKela->wali_kelas_id,
            'kapasitas' => $validated['kapasitas'] ?? $masterKela->kapasitas,
            'keterangan' => $validated['keterangan'] ?? $masterKela->keterangan,
            'status_aktif' => $validated['status_aktif'] ?? $masterKela->status_aktif,
        ]);

        $masterKela->load(['jenjang', 'waliKelas']);
        $masterKela->loadCount('siswa');
        $masterKela->name = $masterKela->nama_kelas;
        $masterKela->level = $masterKela->tingkat;
        $masterKela->major = [
            'id' => $masterKela->idjenjang,
            'name' => $masterKela->jenjang?->nama_jenjang ?? $masterKela->jurusan,
            'code' => $masterKela->jenjang?->kode_jenjang ?? $masterKela->jurusan
        ];

        return response()->json([
            'message' => 'Kelas berhasil diperbarui.',
            'data' => $masterKela
        ]);
    }

    public function destroy(MasterKelas $masterKela)
    {
        $masterKela->delete();

        return response()->json([
            'message' => 'Kelas berhasil dihapus.'
        ]);
    }

    /**
     * Assign student to this class
     */
    public function addStudent(Request $request, MasterKelas $masterKela)
    {
        $request->validate([
            'iduser' => 'required|exists:user,iduser',
            'nisn' => 'nullable|string|max:30',
        ]);

        SiswaKelas::updateOrInsert(
            ['iduser' => $request->iduser],
            [
                'idkelas' => $masterKela->id,
                'nisn' => $request->nisn,
                'tahun_ajaran' => '2026/2027',
                'status' => 'aktif',
                'updated_at' => now(),
            ]
        );

        UserSiswa::where('iduser', $request->iduser)->update([
            'idkelas' => $masterKela->id,
            'nisn' => $request->nisn,
        ]);

        return response()->json([
            'message' => 'Siswa berhasil dimasukkan ke kelas.'
        ]);
    }

    /**
     * Remove student from this class
     */
    public function removeStudent(MasterKelas $masterKela, $iduser)
    {
        SiswaKelas::where('iduser', $iduser)->where('idkelas', $masterKela->id)->delete();
        UserSiswa::where('iduser', $iduser)->where('idkelas', $masterKela->id)->update([
            'idkelas' => null
        ]);

        return response()->json([
            'message' => 'Siswa berhasil dikeluarkan dari kelas.'
        ]);
    }
}
