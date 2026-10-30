<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\AssessmentJawabanPilgan;
use App\Models\AssessmentJawabanPilganDetail;
use App\Models\ExamGroup;
use App\Models\MasterJenjang;
use App\Models\MasterMataPelajaran;
use App\Models\MasterKelas;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeacherExamController extends Controller
{
    /**
     * Resolves authenticated user across Request parameter, auth guard, and request() helper.
     */
    protected function resolveUser(?Request $request = null)
    {
        return $request?->user() ?: auth()->user() ?: request()->user();
    }

    /**
     * Authorize whether user can access/manage this assessment resource (IDOR protection)
     */
    protected function authorizeExamAccess($user, Assessment $assessment, bool $strictOwnerOnly = false): ?\Illuminate\Http\JsonResponse
    {
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->role === 'super_admin') {
            return null;
        }

        if ($user->role === 'admin') {
            if (!empty($user->idkategori) && (string)$assessment->idkategori !== (string)$user->idkategori) {
                return response()->json(['message' => 'Akses ditolak: Anda hanya dapat mengelola ujian di instansi Anda.'], 403);
            }
            return null;
        }

        if ($user->role === 'guru') {
            if ($strictOwnerOnly) {
                if ((string)$assessment->iduser_bo !== (string)$user->iduser_bo) {
                    return response()->json(['message' => 'Akses ditolak: Guru hanya dapat menghapus paket ujian yang dibuat sendiri.'], 403);
                }
                return null;
            }

            $isOwner = (string)$assessment->iduser_bo === (string)$user->iduser_bo;
            $sameSchool = !empty($user->idkategori) && (string)$assessment->idkategori === (string)$user->idkategori;
            $isPublicMaster = in_array((string)$assessment->idkategori, ['27830150842287772', ''], true) || is_null($assessment->idkategori);

            if (!$isOwner && !$sameSchool && !$isPublicMaster) {
                return response()->json(['message' => 'Akses ditolak: Anda hanya dapat mengakses ujian milik Anda atau instansi Anda.'], 403);
            }
            return null;
        }

        return response()->json(['message' => 'Akses ditolak.'], 403);
    }

    /**
     * Sanitize cell value for Excel export to prevent CSV / Formula Injection (CWE-1236)
     */
    protected function sanitizeCellForExcel($val): string
    {
        $str = (string) $val;
        if ($str === '') {
            return '';
        }
        if (in_array($str[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            $str = "'" . $str;
        }
        return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
    }

    /**
     * List all TryOut packages
     */
    public function index(Request $request)
    {
        $user = $this->resolveUser($request);
        $query = Assessment::with(['jenjang', 'kelas', 'mapel', 'pembuat', 'kategori', 'examGroups', 'academicYear'])
            ->withCount(['soal', 'attempts']);

        if ($user && $user->role === 'guru') {
            $query->where(function ($q) use ($user) {
                $q->where('iduser_bo', $user->iduser_bo)
                  ->orWhere('idkategori', $user->idkategori)
                  ->orWhere('idkategori', '27830150842287772') // Master Bank Soal PGRI SLCC / Detik Detik
                  ->orWhereNull('idkategori')
                  ->orWhereNull('iduser_bo');
            });
        } elseif ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where(function ($q) use ($user) {
                $q->where('idkategori', $user->idkategori)
                  ->orWhere('idkategori', '27830150842287772') // Master Bank Soal PGRI SLCC / Detik Detik
                  ->orWhereNull('idkategori');
            });
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('idmapel')) {
            $query->where('idmapel', $request->idmapel);
        }

        if ($request->filled('idkelas')) {
            $query->where('idkelas', $request->idkelas);
        }

        if ($request->filled('search')) {
            $query->where('nama_assessment', 'like', '%' . $request->search . '%');
        }

        // Sort by tanggal_input desc so newly created or generated exams always appear first!
        $orderedQuery = $query->orderBy('tanggal_input', 'desc')->orderBy('idassessment', 'desc');

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $orderedQuery->get();
            $mapped = $items->map(function ($item) {
                $now = now();
                $start = $item->tanggal_mulai_assessment ? \Carbon\Carbon::parse($item->tanggal_mulai_assessment) : null;
                $end = $item->tanggal_batas_assessment ? \Carbon\Carbon::parse($item->tanggal_batas_assessment) : null;
                
                $status = 'published';
                if ($start && $now->lt($start)) {
                    $status = 'scheduled';
                } elseif ($end && $now->gt($end)) {
                    $status = 'closed';
                }

                return [
                    'id' => $item->idassessment,
                    'idassessment' => $item->idassessment,
                    'title' => $item->nama_assessment,
                    'name' => $item->nama_assessment,
                    'code' => 'TO-' . substr($item->idassessment, -5),
                    'description' => $item->deskripsi_assessment,
                    'subject_id' => $item->idmapel,
                    'subject_name' => $item->mapel?->nama_mapel ?? 'Umum',
                    'subject' => [
                        'id' => $item->idmapel,
                        'name' => $item->mapel?->nama_mapel ?? 'Umum',
                        'code' => $item->mapel?->kode_mapel ?? 'UMUM',
                    ],
                    'jenjang_name' => $item->jenjang?->nama_jenjang ?? 'Umum',
                    'class_id' => $item->idkelas,
                    'class_name' => $item->kelas?->nama_kelas ?? 'Semua Kelas / Bank Soal',
                    'id_tahun_ajaran' => $item->id_tahun_ajaran,
                    'academic_year' => $item->academicYear ? [
                        'id' => $item->academicYear->id,
                        'name' => $item->academicYear->name,
                        'semester' => $item->academicYear->semester,
                    ] : null,
                    'duration_minutes' => $item->waktu_pengerjaan !== null ? (int) $item->waktu_pengerjaan : null,
                    'total_questions' => $item->soal_count ?: $item->tampil_assessment_pilgan ?: 50,
                    'questions_count' => $item->soal_count ?: $item->tampil_assessment_pilgan ?: 50,
                    'tampil_assessment_pilgan' => $item->tampil_assessment_pilgan ?: 50,
                    'start_time' => $item->tanggal_mulai_assessment,
                    'end_time' => $item->tanggal_batas_assessment,
                    'status' => $status,
                    'attempts_count' => $item->attempts_count,
                    'created_by' => $item->pembuat?->nama ?? 'Guru',
                    'institution' => $item->kategori?->nama_kategori ?? 'Umum',
                    'kkm_score' => $item->mapel?->kkm ?? 75,
                    'settings' => [
                        'allow_backtrack' => true,
                        'allow_flag' => true,
                        'shuffle_questions' => true,
                        'shuffle_options' => true,
                        'show_result_immediately' => true,
                        'max_tab_switches' => 5,
                    ],
                    'exam_groups' => $item->examGroups->map(function ($g) {
                        return [
                            'id' => $g->id,
                            'exam_id' => $g->exam_id,
                            'name' => $g->name,
                            'token' => $g->token,
                            'start_time' => $g->start_time ? $g->start_time->toIso8601String() : null,
                            'end_time' => $g->end_time ? $g->end_time->toIso8601String() : null,
                            'max_participants' => $g->max_participants,
                            'class_ids' => $g->class_ids,
                            'student_ids' => $g->student_ids,
                        ];
                    }),
                ];
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
        $paginator = $orderedQuery->paginate($perPage);

        $paginator->through(function ($item) {
            $now = now();
            $start = $item->tanggal_mulai_assessment ? \Carbon\Carbon::parse($item->tanggal_mulai_assessment) : null;
            $end = $item->tanggal_batas_assessment ? \Carbon\Carbon::parse($item->tanggal_batas_assessment) : null;
            
            $status = 'published';
            if ($start && $now->lt($start)) {
                $status = 'scheduled';
            } elseif ($end && $now->gt($end)) {
                $status = 'closed';
            }

            return [
                'id' => $item->idassessment,
                'idassessment' => $item->idassessment,
                'title' => $item->nama_assessment,
                'name' => $item->nama_assessment,
                'code' => 'TO-' . substr($item->idassessment, -5),
                'description' => $item->deskripsi_assessment,
                'subject_id' => $item->idmapel,
                'subject_name' => $item->mapel?->nama_mapel ?? 'Umum',
                'subject' => [
                    'id' => $item->idmapel,
                    'name' => $item->mapel?->nama_mapel ?? 'Umum',
                    'code' => $item->mapel?->kode_mapel ?? 'UMUM',
                ],
                'jenjang_name' => $item->jenjang?->nama_jenjang ?? 'Umum',
                'class_id' => $item->idkelas,
                'class_name' => $item->kelas?->nama_kelas ?? 'Semua Kelas / Bank Soal',
                'id_tahun_ajaran' => $item->id_tahun_ajaran,
                'academic_year' => $item->academicYear ? [
                    'id' => $item->academicYear->id,
                    'name' => $item->academicYear->name,
                    'semester' => $item->academicYear->semester,
                ] : null,
                'duration_minutes' => $item->waktu_pengerjaan !== null ? (int) $item->waktu_pengerjaan : null,
                'total_questions' => $item->soal_count ?: $item->tampil_assessment_pilgan ?: 50,
                'questions_count' => $item->soal_count ?: $item->tampil_assessment_pilgan ?: 50,
                'tampil_assessment_pilgan' => $item->tampil_assessment_pilgan ?: 50,
                'start_time' => $item->tanggal_mulai_assessment,
                'end_time' => $item->tanggal_batas_assessment,
                'status' => $status,
                'attempts_count' => $item->attempts_count,
                'created_by' => $item->pembuat?->nama ?? 'Guru',
                'institution' => $item->kategori?->nama_kategori ?? 'Umum',
                'kkm_score' => $item->mapel?->kkm ?? 75,
                'settings' => [
                    'allow_backtrack' => true,
                    'allow_flag' => true,
                    'shuffle_questions' => true,
                    'shuffle_options' => true,
                    'show_result_immediately' => true,
                    'max_tab_switches' => 5,
                ],
                'exam_groups' => $item->examGroups->map(function ($g) {
                    return [
                        'id' => $g->id,
                        'exam_id' => $g->exam_id,
                        'name' => $g->name,
                        'token' => $g->token,
                        'start_time' => $g->start_time ? $g->start_time->toIso8601String() : null,
                        'end_time' => $g->end_time ? $g->end_time->toIso8601String() : null,
                        'max_participants' => $g->max_participants,
                        'class_ids' => $g->class_ids,
                        'student_ids' => $g->student_ids,
                    ];
                }),
            ];
        });

        return response()->json($paginator);
    }

    /**
     * Store manual package / exam
     */
    public function store(Request $request)
    {
        $title = $request->input('title') ?: $request->input('nama_assessment');
        if (!$title) {
            return response()->json(['message' => 'Judul paket TryOut wajib diisi.'], 422);
        }

        $idmapel = $request->input('idmapel') ?: $request->input('subject_id') ?: 1;
        $idjenjang = $request->input('idjenjang') ?: 1;
        $idkelas = $request->input('idkelas') ?: null;
        $duration = $request->filled('duration_minutes')
            ? (int) $request->input('duration_minutes')
            : ($request->filled('waktu_pengerjaan') ? (int) $request->input('waktu_pengerjaan') : null);
        $idTahunAjaran = $request->input('id_tahun_ajaran') ?: $request->input('academic_year_id') ?: null;
        $startTime = $request->input('start_time') ?: $request->input('tanggal_mulai_assessment') ?: now();
        $endTime = $request->input('end_time') ?: $request->input('tanggal_batas_assessment') ?: now()->addDays(7);
        $packageId = $request->input('package_id') ?: $request->input('idassessment_sumber');
        $questionInputs = $request->input('questions', []);

        $user = $this->resolveUser($request);
        $idassessment = (string) (time() . rand(1000000, 9999999));

        $item = Assessment::create([
            'idassessment' => $idassessment,
            'nama_assessment' => $title,
            'deskripsi_assessment' => $request->input('deskripsi_assessment') ?? $request->input('description') ?? '',
            'idjenjang' => $idjenjang,
            'idmapel' => $idmapel,
            'idkelas' => $idkelas,
            'id_tahun_ajaran' => $idTahunAjaran,
            'iduser_bo' => $user ? $user->iduser_bo : null,
            'idkategori' => $user ? $user->idkategori : null,
            'waktu_pengerjaan' => $duration,
            'tampil_assessment_pilgan' => 50,
            'tampil_assessment_essay' => 0,
            'harga_assessment' => 0,
            'diskon_assessment' => 0,
            'status_diskon' => '0',
            'point_assessment' => 0,
            'point_assessment_nama' => 'JPtest',
            'url_image_panjang' => '',
            'url_image_kotak' => '',
            'url_sertifikat_depan_template' => '',
            'url_sertifikat_belakang_template' => '',
            'url_logo_sponsor' => '',
            'tanggal_mulai_assessment' => $startTime,
            'tanggal_batas_assessment' => $endTime,
            'tanggal_input' => now(),
        ]);

        // Question cloning / linking logic
        $sourceQuestions = collect();

        // 1. If package_id provided, get questions from that package
        if ($packageId) {
            $sourceQuestions = AssessmentSoalPilgan::where('idassessment', (string) $packageId)->get();
        }

        // 2. If specific questions array passed
        if ($sourceQuestions->isEmpty() && !empty($questionInputs)) {
            $qIds = collect($questionInputs)->pluck('id')->filter()->map(fn($id) => (string) $id)->toArray();
            if (!empty($qIds)) {
                $sourceQuestions = AssessmentSoalPilgan::whereIn('idassessment_soal_pilgan', $qIds)->get();
            }
        }

        // 3. Fallback: if still empty and idmapel provided, grab questions from that mapel
        if ($sourceQuestions->isEmpty() && $idmapel) {
            $sourceQuestions = AssessmentSoalPilgan::where('idmapel', $idmapel)->limit(50)->get();
        }

        // Clone questions to the new assessment
        $clonedCount = 0;
        foreach ($sourceQuestions as $sq) {
            $newSoalId = (string) (time() . rand(1000000, 9999999));
            AssessmentSoalPilgan::create([
                'idassessment_soal_pilgan' => $newSoalId,
                'idassessment' => $idassessment,
                'idjenjang' => $sq->idjenjang ?: $idjenjang,
                'idmapel' => $sq->idmapel ?: $idmapel,
                'soal_text' => $sq->soal_text,
                'soal_gambar' => $sq->soal_gambar,
                'pilihan_a_text' => $sq->pilihan_a_text,
                'pilihan_a_gambar' => $sq->pilihan_a_gambar,
                'pilihan_b_text' => $sq->pilihan_b_text,
                'pilihan_b_gambar' => $sq->pilihan_b_gambar,
                'pilihan_c_text' => $sq->pilihan_c_text,
                'pilihan_c_gambar' => $sq->pilihan_c_gambar,
                'pilihan_d_text' => $sq->pilihan_d_text,
                'pilihan_d_gambar' => $sq->pilihan_d_gambar,
                'pilihan_e_text' => $sq->pilihan_e_text,
                'pilihan_e_gambar' => $sq->pilihan_e_gambar,
                'jawaban' => $sq->jawaban,
                'penjelasan_jawaban' => $sq->penjelasan_jawaban,
                'tanggal_input' => now(),
            ]);
            $clonedCount++;
        }

        if ($clonedCount > 0) {
            $item->update(['tampil_assessment_pilgan' => $clonedCount]);
        }

        return response()->json([
            'message' => 'Paket TryOut berhasil dibuat',
            'data' => $item
        ], 201);
    }

    /**
     * Update existing exam package
     * Flow Rule:
     * - Belum Ada Siswa Mulai -> Bebas edit seluruh parameter
     * - Minimal 1 Siswa Mulai -> Seluruh butir soal, jumlah soal, dan durasi DIKUNCI (`mod-edit-paket-pengecualian`). Hanya tanggal pelaksanaan yang boleh diubah.
     */
    public function update(Request $request, $idassessment)
    {
        $user = $this->resolveUser($request);
        $item = Assessment::withCount('attempts')->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $item)) {
            return $deny;
        }

        $hasAttempts = ($item->attempts_count > 0) || AssessmentJawabanPilgan::where('idassessment', $idassessment)->exists();

        // Enforce Flow rule: If at least 1 student has started, questions/count/duration/subject/grade are locked!
        if ($hasAttempts) {
            $tryingToChangeLockedFields = false;
            $lockedFields = ['title', 'nama_assessment', 'deskripsi_assessment', 'description', 'subject_id', 'idmapel', 'idjenjang', 'idkelas', 'duration_minutes', 'waktu_pengerjaan', 'tampil_assessment_pilgan', 'total_soal'];
            
            foreach ($lockedFields as $field) {
                if ($request->filled($field)) {
                    if ($field === 'duration_minutes' || $field === 'waktu_pengerjaan') {
                        if ((int)$request->input($field) !== (int)$item->waktu_pengerjaan) {
                            $tryingToChangeLockedFields = true;
                            break;
                        }
                    } elseif ($field === 'title' || $field === 'nama_assessment') {
                        if ($request->input($field) !== $item->nama_assessment) {
                            $tryingToChangeLockedFields = true;
                            break;
                        }
                    } elseif ($field === 'idmapel' || $field === 'subject_id') {
                        if ((int)$request->input($field) !== (int)$item->idmapel) {
                            $tryingToChangeLockedFields = true;
                            break;
                        }
                    }
                }
            }

            if ($tryingToChangeLockedFields) {
                return response()->json([
                    'message' => 'Peringatan Integritas: Minimal 1 siswa telah mulai mengerjakan paket ini. Seluruh butir soal, jumlah soal, mapel, dan durasi pengerjaan telah dikunci permanen. Hanya jadwal pelaksanaan (tanggal mulai & batas akhir) yang dapat disesuaikan.',
                    'error_code' => 'EXAM_LOCKED_ATTEMPTS_EXIST',
                    'attempts_count' => $item->attempts_count
                ], 422);
            }

            // Only update exam schedule dates
            $updates = [];
            if ($request->filled('start_time') || $request->filled('tanggal_mulai_assessment')) {
                $val = $request->input('start_time') ?: $request->input('tanggal_mulai_assessment');
                $updates['tanggal_mulai_assessment'] = \Carbon\Carbon::parse($val)->toDateTimeString();
            }
            if ($request->filled('end_time') || $request->filled('tanggal_batas_assessment')) {
                $val = $request->input('end_time') ?: $request->input('tanggal_batas_assessment');
                $updates['tanggal_batas_assessment'] = \Carbon\Carbon::parse($val)->toDateTimeString();
            }

            if (!empty($updates)) {
                $item->update($updates);
            }

            AuditLog::record(
                'EDIT_PAKET_PENGECEUALIAN',
                'assessment',
                $idassessment,
                $item->nama_assessment,
                [
                    'reason' => 'Attempts exist; only exam dates updated',
                    'attempts_count' => $item->attempts_count,
                    'updated_by' => $user?->name ?? 'Staff',
                    'role' => $user?->role ?? 'guru'
                ]
            );

            return response()->json([
                'message' => 'Jadwal pelaksanaan paket TryOut berhasil disesuaikan (Mod Pengecualian).',
                'data' => $item,
                'is_locked' => true
            ]);
        }

        // No attempts yet: Free full edit
        $updates = [];
        if ($request->filled('title') || $request->filled('nama_assessment')) {
            $updates['nama_assessment'] = $request->input('title') ?: $request->input('nama_assessment');
        }
        if ($request->filled('deskripsi_assessment') || $request->filled('description')) {
            $updates['deskripsi_assessment'] = $request->input('deskripsi_assessment') ?: $request->input('description');
        }
        if ($request->filled('subject_id') || $request->filled('idmapel')) {
            $updates['idmapel'] = $request->input('subject_id') ?: $request->input('idmapel');
        }
        if ($request->filled('idjenjang')) {
            $updates['idjenjang'] = $request->input('idjenjang');
        }
        if ($request->filled('idkelas')) {
            $updates['idkelas'] = $request->input('idkelas');
        }
        if ($request->filled('duration_minutes') || $request->filled('waktu_pengerjaan')) {
            $updates['waktu_pengerjaan'] = $request->input('duration_minutes') ?: $request->input('waktu_pengerjaan');
        }
        if ($request->filled('start_time') || $request->filled('tanggal_mulai_assessment')) {
            $val = $request->input('start_time') ?: $request->input('tanggal_mulai_assessment');
            $updates['tanggal_mulai_assessment'] = \Carbon\Carbon::parse($val)->toDateTimeString();
        }
        if ($request->filled('end_time') || $request->filled('tanggal_batas_assessment')) {
            $val = $request->input('end_time') ?: $request->input('tanggal_batas_assessment');
            $updates['tanggal_batas_assessment'] = \Carbon\Carbon::parse($val)->toDateTimeString();
        }

        if (!empty($updates)) {
            $item->update($updates);
        }

        AuditLog::record(
            'EDIT_PAKET_TRYOUT',
            'assessment',
            $idassessment,
            $item->nama_assessment,
            ['updated_by' => $user?->name ?? 'Staff', 'role' => $user?->role ?? 'guru']
        );

        return response()->json([
            'message' => 'Paket TryOut berhasil diperbarui',
            'data' => $item,
            'is_locked' => false
        ]);
    }

    /**
     * Generate 50 Random Questions from Bank Soal
     * User Requirement: "guru bisa mengenerate 50 soal random dari bank soal, lalu akan di berikan ke murid atau juga bisa di simpan sebagai List pilihan Bank Soal yg sudah dibuat"
     */
    public function generateRandom50(Request $request)
    {
        $validated = $request->validate([
            'nama_assessment' => 'required|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idjenjang' => 'required|integer',
            'idmapel' => 'required|integer',
            'idkelas' => 'nullable|integer',
            'id_tahun_ajaran' => 'nullable|integer',
            'total_soal' => 'nullable|integer|min:1|max:200',
            'waktu_pengerjaan' => 'nullable|integer|min:1|max:300',
            'tanggal_mulai_assessment' => 'nullable|date',
            'tanggal_batas_assessment' => 'nullable|date',
        ]);

        $totalSoal = (int) ($validated['total_soal'] ?? 50);
        $durasi = $request->filled('waktu_pengerjaan') ? (int) $validated['waktu_pengerjaan'] : null;

        // 1. Validate availability in Bank Soal for specific jenjang and mapel
        $availableCount = AssessmentSoalPilgan::where('idjenjang', $validated['idjenjang'])
            ->where('idmapel', $validated['idmapel'])
            ->count();

        if ($availableCount === 0) {
            return response()->json([
                'message' => 'Bank soal untuk jenjang dan mata pelajaran tersebut belum tersedia. Silakan upload bank soal terlebih dahulu.',
                'error_code' => 'EMPTY_QUESTION_BANK',
                'idjenjang' => $validated['idjenjang'],
                'idmapel' => $validated['idmapel'],
            ], 422);
        }

        // 2. Fetch random questions strictly for the requested jenjang & mapel
        $soalPool = AssessmentSoalPilgan::where('idjenjang', $validated['idjenjang'])
            ->where('idmapel', $validated['idmapel'])
            ->inRandomOrder()
            ->limit($totalSoal)
            ->get();

        $user = $this->resolveUser($request);
        $newAssessmentId = (string) (time() . rand(1000000, 9999999));

        // 2. Create the Assessment package
        $assessment = Assessment::create([
            'idassessment' => $newAssessmentId,
            'nama_assessment' => $validated['nama_assessment'],
            'deskripsi_assessment' => $validated['deskripsi_assessment'] ?? "TryOut 50 Soal Acak - Generate Otomatis",
            'idjenjang' => $validated['idjenjang'],
            'idmapel' => $validated['idmapel'],
            'idkelas' => $validated['idkelas'] ?? null,
            'id_tahun_ajaran' => $validated['id_tahun_ajaran'] ?? null,
            'iduser_bo' => $user ? $user->iduser_bo : null,
            'idkategori' => $user ? $user->idkategori : null,
            'waktu_pengerjaan' => $durasi,
            'tampil_assessment_pilgan' => $soalPool->count(),
            'tampil_assessment_essay' => 0,
            'harga_assessment' => 0,
            'diskon_assessment' => 0,
            'status_diskon' => '0',
            'point_assessment' => 0,
            'point_assessment_nama' => 'JPtest',
            'url_image_panjang' => '',
            'url_image_kotak' => '',
            'url_sertifikat_depan_template' => '',
            'url_sertifikat_belakang_template' => '',
            'url_logo_sponsor' => '',
            'tanggal_mulai_assessment' => $validated['tanggal_mulai_assessment'] ?? now(),
            'tanggal_batas_assessment' => $validated['tanggal_batas_assessment'] ?? now()->addDays(7),
            'tanggal_input' => now(),
        ]);

        // 3. Clone selected questions to this assessment package
        // This guarantees all students get the EXACT SAME 50 questions!
        foreach ($soalPool as $item) {
            $newSoalId = (string) (time() . rand(1000000, 9999999));
            AssessmentSoalPilgan::create([
                'idassessment_soal_pilgan' => $newSoalId,
                'idassessment' => $newAssessmentId,
                'idjenjang' => $validated['idjenjang'],
                'idmapel' => $validated['idmapel'],
                'soal_text' => $item->soal_text,
                'soal_gambar' => $item->soal_gambar,
                'pilihan_a_text' => $item->pilihan_a_text,
                'pilihan_a_gambar' => $item->pilihan_a_gambar,
                'pilihan_b_text' => $item->pilihan_b_text,
                'pilihan_b_gambar' => $item->pilihan_b_gambar,
                'pilihan_c_text' => $item->pilihan_c_text,
                'pilihan_c_gambar' => $item->pilihan_c_gambar,
                'pilihan_d_text' => $item->pilihan_d_text,
                'pilihan_d_gambar' => $item->pilihan_d_gambar,
                'pilihan_e_text' => $item->pilihan_e_text,
                'pilihan_e_gambar' => $item->pilihan_e_gambar,
                'jawaban' => $item->jawaban,
                'penjelasan_jawaban' => $item->penjelasan_jawaban,
                'tanggal_input' => now(),
            ]);
        }

        AuditLog::record(
            'GENERATE_SOAL',
            'assessment',
            $newAssessmentId,
            "Guru mengenerate {$soalPool->count()} butir soal acak dari Bank Soal ke paket: {$validated['nama_assessment']}",
            [
                'idjenjang' => $validated['idjenjang'],
                'idmapel' => $validated['idmapel'],
                'idkelas' => $validated['idkelas'] ?? null,
                'total_soal' => $soalPool->count(),
                'duration' => $durasi,
            ]
        );

        return response()->json([
            'message' => "Berhasil mengenerate {$soalPool->count()} soal acak dari Bank Soal ke dalam paket TryOut!",
            'data' => [
                'assessment' => $assessment,
                'total_generated' => $soalPool->count(),
                'assigned_class' => $assessment->kelas?->nama_kelas ?? 'Tersimpan di Bank Soal (Belum Ditugaskan)'
            ]
        ], 201);
    }

    /**
     * Assign package to a class
     */
    public function assignToClass(Request $request, $idassessment)
    {
        $request->validate([
            'idkelas' => 'required|exists:master_kelas,id'
        ]);

        $user = $this->resolveUser($request);
        $assessment = Assessment::findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment)) {
            return $deny;
        }

        $targetClass = MasterKelas::findOrFail($request->idkelas);
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$targetClass->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Kelas tidak berada dalam instansi Anda.'], 403);
        }

        $assessment->update([
            'idkelas' => $request->idkelas
        ]);

        AuditLog::record(
            'ASSIGN_KELAS',
            'assessment',
            $idassessment,
            "Paket TryOut {$assessment->nama_assessment} ditugaskan ke kelas ID {$request->idkelas}",
            ['idkelas' => $request->idkelas]
        );

        return response()->json([
            'message' => 'Paket TryOut berhasil ditugaskan ke kelas',
            'data' => $assessment->load('kelas')
        ]);
    }

    /**
     * Show package questions
     */
    public function show($idassessment, ...$extra)
    {
        $req = null;
        if ($idassessment instanceof Request) {
            $req = $idassessment;
            $idassessment = $extra[0] ?? $idassessment->route('idassessment') ?? $idassessment->route('exam') ?? $idassessment->route('package');
        }

        $user = $this->resolveUser($req);
        $assessment = Assessment::with(['jenjang', 'kelas', 'mapel', 'soal', 'examGroups'])->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment)) {
            return $deny;
        }

        return response()->json($assessment);
    }

    /**
     * List results of students who took this exam
     */
    public function results($idassessment, ...$extra)
    {
        $req = null;
        if ($idassessment instanceof Request) {
            $req = $idassessment;
            $idassessment = $extra[0] ?? $idassessment->route('idassessment');
        }

        $user = $this->resolveUser($req);
        $assessment = Assessment::with(['kelas', 'mapel'])->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment)) {
            return $deny;
        }

        $attempts = AssessmentJawabanPilgan::where('idassessment', $idassessment)
            ->with(['siswa.kelas'])
            ->orderBy('nilai', 'desc')
            ->get();

        $mapped = $attempts->map(function ($att) {
            return [
                'attempt_id' => $att->idassessment_jawaban_pilgan,
                'student_id' => $att->iduser,
                'student_name' => $att->siswa?->nama ?? 'Siswa',
                'student_nisn' => $att->siswa?->nisn ?? '-',
                'class_name' => $att->siswa?->kelas?->nama_kelas ?? '-',
                'score' => (float) $att->nilai,
                'time_spent' => $att->lama_dikerjakan ?: '-',
                'submitted_at' => $att->tgl_input_time,
            ];
        });

        return response()->json([
            'assessment' => [
                'id' => $assessment->idassessment,
                'title' => $assessment->nama_assessment,
                'subject' => $assessment->mapel?->nama_mapel,
                'class' => $assessment->kelas?->nama_kelas,
                'total_attempts' => $mapped->count(),
                'average_score' => $mapped->avg('score') ? round($mapped->avg('score'), 2) : 0,
                'highest_score' => $mapped->max('score') ?: 0,
                'lowest_score' => $mapped->min('score') ?: 0,
            ],
            'results' => $mapped
        ]);
    }

    /**
     * Delete package safely
     */
    public function destroy($idassessment, ...$extra)
    {
        $req = null;
        if ($idassessment instanceof Request) {
            $req = $idassessment;
            $idassessment = $extra[0] ?? $idassessment->route('idassessment') ?? $idassessment->route('exam') ?? $idassessment->route('package');
        }

        $user = $this->resolveUser($req);
        $assessment = Assessment::findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, true)) {
            return $deny;
        }

        // Clean up linked dependencies safely
        ExamGroup::where('exam_id', $idassessment)->delete();

        $attemptIds = AssessmentJawabanPilgan::where('idassessment', $idassessment)->pluck('idassessment_jawaban_pilgan');
        if ($attemptIds->isNotEmpty()) {
            AssessmentJawabanPilganDetail::whereIn('idassessment_jawaban_pilgan', $attemptIds)->delete();
            AssessmentJawabanPilgan::where('idassessment', $idassessment)->delete();
        }

        AssessmentSoalPilgan::where('idassessment', $idassessment)->delete();
        $assessment->delete();

        return response()->json([
            'message' => 'Paket TryOut berhasil dihapus'
        ]);
    }

    /**
     * Detailed Exam Report for Teachers (Statistics, Rankings, Question Item Analysis)
     */
    public function report($idassessment, ...$extra)
    {
        $req = null;
        if ($idassessment instanceof \Illuminate\Http\Request) {
            $req = $idassessment;
            $idassessment = $extra[0] ?? $idassessment->route('idassessment');
        }

        $user = $this->resolveUser($req);
        $assessment = Assessment::with(['mapel', 'jenjang', 'kelas', 'soal'])->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment)) {
            return $deny;
        }

        $questions = $assessment->soal;
        $totalQuestions = $questions->count();

        // Get all student attempts
        $attempts = AssessmentJawabanPilgan::where('idassessment', $idassessment)
            ->with(['siswa.kelas', 'details'])
            ->get();

        // Requirement 2: KKM Dinamis per Jenjang & Mapel
        $kkm = (float) ($assessment->mapel?->kkm ?: 75);
        $completed = $attempts->where('komentar', 'submitted');
        $inProgress = $attempts->where('komentar', '!=', 'submitted');

        $scores = $completed->pluck('nilai')->map(fn($v) => (float)$v);
        $avgScore = $scores->count() > 0 ? round($scores->avg(), 1) : 0;
        $maxScore = $scores->count() > 0 ? (float)$scores->max() : 0;
        $minScore = $scores->count() > 0 ? (float)$scores->min() : 0;

        $passedCount = $scores->filter(fn($s) => $s >= $kkm)->count();
        $remedialCount = $scores->filter(fn($s) => $s < $kkm)->count();
        $passRate = $scores->count() > 0 ? round(($passedCount / max(1, $scores->count())) * 100, 1) : 0;

        // Score distribution
        $distribution = [
            'range_0_20' => $scores->filter(fn($s) => $s >= 0 && $s <= 20)->count(),
            'range_21_40' => $scores->filter(fn($s) => $s > 20 && $s <= 40)->count(),
            'range_41_60' => $scores->filter(fn($s) => $s > 40 && $s <= 60)->count(),
            'range_61_80' => $scores->filter(fn($s) => $s > 60 && $s <= 80)->count(),
            'range_81_100' => $scores->filter(fn($s) => $s > 80 && $s <= 100)->count(),
        ];

        // Build students report list sorted by score descending
        $sortedAttempts = $attempts->sortByDesc(fn($att) => (float)$att->nilai)->values();
        $studentsReport = [];
        $rank = 1;

        foreach ($sortedAttempts as $att) {
            $details = $att->details->keyBy('idassessment_soal_pilgan');
            $correct = 0;
            $incorrect = 0;
            $unanswered = 0;

            foreach ($questions as $q) {
                $det = $details->get($q->idassessment_soal_pilgan);
                if (!$det || empty($det->jawaban)) {
                    $unanswered++;
                } elseif (strtoupper(trim($det->jawaban)) === strtoupper(trim($q->jawaban))) {
                    $correct++;
                } else {
                    $incorrect++;
                }
            }

            $score = $att->komentar === 'submitted' ? (float)$att->nilai : null;
            $isPassed = $score !== null && $score >= $kkm;

            $studentsReport[] = [
                'rank' => $rank++,
                'attempt_id' => $att->idassessment_jawaban_pilgan,
                'student_id' => $att->iduser,
                'name' => $att->siswa?->nama ?? 'Siswa',
                'username' => $att->siswa?->login_email ?? $att->siswa?->nisn ?? 'siswa',
                'nisn' => $att->siswa?->nisn ?? '-',
                'nis' => $att->siswa?->nisn ?? '-',
                'class_name' => $att->siswa?->kelas?->nama_kelas ?? $assessment->kelas?->nama_kelas ?? 'Umum',
                'major_name' => $assessment->jenjang?->nama_jenjang ?? 'Umum',
                'status' => $att->komentar === 'submitted' ? 'completed' : 'in_progress',
                'total_score' => $score,
                'is_passed' => $isPassed,
                'kkm' => $kkm,
                'started_at' => $att->tgl_input_time,
                'submitted_at' => $att->komentar === 'submitted' ? $att->tgl_input_time : null,
                'duration_minutes' => $att->lama_dikerjakan ?: '-',
                'correct_count' => $correct,
                'incorrect_count' => $incorrect,
                'unanswered_count' => $unanswered,
                'violation_count' => 0,
            ];
        }

        // Requirement 8: Siswa terdaftar yang belum ujian TETAP DITAMPILKAN
        $attemptedUserIds = $attempts->pluck('iduser')->filter()->toArray();
        $targetClassId = $assessment->idkelas;
        $enrolledStudents = collect();

        if ($targetClassId) {
            $enrolledStudents = \App\Models\UserSiswa::where('idkelas', $targetClassId)
                ->where('status_aktif', '!=', 'N')
                ->whereNotIn('iduser', $attemptedUserIds)
                ->get();
        } elseif ($assessment->idkategori) {
            $enrolledStudents = \App\Models\UserSiswa::where('idkategori', $assessment->idkategori)
                ->where('status_aktif', '!=', 'N')
                ->whereNotIn('iduser', $attemptedUserIds)
                ->limit(50)
                ->get();
        }

        foreach ($enrolledStudents as $st) {
            $studentsReport[] = [
                'rank' => $rank++,
                'attempt_id' => null,
                'student_id' => $st->iduser,
                'name' => $st->nama,
                'username' => $st->login_email ?? $st->nisn ?? 'siswa',
                'nisn' => $st->nisn ?? '-',
                'nis' => $st->nisn ?? '-',
                'class_name' => $st->kelas?->nama_kelas ?? $assessment->kelas?->nama_kelas ?? 'Umum',
                'major_name' => $assessment->jenjang?->nama_jenjang ?? 'Umum',
                'status' => 'unattempted', // Belum Mengerjakan (Requirement 8)
                'total_score' => 0,
                'is_passed' => false,
                'kkm' => $kkm,
                'started_at' => null,
                'submitted_at' => null,
                'duration_minutes' => '-',
                'correct_count' => 0,
                'incorrect_count' => 0,
                'unanswered_count' => $totalQuestions,
                'violation_count' => 0,
            ];
        }

        // Build item analysis
        $itemAnalysis = [];
        $qNum = 1;

        foreach ($questions as $q) {
            $answeredTotal = 0;
            $qCorrect = 0;
            $qIncorrect = 0;

            foreach ($attempts as $att) {
                $det = $att->details->firstWhere('idassessment_soal_pilgan', $q->idassessment_soal_pilgan);
                if ($det && !empty($det->jawaban)) {
                    $answeredTotal++;
                    if (strtoupper(trim($det->jawaban)) === strtoupper(trim($q->jawaban))) {
                        $qCorrect++;
                    } else {
                        $qIncorrect++;
                    }
                }
            }

            $totalP = max(1, $attempts->count());
            $unans = $totalP - $answeredTotal;
            $accuracy = $totalP > 0 ? round(($qCorrect / $totalP) * 100, 1) : 0;

            $category = 'Sedang';
            if ($accuracy >= 75) $category = 'Mudah';
            elseif ($accuracy < 40) $category = 'Sukar';

            $itemAnalysis[] = [
                'number' => $qNum++,
                'question_id' => $q->idassessment_soal_pilgan,
                'type' => 'multiple_choice_single',
                'content_preview' => strip_tags(substr($q->soal_text ?: 'Soal', 0, 80)),
                'topic' => $assessment->mapel?->nama_mapel ?? 'Umum',
                'difficulty' => $category,
                'weight' => 2,
                'total_answered' => $answeredTotal,
                'correct_count' => $qCorrect,
                'incorrect_count' => $qIncorrect,
                'unanswered_count' => max(0, $unans),
                'accuracy_rate' => $accuracy,
                'performance_category' => $category,
            ];
        }

        return response()->json([
            'exam' => [
                'id' => $assessment->idassessment,
                'title' => $assessment->nama_assessment,
                'subject_name' => $assessment->mapel?->nama_mapel ?? 'Umum',
                'subject_code' => $assessment->mapel?->kode_mapel ?? 'TRYOUT',
                'academic_year' => '2026/2027',
                'duration_minutes' => (int) ($assessment->waktu_pengerjaan ?: 60),
                'start_time' => $assessment->tanggal_mulai_assessment,
                'end_time' => $assessment->tanggal_batas_assessment,
                'kkm_score' => $kkm,
                'status' => 'published',
                'total_questions' => $totalQuestions,
                'total_weight' => $totalQuestions * 2,
            ],
            'statistics' => [
                'total_participants' => $attempts->count(),
                'completed_count' => $completed->count(),
                'in_progress_count' => $inProgress->count(),
                'disqualified_count' => 0,
                'not_started_count' => 0,
                'average_score' => $avgScore,
                'highest_score' => $maxScore,
                'lowest_score' => $minScore,
                'passed_count' => $passedCount,
                'remedial_count' => $remedialCount,
                'pass_rate_percent' => $passRate,
                'score_distribution' => $distribution,
            ],
            'students' => $studentsReport,
            'item_analysis' => $itemAnalysis,
        ]);
    }

    /**
     * Export Exam Report to Excel (.xls)
     */
    public function exportReport($idassessment, ...$extra)
    {
        $req = null;
        if ($idassessment instanceof \Illuminate\Http\Request) {
            $req = $idassessment;
            $idassessment = $extra[0] ?? $idassessment->route('idassessment');
        }

        $reportResponse = $this->report($req ?: $idassessment, $idassessment);
        if ($reportResponse->status() === 403 || $reportResponse->status() === 401) {
            return $reportResponse;
        }

        $reportData = $reportResponse->getData(true);
        $exam = $reportData['exam'];
        $students = $reportData['students'];

        $filename = "Laporan_Hasil_Ujian_" . preg_replace('/[^A-Za-z0-9_]/', '_', $exam['title']) . ".xls";

        $output = "<html><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" /></head><body>";
        $output .= "<h2>LAPORAN HASIL TRYOUT - " . $this->sanitizeCellForExcel($exam['title']) . "</h2>";
        $output .= "<p>Mata Pelajaran: " . $this->sanitizeCellForExcel($exam['subject_name']) . " | KKM: " . $this->sanitizeCellForExcel($exam['kkm_score']) . " | Total Peserta: " . count($students) . "</p>";
        $output .= "<table border='1' cellspacing='0' cellpadding='5'>";
        $output .= "<tr style='background-color:#4f46e5;color:#ffffff;font-weight:bold;'>";
        $output .= "<th>Peringkat</th><th>NISN</th><th>Nama Siswa</th><th>Kelas</th><th>Skor Akhir</th><th>Status</th><th>Benar</th><th>Salah</th><th>Kosong</th><th>Waktu</th>";
        $output .= "</tr>";

        foreach ($students as $st) {
            $statusText = ($st['status'] === 'disqualified') ? 'Didiskualifikasi' : ($st['is_passed'] ? 'Lulus KKM' : 'Remedial');
            $scoreText = ($st['total_score'] !== null) ? $st['total_score'] : '-';
            $output .= "<tr>";
            $output .= "<td align='center'>" . $this->sanitizeCellForExcel($st['rank']) . "</td>";
            $output .= "<td style='mso-number-format:\"\\@\";'>" . $this->sanitizeCellForExcel($st['nisn']) . "</td>";
            $output .= "<td>" . $this->sanitizeCellForExcel($st['name']) . "</td>";
            $output .= "<td>" . $this->sanitizeCellForExcel($st['class_name']) . "</td>";
            $output .= "<td align='center'><b>" . $this->sanitizeCellForExcel($scoreText) . "</b></td>";
            $output .= "<td align='center'>" . $this->sanitizeCellForExcel($statusText) . "</td>";
            $output .= "<td align='center'>" . $this->sanitizeCellForExcel($st['correct_count']) . "</td>";
            $output .= "<td align='center'>" . $this->sanitizeCellForExcel($st['incorrect_count']) . "</td>";
            $output .= "<td align='center'>" . $this->sanitizeCellForExcel($st['unanswered_count']) . "</td>";
            $output .= "<td align='center'>" . $this->sanitizeCellForExcel($st['duration_minutes'] ?: '-') . "</td>";
            $output .= "</tr>";
        }

        $output .= "</table></body></html>";

        return response($output, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * View detailed answers of a specific student attempt
     */
    public function attemptDetail($idassessment, $attemptId = null, ...$extra)
    {
        $req = null;
        if ($idassessment instanceof \Illuminate\Http\Request) {
            $req = $idassessment;
            $idassessment = $attemptId;
            $attemptId = $extra[0] ?? $req->route('attemptId');
        }

        $user = $this->resolveUser($req);
        $attempt = AssessmentJawabanPilgan::with(['assessment.soal', 'details', 'siswa.kelas'])
            ->where('idassessment_jawaban_pilgan', $attemptId)
            ->where('idassessment', $idassessment)
            ->firstOrFail();

        if ($deny = $this->authorizeExamAccess($user, $attempt->assessment)) {
            return $deny;
        }

        $questions = $attempt->assessment->soal;
        $savedAnswers = $attempt->details->keyBy('idassessment_soal_pilgan');

        $detailList = [];
        $qIdx = 1;

        foreach ($questions as $q) {
            $studentAns = $savedAnswers->get($q->idassessment_soal_pilgan);
            $chosen = $studentAns ? strtoupper(trim($studentAns->jawaban)) : null;
            $correctKey = strtoupper(trim($q->jawaban));
            $isCorrect = ($chosen !== null && $chosen === $correctKey);

            $options = [];
            if (!empty($q->pilihan_a_text) || !empty($q->pilihan_a_gambar)) {
                $options[] = ['key' => 'A', 'content' => $q->pilihan_a_text ?: 'Pilihan A', 'media' => $q->pilihan_a_gambar];
            }
            if (!empty($q->pilihan_b_text) || !empty($q->pilihan_b_gambar)) {
                $options[] = ['key' => 'B', 'content' => $q->pilihan_b_text ?: 'Pilihan B', 'media' => $q->pilihan_b_gambar];
            }
            if (!empty($q->pilihan_c_text) || !empty($q->pilihan_c_gambar)) {
                $options[] = ['key' => 'C', 'content' => $q->pilihan_c_text ?: 'Pilihan C', 'media' => $q->pilihan_c_gambar];
            }
            if (!empty($q->pilihan_d_text) || !empty($q->pilihan_d_gambar)) {
                $options[] = ['key' => 'D', 'content' => $q->pilihan_d_text ?: 'Pilihan D', 'media' => $q->pilihan_d_gambar];
            }
            if (!empty($q->pilihan_e_text) || !empty($q->pilihan_e_gambar)) {
                $options[] = ['key' => 'E', 'content' => $q->pilihan_e_text ?: 'Pilihan E', 'media' => $q->pilihan_e_gambar];
            }

            $detailList[] = [
                'number' => $qIdx++,
                'question_id' => $q->idassessment_soal_pilgan,
                'soal_text' => $q->soal_text ?: 'Pertanyaan',
                'soal_gambar' => $q->soal_gambar,
                'options' => $options,
                'student_answer' => $chosen,
                'correct_answer' => $correctKey,
                'is_correct' => $isCorrect,
                'explanation' => $q->penjelasan_jawaban ?: 'Tidak ada pembahasan khusus untuk nomor ini.',
            ];
        }

        return response()->json([
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'student_name' => $attempt->siswa?->nama ?? 'Siswa',
                'student_nisn' => $attempt->siswa?->nisn ?? '-',
                'class_name' => $attempt->siswa?->kelas?->nama_kelas ?? '-',
                'score' => (float)$attempt->nilai,
                'status' => $attempt->komentar === 'submitted' ? 'completed' : 'in_progress',
                'submitted_at' => $attempt->tgl_input_time,
                'time_spent' => $attempt->lama_dikerjakan ?: '-',
            ],
            'questions' => $detailList,
        ]);
    }
}
