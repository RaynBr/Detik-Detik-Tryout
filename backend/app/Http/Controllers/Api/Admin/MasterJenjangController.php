<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterJenjang;
use Illuminate\Http\Request;

class MasterJenjangController extends Controller
{
    public function index(Request $request)
    {
        $query = MasterJenjang::withCount(['kelas', 'mataPelajaran']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_jenjang', 'like', "%{$search}%")
                  ->orWhere('kode_jenjang', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $jenjang = $query->orderBy('urutan', 'asc')->get();
            return response()->json([
                'data' => $jenjang,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $jenjang->count(),
                'total' => $jenjang->count(),
                'from' => $jenjang->count() > 0 ? 1 : null,
                'to' => $jenjang->count() > 0 ? $jenjang->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $jenjang = $query->orderBy('urutan', 'asc')->paginate($perPage);

        return response()->json($jenjang);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'kode_jenjang' => 'required|string|max:20|unique:master_jenjang,kode_jenjang',
            'nama_jenjang' => 'required|string|max:100',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $jenjang = MasterJenjang::create([
            'kode_jenjang' => strtoupper(trim($validated['kode_jenjang'])),
            'nama_jenjang' => trim($validated['nama_jenjang']),
            'urutan' => $validated['urutan'] ?? 1,
            'keterangan' => $validated['keterangan'] ?? null,
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
        ]);

        $jenjang->loadCount(['kelas', 'mataPelajaran']);

        return response()->json([
            'message' => 'Master Jenjang berhasil ditambahkan.',
            'data' => $jenjang
        ], 201);
    }

    public function show(MasterJenjang $masterJenjang)
    {
        $masterJenjang->load(['kelas.waliKelas', 'mataPelajaran']);
        $masterJenjang->loadCount(['kelas', 'mataPelajaran']);

        return response()->json($masterJenjang);
    }

    public function update(Request $request, MasterJenjang $masterJenjang)
    {
        $validated = $request->validate([
            'kode_jenjang' => 'required|string|max:20|unique:master_jenjang,kode_jenjang,' . $masterJenjang->id,
            'nama_jenjang' => 'required|string|max:100',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $masterJenjang->update([
            'kode_jenjang' => strtoupper(trim($validated['kode_jenjang'])),
            'nama_jenjang' => trim($validated['nama_jenjang']),
            'urutan' => $validated['urutan'] ?? $masterJenjang->urutan,
            'keterangan' => $validated['keterangan'] ?? $masterJenjang->keterangan,
            'status_aktif' => $validated['status_aktif'] ?? $masterJenjang->status_aktif,
        ]);

        $masterJenjang->loadCount(['kelas', 'mataPelajaran']);

        return response()->json([
            'message' => 'Master Jenjang berhasil diperbarui.',
            'data' => $masterJenjang
        ]);
    }

    public function destroy(MasterJenjang $masterJenjang)
    {
        if ($masterJenjang->kelas()->count() > 0) {
            return response()->json([
                'message' => 'Tidak dapat menghapus Jenjang yang masih memiliki Kelas terhubung.'
            ], 422);
        }

        $masterJenjang->delete();

        return response()->json([
            'message' => 'Master Jenjang berhasil dihapus.'
        ]);
    }
}
