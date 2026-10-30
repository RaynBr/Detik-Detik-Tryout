<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterTahunSoal;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class MasterTahunSoalController extends Controller
{
    public function index(Request $request)
    {
        $query = MasterTahunSoal::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tahun', 'like', "%{$search}%")
                  ->orWhere('keterangan', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $tahun = $query->orderBy('tahun', 'desc')->get();
            return response()->json([
                'data' => $tahun,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $tahun->count(),
                'total' => $tahun->count(),
                'from' => $tahun->count() > 0 ? 1 : null,
                'to' => $tahun->count() > 0 ? $tahun->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $tahun = $query->orderBy('tahun', 'desc')->paginate($perPage);

        return response()->json($tahun);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tahun' => 'required|string|max:20|unique:master_tahun_soal,tahun',
            'keterangan' => 'nullable|string|max:255',
        ]);

        $tahun = MasterTahunSoal::create([
            'tahun' => $request->tahun,
            'keterangan' => $request->keterangan,
            'is_active' => true,
        ]);

        AuditLog::record(
            'CREATE_TAHUN_SOAL',
            'master_tahun_soal',
            (string)$tahun->id,
            $request->tahun
        );

        return response()->json([
            'message' => 'Tahun Soal berhasil ditambahkan.',
            'data' => $tahun,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $tahun = MasterTahunSoal::findOrFail($id);

        $request->validate([
            'tahun' => 'required|string|max:20|unique:master_tahun_soal,tahun,' . $id,
            'keterangan' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $tahun->update($request->only(['tahun', 'keterangan', 'is_active']));

        AuditLog::record(
            'EDIT_TAHUN_SOAL',
            'master_tahun_soal',
            (string)$tahun->id,
            $tahun->tahun
        );

        return response()->json([
            'message' => 'Tahun Soal berhasil diperbarui.',
            'data' => $tahun,
        ]);
    }

    public function destroy($id)
    {
        $tahun = MasterTahunSoal::findOrFail($id);
        $label = $tahun->tahun;
        $tahun->delete();

        AuditLog::record(
            'DELETE_TAHUN_SOAL',
            'master_tahun_soal',
            (string)$id,
            $label
        );

        return response()->json(['message' => 'Tahun Soal berhasil dihapus.']);
    }
}
