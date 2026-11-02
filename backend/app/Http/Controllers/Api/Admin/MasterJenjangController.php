<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterJenjang;
use Illuminate\Http\Request;

class MasterJenjangController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterJenjang::query();

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        $query->withCount(['kelas', 'mataPelajaran']);

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
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Super Administrator tidak diizinkan membuat data Master Akademik. Fitur ini dikelola penuh oleh Admin Instansi.'
            ], 403);
        }

        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang berhak membuat data jenjang sekolah.'
            ], 403);
        }

        $validated = $request->validate([
            'kode_jenjang' => 'required|string|max:20',
            'nama_jenjang' => 'required|string|max:100',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $user->idkategori;
        $kodeJenjang = strtoupper(trim($validated['kode_jenjang']));

        if (MasterJenjang::where('idkategori', $idkategori)->where('kode_jenjang', $kodeJenjang)->exists()) {
            return response()->json(['message' => 'Kode jenjang tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $jenjang = MasterJenjang::create([
            'idkategori' => $idkategori,
            'kode_jenjang' => $kodeJenjang,
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

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $masterJenjang = $id instanceof MasterJenjang ? $id : MasterJenjang::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterJenjang->idkategori && $masterJenjang->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $masterJenjang->load(['kelas.waliKelas', 'mataPelajaran']);
        $masterJenjang->loadCount(['kelas', 'mataPelajaran']);

        return response()->json($masterJenjang);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Super Administrator tidak diizinkan mengubah data Master Akademik. Fitur ini dikelola penuh oleh Admin Instansi.'
            ], 403);
        }

        $masterJenjang = $id instanceof MasterJenjang ? $id : MasterJenjang::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterJenjang->idkategori && $masterJenjang->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $validated = $request->validate([
            'kode_jenjang' => 'required|string|max:20',
            'nama_jenjang' => 'required|string|max:100',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $masterJenjang->idkategori ?: ($user?->idkategori ?? null);
        $kodeJenjang = strtoupper(trim($validated['kode_jenjang']));

        if ($idkategori && MasterJenjang::where('idkategori', $idkategori)->where('kode_jenjang', $kodeJenjang)->where('id', '!=', $masterJenjang->id)->exists()) {
            return response()->json(['message' => 'Kode jenjang tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $masterJenjang->update([
            'kode_jenjang' => $kodeJenjang,
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

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Super Administrator tidak diizinkan menghapus data Master Akademik. Fitur ini dikelola penuh oleh Admin Instansi.'
            ], 403);
        }

        $masterJenjang = $id instanceof MasterJenjang ? $id : MasterJenjang::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterJenjang->idkategori && $masterJenjang->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

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
