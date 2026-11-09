<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterSemester;
use App\Models\AcademicYear;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MasterSemesterController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterSemester::with('academicYear');

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($user && $user->role === 'super_admin') {
            $query->where('idkategori', '27830150842287772');
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nama_semester', 'like', "%{$s}%")
                  ->orWhere('kode_semester', 'like', "%{$s}%")
                  ->orWhereHas('academicYear', function ($ay) use ($s) {
                      $ay->where('name', 'like', "%{$s}%");
                  });
            });
        }

        if ($request->filled('status')) {
            $query->where('status_aktif', $request->status);
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('academic_year_id', 'desc')->orderBy('urutan', 'asc')->get();
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
        $paginator = $query->orderBy('academic_year_id', 'desc')->orderBy('urutan', 'asc')->paginate($perPage);

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $globalIdkategori = '27830150842287772';

        if (!$isSuperAdmin && (!$user || $user->role !== 'admin' || empty($user->idkategori))) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi atau Super Admin yang berhak membuat data semester sekolah.'
            ], 403);
        }

        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'kode_semester' => 'required|in:ganjil,genap',
            'nama_semester' => 'nullable|string|max:50',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $isSuperAdmin ? $globalIdkategori : $user->idkategori;
        $kodeSemester = strtolower(trim($validated['kode_semester']));
        $namaSemester = !empty($validated['nama_semester'])
            ? trim($validated['nama_semester'])
            : ($kodeSemester === 'ganjil' ? 'Semester Ganjil' : 'Semester Genap');

        // Rule: Satu Tahun Ajaran hanya memiliki Ganjil & Genap. Tidak boleh duplikat.
        if (MasterSemester::where('idkategori', $idkategori)
            ->where('academic_year_id', $validated['academic_year_id'])
            ->where('kode_semester', $kodeSemester)
            ->exists()) {
            return response()->json([
                'message' => 'Semester ' . ucfirst($kodeSemester) . ' untuk tahun ajaran ini sudah terdaftar. Satu tahun ajaran hanya dapat memiliki semester Ganjil dan Genap.'
            ], 422);
        }

        $statusAktif = $validated['status_aktif'] ?? 'N';

        $item = DB::transaction(function () use ($idkategori, $validated, $kodeSemester, $namaSemester, $statusAktif) {
            if ($statusAktif === 'Y') {
                // Ensure only one semester is active in the instansi
                MasterSemester::where('idkategori', $idkategori)->update(['status_aktif' => 'N']);
            }

            $created = MasterSemester::create([
                'idkategori' => $idkategori,
                'academic_year_id' => $validated['academic_year_id'],
                'nama_semester' => $namaSemester,
                'kode_semester' => $kodeSemester,
                'urutan' => $validated['urutan'] ?? ($kodeSemester === 'ganjil' ? 1 : 2),
                'keterangan' => $validated['keterangan'] ?? null,
                'status_aktif' => $statusAktif,
            ]);

            AuditLog::record(
                'CREATE_SEMESTER',
                'master_semester',
                (string) $created->id,
                "Menambahkan semester {$created->nama_semester} pada tahun ajaran ID {$created->academic_year_id}",
                $validated
            );

            return $created;
        });

        return response()->json([
            'message' => 'Semester berhasil ditambahkan.',
            'data' => $item->load('academicYear')
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $masterSemester = $id instanceof MasterSemester ? $id : MasterSemester::with('academicYear')->findOrFail($id);

        if ($user && $user->role === 'admin' && $masterSemester->idkategori && $masterSemester->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        return response()->json($masterSemester);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $globalIdkategori = '27830150842287772';

        $masterSemester = $id instanceof MasterSemester ? $id : MasterSemester::findOrFail($id);

        if (!$isSuperAdmin && $user && $user->role === 'admin' && $masterSemester->idkategori && $masterSemester->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        if ($isSuperAdmin && $masterSemester->idkategori && $masterSemester->idkategori !== $globalIdkategori) {
            return response()->json(['message' => 'Akses ditolak: Super Admin hanya dapat mengubah master semester global.'], 403);
        }

        $validated = $request->validate([
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'kode_semester' => 'nullable|in:ganjil,genap',
            'nama_semester' => 'nullable|string|max:50',
            'urutan' => 'nullable|integer',
            'keterangan' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $idkategori = $masterSemester->idkategori ?: ($user?->idkategori ?? null);
        $academicYearId = $validated['academic_year_id'] ?? $masterSemester->academic_year_id;
        $kodeSemester = isset($validated['kode_semester']) ? strtolower(trim($validated['kode_semester'])) : $masterSemester->kode_semester;

        // Rule: Satu Tahun Ajaran hanya memiliki Ganjil & Genap. Tidak boleh duplikat.
        if (MasterSemester::where('idkategori', $idkategori)
            ->where('academic_year_id', $academicYearId)
            ->where('kode_semester', $kodeSemester)
            ->where('id', '!=', $masterSemester->id)
            ->exists()) {
            return response()->json([
                'message' => 'Semester ' . ucfirst($kodeSemester) . ' untuk tahun ajaran ini sudah terdaftar. Satu tahun ajaran hanya dapat memiliki semester Ganjil dan Genap.'
            ], 422);
        }

        $namaSemester = !empty($validated['nama_semester'])
            ? trim($validated['nama_semester'])
            : ($kodeSemester === 'ganjil' ? 'Semester Ganjil' : 'Semester Genap');

        DB::transaction(function () use ($masterSemester, $idkategori, $validated, $academicYearId, $kodeSemester, $namaSemester) {
            if (($validated['status_aktif'] ?? '') === 'Y') {
                MasterSemester::where('idkategori', $idkategori)->where('id', '!=', $masterSemester->id)->update(['status_aktif' => 'N']);
            }

            $masterSemester->update([
                'academic_year_id' => $academicYearId,
                'nama_semester' => $namaSemester,
                'kode_semester' => $kodeSemester,
                'urutan' => $validated['urutan'] ?? $masterSemester->urutan,
                'keterangan' => $validated['keterangan'] ?? $masterSemester->keterangan,
                'status_aktif' => $validated['status_aktif'] ?? $masterSemester->status_aktif,
            ]);

            AuditLog::record(
                'EDIT_SEMESTER',
                'master_semester',
                (string) $masterSemester->id,
                "Memperbarui semester: {$masterSemester->nama_semester}",
                $validated
            );
        });

        return response()->json([
            'message' => 'Semester berhasil diperbarui.',
            'data' => $masterSemester->load('academicYear')
        ]);
    }

    public function activate(Request $request, $id)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $globalIdkategori = '27830150842287772';

        $masterSemester = $id instanceof MasterSemester ? $id : MasterSemester::with('academicYear')->findOrFail($id);

        if (!$isSuperAdmin && $user && $user->role === 'admin' && $masterSemester->idkategori && $masterSemester->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        if ($isSuperAdmin && $masterSemester->idkategori && $masterSemester->idkategori !== $globalIdkategori) {
            return response()->json(['message' => 'Akses ditolak: Super Admin hanya dapat mengaktifkan master semester global.'], 403);
        }

        $idkategori = $masterSemester->idkategori ?: ($isSuperAdmin ? $globalIdkategori : ($user?->idkategori ?? null));

        DB::transaction(function () use ($masterSemester, $idkategori) {
            // Set all other semesters in this instansi to non-active
            MasterSemester::where('idkategori', $idkategori)->update(['status_aktif' => 'N']);
            $masterSemester->update(['status_aktif' => 'Y']);

            // Sync academic year: ensure this semester's academic year is also the active one
            if ($masterSemester->academic_year_id) {
                AcademicYear::where('idkategori', $idkategori)->update(['is_active' => false]);
                AcademicYear::where('id', $masterSemester->academic_year_id)->update(['is_active' => true]);
            }

            AuditLog::record(
                'ACTIVATE_SEMESTER',
                'master_semester',
                (string) $masterSemester->id,
                "Mengaktifkan semester: {$masterSemester->nama_semester} (Tahun Ajaran: {$masterSemester->academicYear?->name})",
                ['semester_id' => $masterSemester->id]
            );
        });

        return response()->json([
            'message' => "Semester {$masterSemester->nama_semester} berhasil diaktifkan.",
            'data' => $masterSemester->fresh('academicYear')
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $globalIdkategori = '27830150842287772';

        $masterSemester = $id instanceof MasterSemester ? $id : MasterSemester::findOrFail($id);

        if (!$isSuperAdmin && $user && $user->role === 'admin' && $masterSemester->idkategori && $masterSemester->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        if ($isSuperAdmin && $masterSemester->idkategori && $masterSemester->idkategori !== $globalIdkategori) {
            return response()->json(['message' => 'Akses ditolak: Super Admin hanya dapat menghapus master semester global.'], 403);
        }

        if ($masterSemester->status_aktif === 'Y') {
            return response()->json([
                'message' => 'Tidak dapat menghapus semester yang sedang aktif.'
            ], 422);
        }

        $name = $masterSemester->nama_semester;
        $strId = (string) $masterSemester->id;
        $masterSemester->delete();

        AuditLog::record(
            'DELETE_SEMESTER',
            'master_semester',
            $strId,
            "Menghapus semester: {$name}",
            ['deleted_id' => $strId]
        );

        return response()->json([
            'message' => "Semester {$name} berhasil dihapus."
        ]);
    }
}
