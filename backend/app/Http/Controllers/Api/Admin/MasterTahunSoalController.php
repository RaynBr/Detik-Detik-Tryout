<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterTahunSoal;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class MasterTahunSoalController extends Controller
{
    public function index()
    {
        $tahun = MasterTahunSoal::orderBy('tahun', 'desc')->get();
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
