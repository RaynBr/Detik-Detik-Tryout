<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruMataPelajaran;
use App\Models\MasterMataPelajaran;
use App\Models\MasterKurikulum;
use App\Models\MasterJenjang;
use App\Models\Major;
use App\Models\MasterTingkatKelas;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class MasterMataPelajaranController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterMataPelajaran::with([
            'academicYear',
            'semester',
            'kurikulum',
            'jenjang',
            'jurusan',
            'tingkatKelas',
            'guruPengampu.guru',
            'guruPengampu.kelas'
        ]);

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        if ($request->filled('academic_year_id') || $request->filled('id_tahun_ajaran')) {
            $query->where('academic_year_id', $request->input('academic_year_id') ?: $request->input('id_tahun_ajaran'));
        }

        if ($request->filled('semester_id')) {
            $query->where('semester_id', $request->semester_id);
        }

        if ($request->filled('idkurikulum')) {
            $query->where('idkurikulum', $request->idkurikulum);
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('idjurusan')) {
            $query->where('idjurusan', $request->idjurusan);
        }

        if ($request->filled('idtingkat')) {
            $query->where('idtingkat', $request->idtingkat);
        }

        if ($request->filled('kelompok')) {
            $query->where('kelompok', $request->kelompok);
        }

        if ($request->filled('tahun_ajaran')) {
            $query->where('tahun_ajaran', $request->tahun_ajaran);
        }

        if ($request->filled('status') || $request->filled('status_aktif')) {
            $status = $request->input('status') ?: $request->input('status_aktif');
            $query->where('status_aktif', $status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_mapel', 'like', "%{$search}%")
                  ->orWhere('kode_mapel', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $mapels = $query->orderBy('nama_mapel', 'asc')->get();
            $mapped = $mapels->map(function ($m) {
                $m->name = $m->nama_mapel;
                $m->code = $m->kode_mapel;
                return $m;
            });

            return response()->json([
                'data' => $mapped,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $mapped->count(),
                'total' => $mapped->count(),
                'from' => $mapped->count() > 0 ? 1 : null,
                'to' => $mapped->count() > 0 ? $mapped->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama_mapel', 'asc')->paginate($perPage);

        $paginator->through(function ($m) {
            $m->name = $m->nama_mapel;
            $m->code = $m->kode_mapel;
            return $m;
        });

        return response()->json($paginator);
    }

    /**
     * Provide options (Kurikulum, Jenjang, Jurusan, Tingkat, Tahun Ajaran, Semester) for Mata Pelajaran forms
     */
    public function options(Request $request)
    {
        $user = $request->user();
        $idkategori = ($user && $user->role === 'admin' && !empty($user->idkategori))
            ? $user->idkategori
            : $request->input('idkategori');

        // Master Global query: either instansi's own, or Super Admin global '27830150842287772' or null
        $globalFilter = function ($q) use ($idkategori) {
            if ($idkategori) {
                $q->where(function ($sub) use ($idkategori) {
                    $sub->where('idkategori', $idkategori)
                        ->orWhere('idkategori', '27830150842287772')
                        ->orWhereNull('idkategori');
                });
            }
        };

        $years = \App\Models\AcademicYear::where('is_active', true)->where($globalFilter)->orderBy('name', 'desc')->get(['id', 'name', 'semester', 'is_active']);
        $semesters = \App\Models\MasterSemester::where('status_aktif', 'Y')->where($globalFilter)->orderBy('urutan', 'asc')->get(['id', 'academic_year_id', 'nama_semester', 'kode_semester']);
        $kurikulumQuery = MasterKurikulum::where('status_aktif', 'Y')->where($globalFilter);
        $jenjangQuery = MasterJenjang::where('status_aktif', 'Y')->where($globalFilter);
        $jurusanQuery = Major::where('is_active', true)->where($globalFilter);
        $tingkatQuery = MasterTingkatKelas::where('status_aktif', 'Y')->where($globalFilter);

        return response()->json([
            'academic_years' => $years,
            'tahun_ajaran' => $years,
            'semesters' => $semesters,
            'semester' => $semesters,
            'kurikulum' => $kurikulumQuery->orderBy('nama_kurikulum', 'asc')->get(['id', 'nama_kurikulum', 'kode_kurikulum']),
            'jenjang' => $jenjangQuery->orderBy('urutan', 'asc')->get(['id', 'nama_jenjang', 'kode_jenjang']),
            'jurusan' => $jurusanQuery->orderBy('name', 'asc')->get(['id', 'idjenjang', 'name', 'code', 'jenjang']),
            'tingkat_kelas' => $tingkatQuery->orderBy('tingkat', 'asc')->get(['id', 'idjenjang', 'idjurusan', 'tingkat', 'nama_tingkat']),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }

        $validated = $request->validate([
            'nama_mapel' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100', // alias
            'kode_mapel' => 'nullable|string|max:30',
            'code' => 'nullable|string|max:30', // alias
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'id_tahun_ajaran' => 'nullable|exists:academic_years,id',
            'semester_id' => 'nullable|exists:master_semester,id',
            'idkurikulum' => 'nullable|exists:master_kurikulum,id',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'idjurusan' => 'nullable|exists:majors,id',
            'idtingkat' => 'nullable|exists:master_tingkat_kelas,id',
            'tahun_ajaran' => 'nullable|string|max:20',
            'kelompok' => 'nullable|string|max:50',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'deskripsi' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $nama = trim($validated['nama_mapel'] ?? $validated['name'] ?? 'Mata Pelajaran Baru');
        $kode = strtoupper(trim($validated['kode_mapel'] ?? $validated['code'] ?? ('MPL-' . substr(uniqid(), -5))));

        // Unique check for kode_mapel per instansi
        if (MasterMataPelajaran::where('idkategori', $user->idkategori)->where('kode_mapel', $kode)->exists()) {
            return response()->json(['message' => 'Kode mata pelajaran sudah digunakan di instansi Anda.'], 422);
        }

        $academicYearId = $validated['academic_year_id'] ?? $validated['id_tahun_ajaran'] ?? null;
        $semesterId = $validated['semester_id'] ?? null;
        $idkurikulum = $validated['idkurikulum'] ?? null;
        $idjenjang = $validated['idjenjang'] ?? null;
        $idjurusan = $validated['idjurusan'] ?? null;
        $idtingkat = $validated['idtingkat'] ?? null;

        // Combination unique check: Kurikulum, Jenjang, Jurusan, Tingkat, Nama Mapel
        $comboDuplicate = MasterMataPelajaran::where('idkategori', $user->idkategori)
            ->where('nama_mapel', $nama)
            ->where(function ($q) use ($idkurikulum) {
                if ($idkurikulum) $q->where('idkurikulum', $idkurikulum);
                else $q->whereNull('idkurikulum');
            })
            ->where(function ($q) use ($idjenjang) {
                if ($idjenjang) $q->where('idjenjang', $idjenjang);
                else $q->whereNull('idjenjang');
            })
            ->where(function ($q) use ($idjurusan) {
                if ($idjurusan) $q->where('idjurusan', $idjurusan);
                else $q->whereNull('idjurusan');
            })
            ->where(function ($q) use ($idtingkat) {
                if ($idtingkat) $q->where('idtingkat', $idtingkat);
                else $q->whereNull('idtingkat');
            })
            ->exists();

        if ($comboDuplicate) {
            return response()->json([
                'message' => 'Mata pelajaran dengan nama tersebut sudah terdaftar pada kombinasi Kurikulum, Jenjang, Jurusan, dan Tingkat yang dipilih.'
            ], 422);
        }

        $tahunAjaran = $validated['tahun_ajaran'] ?? null;
        if (!$tahunAjaran && $academicYearId) {
            $tahunAjaran = \App\Models\AcademicYear::find($academicYearId)?->name;
        }
        if (!$tahunAjaran) {
            $tahunAjaran = \App\Models\AcademicYear::where('is_active', true)->where('idkategori', $user->idkategori)->value('name') ?: '2026/2027';
        }

        $mapel = MasterMataPelajaran::create([
            'idkategori' => $user->idkategori,
            'academic_year_id' => $academicYearId,
            'semester_id' => $semesterId,
            'nama_mapel' => $nama,
            'kode_mapel' => $kode,
            'idkurikulum' => $idkurikulum,
            'idjenjang' => $idjenjang,
            'idjurusan' => $idjurusan,
            'idtingkat' => $idtingkat,
            'tahun_ajaran' => $tahunAjaran,
            'kelompok' => $validated['kelompok'] ?? 'Wajib',
            'kkm' => $validated['kkm'] ?? 75.00,
            'deskripsi' => $validated['deskripsi'] ?? null,
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
        ]);

        $mapel->load(['academicYear', 'semester', 'kurikulum', 'jenjang', 'jurusan', 'tingkatKelas', 'guruPengampu.guru']);
        $mapel->name = $mapel->nama_mapel;
        $mapel->code = $mapel->kode_mapel;

        AuditLog::record(
            'CREATE_MATA_PELAJARAN',
            'master_mata_pelajaran',
            (string) $mapel->id,
            "Menambahkan mata pelajaran: {$mapel->nama_mapel}",
            [
                'action' => 'create',
                'after' => $mapel->toArray(),
            ],
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Mata Pelajaran berhasil dibuat.',
            'data' => $mapel
        ], 201);
    }

    public function show($id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki akses ke mata pelajaran instansi lain.'], 403);
        }

        $masterMataPelajaran->load(['academicYear', 'semester', 'kurikulum', 'jenjang', 'jurusan', 'tingkatKelas', 'guruPengampu.guru', 'guruPengampu.kelas']);
        $masterMataPelajaran->name = $masterMataPelajaran->nama_mapel;
        $masterMataPelajaran->code = $masterMataPelajaran->kode_mapel;

        return response()->json($masterMataPelajaran);
    }

    public function update(Request $request, $id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah mata pelajaran instansi lain.'], 403);
        }

        $validated = $request->validate([
            'nama_mapel' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100',
            'kode_mapel' => 'nullable|string|max:30',
            'code' => 'nullable|string|max:30',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'id_tahun_ajaran' => 'nullable|exists:academic_years,id',
            'semester_id' => 'nullable|exists:master_semester,id',
            'idkurikulum' => 'nullable|exists:master_kurikulum,id',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'idjurusan' => 'nullable|exists:majors,id',
            'idtingkat' => 'nullable|exists:master_tingkat_kelas,id',
            'tahun_ajaran' => 'nullable|string|max:20',
            'kelompok' => 'nullable|string|max:50',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'deskripsi' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $namaBaru = trim($validated['nama_mapel'] ?? $validated['name'] ?? $masterMataPelajaran->nama_mapel);
        $kodeBaru = strtoupper(trim($validated['kode_mapel'] ?? $validated['code'] ?? $masterMataPelajaran->kode_mapel));

        if (MasterMataPelajaran::where('idkategori', $masterMataPelajaran->idkategori)
            ->where('kode_mapel', $kodeBaru)
            ->where('id', '!=', $masterMataPelajaran->id)
            ->exists()) {
            return response()->json(['message' => 'Kode mata pelajaran sudah digunakan di instansi Anda.'], 422);
        }

        $academicYearId = array_key_exists('academic_year_id', $validated)
            ? $validated['academic_year_id']
            : (array_key_exists('id_tahun_ajaran', $validated) ? $validated['id_tahun_ajaran'] : $masterMataPelajaran->academic_year_id);
        $semesterId = array_key_exists('semester_id', $validated) ? $validated['semester_id'] : $masterMataPelajaran->semester_id;
        $idkurikulum = array_key_exists('idkurikulum', $validated) ? $validated['idkurikulum'] : $masterMataPelajaran->idkurikulum;
        $idjenjang = array_key_exists('idjenjang', $validated) ? $validated['idjenjang'] : $masterMataPelajaran->idjenjang;
        $idjurusan = array_key_exists('idjurusan', $validated) ? $validated['idjurusan'] : $masterMataPelajaran->idjurusan;
        $idtingkat = array_key_exists('idtingkat', $validated) ? $validated['idtingkat'] : $masterMataPelajaran->idtingkat;

        // Combination unique check excluding self
        $comboDuplicate = MasterMataPelajaran::where('idkategori', $masterMataPelajaran->idkategori)
            ->where('nama_mapel', $namaBaru)
            ->where(function ($q) use ($idkurikulum) {
                if ($idkurikulum) $q->where('idkurikulum', $idkurikulum);
                else $q->whereNull('idkurikulum');
            })
            ->where(function ($q) use ($idjenjang) {
                if ($idjenjang) $q->where('idjenjang', $idjenjang);
                else $q->whereNull('idjenjang');
            })
            ->where(function ($q) use ($idjurusan) {
                if ($idjurusan) $q->where('idjurusan', $idjurusan);
                else $q->whereNull('idjurusan');
            })
            ->where(function ($q) use ($idtingkat) {
                if ($idtingkat) $q->where('idtingkat', $idtingkat);
                else $q->whereNull('idtingkat');
            })
            ->where('id', '!=', $masterMataPelajaran->id)
            ->exists();

        if ($comboDuplicate) {
            return response()->json([
                'message' => 'Mata pelajaran dengan nama tersebut sudah terdaftar pada kombinasi Kurikulum, Jenjang, Jurusan, dan Tingkat yang dipilih.'
            ], 422);
        }

        $before = $masterMataPelajaran->toArray();

        $tahunAjaranBaru = $validated['tahun_ajaran'] ?? $masterMataPelajaran->tahun_ajaran;
        if ($academicYearId && (!$tahunAjaranBaru || $academicYearId != $masterMataPelajaran->academic_year_id)) {
            $ayName = \App\Models\AcademicYear::find($academicYearId)?->name;
            if ($ayName) $tahunAjaranBaru = $ayName;
        }

        $masterMataPelajaran->update([
            'nama_mapel' => $namaBaru,
            'kode_mapel' => $kodeBaru,
            'academic_year_id' => $academicYearId,
            'semester_id' => $semesterId,
            'idkurikulum' => $idkurikulum,
            'idjenjang' => $idjenjang,
            'idjurusan' => $idjurusan,
            'idtingkat' => $idtingkat,
            'tahun_ajaran' => $tahunAjaranBaru,
            'kelompok' => $validated['kelompok'] ?? $masterMataPelajaran->kelompok,
            'kkm' => $validated['kkm'] ?? $masterMataPelajaran->kkm,
            'deskripsi' => $validated['deskripsi'] ?? $masterMataPelajaran->deskripsi,
            'status_aktif' => $validated['status_aktif'] ?? $masterMataPelajaran->status_aktif,
        ]);

        $masterMataPelajaran->load(['academicYear', 'semester', 'kurikulum', 'jenjang', 'jurusan', 'tingkatKelas', 'guruPengampu.guru']);
        $masterMataPelajaran->name = $masterMataPelajaran->nama_mapel;
        $masterMataPelajaran->code = $masterMataPelajaran->kode_mapel;

        $after = $masterMataPelajaran->fresh()->toArray();

        AuditLog::record(
            'EDIT_MATA_PELAJARAN',
            'master_mata_pelajaran',
            (string) $masterMataPelajaran->id,
            "Memperbarui mata pelajaran: {$masterMataPelajaran->nama_mapel}",
            [
                'action' => 'edit',
                'before' => $before,
                'after' => $after,
            ],
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Mata Pelajaran berhasil diperbarui.',
            'data' => $masterMataPelajaran
        ]);
    }

    public function destroy($id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk menghapus data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus mata pelajaran instansi lain.'], 403);
        }

        $name = $masterMataPelajaran->nama_mapel;
        $strId = (string) $masterMataPelajaran->id;
        $before = $masterMataPelajaran->toArray();
        $masterMataPelajaran->delete();

        AuditLog::record(
            'DELETE_MATA_PELAJARAN',
            'master_mata_pelajaran',
            $strId,
            "Menghapus mata pelajaran: {$name}",
            [
                'action' => 'delete',
                'before' => $before,
                'after' => null,
            ],
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Mata Pelajaran berhasil dihapus.'
        ]);
    }

    public function toggleStatus($id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola status mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah mata pelajaran instansi lain.'], 403);
        }

        $newStatus = ($masterMataPelajaran->status_aktif === 'Y') ? 'N' : 'Y';
        $before = $masterMataPelajaran->toArray();
        $masterMataPelajaran->status_aktif = $newStatus;
        $masterMataPelajaran->save();

        $after = $masterMataPelajaran->fresh()->toArray();

        AuditLog::record(
            'TOGGLE_STATUS_MATA_PELAJARAN',
            'master_mata_pelajaran',
            (string) $masterMataPelajaran->id,
            "Mengubah status mata pelajaran {$masterMataPelajaran->nama_mapel} menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Nonaktif'),
            [
                'action' => 'toggle_status',
                'before' => $before,
                'after' => $after,
            ],
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => "Status mata pelajaran berhasil diubah menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Nonaktif') . ".",
            'data' => $masterMataPelajaran
        ]);
    }

    /**
     * Assign teacher to this subject
     */
    public function assignTeacher(Request $request, $id)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah mata pelajaran instansi lain.'], 403);
        }

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

        AuditLog::record(
            'ASSIGN_GURU_MAPEL',
            'master_mata_pelajaran',
            (string) $masterMataPelajaran->id,
            "Menugaskan guru ke mata pelajaran: {$masterMataPelajaran->nama_mapel}",
            [
                'iduser_bo' => $request->iduser_bo,
                'idkelas' => $request->idkelas,
            ],
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Guru pengampu berhasil ditugaskan.'
        ]);
    }

    /**
     * Remove teacher assignment
     */
    public function removeTeacher($id, $iduser_bo)
    {
        $masterMataPelajaran = $id instanceof MasterMataPelajaran ? $id : MasterMataPelajaran::findOrFail($id);
        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json(['message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data mata pelajaran.'], 403);
        }
        if ((string)$masterMataPelajaran->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah mata pelajaran instansi lain.'], 403);
        }

        GuruMataPelajaran::where('idmapel', $masterMataPelajaran->id)
            ->where('iduser_bo', $iduser_bo)
            ->delete();

        AuditLog::record(
            'REMOVE_GURU_MAPEL',
            'master_mata_pelajaran',
            (string) $masterMataPelajaran->id,
            "Menghapus penugasan guru dari mata pelajaran: {$masterMataPelajaran->nama_mapel}",
            [
                'iduser_bo' => $iduser_bo,
            ],
            null,
            null,
            null,
            'Master Akademik'
        );

        return response()->json([
            'message' => 'Penugasan guru pengampu berhasil dihapus.'
        ]);
    }
}
