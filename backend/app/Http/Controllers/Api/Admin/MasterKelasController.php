<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterKelas;
use App\Models\SiswaKelas;
use App\Models\UserSiswa;
use App\Models\GuruMataPelajaran;
use Illuminate\Http\Request;

class MasterKelasController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterKelas::with(['jenjang', 'waliKelas', 'kategori'])
            ->withCount('siswa');

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('tingkat')) {
            $query->where('tingkat', $request->tingkat);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_kelas', 'like', "%{$search}%")
                  ->orWhere('jurusan', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $classes = $query->orderBy('nama_kelas', 'asc')->get();
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

            return response()->json([
                'data' => $mapped,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $mapped->count(),
                'total' => $mapped->count(),
                'from' => $mapped->count() > 0 ? 1 : null,
                'to' => $mapped->count() > 0 ? $mapped->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama_kelas', 'asc')->paginate($perPage);

        $paginator->through(function ($c) {
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

        return response()->json($paginator);
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
        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $idkategori = $user->idkategori;
        } else {
            $idkategori = $validated['idkategori'] ?? ($user && !empty($user->idkategori) ? $user->idkategori : '27830150842287772');
        }

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

    public function show($masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki akses ke kelas instansi lain.'], 403);
        }

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

    public function update(Request $request, $masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah kelas instansi lain.'], 403);
        }

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

    public function destroy($masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus kelas instansi lain.'], 403);
        }

        $masterKela->delete();

        return response()->json([
            'message' => 'Kelas berhasil dihapus.'
        ]);
    }

    /**
     * Assign student to this class
     */
    public function addStudent(Request $request, $masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'], 403);
        }

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
    public function removeStudent($masterKela, $iduser)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'], 403);
        }

        SiswaKelas::where('iduser', $iduser)->where('idkelas', $masterKela->id)->delete();
        UserSiswa::where('iduser', $iduser)->where('idkelas', $masterKela->id)->update([
            'idkelas' => null
        ]);

        return response()->json([
            'message' => 'Siswa berhasil dikeluarkan dari kelas.'
        ]);
    }

    /**
     * Get subject teachers (Guru Pengampu) for this class
     */
    public function getSubjectTeachers($masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'], 403);
        }

        $items = GuruMataPelajaran::where('idkelas', $masterKela->id)
            ->with(['guru', 'mataPelajaran'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'data' => $items
        ]);
    }

    /**
     * Assign or update a subject teacher in this class
     */
    public function assignSubjectTeacher(Request $request, $masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'], 403);
        }

        $validated = $request->validate([
            'idmapel' => 'required|exists:master_mata_pelajaran,id',
            'iduser_bo' => 'required|exists:user_bo,iduser_bo',
            'tahun_ajaran' => 'nullable|string|max:20',
            'status' => 'nullable|string|in:aktif,nonaktif,Aktif,Nonaktif',
        ]);

        $status = strtolower($validated['status'] ?? 'aktif');
        $tahunAjaran = $validated['tahun_ajaran'] ?? '2026/2027';

        $record = GuruMataPelajaran::updateOrCreate(
            [
                'idkelas' => $masterKela->id,
                'idmapel' => $validated['idmapel'],
            ],
            [
                'iduser_bo' => $validated['iduser_bo'],
                'tahun_ajaran' => $tahunAjaran,
                'status' => $status,
            ]
        );

        $record->load(['guru', 'mataPelajaran']);

        return response()->json([
            'message' => 'Guru Pengampu berhasil ditugaskan.',
            'data' => $record
        ]);
    }

    /**
     * Update an existing subject teacher entry
     */
    public function updateSubjectTeacher(Request $request, $masterKela, $guruMapelId)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'], 403);
        }

        $record = GuruMataPelajaran::where('idkelas', $masterKela->id)->findOrFail($guruMapelId);

        $validated = $request->validate([
            'idmapel' => 'nullable|exists:master_mata_pelajaran,id',
            'iduser_bo' => 'nullable|exists:user_bo,iduser_bo',
            'tahun_ajaran' => 'nullable|string|max:20',
            'status' => 'nullable|string|in:aktif,nonaktif,Aktif,Nonaktif',
        ]);

        $updateData = [];
        if (isset($validated['idmapel'])) $updateData['idmapel'] = $validated['idmapel'];
        if (isset($validated['iduser_bo'])) $updateData['iduser_bo'] = $validated['iduser_bo'];
        if (isset($validated['tahun_ajaran'])) $updateData['tahun_ajaran'] = $validated['tahun_ajaran'];
        if (isset($validated['status'])) $updateData['status'] = strtolower($validated['status']);

        $record->update($updateData);
        $record->load(['guru', 'mataPelajaran']);

        return response()->json([
            'message' => 'Guru Pengampu berhasil diperbarui.',
            'data' => $record
        ]);
    }

    /**
     * Remove subject teacher from this class
     */
    public function removeSubjectTeacher($masterKela, $guruMapelId)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'], 403);
        }

        GuruMataPelajaran::where('idkelas', $masterKela->id)->where('id', $guruMapelId)->delete();

        return response()->json([
            'message' => 'Guru Pengampu berhasil dihapus dari kelas.'
        ]);
    }
}
