<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterTingkatKelas;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class MasterTingkatKelasController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterTingkatKelas::with('jenjang');

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nama_tingkat', 'like', "%{$s}%")
                  ->orWhere('tingkat', 'like', "%{$s}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status_aktif', $request->status);
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('tingkat', 'asc')->get();
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
        $paginator = $query->orderBy('tingkat', 'asc')->paginate($perPage);

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data tingkat kelas.'], 403);
        }

        $validated = $request->validate([
            'tingkat' => 'required|integer|min:1|max:20',
            'nama_tingkat' => 'required|string|max:50',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        // Validate duplicate tingkat + nama_tingkat for this instansi
        if (MasterTingkatKelas::where('idkategori', $user->idkategori)
            ->where('tingkat', $validated['tingkat'])
            ->where('nama_tingkat', $validated['nama_tingkat'])
            ->exists()) {
            return response()->json(['message' => 'Tingkat kelas dengan nama dan tingkatan ini sudah ada di instansi Anda.'], 422);
        }

        $item = MasterTingkatKelas::create([
            'idkategori' => $user->idkategori,
            'tingkat' => $validated['tingkat'],
            'nama_tingkat' => trim($validated['nama_tingkat']),
            'idjenjang' => $validated['idjenjang'] ?? null,
            'keterangan' => $validated['keterangan'] ?? null,
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
        ]);

        $item->load('jenjang');

        AuditLog::record(
            'Tambah Data',
            'master_tingkat_kelas',
            (string) $item->id,
            "Menambahkan tingkat kelas: {$item->nama_tingkat}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Tingkat kelas berhasil ditambahkan.',
            'data' => $item
        ], 201);
    }

    public function show($id)
    {
        $masterTingkatKela = $id instanceof MasterTingkatKelas ? $id : MasterTingkatKelas::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterTingkatKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki akses ke tingkat kelas instansi lain.'], 403);
        }

        $masterTingkatKela->load('jenjang');
        return response()->json($masterTingkatKela);
    }

    public function update(Request $request, $id)
    {
        $masterTingkatKela = $id instanceof MasterTingkatKelas ? $id : MasterTingkatKelas::findOrFail($id);
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data tingkat kelas.'], 403);
        }
        if ((string)$masterTingkatKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah tingkat kelas instansi lain.'], 403);
        }

        $validated = $request->validate([
            'tingkat' => 'required|integer|min:1|max:20',
            'nama_tingkat' => 'required|string|max:50',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        // Duplicate check excluding self within this instansi
        $duplicate = MasterTingkatKelas::where('idkategori', $masterTingkatKela->idkategori)
            ->where('tingkat', $validated['tingkat'])
            ->where('nama_tingkat', $validated['nama_tingkat'])
            ->where('id', '!=', $masterTingkatKela->id)
            ->exists();

        if ($duplicate) {
            return response()->json(['message' => 'Tingkat kelas dengan nama dan tingkatan ini sudah ada di instansi Anda.'], 422);
        }

        $masterTingkatKela->update([
            'tingkat' => $validated['tingkat'],
            'nama_tingkat' => trim($validated['nama_tingkat']),
            'idjenjang' => $validated['idjenjang'] ?? $masterTingkatKela->idjenjang,
            'keterangan' => $validated['keterangan'] ?? $masterTingkatKela->keterangan,
            'status_aktif' => $validated['status_aktif'] ?? $masterTingkatKela->status_aktif,
        ]);

        $masterTingkatKela->load('jenjang');

        AuditLog::record(
            'Edit Data',
            'master_tingkat_kelas',
            (string) $masterTingkatKela->id,
            "Memperbarui tingkat kelas: {$masterTingkatKela->nama_tingkat}",
            $validated,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Tingkat kelas berhasil diperbarui.',
            'data' => $masterTingkatKela
        ]);
    }

    public function destroy($id)
    {
        $masterTingkatKela = $id instanceof MasterTingkatKelas ? $id : MasterTingkatKelas::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menghapus data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data tingkat kelas.'], 403);
        }
        if ((string)$masterTingkatKela->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus tingkat kelas instansi lain.'], 403);
        }

        $name = $masterTingkatKela->nama_tingkat;
        $strId = (string) $masterTingkatKela->id;
        $masterTingkatKela->delete();

        AuditLog::record(
            'Hapus Data',
            'master_tingkat_kelas',
            $strId,
            "Menghapus tingkat kelas: {$name}",
            null,
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => "Tingkat kelas {$name} berhasil dihapus."
        ]);
    }
}
