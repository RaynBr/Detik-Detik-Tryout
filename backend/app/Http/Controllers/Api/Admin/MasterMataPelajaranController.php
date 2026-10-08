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
        $query = MasterMataPelajaran::with(['jenjang', 'guruPengampu.guru', 'guruPengampu.kelas']);

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('kelompok')) {
            $query->where('kelompok', $request->kelompok);
        }

        $mapels = $query->orderBy('nama_mapel', 'asc')->get();

        // Compatibility mapping for existing frontend (name & code)
        $mapped = $mapels->map(function ($m) {
            $m->name = $m->nama_mapel;
            $m->code = $m->kode_mapel;
            return $m;
        });

        return response()->json($mapped);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_mapel' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100', // alias
            'kode_mapel' => 'nullable|string|max:30|unique:master_mata_pelajaran,kode_mapel',
            'code' => 'nullable|string|max:30|unique:master_mata_pelajaran,kode_mapel', // alias
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'kelompok' => 'nullable|string|max:50',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'deskripsi' => 'nullable|string',
        ]);

        $nama = $validated['nama_mapel'] ?? $validated['name'] ?? 'Mata Pelajaran Baru';
        $kode = $validated['kode_mapel'] ?? $validated['code'] ?? ('MPL-' . strtoupper(substr(uniqid(), -5)));
        $idjenjang = $validated['idjenjang'] ?? 1;

        $mapel = MasterMataPelajaran::create([
            'nama_mapel' => trim($nama),
            'kode_mapel' => strtoupper(trim($kode)),
            'idjenjang' => $idjenjang,
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

    public function show(MasterMataPelajaran $masterMataPelajaran)
    {
        $masterMataPelajaran->load(['jenjang', 'guruPengampu.guru', 'guruPengampu.kelas']);
        $masterMataPelajaran->name = $masterMataPelajaran->nama_mapel;
        $masterMataPelajaran->code = $masterMataPelajaran->kode_mapel;

        return response()->json($masterMataPelajaran);
    }

    public function update(Request $request, MasterMataPelajaran $masterMataPelajaran)
    {
        $validated = $request->validate([
            'nama_mapel' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100',
            'kode_mapel' => 'nullable|string|max:30|unique:master_mata_pelajaran,kode_mapel,' . $masterMataPelajaran->id,
            'code' => 'nullable|string|max:30|unique:master_mata_pelajaran,kode_mapel,' . $masterMataPelajaran->id,
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'kelompok' => 'nullable|string|max:50',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'deskripsi' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $masterMataPelajaran->update([
            'nama_mapel' => $validated['nama_mapel'] ?? $validated['name'] ?? $masterMataPelajaran->nama_mapel,
            'kode_mapel' => strtoupper(trim($validated['kode_mapel'] ?? $validated['code'] ?? $masterMataPelajaran->kode_mapel)),
            'idjenjang' => $validated['idjenjang'] ?? $masterMataPelajaran->idjenjang,
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

    public function destroy(MasterMataPelajaran $masterMataPelajaran)
    {
        $masterMataPelajaran->delete();

        return response()->json([
            'message' => 'Mata Pelajaran berhasil dihapus.'
        ]);
    }

    /**
     * Assign teacher to this subject
     */
    public function assignTeacher(Request $request, MasterMataPelajaran $masterMataPelajaran)
    {
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
    public function removeTeacher(MasterMataPelajaran $masterMataPelajaran, $iduser_bo)
    {
        GuruMataPelajaran::where('idmapel', $masterMataPelajaran->id)
            ->where('iduser_bo', $iduser_bo)
            ->delete();

        return response()->json([
            'message' => 'Penugasan guru pengampu berhasil dihapus.'
        ]);
    }
}
