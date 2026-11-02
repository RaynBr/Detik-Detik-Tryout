<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Major;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class MajorController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Major::query();

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'LIKE', "%{$s}%")
                  ->orWhere('code', 'LIKE', "%{$s}%");
            });
        }

        if ($request->filled('jenjang')) {
            $query->where('jenjang', $request->jenjang);
        }

        if ($request->filled('status')) {
            $query->where('is_active', in_array(strtolower($request->status), ['aktif', '1', 'true', 'y']));
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('name', 'asc')->get();
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
        $paginator = $query->orderBy('name', 'asc')->paginate($perPage);

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
                'message' => 'Akses ditolak: Hanya Admin Instansi yang berhak membuat data jurusan sekolah.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'jenjang' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $idkategori = $user->idkategori;
        $code = strtoupper(trim($validated['code']));

        if (Major::where('idkategori', $idkategori)->where('code', $code)->exists()) {
            return response()->json(['message' => 'Kode jurusan tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $major = Major::create([
            'idkategori' => $idkategori,
            'name' => trim($validated['name']),
            'code' => $code,
            'jenjang' => $validated['jenjang'] ?? 'SMA',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        AuditLog::record(
            'Tambah Data',
            'majors',
            (string) $major->id,
            "Menambahkan jurusan: {$major->name}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Jurusan berhasil dibuat.',
            'data' => $major
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $major = $id instanceof Major ? $id : Major::findOrFail($id);

        if ($user && $user->role === 'admin' && $major->idkategori && $major->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        return response()->json($major);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Akses ditolak: Super Administrator tidak diizinkan mengubah data Master Akademik. Fitur ini dikelola penuh oleh Admin Instansi.'
            ], 403);
        }

        $major = $id instanceof Major ? $id : Major::findOrFail($id);

        if ($user && $user->role === 'admin' && $major->idkategori && $major->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'jenjang' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $idkategori = $major->idkategori ?: ($user?->idkategori ?? null);
        $code = strtoupper(trim($validated['code']));

        if ($idkategori && Major::where('idkategori', $idkategori)->where('code', $code)->where('id', '!=', $major->id)->exists()) {
            return response()->json(['message' => 'Kode jurusan tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $major->update([
            'name' => trim($validated['name']),
            'code' => $code,
            'jenjang' => $validated['jenjang'] ?? $major->jenjang,
            'is_active' => $validated['is_active'] ?? $major->is_active,
        ]);

        AuditLog::record(
            'Edit Data',
            'majors',
            (string) $major->id,
            "Memperbarui jurusan: {$major->name}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Jurusan berhasil diperbarui.',
            'data' => $major
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

        $major = $id instanceof Major ? $id : Major::findOrFail($id);

        if ($user && $user->role === 'admin' && $major->idkategori && $major->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $name = $major->name;
        $strId = (string) $major->id;
        $major->delete();

        AuditLog::record(
            'Hapus Data',
            'majors',
            $strId,
            "Menghapus jurusan: {$name}",
            null,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Jurusan berhasil dihapus.'
        ]);
    }
}
