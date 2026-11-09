<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterKelas;
use App\Models\SiswaKelas;
use App\Models\UserSiswa;
use App\Models\GuruMataPelajaran;
use App\Models\AcademicYear;
use App\Models\MasterSemester;
use App\Models\MasterKurikulum;
use App\Models\MasterJenjang;
use App\Models\Major;
use App\Models\MasterTingkatKelas;
use App\Models\MasterMataPelajaran;
use App\Models\UserBo;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MasterKelasController extends Controller
{
    /**
     * Provide comprehensive options for Kelola Kelas & Rombel forms and filters.
     * All references are strictly sourced from Master Akademik.
     */
    public function options(Request $request)
    {
        $user = $request->user();
        $idkategori = ($user && $user->role === 'admin' && !empty($user->idkategori))
            ? $user->idkategori
            : $request->input('idkategori');

        $instansi = $idkategori ? \App\Models\KategoriUserBo::find($idkategori) : null;
        $academicConfig = $instansi?->academic_config;

        // Master Global filter: either school's own, or Super Admin Master Global
        $globalFilter = function ($q) use ($idkategori) {
            if ($idkategori) {
                $q->where(function ($sub) use ($idkategori) {
                    $sub->where('idkategori', $idkategori)
                        ->orWhere('idkategori', '27830150842287772')
                        ->orWhereNull('idkategori');
                });
            }
        };

        // Academic Years (Tahun Ajaran)
        $ayQuery = AcademicYear::query();
        $ayQuery->where($globalFilter);
        if (!empty($academicConfig['academic_year_ids']) && is_array($academicConfig['academic_year_ids'])) {
            $ayQuery->whereIn('id', $academicConfig['academic_year_ids']);
        }
        $academicYears = $ayQuery->orderBy('is_active', 'desc')->orderBy('name', 'desc')->get();

        // Semesters
        $semQuery = MasterSemester::with('academicYear');
        $semQuery->where($globalFilter);
        if (!empty($academicConfig['semester_ids']) && is_array($academicConfig['semester_ids'])) {
            $semQuery->whereIn('id', $academicConfig['semester_ids']);
        }
        $semesters = $semQuery->orderBy('academic_year_id', 'desc')->orderBy('urutan', 'asc')->get();

        // Kurikulum
        $kurQuery = MasterKurikulum::query();
        $kurQuery->where($globalFilter);
        if (!empty($academicConfig['kurikulum_ids']) && is_array($academicConfig['kurikulum_ids'])) {
            $kurQuery->whereIn('id', $academicConfig['kurikulum_ids']);
        }
        $kurikulum = $kurQuery->where('status_aktif', 'Y')->orderBy('nama_kurikulum', 'asc')->get();

        // Jenjang
        $jenjangQuery = MasterJenjang::query();
        $jenjangQuery->where($globalFilter);
        if (!empty($academicConfig['jenjang_ids']) && is_array($academicConfig['jenjang_ids'])) {
            $jenjangQuery->whereIn('id', $academicConfig['jenjang_ids']);
        }
        $jenjang = $jenjangQuery->where('status_aktif', 'Y')->orderBy('urutan', 'asc')->get();

        // Jurusan (Majors)
        $majorsQuery = Major::query();
        $majorsQuery->where($globalFilter);
        $majors = $majorsQuery->where('is_active', true)->orderBy('name', 'asc')->get();

        // Tingkat / Kelas
        $tingkatQuery = MasterTingkatKelas::with('jenjang');
        $tingkatQuery->where($globalFilter);
        if (!empty($academicConfig['tingkat_ids']) && is_array($academicConfig['tingkat_ids'])) {
            $tingkatQuery->whereIn('id', $academicConfig['tingkat_ids']);
        }
        $tingkatKelas = $tingkatQuery->where('status_aktif', 'Y')->orderBy('tingkat', 'asc')->get();

        // Teachers (Wali Kelas & Guru Pengampu candidates)
        $teachersQuery = UserBo::where('status_remove', '!=', 'Y')
            ->where(function ($q) {
                $q->where('role_type', 'guru')
                  ->orWhere('role_type', 'admin_sekolah')
                  ->orWhere('status_admin', '2')
                  ->orWhereNull('role_type');
            });

        if ($idkategori) {
            $classIds = MasterKelas::where('idkategori', $idkategori)->pluck('id');
            $currentRelatedIds = MasterKelas::where('idkategori', $idkategori)
                ->whereNotNull('wali_kelas_id')
                ->pluck('wali_kelas_id')
                ->merge(GuruMataPelajaran::whereIn('idkelas', $classIds)->pluck('iduser_bo'))
                ->filter()
                ->unique()
                ->toArray();

            $teachersQuery->where(function ($q) use ($idkategori, $currentRelatedIds) {
                $q->where('idkategori', $idkategori);
                if (!empty($currentRelatedIds)) {
                    $q->orWhereIn('iduser_bo', $currentRelatedIds);
                }
            });
        }

        $teachers = $teachersQuery->orderBy('nama', 'asc')->get()->map(function ($t) {
            return [
                'id' => (string) $t->iduser_bo,
                'name' => (string) ($t->nama ?: $t->name),
                'email' => (string) ($t->login_email ?: $t->email ?: '-'),
                'nip' => (string) ($t->nip ?? $t->iduser_bo),
            ];
        })->values();

        // Mata Pelajaran (from Master Akademik)
        $subjectsQuery = MasterMataPelajaran::with(['kurikulum', 'jenjang', 'tingkatKelas', 'jurusan']);
        if ($idkategori) {
            $subjectsQuery->where('idkategori', $idkategori);
        }
        $subjects = $subjectsQuery->where('status_aktif', 'Y')->orderBy('nama_mapel', 'asc')->get();

        return response()->json([
            'academic_years' => $academicYears,
            'semesters' => $semesters,
            'kurikulum' => $kurikulum,
            'jenjang' => $jenjang,
            'majors' => $majors,
            'tingkat_kelas' => $tingkatKelas,
            'teachers' => $teachers,
            'subjects' => $subjects,
        ]);
    }

    /**
     * List all classes with eager-loaded academic relations and student counts.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MasterKelas::with([
            'academicYear',
            'semester',
            'kurikulum',
            'jenjang',
            'jurusanRelation',
            'tingkatKelas',
            'waliKelas',
            'kategori'
        ])
        ->withCount(['siswa', 'guruMataPelajaran']);

        // Multi-tenant scope
        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        } elseif ($request->filled('idkategori')) {
            $query->where('idkategori', $request->idkategori);
        }

        // Academic Filters
        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->filled('semester_id')) {
            $query->where('semester_id', $request->semester_id);
        }

        if ($request->filled('kurikulum_id')) {
            $query->where('kurikulum_id', $request->kurikulum_id);
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('idjurusan')) {
            $query->where('idjurusan', $request->idjurusan);
        }

        if ($request->filled('idtingkat')) {
            $query->where('idtingkat', $request->idtingkat);
        } elseif ($request->filled('tingkat')) {
            $query->where('tingkat', $request->tingkat);
        }

        if ($request->filled('status_aktif')) {
            $query->where('status_aktif', $request->status_aktif);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_kelas', 'like', "%{$search}%")
                  ->orWhere('jurusan', 'like', "%{$search}%");
            });
        }

        $mapClassItem = function ($c) {
            $c->name = $c->nama_kelas;
            $c->level = $c->tingkatKelas?->tingkat ?? $c->tingkat;
            $c->institution = $c->kategori?->nama_kategori ?? 'Semua';
            $c->major = [
                'id' => $c->idjurusan ?? $c->idjenjang,
                'name' => $c->jurusanRelation?->name ?? $c->jenjang?->nama_jenjang ?? $c->jurusan,
                'code' => $c->jurusanRelation?->code ?? $c->jenjang?->kode_jenjang ?? $c->jurusan
            ];
            return $c;
        };

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $classes = $query->orderBy('nama_kelas', 'asc')->get();
            $mapped = $classes->map($mapClassItem);

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
        $paginator = $query->orderBy('nama_kelas', 'asc')->paginate($perPage);
        $paginator->getCollection()->transform($mapClassItem);

        return response()->json($paginator);
    }

    /**
     * Create a new Class & Rombel referencing Master Akademik.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }

        $idkategori = $user->idkategori;

        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'semester_id' => 'required|exists:master_semester,id',
            'kurikulum_id' => 'required|exists:master_kurikulum,id',
            'idjenjang' => 'required|exists:master_jenjang,id',
            'idjurusan' => 'nullable|exists:majors,id',
            'idtingkat' => 'required|exists:master_tingkat_kelas,id',
            'nama_kelas' => 'required|string|max:100',
            'wali_kelas_id' => 'nullable|exists:user_bo,iduser_bo',
            'kapasitas' => 'nullable|integer|min:1|max:100',
            'keterangan' => 'nullable|string|max:255',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $namaKelas = trim($validated['nama_kelas']);

        // Check duplicate: Dalam 1 instansi, 1 tahun ajaran, 1 semester tidak boleh ada nama rombel yang sama
        $duplicateExists = MasterKelas::where('idkategori', $idkategori)
            ->where('academic_year_id', $validated['academic_year_id'])
            ->where('semester_id', $validated['semester_id'])
            ->where('nama_kelas', $namaKelas)
            ->exists();

        if ($duplicateExists) {
            return response()->json([
                'message' => "Kelas/Rombel '{$namaKelas}' sudah terdaftar pada Tahun Ajaran dan Semester yang dipilih."
            ], 422);
        }

        // Verify semester belongs to the chosen academic year
        $semesterCheck = MasterSemester::where('id', $validated['semester_id'])
            ->where('academic_year_id', $validated['academic_year_id'])
            ->first();

        if (!$semesterCheck) {
            return response()->json([
                'message' => 'Semester yang dipilih tidak sesuai dengan Tahun Ajaran yang dipilih.'
            ], 422);
        }

        // Resolve legacy synchronized values
        $tingkatModel = MasterTingkatKelas::find($validated['idtingkat']);
        $tingkatInt = $tingkatModel ? $tingkatModel->tingkat : 10;

        $jurusanStr = 'Umum';
        if (!empty($validated['idjurusan'])) {
            $majorModel = Major::find($validated['idjurusan']);
            if ($majorModel) {
                $jurusanStr = $majorModel->name;
            }
        }

        $kelas = MasterKelas::create([
            'idkategori' => $idkategori,
            'academic_year_id' => $validated['academic_year_id'],
            'semester_id' => $validated['semester_id'],
            'kurikulum_id' => $validated['kurikulum_id'],
            'idjenjang' => $validated['idjenjang'],
            'idjurusan' => $validated['idjurusan'] ?? null,
            'idtingkat' => $validated['idtingkat'],
            'nama_kelas' => $namaKelas,
            'tingkat' => $tingkatInt,
            'jurusan' => $jurusanStr,
            'wali_kelas_id' => $validated['wali_kelas_id'] ?? null,
            'kapasitas' => $validated['kapasitas'] ?? 36,
            'keterangan' => $validated['keterangan'] ?? null,
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
        ]);

        $kelas->load([
            'academicYear',
            'semester',
            'kurikulum',
            'jenjang',
            'jurusanRelation',
            'tingkatKelas',
            'waliKelas'
        ]);
        $kelas->loadCount('siswa');

        // Audit Log
        AuditLog::record(
            'CREATE_KELAS',
            'master_kelas',
            (string)$kelas->id,
            "Menambahkan Kelas/Rombel: {$kelas->nama_kelas}",
            [
                'nama_kelas' => $kelas->nama_kelas,
                'academic_year' => $kelas->academicYear?->name,
                'semester' => $kelas->semester?->nama_semester,
                'kurikulum' => $kelas->kurikulum?->nama_kurikulum,
                'jenjang' => $kelas->jenjang?->nama_jenjang,
                'tingkat' => $kelas->tingkatKelas?->nama_tingkat,
                'jurusan' => $kelas->jurusanRelation?->name ?? $kelas->jurusan,
                'wali_kelas' => $kelas->waliKelas?->nama,
            ]
        );

        return response()->json([
            'message' => 'Kelas & Rombel berhasil ditambahkan ke Master Akademik.',
            'data' => $kelas
        ], 201);
    }

    /**
     * Show detailed class information including students and assigned teachers.
     */
    public function show($masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki akses ke kelas instansi lain.'
            ], 403);
        }

        $masterKela->load([
            'academicYear',
            'semester',
            'kurikulum',
            'jenjang',
            'jurusanRelation',
            'tingkatKelas',
            'waliKelas',
            'siswa.siswa',
            'guruMataPelajaran.mataPelajaran.kurikulum',
            'guruMataPelajaran.mataPelajaran.jenjang',
            'guruMataPelajaran.mataPelajaran.tingkatKelas',
            'guruMataPelajaran.guru',
            'guruMataPelajaran.academicYear',
            'guruMataPelajaran.semester'
        ]);
        $masterKela->loadCount(['siswa', 'guruMataPelajaran']);

        $masterKela->name = $masterKela->nama_kelas;
        $masterKela->level = $masterKela->tingkatKelas?->tingkat ?? $masterKela->tingkat;
        $masterKela->major = [
            'id' => $masterKela->idjurusan ?? $masterKela->idjenjang,
            'name' => $masterKela->jurusanRelation?->name ?? $masterKela->jenjang?->nama_jenjang ?? $masterKela->jurusan,
            'code' => $masterKela->jurusanRelation?->code ?? $masterKela->jenjang?->kode_jenjang ?? $masterKela->jurusan
        ];

        return response()->json($masterKela);
    }

    /**
     * Update an existing Class & Rombel.
     */
    public function update(Request $request, $masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk menambah/mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }
        if ((string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah kelas instansi lain.'
            ], 403);
        }

        $validated = $request->validate([
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'semester_id' => 'nullable|exists:master_semester,id',
            'kurikulum_id' => 'nullable|exists:master_kurikulum,id',
            'idjenjang' => 'nullable|exists:master_jenjang,id',
            'idjurusan' => 'nullable|exists:majors,id',
            'idtingkat' => 'nullable|exists:master_tingkat_kelas,id',
            'nama_kelas' => 'nullable|string|max:100',
            'name' => 'nullable|string|max:100',
            'wali_kelas_id' => 'nullable|exists:user_bo,iduser_bo',
            'kapasitas' => 'nullable|integer|min:1|max:100',
            'keterangan' => 'nullable|string|max:255',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $newAyId = $validated['academic_year_id'] ?? $masterKela->academic_year_id;
        $newSemId = $validated['semester_id'] ?? $masterKela->semester_id;
        $newName = trim($validated['nama_kelas'] ?? $validated['name'] ?? $masterKela->nama_kelas);

        // Check duplicate name in same instansi + academic year + semester
        if ($newAyId && $newSemId) {
            $duplicateExists = MasterKelas::where('idkategori', $masterKela->idkategori)
                ->where('academic_year_id', $newAyId)
                ->where('semester_id', $newSemId)
                ->where('nama_kelas', $newName)
                ->where('id', '!=', $masterKela->id)
                ->exists();

            if ($duplicateExists) {
                return response()->json([
                    'message' => "Kelas/Rombel '{$newName}' sudah terdaftar pada Tahun Ajaran dan Semester yang dipilih."
                ], 422);
            }
        }

        $beforeData = $masterKela->toArray();

        $updateData = [];
        if (isset($validated['academic_year_id'])) $updateData['academic_year_id'] = $validated['academic_year_id'];
        if (isset($validated['semester_id'])) $updateData['semester_id'] = $validated['semester_id'];
        if (isset($validated['kurikulum_id'])) $updateData['kurikulum_id'] = $validated['kurikulum_id'];
        if (isset($validated['idjenjang'])) $updateData['idjenjang'] = $validated['idjenjang'];
        if (array_key_exists('idjurusan', $validated)) {
            $updateData['idjurusan'] = $validated['idjurusan'];
            if ($validated['idjurusan']) {
                $major = Major::find($validated['idjurusan']);
                if ($major) $updateData['jurusan'] = $major->name;
            } else {
                $updateData['jurusan'] = 'Umum';
            }
        }
        if (isset($validated['idtingkat'])) {
            $updateData['idtingkat'] = $validated['idtingkat'];
            $tk = MasterTingkatKelas::find($validated['idtingkat']);
            if ($tk) $updateData['tingkat'] = $tk->tingkat;
        }
        if (!empty($newName)) $updateData['nama_kelas'] = $newName;
        if (array_key_exists('wali_kelas_id', $validated)) $updateData['wali_kelas_id'] = $validated['wali_kelas_id'];
        if (isset($validated['kapasitas'])) $updateData['kapasitas'] = $validated['kapasitas'];
        if (array_key_exists('keterangan', $validated)) $updateData['keterangan'] = $validated['keterangan'];
        if (isset($validated['status_aktif'])) $updateData['status_aktif'] = $validated['status_aktif'];

        $masterKela->update($updateData);

        $masterKela->load([
            'academicYear',
            'semester',
            'kurikulum',
            'jenjang',
            'jurusanRelation',
            'tingkatKelas',
            'waliKelas'
        ]);
        $masterKela->loadCount(['siswa', 'guruMataPelajaran']);

        // Audit Log
        AuditLog::record(
            'EDIT_KELAS',
            'master_kelas',
            (string)$masterKela->id,
            "Memperbarui Kelas/Rombel: {$masterKela->nama_kelas}",
            [
                'before' => $beforeData,
                'after' => $masterKela->toArray()
            ]
        );

        $masterKela->name = $masterKela->nama_kelas;
        $masterKela->level = $masterKela->tingkatKelas?->tingkat ?? $masterKela->tingkat;

        return response()->json([
            'message' => 'Data Kelas berhasil diperbarui.',
            'data' => $masterKela
        ]);
    }

    /**
     * Delete a class.
     */
    public function destroy($masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk menghapus data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }
        if ((string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus kelas instansi lain.'
            ], 403);
        }

        $className = $masterKela->nama_kelas;
        $oldId = $masterKela->id;
        $oldData = $masterKela->toArray();

        // Check if class has ongoing/scheduled assessments (Temuan 05)
        $hasActiveExams = \App\Models\Assessment::where('idkelas', $masterKela->id)
            ->where('status_aktif', 'Y')
            ->exists();
        if ($hasActiveExams) {
            return response()->json([
                'message' => 'Kelas tidak dapat dihapus karena masih memiliki jadwal paket ujian aktif. Nonaktifkan atau ubah paket ujian terlebih dahulu.'
            ], 422);
        }

        // Disassociate students from this class in user table to prevent orphan foreign keys (Temuan 05)
        \App\Models\UserSiswa::where('idkelas', $masterKela->id)->update(['idkelas' => null]);

        // Disassociate students and guru pengampu
        SiswaKelas::where('idkelas', $masterKela->id)->delete();
        GuruMataPelajaran::where('idkelas', $masterKela->id)->delete();

        $masterKela->delete();

        // Audit Log
        AuditLog::record(
            'DELETE_KELAS',
            'master_kelas',
            (string)$oldId,
            "Menghapus Kelas/Rombel: {$className}",
            $oldData
        );

        return response()->json([
            'message' => "Kelas '{$className}' berhasil dihapus."
        ]);
    }

    /**
     * Centralized Academic Context Resolution for Integrated Modules:
     * - Paket Soal, Jadwal Ujian, Monitoring Ujian, Nilai, Rekap Nilai, Rapor, Analisis Nilai.
     * When Guru selects a class they teach, this endpoint provides complete context instantly:
     * Tahun Ajaran, Semester, Kurikulum, Mata Pelajaran, Guru Pengampu, and KKM without re-selection.
     */
    public function academicContext($masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        $idkategori = $masterKela->idkategori;

        // Scoping check
        if ($user && in_array($user->role, ['admin', 'guru']) && !empty($user->idkategori)) {
            if ((string)$idkategori !== (string)$user->idkategori) {
                return response()->json([
                    'message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'
                ], 403);
            }
        }

        $masterKela->load([
            'academicYear',
            'semester',
            'kurikulum',
            'jenjang',
            'jurusanRelation',
            'tingkatKelas',
            'waliKelas',
            'guruMataPelajaran.mataPelajaran.kurikulum',
            'guruMataPelajaran.mataPelajaran.jenjang',
            'guruMataPelajaran.mataPelajaran.tingkatKelas',
            'guruMataPelajaran.guru',
        ]);
        $masterKela->loadCount('siswa');

        // Fetch applicable subjects from Master Akademik for this class configuration
        $subjectsQuery = MasterMataPelajaran::where('idkategori', $idkategori)
            ->where('status_aktif', 'Y');

        if ($masterKela->kurikulum_id) {
            $subjectsQuery->where('idkurikulum', $masterKela->kurikulum_id);
        }
        if ($masterKela->idjenjang) {
            $subjectsQuery->where('idjenjang', $masterKela->idjenjang);
        }
        if ($masterKela->idjurusan) {
            $subjectsQuery->where(function ($q) use ($masterKela) {
                $q->where('idjurusan', $masterKela->idjurusan)
                  ->orWhereNull('idjurusan');
            });
        }
        if ($masterKela->idtingkat) {
            $subjectsQuery->where(function ($q) use ($masterKela) {
                $q->where('idtingkat', $masterKela->idtingkat)
                  ->orWhereNull('idtingkat');
            });
        }

        $applicableSubjects = $subjectsQuery->orderBy('nama_mapel', 'asc')->get();

        // Format Guru Pengampu with subject details & KKM
        $guruPengampuFormatted = $masterKela->guruMataPelajaran->map(function ($gmp) {
            return [
                'id' => $gmp->id,
                'idmapel' => $gmp->idmapel,
                'mata_pelajaran' => $gmp->mataPelajaran ? [
                    'id' => $gmp->mataPelajaran->id,
                    'nama_mapel' => $gmp->mataPelajaran->nama_mapel,
                    'kode_mapel' => $gmp->mataPelajaran->kode_mapel,
                    'kkm' => $gmp->mataPelajaran->kkm ?? 75,
                    'kurikulum_id' => $gmp->mataPelajaran->idkurikulum,
                    'jenjang_id' => $gmp->mataPelajaran->idjenjang,
                ] : null,
                'guru' => $gmp->guru ? [
                    'iduser_bo' => $gmp->guru->iduser_bo,
                    'nama' => $gmp->guru->nama,
                    'login_email' => $gmp->guru->login_email,
                ] : null,
                'tahun_ajaran' => $gmp->tahun_ajaran,
                'status' => $gmp->status,
            ];
        });

        return response()->json([
            'id' => $masterKela->id,
            'nama_kelas' => $masterKela->nama_kelas,
            'kapasitas' => $masterKela->kapasitas,
            'status_aktif' => $masterKela->status_aktif,
            'students_count' => $masterKela->siswa_count,
            'academic_year' => $masterKela->academicYear ? [
                'id' => $masterKela->academicYear->id,
                'name' => $masterKela->academicYear->name,
                'is_active' => (bool)$masterKela->academicYear->is_active,
            ] : null,
            'semester' => $masterKela->semester ? [
                'id' => $masterKela->semester->id,
                'nama_semester' => $masterKela->semester->nama_semester,
                'kode_semester' => $masterKela->semester->kode_semester,
                'status_aktif' => $masterKela->semester->status_aktif,
            ] : null,
            'kurikulum' => $masterKela->kurikulum ? [
                'id' => $masterKela->kurikulum->id,
                'nama_kurikulum' => $masterKela->kurikulum->nama_kurikulum,
                'kode_kurikulum' => $masterKela->kurikulum->kode_kurikulum,
            ] : null,
            'jenjang' => $masterKela->jenjang ? [
                'id' => $masterKela->jenjang->id,
                'nama_jenjang' => $masterKela->jenjang->nama_jenjang,
                'kode_jenjang' => $masterKela->jenjang->kode_jenjang,
            ] : null,
            'jurusan' => $masterKela->jurusanRelation ? [
                'id' => $masterKela->jurusanRelation->id,
                'name' => $masterKela->jurusanRelation->name,
                'code' => $masterKela->jurusanRelation->code,
            ] : ($masterKela->jurusan ? ['id' => null, 'name' => $masterKela->jurusan, 'code' => $masterKela->jurusan] : null),
            'tingkat' => $masterKela->tingkatKelas ? [
                'id' => $masterKela->tingkatKelas->id,
                'nama_tingkat' => $masterKela->tingkatKelas->nama_tingkat,
                'tingkat' => $masterKela->tingkatKelas->tingkat,
            ] : ['id' => null, 'nama_tingkat' => "Tingkat {$masterKela->tingkat}", 'tingkat' => $masterKela->tingkat],
            'wali_kelas' => $masterKela->waliKelas ? [
                'iduser_bo' => $masterKela->waliKelas->iduser_bo,
                'nama' => $masterKela->waliKelas->nama,
                'login_email' => $masterKela->waliKelas->login_email,
            ] : null,
            'guru_pengampu' => $guruPengampuFormatted,
            'applicable_subjects' => $applicableSubjects,
        ]);
    }

    /**
     * Get subject teachers (Guru Pengampu) for this class.
     */
    public function getSubjectTeachers($masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'
            ], 403);
        }

        $items = GuruMataPelajaran::where('idkelas', $masterKela->id)
            ->with([
                'guru',
                'mataPelajaran.kurikulum',
                'mataPelajaran.jenjang',
                'mataPelajaran.tingkatKelas',
                'academicYear',
                'semester'
            ])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'data' => $items
        ]);
    }

    /**
     * Assign or update a subject teacher (Guru Pengampu) in this class.
     * Subject MUST originate from Master Akademik (master_mata_pelajaran).
     */
    public function assignSubjectTeacher(Request $request, $masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }
        if ((string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'
            ], 403);
        }

        $validated = $request->validate([
            'idmapel' => 'required|exists:master_mata_pelajaran,id',
            'iduser_bo' => 'required|exists:user_bo,iduser_bo',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'semester_id' => 'nullable|exists:master_semester,id',
            'tahun_ajaran' => 'nullable|string|max:20',
            'status' => 'nullable|string|in:aktif,nonaktif,Aktif,Nonaktif',
        ]);

        // Validation: Verify subject belongs to this instansi's Master Akademik
        $subject = MasterMataPelajaran::where('id', $validated['idmapel'])
            ->where('idkategori', $masterKela->idkategori)
            ->first();

        if (!$subject) {
            return response()->json([
                'message' => 'Mata Pelajaran harus berasal dari Master Akademik instansi Anda dan belum terdaftar.'
            ], 422);
        }

        $status = strtolower($validated['status'] ?? 'aktif');
        $ayId = $validated['academic_year_id'] ?? $masterKela->academic_year_id;
        $semId = $validated['semester_id'] ?? $masterKela->semester_id;

        $tahunAjaran = $validated['tahun_ajaran']
            ?? $masterKela->academicYear?->name
            ?? '2026/2027';

        $record = GuruMataPelajaran::updateOrCreate(
            [
                'idkelas' => $masterKela->id,
                'idmapel' => $validated['idmapel'],
            ],
            [
                'iduser_bo' => $validated['iduser_bo'],
                'academic_year_id' => $ayId,
                'semester_id' => $semId,
                'tahun_ajaran' => $tahunAjaran,
                'status' => $status,
            ]
        );

        $record->load(['guru', 'mataPelajaran', 'academicYear', 'semester']);

        // Audit Log
        AuditLog::record(
            'ASSIGN_GURU_PENGAMPU',
            'guru_mata_pelajaran',
            (string)$record->id,
            "Menugaskan Guru {$record->guru?->nama} sebagai Pengampu {$record->mataPelajaran?->nama_mapel} pada {$masterKela->nama_kelas}",
            [
                'idkelas' => $masterKela->id,
                'nama_kelas' => $masterKela->nama_kelas,
                'mapel' => $record->mataPelajaran?->nama_mapel,
                'kkm' => $record->mataPelajaran?->kkm,
                'guru' => $record->guru?->nama,
                'tahun_ajaran' => $tahunAjaran,
                'status' => $status,
            ]
        );

        return response()->json([
            'message' => 'Guru Pengampu Mata Pelajaran berhasil ditugaskan.',
            'data' => $record
        ]);
    }

    /**
     * Update an existing subject teacher entry.
     */
    public function updateSubjectTeacher(Request $request, $masterKela, $guruMapelId)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }
        if ((string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'
            ], 403);
        }

        $record = GuruMataPelajaran::where('idkelas', $masterKela->id)->findOrFail($guruMapelId);

        $validated = $request->validate([
            'idmapel' => 'nullable|exists:master_mata_pelajaran,id',
            'iduser_bo' => 'nullable|exists:user_bo,iduser_bo',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'semester_id' => 'nullable|exists:master_semester,id',
            'tahun_ajaran' => 'nullable|string|max:20',
            'status' => 'nullable|string|in:aktif,nonaktif,Aktif,Nonaktif',
        ]);

        if (isset($validated['idmapel'])) {
            $subject = MasterMataPelajaran::where('id', $validated['idmapel'])
                ->where('idkategori', $masterKela->idkategori)
                ->first();
            if (!$subject) {
                return response()->json([
                    'message' => 'Mata Pelajaran harus berasal dari Master Akademik instansi Anda.'
                ], 422);
            }
        }

        $updateData = [];
        if (isset($validated['idmapel'])) $updateData['idmapel'] = $validated['idmapel'];
        if (isset($validated['iduser_bo'])) $updateData['iduser_bo'] = $validated['iduser_bo'];
        if (isset($validated['academic_year_id'])) $updateData['academic_year_id'] = $validated['academic_year_id'];
        if (isset($validated['semester_id'])) $updateData['semester_id'] = $validated['semester_id'];
        if (isset($validated['tahun_ajaran'])) $updateData['tahun_ajaran'] = $validated['tahun_ajaran'];
        if (isset($validated['status'])) $updateData['status'] = strtolower($validated['status']);

        $before = $record->toArray();
        $record->update($updateData);
        $record->load(['guru', 'mataPelajaran', 'academicYear', 'semester']);

        // Audit Log
        AuditLog::record(
            'UPDATE_GURU_PENGAMPU',
            'guru_mata_pelajaran',
            (string)$record->id,
            "Memperbarui Guru Pengampu {$record->mataPelajaran?->nama_mapel} pada {$masterKela->nama_kelas}",
            [
                'before' => $before,
                'after' => $record->toArray()
            ]
        );

        return response()->json([
            'message' => 'Guru Pengampu berhasil diperbarui.',
            'data' => $record
        ]);
    }

    /**
     * Remove subject teacher from this class.
     */
    public function removeSubjectTeacher($masterKela, $guruMapelId)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }
        if ((string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'
            ], 403);
        }

        $record = GuruMataPelajaran::where('idkelas', $masterKela->id)->findOrFail($guruMapelId);
        $oldData = $record->toArray();
        $record->delete();

        // Audit Log
        AuditLog::record(
            'REMOVE_GURU_PENGAMPU',
            'guru_mata_pelajaran',
            (string)$guruMapelId,
            "Menghapus Guru Pengampu dari kelas {$masterKela->nama_kelas}",
            $oldData
        );

        return response()->json([
            'message' => 'Guru Pengampu berhasil dihapus dari kelas.'
        ]);
    }

    /**
     * Assign student to this class.
     */
    public function addStudent(Request $request, $masterKela)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }
        if ((string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'
            ], 403);
        }

        $request->validate([
            'iduser' => 'required|exists:user,iduser',
            'nisn' => 'nullable|string|max:30',
        ]);

        $tahunAjaran = $masterKela->academicYear?->name ?? '2026/2027';

        SiswaKelas::updateOrInsert(
            ['iduser' => $request->iduser],
            [
                'idkelas' => $masterKela->id,
                'academic_year_id' => $masterKela->academic_year_id,
                'semester_id' => $masterKela->semester_id,
                'nisn' => $request->nisn,
                'tahun_ajaran' => $tahunAjaran,
                'status' => 'aktif',
                'updated_at' => now(),
            ]
        );

        UserSiswa::where('iduser', $request->iduser)->update([
            'idkelas' => $masterKela->id,
            'nisn' => $request->nisn,
        ]);

        $student = UserSiswa::where('iduser', $request->iduser)->first();

        // Audit Log
        AuditLog::record(
            'ASSIGN_SISWA_KELAS',
            'siswa_kelas',
            (string)$request->iduser,
            "Menambahkan Siswa {$student?->nama} ke {$masterKela->nama_kelas}",
            [
                'idkelas' => $masterKela->id,
                'nama_kelas' => $masterKela->nama_kelas,
                'iduser' => $request->iduser,
                'nisn' => $request->nisn,
            ]
        );

        return response()->json([
            'message' => 'Siswa berhasil dimasukkan ke kelas.'
        ]);
    }

    /**
     * Remove student from this class.
     */
    public function removeStudent($masterKela, $iduser)
    {
        if (!($masterKela instanceof MasterKelas)) {
            $masterKela = MasterKelas::findOrFail($masterKela);
        }

        $user = request()->user();
        if ($user && $user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin tidak memiliki akses untuk mengubah data Master Akademik. Kelola data dilakukan oleh Admin Instansi.'
            ], 403);
        }
        if (!$user || $user->role !== 'admin' || empty($user->idkategori)) {
            return response()->json([
                'message' => 'Akses ditolak: Hanya Admin Instansi yang dapat mengelola data kelas.'
            ], 403);
        }
        if ((string)$masterKela->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki hak akses pada kelas instansi lain.'
            ], 403);
        }

        $student = UserSiswa::where('iduser', $iduser)->first();

        SiswaKelas::where('iduser', $iduser)->where('idkelas', $masterKela->id)->delete();
        UserSiswa::where('iduser', $iduser)->where('idkelas', $masterKela->id)->update([
            'idkelas' => null
        ]);

        // Audit Log
        AuditLog::record(
            'REMOVE_SISWA_KELAS',
            'siswa_kelas',
            (string)$iduser,
            "Mengeluarkan Siswa {$student?->nama} dari {$masterKela->nama_kelas}",
            [
                'idkelas' => $masterKela->id,
                'nama_kelas' => $masterKela->nama_kelas,
                'iduser' => $iduser,
            ]
        );

        return response()->json([
            'message' => 'Siswa berhasil dikeluarkan dari kelas.'
        ]);
    }

    /**
     * Toggle status aktif / nonaktif kelas
     */
    public function toggleStatus(Request $request, $id)
    {
        $kelas = MasterKelas::findOrFail($id);
        $user = $request->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$kelas->idkategori !== (string)$user->idkategori) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak memiliki akses ke kelas instansi lain.'
            ], 403);
        }

        $newStatus = ($kelas->status_aktif === 'Y') ? 'N' : 'Y';
        $kelas->update(['status_aktif' => $newStatus]);

        AuditLog::record(
            'TOGGLE_STATUS_KELAS',
            'classes',
            (string)$kelas->id,
            "Mengubah status kelas {$kelas->nama_kelas} menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Nonaktif'),
            ['id' => $kelas->id, 'nama_kelas' => $kelas->nama_kelas, 'status_aktif' => $newStatus]
        );

        return response()->json([
            'message' => 'Status kelas berhasil diubah menjadi ' . ($newStatus === 'Y' ? 'Aktif' : 'Nonaktif'),
            'status_aktif' => $newStatus,
            'data' => $kelas
        ]);
    }
}
