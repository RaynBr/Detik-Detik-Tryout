<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruMataPelajaran;
use App\Models\MasterMataPelajaran;
use Illuminate\Http\Request;

class MasterMataPelajaranController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterMataPelajaran::with(['jenjang', 'guruPengampu.guru', 'guruPengampu.kelas']);

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('kelompok')) {
            $query->where('kelompok', $request->kelompok);
        }

        if ($request->filled('tahun_ajaran')) {
            $query->where('tahun_ajaran', $request->tahun_ajaran);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_mapel', 'like', "%{$search}%")
                  ->orWhere('kode_mapel', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $mapels = $query->orderBy('nama_mapel', 'asc')->get();
            $mapped = $mapels->map(function ($m) {
                $m->name = $m->nama_mapel;
                $m->code = $m->kode_mapel;
                return $m;
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
        $paginator = $query->orderBy('nama_mapel', 'asc')->paginate($perPage);

        $paginator->through(function ($m) {
            $m->name = $m->nama_mapel;
            $m->code = $m->kode_mapel;
            return $m;
        });

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }

        $validated = $request->validate([
            'nama_mapel' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100', // alias
            'kode_mapel' => 'nullable|string|max:30',
            'code' => 'nullable|string|max:30', // alias
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'tahun_ajaran' => 'nullable|string|max:20',
            'kelompok' => 'nullable|string|max:50',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'deskripsi' => 'nullable|string',
        ]);

        $nama = $validated['nama_mapel'] ?? $validated['name'] ?? 'Mata Pelajaran Baru';
        $kode = strtoupper(trim($validated['kode_mapel'] ?? $validated['code'] ?? ('MPL-' . substr(uniqid(), -5))));

        if (MasterMataPelajaran::where('idkategori', $user->idkategori)->where('kode_mapel', $kode)->exists()) {
            return response()->json(['message' => 'Kode mata pelajaran sudah digunakan di instansi Anda.'], 422);
        }

        $idjenjang = $validated['idjenjang'] ?? 1;
        $tahunAjaran = $validated['tahun_ajaran'] ?? (\App\Models\AcademicYear::where('is_active', true)->where('idkategori', $user->idkategori)->value('name') ?: '2026/2027');

        $mapel = MasterMataPelajaran::create([
            'idkategori' => $user->idkategori,
            'nama_mapel' => trim($nama),
            'kode_mapel' => $kode,
            'idjenjang' => $idjenjang,
            'tahun_ajaran' => $tahunAjaran,
            'kelompok' => $validated['kelompok'] ?? 'Wajib',
            'kkm' => $validated['kkm'] ?? 75.00,
            'deskripsi' => $validated['deskripsi'] ?? null,
            'status_aktif' => 'Y',
        ]);

        $mapel->load(['jenjang', 'guruPengampu.guru']);
        $mapel->name = $mapel->nama_mapel;
        $mapel->code = $mapel->kode_mapel;

        return response()->json([
            'message' => 'Mata Pelajaran berhasil dibuat.',
            'data' => $mapel
        ], 201);
    }

    public function show($id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki akses ke mata pelajaran instansi lain.'], 403);
        }

        $masterMataPelajaran->load(['jenjang', 'guruPengampu.guru', 'guruPengampu.kelas']);
        $masterMataPelajaran->name = $masterMataPelajaran->nama_mapel;
        $masterMataPelajaran->code = $masterMataPelajaran->kode_mapel;

        return response()->json($masterMataPelajaran);
    }

    public function update(Request $request, $id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah mata pelajaran instansi lain.'], 403);
        }

        $validated = $request->validate([
            'nama_mapel' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100',
            'kode_mapel' => 'nullable|string|max:30',
            'code' => 'nullable|string|max:30',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'tahun_ajaran' => 'nullable|string|max:20',
            'kelompok' => 'nullable|string|max:50',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'deskripsi' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $kodeBaru = strtoupper(trim($validated['kode_mapel'] ?? $validated['code'] ?? $masterMataPelajaran->kode_mapel));
        if (MasterMataPelajaran::where('idkategori', $masterMataPelajaran->idkategori)
            ->where('kode_mapel', $kodeBaru)
            ->where('id', '!=', $masterMataPelajaran->id)
            ->exists()) {
            return response()->json(['message' => 'Kode mata pelajaran sudah digunakan di instansi Anda.'], 422);
        }

        $masterMataPelajaran->update([
            'nama_mapel' => $validated['nama_mapel'] ?? $validated['name'] ?? $masterMataPelajaran->nama_mapel,
            'kode_mapel' => $kodeBaru,
            'idjenjang' => $validated['idjenjang'] ?? $masterMataPelajaran->idjenjang,
            'tahun_ajaran' => $validated['tahun_ajaran'] ?? $masterMataPelajaran->tahun_ajaran,
            'kelompok' => $validated['kelompok'] ?? $masterMataPelajaran->kelompok,
            'kkm' => $validated['kkm'] ?? $masterMataPelajaran->kkm,
            'deskripsi' => $validated['deskripsi'] ?? $masterMataPelajaran->deskripsi,
            'status_aktif' => $validated['status_aktif'] ?? $masterMataPelajaran->status_aktif,
        ]);

        $masterMataPelajaran->load(['jenjang', 'guruPengampu.guru']);
        $masterMataPelajaran->name = $masterMataPelajaran->nama_mapel;
        $masterMataPelajaran->code = $masterMataPelajaran->kode_mapel;

        return response()->json([
            'message' => 'Mata Pelajaran berhasil diperbarui.',
            'data' => $masterMataPelajaran
        ]);
    }

    public function destroy($id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menghapus data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus mata pelajaran instansi lain.'], 403);
        }

        $masterMataPelajaran->delete();

        return response()->json([
            'message' => 'Mata Pelajaran berhasil dihapus.'
        ]);
    }

    /**
     * Assign teacher to this subject
     */
    public function assignTeacher(Request $request, $id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah mata pelajaran instansi lain.'], 403);
        }

        $request->validate([
            'iduser_bo' => 'required|exists:user_bo,iduser_bo',
            'idkelas' => 'nullable|exists:master_kelas,id',
            'tahun_ajaran' => 'nullable|string|max:20',
        ]);

        GuruMataPelajaran::updateOrInsert(
            [
                'iduser_bo' => $request->iduser_bo,
                'idmapel' => $masterMataPelajaran->id,
                'idkelas' => $request->idkelas,
            ],
            [
                'tahun_ajaran' => $request->tahun_ajaran ?? '2026/2027',
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Guru pengampu berhasil ditugaskan.'
        ]);
    }

    /**
     * Remove teacher assignment
     */
    public function removeTeacher($id, $iduser_bo)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah mata pelajaran instansi lain.'], 403);
        }

        GuruMataPelajaran::where('idmapel', $masterMataPelajaran->id)
            ->where('iduser_bo', $iduser_bo)
            ->delete();

        return response()->json([
            'message' => 'Penugasan guru pengampu berhasil dihapus.'
        ]);
    }
}
