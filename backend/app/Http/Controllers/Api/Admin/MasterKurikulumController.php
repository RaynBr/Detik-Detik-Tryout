<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterKurikulum;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class MasterKurikulumController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterKurikulum::query();

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nama_kurikulum', 'like', "%{$s}%")
                  ->orWhere('kode_kurikulum', 'like', "%{$s}%")
                  ->orWhere('tahun', 'like', "%{$s}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status_aktif', $request->status);
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('nama_kurikulum', 'asc')->get();
            return response()->json([
                'data' => $items,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $items->count(),
                'total' => $items->count(),
                'from' => $items->count() > 0 ? 1 : null,
                'to' => $items->count() > 0 ? $items->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama_kurikulum', 'asc')->paginate($perPage);

        return response()->json($paginator);
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
                'message' => 'Akses ditolak: Hanya Admin Instansi yang berhak membuat data kurikulum sekolah.'
            ], 403);
        }

        $validated = $request->validate([
            'nama_kurikulum' => 'required|string|max:100',
            'kode_kurikulum' => 'required|string|max:30',
            'tahun' => 'nullable|string|max:10',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $user->idkategori;
        $kodeKurikulum = strtoupper(trim($validated['kode_kurikulum']));

        if (MasterKurikulum::where('idkategori', $idkategori)->where('kode_kurikulum', $kodeKurikulum)->exists()) {
            return response()->json(['message' => 'Kode kurikulum tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $item = MasterKurikulum::create([
            'idkategori' => $idkategori,
            'nama_kurikulum' => trim($validated['nama_kurikulum']),
            'kode_kurikulum' => $kodeKurikulum,
            'tahun' => $validated['tahun'] ?? null,
            'keterangan' => $validated['keterangan'] ?? null,
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
        ]);

        AuditLog::record(
            'Tambah Data',
            'master_kurikulum',
            (string) $item->id,
            "Menambahkan kurikulum: {$item->nama_kurikulum}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Kurikulum berhasil ditambahkan.',
            'data' => $item
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $masterKurikulum = $id instanceof MasterKurikulum ? $id : MasterKurikulum::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterKurikulum->idkategori && $masterKurikulum->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        return response()->json($masterKurikulum);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Super Administrator tidak diizinkan mengubah data Master Akademik. Fitur ini dikelola penuh oleh Admin Instansi.'
            ], 403);
        }

        $masterKurikulum = $id instanceof MasterKurikulum ? $id : MasterKurikulum::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterKurikulum->idkategori && $masterKurikulum->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $validated = $request->validate([
            'nama_kurikulum' => 'required|string|max:100',
            'kode_kurikulum' => 'required|string|max:30',
            'tahun' => 'nullable|string|max:10',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $masterKurikulum->idkategori ?: ($user?->idkategori ?? null);
        $kodeKurikulum = strtoupper(trim($validated['kode_kurikulum']));

        if ($idkategori && MasterKurikulum::where('idkategori', $idkategori)->where('kode_kurikulum', $kodeKurikulum)->where('id', '!=', $masterKurikulum->id)->exists()) {
            return response()->json(['message' => 'Kode kurikulum tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $masterKurikulum->update([
            'nama_kurikulum' => trim($validated['nama_kurikulum']),
            'kode_kurikulum' => $kodeKurikulum,
            'tahun' => $validated['tahun'] ?? $masterKurikulum->tahun,
            'keterangan' => $validated['keterangan'] ?? $masterKurikulum->keterangan,
            'status_aktif' => $validated['status_aktif'] ?? $masterKurikulum->status_aktif,
        ]);

        AuditLog::record(
            'Edit Data',
            'master_kurikulum',
            (string) $masterKurikulum->id,
            "Memperbarui kurikulum: {$masterKurikulum->nama_kurikulum}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Kurikulum berhasil diperbarui.',
            'data' => $masterKurikulum
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

        $masterKurikulum = $id instanceof MasterKurikulum ? $id : MasterKurikulum::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterKurikulum->idkategori && $masterKurikulum->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }
        $name = $masterKurikulum->nama_kurikulum;
        $strId = (string) $masterKurikulum->id;
        $masterKurikulum->delete();

        AuditLog::record(
            'Hapus Data',
            'master_kurikulum',
            $strId,
            "Menghapus kurikulum: {$name}",
            null,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => "Kurikulum {$name} berhasil dihapus."
        ]);
    }
}
