<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterSemester;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class MasterSemesterController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterSemester::query();

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nama_semester', 'like', "%{$s}%")
                  ->orWhere('kode_semester', 'like', "%{$s}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status_aktif', $request->status);
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('urutan', 'asc')->get();
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
        $paginator = $query->orderBy('urutan', 'asc')->paginate($perPage);

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
                'message' => 'Akses ditolak: Hanya Admin Instansi yang berhak membuat data semester sekolah.'
            ], 403);
        }

        $validated = $request->validate([
            'nama_semester' => 'required|string|max:50',
            'kode_semester' => 'required|string|max:20',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $user->idkategori;
        $kodeSemester = strtolower(trim($validated['kode_semester']));

        if (MasterSemester::where('idkategori', $idkategori)->where('kode_semester', $kodeSemester)->exists()) {
            return response()->json(['message' => 'Kode semester tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $item = MasterSemester::create([
            'idkategori' => $idkategori,
            'nama_semester' => trim($validated['nama_semester']),
            'kode_semester' => $kodeSemester,
            'urutan' => $validated['urutan'] ?? 1,
            'keterangan' => $validated['keterangan'] ?? null,
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
        ]);

        AuditLog::record(
            'Tambah Data',
            'master_semester',
            (string) $item->id,
            "Menambahkan semester: {$item->nama_semester}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Semester berhasil ditambahkan.',
            'data' => $item
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $masterSemester = $id instanceof MasterSemester ? $id : MasterSemester::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterSemester->idkategori && $masterSemester->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        return response()->json($masterSemester);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Super Administrator tidak diizinkan mengubah data Master Akademik. Fitur ini dikelola penuh oleh Admin Instansi.'
            ], 403);
        }

        $masterSemester = $id instanceof MasterSemester ? $id : MasterSemester::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterSemester->idkategori && $masterSemester->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $validated = $request->validate([
            'nama_semester' => 'required|string|max:50',
            'kode_semester' => 'required|string|max:20',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $masterSemester->idkategori ?: ($user?->idkategori ?? null);
        $kodeSemester = strtolower(trim($validated['kode_semester']));

        if ($idkategori && MasterSemester::where('idkategori', $idkategori)->where('kode_semester', $kodeSemester)->where('id', '!=', $masterSemester->id)->exists()) {
            return response()->json(['message' => 'Kode semester tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $masterSemester->update([
            'nama_semester' => trim($validated['nama_semester']),
            'kode_semester' => $kodeSemester,
            'urutan' => $validated['urutan'] ?? $masterSemester->urutan,
            'keterangan' => $validated['keterangan'] ?? $masterSemester->keterangan,
            'status_aktif' => $validated['status_aktif'] ?? $masterSemester->status_aktif,
        ]);

        AuditLog::record(
            'Edit Data',
            'master_semester',
            (string) $masterSemester->id,
            "Memperbarui semester: {$masterSemester->nama_semester}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Semester berhasil diperbarui.',
            'data' => $masterSemester
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

        $masterSemester = $id instanceof MasterSemester ? $id : MasterSemester::findOrFail($id);

        if ($user && $user->role === 'admin' && $masterSemester->idkategori && $masterSemester->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }
        $name = $masterSemester->nama_semester;
        $strId = (string) $masterSemester->id;
        $masterSemester->delete();

        AuditLog::record(
            'Hapus Data',
            'master_semester',
            $strId,
            "Menghapus semester: {$name}",
            null,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => "Semester {$name} berhasil dihapus."
        ]);
    }
}
