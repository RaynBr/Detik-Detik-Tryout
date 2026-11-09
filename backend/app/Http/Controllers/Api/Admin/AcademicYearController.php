<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\MasterSemester;
use App\Models\MasterMataPelajaran;
use App\Models\MasterKelas;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicYearController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = AcademicYear::query();

        // Multi-tenant scope
        $globalIdkategori = '27830150842287772';
        if ($user && $user->role === 'super_admin') {
            $query->where('idkategori', $globalIdkategori);
            $idkategori = $globalIdkategori;
        } elseif ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
            $idkategori = $user->idkategori;
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
            $idkategori = $request->idkategori;
        } else {
            $idkategori = null;
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $attachCounts = function ($items) use ($idkategori) {
            foreach ($items as $item) {
                // Mapel count in this academic year
                $item->subjects_count = MasterMataPelajaran::where('tahun_ajaran', $item->name)
                    ->when($idkategori, fn($q) => $q->where('idkategori', $idkategori))
                    ->count();

                // Students count in this academic year
                $stQuery = DB::table('siswa_kelas')->where('siswa_kelas.tahun_ajaran', $item->name);
                if ($idkategori) {
                    $stQuery->join('user', 'siswa_kelas.iduser', '=', 'user.iduser')
                            ->where('user.idkategori', $idkategori);
                }
                $item->students_count = $stQuery->count();
            }
            return $items;
        };

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $years = $query->orderBy('id', 'desc')->get();
            $attachCounts($years);
            return response()->json([
                'data' => $years,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $years->count(),
                'total' => $years->count(),
                'from' => $years->count() > 0 ? 1 : null,
                'to' => $years->count() > 0 ? $years->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $academicYears = $query->orderBy('id', 'desc')->paginate($perPage);
        $attachCounts($academicYears->getCollection());

        return response()->json($academicYears);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $globalIdkategori = '27830150842287772';

        // Super Admin mengelola Master Global dengan idkategori global
        if (!$isSuperAdmin && (!$user || $user->role !== 'admin' || empty($user->idkategori))) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi atau Super Admin yang berhak membuat data tahun ajaran.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'semester' => 'nullable|in:odd,even',
            'is_active' => 'boolean',
        ]);

        $idkategori = $isSuperAdmin ? $globalIdkategori : $user->idkategori;
        $validated['idkategori'] = $idkategori;
        $validated['semester'] = $validated['semester'] ?? 'odd';

        if (AcademicYear::where('idkategori', $idkategori)->where('name', $validated['name'])->exists()) {
            return response()->json(['message' => 'Tahun ajaran tersebut sudah terdaftar.'], 422);
        }

        $academicYear = DB::transaction(function () use ($validated, $idkategori) {
            $is_active = $validated['is_active'] ?? false;

            if ($is_active) {
                AcademicYear::where('idkategori', $idkategori)->update(['is_active' => false]);
                MasterSemester::where('idkategori', $idkategori)->update(['status_aktif' => 'N']);
            }

            $ay = AcademicYear::create($validated);

            // Automatically create Ganjil & Genap for this academic year
            MasterSemester::create([
                'idkategori' => $idkategori,
                'academic_year_id' => $ay->id,
                'nama_semester' => 'Semester Ganjil',
                'kode_semester' => 'ganjil',
                'urutan' => 1,
                'status_aktif' => $is_active ? 'Y' : 'N',
                'keterangan' => 'Semester Ganjil ' . $ay->name,
            ]);

            MasterSemester::create([
                'idkategori' => $idkategori,
                'academic_year_id' => $ay->id,
                'nama_semester' => 'Semester Genap',
                'kode_semester' => 'genap',
                'urutan' => 2,
                'status_aktif' => 'N',
                'keterangan' => 'Semester Genap ' . $ay->name,
            ]);

            AuditLog::record(
                'CREATE_TAHUN_AJARAN',
                'academic_years',
                (string)$ay->id,
                "Menambahkan Tahun Ajaran: {$ay->name}",
                $validated
            );

            return $ay;
        });

        return response()->json([
            'message' => 'Tahun ajaran berhasil dibuat.',
            'data' => $academicYear
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $academicYear = $id instanceof AcademicYear ? $id : AcademicYear::findOrFail($id);

        if ($user && $user->role === 'admin' && $academicYear->idkategori && $academicYear->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $idkategori = $academicYear->idkategori ?: ($user?->idkategori ?? null);
        $academicYear->subjects_count = MasterMataPelajaran::where('tahun_ajaran', $academicYear->name)
            ->when($idkategori, fn($q) => $q->where('idkategori', $idkategori))
            ->count();
        $academicYear->students_count = DB::table('siswa_kelas')->where('tahun_ajaran', $academicYear->name)->count();
        return response()->json($academicYear);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $academicYear = $id instanceof AcademicYear ? $id : AcademicYear::findOrFail($id);

        if (!$isSuperAdmin && $user && $user->role === 'admin' && $academicYear->idkategori && $academicYear->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'semester' => 'nullable|in:odd,even',
            'is_active' => 'boolean',
        ]);

        $idkategori = $academicYear->idkategori ?: ($user?->idkategori ?? null);

        if (AcademicYear::where('idkategori', $idkategori)->where('name', $validated['name'])->where('id', '!=', $academicYear->id)->exists()) {
            return response()->json(['message' => 'Tahun ajaran tersebut sudah terdaftar di instansi Anda.'], 422);
        }

        $oldName = $academicYear->name;
        $validated['semester'] = $validated['semester'] ?? $academicYear->semester;

        $academicYear = DB::transaction(function () use ($validated, $academicYear, $oldName, $idkategori) {
            $is_active = $validated['is_active'] ?? false;

            if ($is_active && $idkategori) {
                AcademicYear::where('idkategori', $idkategori)->where('id', '!=', $academicYear->id)->update(['is_active' => false]);
                MasterSemester::where('idkategori', $idkategori)->update(['status_aktif' => 'N']);
                MasterSemester::where('idkategori', $idkategori)->where('academic_year_id', $academicYear->id)->where('kode_semester', 'ganjil')->update(['status_aktif' => 'Y']);
            }

            $academicYear->update($validated);

            // If name changed, update relations scoped by idkategori
            if ($oldName !== $validated['name']) {
                MasterMataPelajaran::where('tahun_ajaran', $oldName)->when($idkategori, fn($q) => $q->where('idkategori', $idkategori))->update(['tahun_ajaran' => $validated['name']]);
                DB::table('siswa_kelas')->where('tahun_ajaran', $oldName)->update(['tahun_ajaran' => $validated['name']]);
                DB::table('guru_mata_pelajaran')->where('tahun_ajaran', $oldName)->update(['tahun_ajaran' => $validated['name']]);
            }

            AuditLog::record(
                'EDIT_TAHUN_AJARAN',
                'academic_years',
                (string)$academicYear->id,
                "Memperbarui Tahun Ajaran: {$academicYear->name}",
                $validated
            );

            return $academicYear;
        });

        return response()->json([
            'message' => 'Tahun ajaran berhasil diperbarui.',
            'data' => $academicYear
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $globalIdkategori = '27830150842287772';

        $academicYear = $id instanceof AcademicYear ? $id : AcademicYear::findOrFail($id);

        if (!$isSuperAdmin && $user && $user->role === 'admin' && $academicYear->idkategori && $academicYear->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        // Super Admin hanya bisa hapus data global (idkategori = globalIdkategori)
        if ($isSuperAdmin && $academicYear->idkategori !== $globalIdkategori) {
            return response()->json(['message' => 'Akses ditolak: Super Admin hanya dapat menghapus data master global.'], 403);
        }

        if ($academicYear->is_active) {
            return response()->json([
                'message' => 'Tidak dapat menghapus tahun ajaran yang sedang aktif.'
            ], 422);
        }

        $oldName = $academicYear->name;
        $yearId = $academicYear->id;

        DB::transaction(function () use ($academicYear, $yearId, $oldName) {
            MasterSemester::where('academic_year_id', $yearId)->delete();
            $academicYear->delete();

            AuditLog::record(
                'DELETE_TAHUN_AJARAN',
                'academic_years',
                (string)$yearId,
                "Menghapus Tahun Ajaran: {$oldName}",
                ['deleted_name' => $oldName]
            );
        });

        return response()->json([
            'message' => 'Tahun ajaran berhasil dihapus.'
        ]);
    }

    public function activate(Request $request, $id)
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->role === 'super_admin';
        $globalIdkategori = '27830150842287772';

        $academicYear = $id instanceof AcademicYear ? $id : AcademicYear::findOrFail($id);

        if (!$isSuperAdmin && $user && $user->role === 'admin' && $academicYear->idkategori && $academicYear->idkategori !== $user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Data akademik bukan milik instansi Anda.'], 403);
        }

        $idkategori = $academicYear->idkategori ?: ($isSuperAdmin ? $globalIdkategori : ($user?->idkategori ?? null));

        DB::transaction(function () use ($academicYear, $idkategori) {
            if ($idkategori) {
                AcademicYear::where('idkategori', $idkategori)->update(['is_active' => false]);
                MasterSemester::where('idkategori', $idkategori)->update(['status_aktif' => 'N']);
            } else {
                AcademicYear::query()->update(['is_active' => false]);
                MasterSemester::query()->update(['status_aktif' => 'N']);
            }

            $academicYear->update(['is_active' => true]);

            // Ensure semester Ganjil & Genap exist for this activated year
            $ganjil = MasterSemester::where('academic_year_id', $academicYear->id)->where('kode_semester', 'ganjil')->first();
            if (!$ganjil) {
                $ganjil = MasterSemester::create([
                    'idkategori' => $idkategori,
                    'academic_year_id' => $academicYear->id,
                    'nama_semester' => 'Semester Ganjil',
                    'kode_semester' => 'ganjil',
                    'urutan' => 1,
                    'status_aktif' => 'Y',
                    'keterangan' => 'Semester Ganjil ' . $academicYear->name,
                ]);
                MasterSemester::create([
                    'idkategori' => $idkategori,
                    'academic_year_id' => $academicYear->id,
                    'nama_semester' => 'Semester Genap',
                    'kode_semester' => 'genap',
                    'urutan' => 2,
                    'status_aktif' => 'N',
                    'keterangan' => 'Semester Genap ' . $academicYear->name,
                ]);
            } else {
                $ganjil->update(['status_aktif' => 'Y']);
            }

            AuditLog::record(
                'ACTIVATE_TAHUN_AJARAN',
                'academic_years',
                (string)$academicYear->id,
                "Mengaktifkan Tahun Ajaran: {$academicYear->name} dan menyinkronkan semester aktif",
                ['activated_year' => $academicYear->name]
            );
        });

        return response()->json([
            'message' => "Tahun ajaran {$academicYear->name} berhasil diaktifkan beserta semester aktifnya.",
            'data' => $academicYear
        ]);
    }

    /**
     * Get subjects taught in this academic year
     */
    public function subjects(Request $request, AcademicYear $academicYear)
    {
        $query = MasterMataPelajaran::with(['jenjang', 'guruPengampu.guru', 'guruPengampu.kelas'])
            ->where('tahun_ajaran', $academicYear->name);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_mapel', 'like', "%{$search}%")
                  ->orWhere('kode_mapel', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $data = $query->orderBy('nama_mapel', 'asc')->get();
            return response()->json([
                'data' => $data,
                'total' => $data->count(),
                'academic_year' => $academicYear
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama_mapel', 'asc')->paginate($perPage);

        return response()->json($paginator);
    }

    /**
     * Attach/assign subject to this academic year
     */
    public function attachSubject(Request $request, AcademicYear $academicYear)
    {
        $request->validate([
            'idmapel' => 'nullable|exists:master_mata_pelajaran,id',
            'nama_mapel' => 'nullable|string|max:100',
            'kode_mapel' => 'nullable|string|max:30',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'kelompok' => 'nullable|string|max:50',
            'kkm' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($request->filled('idmapel')) {
            $subject = MasterMataPelajaran::findOrFail($request->idmapel);
            $subject->update(['tahun_ajaran' => $academicYear->name]);
        } else {
            $nama = $request->nama_mapel ?? 'Mata Pelajaran';
            $kode = $request->kode_mapel ?: ('MPL-' . strtoupper(substr(uniqid(), -5)));
            $subject = MasterMataPelajaran::create([
                'nama_mapel' => $nama,
                'kode_mapel' => $kode,
                'idjenjang' => $request->idjenjang ?? 1,
                'tahun_ajaran' => $academicYear->name,
                'kelompok' => $request->kelompok ?? 'Wajib',
                'kkm' => $request->kkm ?? 75.00,
                'status_aktif' => 'Y',
            ]);
        }

        return response()->json([
            'message' => 'Mata pelajaran berhasil ditambahkan ke tahun ajaran ' . $academicYear->name,
            'data' => $subject
        ]);
    }

    /**
     * Detach subject from this academic year
     */
    public function detachSubject(AcademicYear $academicYear, $idmapel)
    {
        $subject = MasterMataPelajaran::where('id', $idmapel)
            ->where('tahun_ajaran', $academicYear->name)
            ->first();

        if ($subject) {
            $subject->update(['tahun_ajaran' => null]);
        }

        return response()->json([
            'message' => 'Mata pelajaran berhasil dilepas dari tahun ajaran ' . $academicYear->name
        ]);
    }

    /**
     * Get students studying in this academic year
     */
    public function students(Request $request, AcademicYear $academicYear)
    {
        $user = $request->user();
        $idkategori = ($user && $user->role !== 'super_admin') ? $user->idkategori : null;

        $query = DB::table('siswa_kelas')
            ->join('user', 'siswa_kelas.iduser', '=', 'user.iduser')
            ->leftJoin('master_kelas', 'siswa_kelas.idkelas', '=', 'master_kelas.id')
            ->where('siswa_kelas.tahun_ajaran', $academicYear->name)
            ->select([
                'siswa_kelas.id as enrollment_id',
                'siswa_kelas.iduser',
                'siswa_kelas.idkelas',
                'siswa_kelas.status as enrollment_status',
                'siswa_kelas.tahun_ajaran',
                'user.nama',
                'user.nisn',
                'user.nis',
                'user.login_email',
                'user.telp',
                'user.jenis_kelamin',
                'user.status_aktif as user_status',
                'master_kelas.nama_kelas',
                'master_kelas.tingkat',
            ]);

        if ($idkategori) {
            $query->where('user.idkategori', $idkategori);
        }

        if ($request->filled('idkelas')) {
            $query->where('siswa_kelas.idkelas', $request->idkelas);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('user.nama', 'like', "%{$search}%")
                  ->orWhere('user.nisn', 'like', "%{$search}%")
                  ->orWhere('user.login_email', 'like', "%{$search}%")
                  ->orWhere('master_kelas.nama_kelas', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('master_kelas.nama_kelas', 'asc')
                           ->orderBy('user.nama', 'asc')
                           ->paginate($perPage);

        return response()->json($paginator);
    }

    /**
     * Enroll students or whole class into this academic year
     */
    public function enrollStudents(Request $request, AcademicYear $academicYear)
    {
        $user = $request->user();
        $idkategori = ($user && $user->role !== 'super_admin') ? $user->idkategori : null;

        $request->validate([
            'idkelas' => 'nullable|exists:master_kelas,id',
            'idusers' => 'nullable|array',
            'idusers.*' => 'exists:user,iduser',
        ]);

        $enrolledCount = 0;

        if ($request->boolean('all_active')) {
            $studentsQuery = DB::table('user')
                ->where('status_aktif', 'Y');
            if ($idkategori) {
                $studentsQuery->where('idkategori', $idkategori);
            }
            $students = $studentsQuery->get();

            foreach ($students as $st) {
                DB::table('siswa_kelas')->updateOrInsert(
                    [
                        'iduser' => $st->iduser,
                        'tahun_ajaran' => $academicYear->name,
                    ],
                    [
                        'idkelas' => $st->idkelas ?: 1,
                        'nisn' => $st->nisn,
                        'status' => 'aktif',
                        'updated_at' => now(),
                    ]
                );
                $enrolledCount++;
            }
        } elseif ($request->filled('idkelas')) {
            $classStudents = DB::table('user')
                ->where('idkelas', $request->idkelas)
                ->when($idkategori, fn($q) => $q->where('idkategori', $idkategori))
                ->get();

            foreach ($classStudents as $st) {
                DB::table('siswa_kelas')->updateOrInsert(
                    [
                        'iduser' => $st->iduser,
                        'tahun_ajaran' => $academicYear->name,
                    ],
                    [
                        'idkelas' => $request->idkelas,
                        'nisn' => $st->nisn,
                        'status' => 'aktif',
                        'updated_at' => now(),
                    ]
                );
                $enrolledCount++;
            }
        } elseif ($request->filled('idusers')) {
            foreach ($request->idusers as $iduser) {
                $st = DB::table('user')->where('iduser', $iduser)->first();
                if ($st) {
                    DB::table('siswa_kelas')->updateOrInsert(
                        [
                            'iduser' => $st->iduser,
                            'tahun_ajaran' => $academicYear->name,
                        ],
                        [
                            'idkelas' => $st->idkelas ?: 1,
                            'nisn' => $st->nisn,
                            'status' => 'aktif',
                            'updated_at' => now(),
                        ]
                    );
                    $enrolledCount++;
                }
            }
        }

        return response()->json([
            'message' => "Berhasil mendaftarkan {$enrolledCount} siswa ke tahun ajaran {$academicYear->name}.",
            'enrolled_count' => $enrolledCount
        ]);
    }

    /**
     * Remove student from this academic year
     */
    public function removeStudent(AcademicYear $academicYear, $iduser)
    {
        DB::table('siswa_kelas')
            ->where('iduser', $iduser)
            ->where('tahun_ajaran', $academicYear->name)
            ->delete();

        return response()->json([
            'message' => "Siswa berhasil dikeluarkan dari tahun ajaran {$academicYear->name}."
        ]);
    }
}
