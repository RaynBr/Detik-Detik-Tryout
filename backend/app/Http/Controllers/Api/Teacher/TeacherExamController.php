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
use App\Models\BankSoalGlobal;
use App\Models\BankSoalGlobalDetail;
use App\Models\BankSoalGuru;
use App\Models\BankSoalGuruDetail;
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
    protected function authorizeExamAccess($user, Assessment $assessment, bool $strictOwnerOnly = false, bool $isWriteOperation = false): ?\Illuminate\Http\JsonResponse
    {
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->role === 'super_admin') {
            return null;
        }

        // Admin Instansi check
        if ($user->role === 'admin' || $user->role === 'admin_instansi') {
            // Cannot modify exams that explicitly belong to a different institution
            if (!empty($user->idkategori) && !empty($assessment->idkategori) 
                && (string)$assessment->idkategori !== (string)$user->idkategori 
                && (string)$assessment->idkategori !== '27830150842287772') {
                return response()->json(['message' => 'Akses ditolak: Anda hanya dapat mengelola ujian di instansi Anda.'], 403);
            }
            return null;
        }

        // Guru check
        if ($user->role === 'guru') {
            if ($strictOwnerOnly) {
                if (!empty($assessment->iduser_bo) && (string)$assessment->iduser_bo !== (string)$user->iduser_bo) {
                    return response()->json(['message' => 'Akses ditolak: Guru hanya dapat mengelola atau menghapus paket ujian yang dibuat sendiri.'], 403);
                }
            }

            // Cannot modify exams that explicitly belong to a different institution
            if (!empty($user->idkategori) && !empty($assessment->idkategori) 
                && (string)$assessment->idkategori !== (string)$user->idkategori 
                && (string)$assessment->idkategori !== '27830150842287772') {
                return response()->json(['message' => 'Akses ditolak: Anda hanya dapat mengakses ujian di instansi Anda.'], 403);
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
                
                $isLocked = (bool) ($item->is_locked || ($item->attempts_count > 0));
                $statusPaket = $item->status_paket;
                if (!$statusPaket) {
                    $statusPaket = $isLocked ? 'terkunci' : ($item->status_aktif === 'Y' ? 'aktif' : 'draft');
                }

                $status = 'published';
                if ($statusPaket === 'draft' || $item->status_aktif === 'N') {
                    $status = 'draft';
                } elseif ($start && $now->lt($start)) {
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
                    'status_aktif' => $item->status_aktif,
                    'status_paket' => $statusPaket,
                    'is_locked' => $isLocked,
                    'locked_at' => $item->locked_at,
                    'can_edit' => !$isLocked,
                    'exam_groups_count' => $item->examGroups->count(),
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
            
            $isLocked = (bool) ($item->is_locked || ($item->attempts_count > 0));
            $statusPaket = $item->status_paket;
            if (!$statusPaket) {
                $statusPaket = $isLocked ? 'terkunci' : ($item->status_aktif === 'Y' ? 'aktif' : 'draft');
            }

            $status = 'published';
            if ($statusPaket === 'draft' || $item->status_aktif === 'N') {
                $status = 'draft';
            } elseif ($start && $now->lt($start)) {
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
                'status_aktif' => $item->status_aktif,
                'status_paket' => $statusPaket,
                'is_locked' => $isLocked,
                'locked_at' => $item->locked_at,
                'can_edit' => !$isLocked,
                'exam_groups_count' => $item->examGroups->count(),
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

        $idmapel = $request->input('idmapel') ?: $request->input('subject_id') ?: null;
        $idjenjang = $request->input('idjenjang') ?: null;
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
        $sourceType = $request->input('source_type') ?: 'gabungan';
        $idkurikulum = $request->input('idkurikulum') ?: null;
        $idtingkat = $request->input('idtingkat') ?: null;
        $acakSoal = $request->boolean('acak_soal', true);
        $acakOpsi = $request->boolean('acak_opsi', true);

        // Auto-resolve academic context from Kelola Kelas & Rombel if selected
        if ($idkelas) {
            $kelasObj = MasterKelas::with(['guruMataPelajaran'])->find($idkelas);
            if ($kelasObj) {
                if (!$idjenjang) $idjenjang = $kelasObj->idjenjang;
                if (!$idkurikulum) $idkurikulum = $kelasObj->kurikulum_id;
                if (!$idtingkat) $idtingkat = $kelasObj->idtingkat;
                if (!$idTahunAjaran) $idTahunAjaran = $kelasObj->academic_year_id;
                if (!$idmapel && $user) {
                    $assigned = $kelasObj->guruMataPelajaran->where('iduser_bo', $user->iduser_bo)->first();
                    if ($assigned) $idmapel = $assigned->idmapel;
                }
            }
        }
        if (!$idjenjang) $idjenjang = 1;
        if (!$idmapel) $idmapel = 1;
        if (!$idTahunAjaran) {
            $idTahunAjaran = \App\Models\AcademicYear::where('is_active', 1)->value('id') ?? 1;
        }
        $tahunSoalId = $request->input('tahun_soal_id') ?: (\App\Models\MasterTahunSoal::where('is_active', 1)->value('id') ?? 1);

        $item = Assessment::create([
            'idassessment' => $idassessment,
            'nama_assessment' => $title,
            'deskripsi_assessment' => $request->input('deskripsi_assessment') ?? $request->input('description') ?? '',
            'idjenjang' => $idjenjang,
            'idmapel' => $idmapel,
            'idkelas' => $idkelas,
            'idkurikulum' => $idkurikulum,
            'id_tahun_ajaran' => $idTahunAjaran,
            'tahun_soal_id' => $tahunSoalId,
            'source_type' => $sourceType,
            'acak_soal' => $acakSoal,
            'acak_opsi' => $acakOpsi,
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
            'status_aktif' => $request->input('status_aktif', 'Y'),
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
                'idkurikulum' => $sq->idkurikulum ?: $idkurikulum,
                'idtingkat' => $sq->idtingkat ?: $idtingkat,
                'bab' => $sq->bab,
                'tingkat_kesulitan' => $sq->tingkat_kesulitan,
                'source_type' => $sq->source_type ?: 'guru',
                'tahun_soal_id' => $sq->tahun_soal_id,
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

        if ($deny = $this->authorizeExamAccess($user, $item, false, true)) {
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
        if ($request->has('status')) {
            $st = strtolower((string)$request->input('status'));
            if ($st === 'published' || $st === 'aktif') {
                $updates['status_paket'] = 'aktif';
                $updates['status_aktif'] = 'Y';
            } elseif ($st === 'draft') {
                $updates['status_paket'] = 'draft';
                $updates['status_aktif'] = 'N';
            } elseif ($st === 'closed' || $st === 'selesai' || $st === 'terkunci') {
                $updates['status_paket'] = 'selesai';
                $updates['status_aktif'] = 'N';
            }
        } elseif ($request->has('status_aktif')) {
            $statusAktif = $request->input('status_aktif');
            $isAktif = !in_array(strtolower((string)$statusAktif), ['n', 'nonaktif', '0', 'false'], true);
            $updates['status_aktif'] = $isAktif ? 'Y' : 'N';
            $updates['status_paket'] = $isAktif ? 'aktif' : 'draft';
        }

        // Bind unassigned or global package to current user's school if edited by admin or teacher
        if ($user && !empty($user->idkategori) && (empty($item->idkategori) || (string)$item->idkategori === '27830150842287772')) {
            $updates['idkategori'] = $user->idkategori;
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
     * Generate Random Questions from Bank Soal
     * User Requirement:
     * - Sumber soal: Bank Soal Nasional (Super Admin), Bank Soal Guru, atau Gabungan Keduanya
     * - Filter: Jenjang, Kurikulum, Mapel, Bab, Tingkat Kesulitan, Tahun Soal, Jumlah Soal, Acak Soal, Acak Pilihan
     */
    public function generateRandom50(Request $request)
    {
        $validated = $request->validate([
            'nama_assessment' => 'required|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idjenjang' => 'nullable|integer',
            'idmapel' => 'nullable|integer',
            'idkurikulum' => 'nullable|integer',
            'idtingkat' => 'nullable|integer',
            'idkelas' => 'nullable|integer',
            'id_tahun_ajaran' => 'nullable|integer',
            'tahun_soal_id' => 'nullable|integer',
            'bab' => 'nullable|string|max:100',
            'tingkat_kesulitan' => 'nullable|string|max:50',
            'source_type' => 'nullable|string|in:nasional,guru,gabungan',
            'total_soal' => 'nullable|integer|min:1|max:200',
            'soal_nasional_count' => 'nullable|integer|min:0',
            'soal_guru_count' => 'nullable|integer|min:0',
            'acak_soal' => 'nullable|boolean',
            'acak_opsi' => 'nullable|boolean',
            'waktu_pengerjaan' => 'nullable|integer|min:1|max:300',
            'tanggal_mulai_assessment' => 'nullable|date',
            'tanggal_batas_assessment' => 'nullable|date',
        ]);

        $user = $this->resolveUser($request);

        // Auto-resolve academic context from Kelola Kelas & Rombel if selected
        if (!empty($validated['idkelas'])) {
            $kelasObj = MasterKelas::with(['guruMataPelajaran'])->find($validated['idkelas']);
            if ($kelasObj) {
                if (empty($validated['idjenjang'])) $validated['idjenjang'] = $kelasObj->idjenjang;
                if (empty($validated['idkurikulum'])) $validated['idkurikulum'] = $kelasObj->kurikulum_id;
                if (empty($validated['idtingkat'])) $validated['idtingkat'] = $kelasObj->idtingkat;
                if (empty($validated['id_tahun_ajaran'])) $validated['id_tahun_ajaran'] = $kelasObj->academic_year_id;
                if (empty($validated['idmapel']) && $user) {
                    $assigned = $kelasObj->guruMataPelajaran->where('iduser_bo', $user->iduser_bo)->first();
                    if ($assigned) $validated['idmapel'] = $assigned->idmapel;
                }
            }
        }

        if (empty($validated['idjenjang'])) $validated['idjenjang'] = 1;
        if (empty($validated['idmapel'])) $validated['idmapel'] = 1;
        $totalSoal = (int) ($validated['total_soal'] ?? 50);
        $durasi = $request->filled('waktu_pengerjaan') ? (int) $validated['waktu_pengerjaan'] : null;
        $sourceType = $validated['source_type'] ?? 'nasional';
        $acakSoal = $request->boolean('acak_soal', true);
        $acakOpsi = $request->boolean('acak_opsi', true);

        // Base query with academic master filters
        $applyFilters = function ($q) use ($validated) {
            $q->where('idjenjang', $validated['idjenjang'])
              ->where('idmapel', $validated['idmapel']);

            if (!empty($validated['idkurikulum'])) {
                $q->where('idkurikulum', $validated['idkurikulum']);
            }
            if (!empty($validated['idtingkat'])) {
                $q->where('idtingkat', $validated['idtingkat']);
            }
            if (!empty($validated['tahun_soal_id'])) {
                $q->where('tahun_soal_id', $validated['tahun_soal_id']);
            }
            if (!empty($validated['bab'])) {
                $q->where('bab', 'like', "%{$validated['bab']}%");
            }
            if (!empty($validated['tingkat_kesulitan'])) {
                $q->where('tingkat_kesulitan', $validated['tingkat_kesulitan']);
            }
        };

        $soalPool = collect();

        if ($sourceType === 'nasional') {
            $nasionalQuery = BankSoalGlobalDetail::where('status_aktif', 'Y');
            $applyFilters($nasionalQuery);
            $soalPool = $nasionalQuery->inRandomOrder()->limit($totalSoal)->get();

            // Fallback to AssessmentSoalPilgan if BankSoalGlobalDetail has fewer results
            if ($soalPool->isEmpty()) {
                $fallbackQuery = AssessmentSoalPilgan::where('source_type', 'nasional');
                $applyFilters($fallbackQuery);
                $soalPool = $fallbackQuery->inRandomOrder()->limit($totalSoal)->get();
            }
        } elseif ($sourceType === 'guru') {
            $guruQuery = BankSoalGuruDetail::where('status_aktif', 'Y')
                ->where(function ($q) use ($user) {
                    if ($user) {
                        $q->where('id_guru', $user->iduser_bo);
                        if (!empty($user->idkategori)) {
                            $q->orWhere('id_instansi', $user->idkategori);
                        }
                    }
                });
            $applyFilters($guruQuery);
            $soalPool = $guruQuery->inRandomOrder()->limit($totalSoal)->get();

            // Fallback to AssessmentSoalPilgan
            if ($soalPool->isEmpty()) {
                $fallbackGuru = AssessmentSoalPilgan::where('source_type', 'guru')
                    ->where(function ($q) use ($user) {
                        if ($user) {
                            $q->where('iduser_bo', $user->iduser_bo);
                            if (!empty($user->idkategori)) {
                                $q->orWhereHas('creator', fn($c) => $c->where('idkategori', $user->idkategori));
                            }
                        }
                    });
                $applyFilters($fallbackGuru);
                $soalPool = $fallbackGuru->inRandomOrder()->limit($totalSoal)->get();
            }
        } else {
            // Gabungan Keduanya
            $countNasional = $request->has('soal_nasional_count') ? (int) $request->soal_nasional_count : (int) ceil($totalSoal / 2);
            $countGuru = $request->has('soal_guru_count') ? (int) $request->soal_guru_count : (int) ($totalSoal - $countNasional);

            // Fetch from Bank Soal Global
            $nasionalQuery = BankSoalGlobalDetail::where('status_aktif', 'Y');
            $applyFilters($nasionalQuery);
            $nasionalSoal = $nasionalQuery->inRandomOrder()->limit($countNasional)->get();
            if ($nasionalSoal->isEmpty()) {
                $fallbackNas = AssessmentSoalPilgan::where('source_type', 'nasional');
                $applyFilters($fallbackNas);
                $nasionalSoal = $fallbackNas->inRandomOrder()->limit($countNasional)->get();
            }

            // Fetch from Guru
            $guruQuery = BankSoalGuruDetail::where('status_aktif', 'Y')
                ->where(function ($q) use ($user) {
                    if ($user) {
                        $q->where('id_guru', $user->iduser_bo);
                        if (!empty($user->idkategori)) {
                            $q->orWhere('id_instansi', $user->idkategori);
                        }
                    }
                });
            $applyFilters($guruQuery);
            $guruSoal = $guruQuery->inRandomOrder()->limit($countGuru)->get();
            if ($guruSoal->isEmpty()) {
                $fallbackGuru = AssessmentSoalPilgan::where('source_type', 'guru')
                    ->where(function ($q) use ($user) {
                        if ($user) {
                            $q->where('iduser_bo', $user->iduser_bo);
                            if (!empty($user->idkategori)) {
                                $q->orWhereHas('creator', fn($c) => $c->where('idkategori', $user->idkategori));
                            }
                        }
                    });
                $applyFilters($fallbackGuru);
                $guruSoal = $fallbackGuru->inRandomOrder()->limit($countGuru)->get();
            }

            $soalPool = $nasionalSoal->concat($guruSoal);

            // If combined total is less than requested, fill remainder from Bank Soal Global
            if ($soalPool->count() < $totalSoal) {
                $existingIds = $soalPool->pluck('id')->toArray();
                $remainderCount = $totalSoal - $soalPool->count();
                $extraQuery = BankSoalGlobalDetail::where('status_aktif', 'Y')->whereNotIn('id', $existingIds);
                $applyFilters($extraQuery);
                $extraSoal = $extraQuery->inRandomOrder()->limit($remainderCount)->get();
                $soalPool = $soalPool->concat($extraSoal);
            }
        }

        if ($soalPool->isEmpty()) {
            return response()->json([
                'message' => 'Tidak ditemukan butir soal yang sesuai dengan kombinasi filter dan sumber Bank Soal Global (' . strtoupper($sourceType) . ') yang dipilih. Silakan sesuaikan kriteria.',
                'error_code' => 'EMPTY_QUESTION_BANK',
                'source_type' => $sourceType,
            ], 422);
        }

        $newAssessmentId = (string) (time() . rand(1000000, 9999999));

        // Generated exams start in DRAFT status so teachers can review, add, replace, and reorder questions freely
        $assessment = Assessment::create([
            'idassessment' => $newAssessmentId,
            'nama_assessment' => $validated['nama_assessment'],
            'deskripsi_assessment' => $validated['deskripsi_assessment'] ?? "TryOut {$soalPool->count()} Soal Acak - Generate Otomatis ({$sourceType})",
            'idjenjang' => $validated['idjenjang'],
            'idmapel' => $validated['idmapel'],
            'idkurikulum' => $validated['idkurikulum'] ?? null,
            'source_type' => $sourceType,
            'acak_soal' => $acakSoal,
            'acak_opsi' => $acakOpsi,
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
            'status_aktif' => 'N',
            'status_paket' => 'draft',
            'is_locked' => false,
            'tanggal_input' => now(),
        ]);

        // Clone selected questions to this assessment package preserving full metadata & urutan
        $orderNum = 1;
        foreach ($soalPool as $item) {
            $newSoalId = (string) (time() . rand(1000000, 9999999));
            AssessmentSoalPilgan::create([
                'idassessment_soal_pilgan' => $newSoalId,
                'idassessment' => $newAssessmentId,
                'idjenjang' => $validated['idjenjang'],
                'idmapel' => $validated['idmapel'],
                'idkurikulum' => $item->idkurikulum ?: ($validated['idkurikulum'] ?? null),
                'idtingkat' => $item->idtingkat ?: ($validated['idtingkat'] ?? null),
                'bab' => $item->bab,
                'tingkat_kesulitan' => $item->tingkat_kesulitan,
                'source_type' => $item->source_type ?: 'nasional',
                'tahun_soal_id' => $item->tahun_soal_id,
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
                'is_annulled' => false,
                'urutan' => $orderNum++,
                'tanggal_input' => now(),
            ]);
        }

        AuditLog::record(
            'GENERATE_SOAL',
            'assessment',
            $newAssessmentId,
            "Guru mengenerate {$soalPool->count()} butir soal acak (sumber: {$sourceType}) ke paket: {$validated['nama_assessment']}",
            [
                'idjenjang' => $validated['idjenjang'],
                'idmapel' => $validated['idmapel'],
                'idkurikulum' => $validated['idkurikulum'] ?? null,
                'idtingkat' => $validated['idtingkat'] ?? null,
                'source_type' => $sourceType,
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
     * Pilihan 2: Buat Jadwal Ujian dengan Menyalin Paket Bank Soal Global
     */
    public function copyFromGlobalPackage(Request $request)
    {
        $validated = $request->validate([
            'package_id' => 'required',
            'nama_assessment' => 'nullable|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idkelas' => 'nullable|integer',
            'id_tahun_ajaran' => 'nullable|integer',
            'waktu_pengerjaan' => 'nullable|integer|min:1|max:300',
            'tanggal_mulai_assessment' => 'nullable|date',
            'tanggal_batas_assessment' => 'nullable|date',
            'acak_soal' => 'nullable|boolean',
            'acak_opsi' => 'nullable|boolean',
        ]);

        $user = $this->resolveUser($request);
        $packageId = (string) $validated['package_id'];

        $globalPkg = BankSoalGlobal::with(['soal' => fn($q) => $q->where('status_aktif', 'Y')])->find($packageId);

        // Fallback to Assessment if not in bank_soal_global
        if (!$globalPkg) {
            $fallbackAssessment = Assessment::with(['soal' => fn($q) => $q->where('status_aktif', 'Y')])->find($packageId);
            if (!$fallbackAssessment) {
                return response()->json(['message' => 'Paket Bank Soal Global tidak ditemukan.'], 404);
            }
            $namaUjian = $validated['nama_assessment'] ?: $fallbackAssessment->nama_assessment;
            $idjenjang = $fallbackAssessment->idjenjang;
            $idmapel = $fallbackAssessment->idmapel;
            $idtingkat = $fallbackAssessment->idtingkat;
            $sourceQuestions = $fallbackAssessment->soal;
        } else {
            $namaUjian = $validated['nama_assessment'] ?: $globalPkg->nama_paket;
            $idjenjang = $globalPkg->idjenjang;
            $idmapel = $globalPkg->idmapel;
            $idtingkat = $globalPkg->idtingkat;
            $sourceQuestions = $globalPkg->soal;
        }

        if ($sourceQuestions->isEmpty()) {
            return response()->json(['message' => 'Paket yang dipilih belum memiliki butir soal.'], 422);
        }

        $newAssessmentId = (string) (time() . rand(1000000, 9999999));
        $durasi = $request->filled('waktu_pengerjaan') ? (int) $validated['waktu_pengerjaan'] : 90;

        $newExam = Assessment::create([
            'idassessment' => $newAssessmentId,
            'nama_assessment' => $namaUjian,
            'deskripsi_assessment' => $validated['deskripsi_assessment'] ?? "Ujian CBT disalin dari Paket Bank Soal Global",
            'idjenjang' => $idjenjang ?: 1,
            'idmapel' => $idmapel ?: 1,
            'idtingkat' => $idtingkat,
            'idkelas' => $validated['idkelas'] ?? null,
            'id_tahun_ajaran' => $validated['id_tahun_ajaran'] ?? null,
            'source_type' => 'nasional',
            'acak_soal' => $request->boolean('acak_soal', true),
            'acak_opsi' => $request->boolean('acak_opsi', true),
            'iduser_bo' => $user ? $user->iduser_bo : null,
            'idkategori' => $user ? $user->idkategori : null,
            'waktu_pengerjaan' => $durasi,
            'tampil_assessment_pilgan' => $sourceQuestions->count(),
            'tampil_assessment_essay' => 0,
            'tanggal_mulai_assessment' => $validated['tanggal_mulai_assessment'] ?? now(),
            'tanggal_batas_assessment' => $validated['tanggal_batas_assessment'] ?? now()->addDays(7),
            'status_aktif' => 'Y',
            'status_paket' => 'published',
            'is_locked' => false,
            'tanggal_input' => now(),
        ]);

        $orderNum = 1;
        foreach ($sourceQuestions as $sq) {
            $newSoalId = (string) (time() . rand(1000000, 9999999));
            AssessmentSoalPilgan::create([
                'idassessment_soal_pilgan' => $newSoalId,
                'idassessment' => $newAssessmentId,
                'idjenjang' => $sq->idjenjang ?: $idjenjang,
                'idmapel' => $sq->idmapel ?: $idmapel,
                'idkurikulum' => $sq->idkurikulum,
                'idtingkat' => $sq->idtingkat ?: $idtingkat,
                'bab' => $sq->bab,
                'tingkat_kesulitan' => $sq->tingkat_kesulitan ?: 'Sedang',
                'source_type' => 'nasional',
                'tahun_soal_id' => $sq->tahun_soal_id,
                'soal_text' => $sq->soal_text ?: 'Pertanyaan',
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
                'jawaban' => $sq->jawaban ?: 'A',
                'penjelasan_jawaban' => $sq->penjelasan_jawaban,
                'is_annulled' => false,
                'urutan' => $orderNum++,
                'tanggal_input' => now(),
            ]);
        }

        AuditLog::record(
            'COPY_PACKAGE_TO_EXAM',
            'assessment',
            $newAssessmentId,
            "Guru membuat jadwal ujian dari salinan paket Bank Soal Global {$packageId} ({$sourceQuestions->count()} butir soal)",
            ['package_id' => $packageId, 'idassessment' => $newAssessmentId]
        );

        return response()->json([
            'message' => "Berhasil menyalin {$sourceQuestions->count()} butir soal dari Paket Bank Soal Global ke Jadwal Ujian baru!",
            'data' => $newExam
        ], 201);
    }

    /**
     * Pilihan B: Buat Jadwal Ujian dengan Menyalin Paket Soal Buatan Guru
     */
    public function copyFromTeacherPackage(Request $request)
    {
        $validated = $request->validate([
            'package_id' => 'required',
            'nama_assessment' => 'nullable|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idkelas' => 'nullable|integer',
            'id_tahun_ajaran' => 'nullable|integer',
            'waktu_pengerjaan' => 'nullable|integer|min:1|max:300',
            'tanggal_mulai_assessment' => 'nullable|date',
            'tanggal_batas_assessment' => 'nullable|date',
            'acak_soal' => 'nullable|boolean',
            'acak_opsi' => 'nullable|boolean',
        ]);

        $user = $this->resolveUser($request);
        $packageId = (string) $validated['package_id'];

        $teacherPkg = BankSoalGuru::with(['soal' => fn($q) => $q->where('status_aktif', 'Y')])
            ->where(function ($q) use ($user) {
                if ($user) {
                    $q->where('id_guru', $user->iduser_bo);
                    if (!empty($user->idkategori)) {
                        $q->orWhere('id_instansi', $user->idkategori);
                    }
                }
            })
            ->find($packageId);

        if (!$teacherPkg) {
            return response()->json(['message' => 'Paket Soal Guru tidak ditemukan atau bukan milik Anda.'], 404);
        }

        $sourceQuestions = $teacherPkg->soal;
        if ($sourceQuestions->isEmpty()) {
            return response()->json(['message' => 'Paket yang dipilih belum memiliki butir soal.'], 422);
        }

        $newAssessmentId = (string) (time() . rand(1000000, 9999999));
        $durasi = $request->filled('waktu_pengerjaan') ? (int) $validated['waktu_pengerjaan'] : 90;

        $newExam = Assessment::create([
            'idassessment' => $newAssessmentId,
            'nama_assessment' => $validated['nama_assessment'] ?: $teacherPkg->nama_paket,
            'deskripsi_assessment' => $validated['deskripsi_assessment'] ?? "Ujian CBT disalin dari Soal Buatan Guru",
            'idjenjang' => $teacherPkg->idjenjang ?: 1,
            'idmapel' => $teacherPkg->idmapel ?: 1,
            'idtingkat' => $teacherPkg->idtingkat,
            'idkelas' => $validated['idkelas'] ?? null,
            'id_tahun_ajaran' => $validated['id_tahun_ajaran'] ?? null,
            'source_type' => 'guru',
            'acak_soal' => $request->boolean('acak_soal', true),
            'acak_opsi' => $request->boolean('acak_opsi', true),
            'iduser_bo' => $user ? $user->iduser_bo : null,
            'idkategori' => $user ? $user->idkategori : null,
            'waktu_pengerjaan' => $durasi,
            'tampil_assessment_pilgan' => $sourceQuestions->count(),
            'tampil_assessment_essay' => 0,
            'tanggal_mulai_assessment' => $validated['tanggal_mulai_assessment'] ?? now(),
            'tanggal_batas_assessment' => $validated['tanggal_batas_assessment'] ?? now()->addDays(7),
            'status_aktif' => 'Y',
            'status_paket' => 'published',
            'is_locked' => false,
            'tanggal_input' => now(),
        ]);

        $orderNum = 1;
        foreach ($sourceQuestions as $sq) {
            $newSoalId = (string) (time() . rand(1000000, 9999999));
            AssessmentSoalPilgan::create([
                'idassessment_soal_pilgan' => $newSoalId,
                'idassessment' => $newAssessmentId,
                'idjenjang' => $sq->idjenjang ?: $teacherPkg->idjenjang,
                'idmapel' => $sq->idmapel ?: $teacherPkg->idmapel,
                'idkurikulum' => $sq->idkurikulum,
                'idtingkat' => $sq->idtingkat ?: $teacherPkg->idtingkat,
                'bab' => $sq->bab,
                'tingkat_kesulitan' => $sq->tingkat_kesulitan ?: 'Sedang',
                'source_type' => 'guru',
                'tahun_soal_id' => $sq->tahun_soal_id,
                'soal_text' => $sq->soal_text ?: 'Pertanyaan',
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
                'jawaban' => $sq->jawaban ?: 'A',
                'penjelasan_jawaban' => $sq->penjelasan_jawaban,
                'is_annulled' => false,
                'urutan' => $orderNum++,
                'tanggal_input' => now(),
            ]);
        }

        AuditLog::record(
            'COPY_TEACHER_PACKAGE_TO_EXAM',
            'assessment',
            $newAssessmentId,
            "Guru membuat jadwal ujian dari salinan paket Soal Guru {$packageId} ({$sourceQuestions->count()} butir soal)",
            ['package_id' => $packageId, 'idassessment' => $newAssessmentId]
        );

        return response()->json([
            'message' => "Berhasil menyalin {$sourceQuestions->count()} butir soal dari Paket Guru ke Jadwal Ujian baru!",
            'data' => $newExam
        ], 201);
    }

    /**
     * Assign package to a class(Request $request, $idassessment)
    {
        $request->validate([
            'idkelas' => 'required|exists:master_kelas,id'
        ]);

        $user = $this->resolveUser($request);
        $assessment = Assessment::findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        $targetClass = MasterKelas::findOrFail($request->idkelas);
        if ($user && $user->role !== 'super_admin' && !empty($user->idkategori) && (string)$targetClass->idkategori !== (string)$user->idkategori) {
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
     * Publish exam package (DRAFT -> AKTIF)
     * Requirement: Guru can publish once drafting/reviewing is complete.
     */
    public function publish(Request $request, $idassessment)
    {
        $user = $this->resolveUser($request);
        $assessment = Assessment::withCount(['soal', 'attempts'])->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        if ($assessment->soal_count === 0) {
            return response()->json([
                'message' => 'Paket soal belum memiliki butir soal. Silakan generate atau pilih butir soal dari Bank Soal Global terlebih dahulu sebelum mempublikasikan.',
                'error_code' => 'EMPTY_EXAM_QUESTIONS'
            ], 422);
        }

        $updates = [
            'status_paket' => 'aktif',
            'status_aktif' => 'Y',
        ];

        // Bind to current institution if unassigned or global
        if ($user && !empty($user->idkategori) && (empty($assessment->idkategori) || (string)$assessment->idkategori === '27830150842287772')) {
            $updates['idkategori'] = $user->idkategori;
        }
        if ($user && !empty($user->iduser_bo) && empty($assessment->iduser_bo)) {
            $updates['iduser_bo'] = $user->iduser_bo;
        }

        $assessment->update($updates);

        AuditLog::record(
            'PUBLIKASIKAN_PAKET_SOAL',
            'assessment',
            $idassessment,
            "Paket soal {$assessment->nama_assessment} dipublikasikan (status AKTIF). Siap digunakan pada Jadwal Ujian.",
            ['user_id' => $user?->iduser_bo, 'status_paket' => 'aktif']
        );

        return response()->json([
            'message' => 'Paket soal berhasil dipublikasikan dan berstatus AKTIF. Paket siap digunakan pada Jadwal Ujian.',
            'data' => $assessment
        ]);
    }

    /**
     * List questions in an exam package (sorted by urutan)
     */
    public function getQuestions(Request $request, $idassessment)
    {
        $user = $this->resolveUser($request);
        $assessment = Assessment::withCount('attempts')->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment)) {
            return $deny;
        }

        $questions = AssessmentSoalPilgan::where('idassessment', $idassessment)
            ->orderBy('urutan', 'asc')
            ->orderBy('idassessment_soal_pilgan', 'asc')
            ->get();

        $isLocked = (bool) ($assessment->is_locked || ($assessment->attempts_count > 0));

        return response()->json([
            'assessment' => [
                'idassessment' => $assessment->idassessment,
                'nama_assessment' => $assessment->nama_assessment,
                'status_paket' => $assessment->status_paket,
                'status_aktif' => $assessment->status_aktif,
                'is_locked' => $isLocked,
                'locked_at' => $assessment->locked_at,
                'can_edit' => !$isLocked,
                'total_questions' => $questions->count(),
                'annulled_count' => $questions->where('is_annulled', true)->count(),
            ],
            'questions' => $questions->map(function ($q, $idx) {
                return [
                    'id' => $q->idassessment_soal_pilgan,
                    'idassessment_soal_pilgan' => $q->idassessment_soal_pilgan,
                    'urutan' => $q->urutan ?: ($idx + 1),
                    'soal_text' => $q->soal_text,
                    'soal_gambar' => $q->soal_gambar,
                    'pilihan_a_text' => $q->pilihan_a_text,
                    'pilihan_a_gambar' => $q->pilihan_a_gambar,
                    'pilihan_b_text' => $q->pilihan_b_text,
                    'pilihan_b_gambar' => $q->pilihan_b_gambar,
                    'pilihan_c_text' => $q->pilihan_c_text,
                    'pilihan_c_gambar' => $q->pilihan_c_gambar,
                    'pilihan_d_text' => $q->pilihan_d_text,
                    'pilihan_d_gambar' => $q->pilihan_d_gambar,
                    'pilihan_e_text' => $q->pilihan_e_text,
                    'pilihan_e_gambar' => $q->pilihan_e_gambar,
                    'jawaban' => $q->jawaban,
                    'penjelasan_jawaban' => $q->penjelasan_jawaban,
                    'tingkat_kesulitan' => $q->tingkat_kesulitan,
                    'bab' => $q->bab,
                    'source_type' => $q->source_type,
                    'is_annulled' => (bool) $q->is_annulled,
                    'annulled_at' => $q->annulled_at,
                    'annulled_reason' => $q->annulled_reason,
                ];
            })
        ]);
    }

    /**
     * Add a question from Global Question Bank to this exam package
     */
    public function addQuestionFromGlobal(Request $request, $idassessment)
    {
        $request->validate([
            'idsoal_global' => 'required',
        ]);

        $user = $this->resolveUser($request);
        $assessment = Assessment::withCount('attempts')->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        $isLocked = (bool) ($assessment->is_locked || ($assessment->attempts_count > 0));
        if ($isLocked) {
            return response()->json([
                'message' => 'Paket soal telah TERKUNCI karena sudah ada siswa yang mulai mengerjakan. Tidak dapat menambah butir soal baru.',
                'error_code' => 'EXAM_LOCKED'
            ], 422);
        }

        $globalSoal = AssessmentSoalPilgan::where('idassessment_soal_pilgan', (string)$request->idsoal_global)->firstOrFail();

        // Check if question already in package
        $existing = AssessmentSoalPilgan::where('idassessment', $idassessment)
            ->where(function($q) use ($globalSoal) {
                $q->where('soal_text', $globalSoal->soal_text)
                  ->orWhere('idassessment_soal_pilgan', $globalSoal->idassessment_soal_pilgan);
            })->exists();

        if ($existing) {
            return response()->json([
                'message' => 'Butir soal ini sudah ada di dalam paket ujian.',
                'error_code' => 'DUPLICATE_QUESTION'
            ], 422);
        }

        $maxUrutan = AssessmentSoalPilgan::where('idassessment', $idassessment)->max('urutan') ?: 0;
        $newSoalId = (string) (time() . rand(1000000, 9999999));

        $cloned = AssessmentSoalPilgan::create([
            'idassessment_soal_pilgan' => $newSoalId,
            'idassessment' => $idassessment,
            'idjenjang' => $globalSoal->idjenjang ?: $assessment->idjenjang,
            'idmapel' => $globalSoal->idmapel ?: $assessment->idmapel,
            'idkurikulum' => $globalSoal->idkurikulum ?: $assessment->idkurikulum,
            'idtingkat' => $globalSoal->idtingkat,
            'bab' => $globalSoal->bab,
            'tingkat_kesulitan' => $globalSoal->tingkat_kesulitan,
            'source_type' => 'nasional',
            'tahun_soal_id' => $globalSoal->tahun_soal_id,
            'soal_text' => $globalSoal->soal_text,
            'soal_gambar' => $globalSoal->soal_gambar,
            'pilihan_a_text' => $globalSoal->pilihan_a_text,
            'pilihan_a_gambar' => $globalSoal->pilihan_a_gambar,
            'pilihan_b_text' => $globalSoal->pilihan_b_text,
            'pilihan_b_gambar' => $globalSoal->pilihan_b_gambar,
            'pilihan_c_text' => $globalSoal->pilihan_c_text,
            'pilihan_c_gambar' => $globalSoal->pilihan_c_gambar,
            'pilihan_d_text' => $globalSoal->pilihan_d_text,
            'pilihan_d_gambar' => $globalSoal->pilihan_d_gambar,
            'pilihan_e_text' => $globalSoal->pilihan_e_text,
            'pilihan_e_gambar' => $globalSoal->pilihan_e_gambar,
            'jawaban' => $globalSoal->jawaban,
            'penjelasan_jawaban' => $globalSoal->penjelasan_jawaban,
            'is_annulled' => false,
            'urutan' => $maxUrutan + 1,
            'tanggal_input' => now(),
        ]);

        $newCount = AssessmentSoalPilgan::where('idassessment', $idassessment)->count();
        $assessment->update(['tampil_assessment_pilgan' => $newCount]);

        return response()->json([
            'message' => 'Butir soal dari Bank Soal Global berhasil ditambahkan ke paket.',
            'data' => $cloned,
            'total_questions' => $newCount
        ]);
    }

    /**
     * Replace a question in package with another question from Global Question Bank
     */
    public function replaceQuestion(Request $request, $idassessment, $idsoal)
    {
        $user = $this->resolveUser($request);
        $assessment = Assessment::withCount('attempts')->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        $isLocked = (bool) ($assessment->is_locked || ($assessment->attempts_count > 0));
        if ($isLocked) {
            return response()->json([
                'message' => 'Paket soal telah TERKUNCI karena sudah ada siswa yang mulai mengerjakan. Tidak dapat mengganti butir soal. Gunakan fitur ANULIR SOAL jika ada butir yang keliru.',
                'error_code' => 'EXAM_LOCKED'
            ], 422);
        }

        $oldSoal = AssessmentSoalPilgan::where('idassessment', $idassessment)
            ->where('idassessment_soal_pilgan', (string)$idsoal)
            ->firstOrFail();

        $currentUrutan = $oldSoal->urutan;

        // Find candidate from Bank Soal Global
        $newGlobalId = $request->input('new_idsoal_global');
        $newGlobalSoal = null;

        if ($newGlobalId) {
            $newGlobalSoal = AssessmentSoalPilgan::where('idassessment_soal_pilgan', (string)$newGlobalId)->firstOrFail();
        } else {
            $existingTexts = AssessmentSoalPilgan::where('idassessment', $idassessment)->pluck('soal_text')->toArray();
            $newGlobalSoal = AssessmentSoalPilgan::where('idmapel', $assessment->idmapel)
                ->where('source_type', 'nasional')
                ->whereNotIn('soal_text', $existingTexts)
                ->inRandomOrder()
                ->first();

            if (!$newGlobalSoal) {
                return response()->json([
                    'message' => 'Tidak ditemukan butir soal alternatif di Bank Soal Global untuk mata pelajaran ini.',
                    'error_code' => 'NO_REPLACEMENT_FOUND'
                ], 422);
            }
        }

        $oldSoal->delete();

        $newSoalId = (string) (time() . rand(1000000, 9999999));
        $created = AssessmentSoalPilgan::create([
            'idassessment_soal_pilgan' => $newSoalId,
            'idassessment' => $idassessment,
            'idjenjang' => $newGlobalSoal->idjenjang ?: $assessment->idjenjang,
            'idmapel' => $newGlobalSoal->idmapel ?: $assessment->idmapel,
            'idkurikulum' => $newGlobalSoal->idkurikulum ?: $assessment->idkurikulum,
            'idtingkat' => $newGlobalSoal->idtingkat,
            'bab' => $newGlobalSoal->bab,
            'tingkat_kesulitan' => $newGlobalSoal->tingkat_kesulitan,
            'source_type' => 'nasional',
            'tahun_soal_id' => $newGlobalSoal->tahun_soal_id,
            'soal_text' => $newGlobalSoal->soal_text,
            'soal_gambar' => $newGlobalSoal->soal_gambar,
            'pilihan_a_text' => $newGlobalSoal->pilihan_a_text,
            'pilihan_a_gambar' => $newGlobalSoal->pilihan_a_gambar,
            'pilihan_b_text' => $newGlobalSoal->pilihan_b_text,
            'pilihan_b_gambar' => $newGlobalSoal->pilihan_b_gambar,
            'pilihan_c_text' => $newGlobalSoal->pilihan_c_text,
            'pilihan_c_gambar' => $newGlobalSoal->pilihan_c_gambar,
            'pilihan_d_text' => $newGlobalSoal->pilihan_d_text,
            'pilihan_d_gambar' => $newGlobalSoal->pilihan_d_gambar,
            'pilihan_e_text' => $newGlobalSoal->pilihan_e_text,
            'pilihan_e_gambar' => $newGlobalSoal->pilihan_e_gambar,
            'jawaban' => $newGlobalSoal->jawaban,
            'penjelasan_jawaban' => $newGlobalSoal->penjelasan_jawaban,
            'is_annulled' => false,
            'urutan' => $currentUrutan,
            'tanggal_input' => now(),
        ]);

        return response()->json([
            'message' => 'Butir soal berhasil diganti dengan butir dari Bank Soal Global.',
            'data' => $created
        ]);
    }

    /**
     * Remove question from exam package (Only permitted when NOT locked)
     */
    public function removeQuestion(Request $request, $idassessment, $idsoal)
    {
        $user = $this->resolveUser($request);
        $assessment = Assessment::withCount('attempts')->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        $isLocked = (bool) ($assessment->is_locked || ($assessment->attempts_count > 0));
        if ($isLocked) {
            return response()->json([
                'message' => 'Paket soal telah TERKUNCI karena sudah ada siswa yang mulai mengerjakan. Dilarang menghapus butir soal. Silakan gunakan fitur ANULIR SOAL.',
                'error_code' => 'EXAM_LOCKED'
            ], 422);
        }

        $soal = AssessmentSoalPilgan::where('idassessment', $idassessment)
            ->where('idassessment_soal_pilgan', (string)$idsoal)
            ->firstOrFail();

        $soal->delete();

        // Re-index urutan
        $remaining = AssessmentSoalPilgan::where('idassessment', $idassessment)->orderBy('urutan', 'asc')->get();
        foreach ($remaining as $idx => $r) {
            $r->update(['urutan' => $idx + 1]);
        }

        $newCount = $remaining->count();
        $assessment->update(['tampil_assessment_pilgan' => $newCount]);

        return response()->json([
            'message' => 'Butir soal berhasil dihapus dari paket.',
            'total_questions' => $newCount
        ]);
    }

    /**
     * Reorder questions in package (Only permitted when NOT locked)
     */
    public function reorderQuestions(Request $request, $idassessment)
    {
        $request->validate([
            'order' => 'required|array',
            'order.*' => 'string'
        ]);

        $user = $this->resolveUser($request);
        $assessment = Assessment::withCount('attempts')->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        $isLocked = (bool) ($assessment->is_locked || ($assessment->attempts_count > 0));
        if ($isLocked) {
            return response()->json([
                'message' => 'Paket soal telah TERKUNCI karena sudah ada siswa yang mulai mengerjakan. Dilarang mengubah urutan butir soal.',
                'error_code' => 'EXAM_LOCKED'
            ], 422);
        }

        foreach ($request->order as $idx => $soalId) {
            AssessmentSoalPilgan::where('idassessment', $idassessment)
                ->where('idassessment_soal_pilgan', $soalId)
                ->update(['urutan' => $idx + 1]);
        }

        return response()->json([
            'message' => 'Urutan butir soal berhasil diperbarui.'
        ]);
    }

    /**
     * Annul question (ANULIR SOAL) when exam is locked / has attempts
     * Requirement 8: Guru can annul defective questions without editing them directly.
     * Student scores are dynamically recalculated excluding this annulled question.
     */
    public function annulQuestion(Request $request, $idassessment, $idsoal)
    {
        $request->validate([
            'reason' => 'required|string|max:255'
        ]);

        $user = $this->resolveUser($request);
        $assessment = Assessment::withCount('attempts')->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        $soal = AssessmentSoalPilgan::where('idassessment', $idassessment)
            ->where('idassessment_soal_pilgan', (string)$idsoal)
            ->firstOrFail();

        $soal->update([
            'is_annulled' => true,
            'annulled_at' => now(),
            'annulled_reason' => $request->reason,
        ]);

        // Recalculate scores of all students who took this exam
        $affectedCount = $this->recalculateScores($assessment);

        AuditLog::record(
            'ANULIR_SOAL',
            'assessment_soal_pilgan',
            $idsoal,
            "Soal ID {$idsoal} pada paket {$assessment->nama_assessment} dianulir. Alasan: {$request->reason}. Nilai {$affectedCount} siswa dihitung ulang.",
            [
                'idassessment' => $idassessment,
                'idsoal' => $idsoal,
                'reason' => $request->reason,
                'affected_students' => $affectedCount,
                'user' => $user?->name ?? 'Guru',
            ]
        );

        return response()->json([
            'message' => "Soal nomor {$soal->urutan} berhasil dianulir. Nilai {$affectedCount} peserta telah dihitung ulang secara otomatis tanpa butir soal tersebut.",
            'data' => $soal,
            'affected_students' => $affectedCount
        ]);
    }

    /**
     * Helper to dynamically recalculate student scores excluding annulled questions
     */
    protected function recalculateScores(Assessment $assessment): int
    {
        $allQuestions = AssessmentSoalPilgan::where('idassessment', $assessment->idassessment)->get();
        $validQuestions = $allQuestions->where('is_annulled', false);
        $totalValid = $validQuestions->count();

        $attempts = AssessmentJawabanPilgan::where('idassessment', $assessment->idassessment)
            ->with('details')
            ->get();

        $count = 0;
        foreach ($attempts as $attempt) {
            $correctCount = 0;
            $details = $attempt->details->keyBy('idassessment_soal_pilgan');

            foreach ($validQuestions as $vq) {
                $detail = $details->get($vq->idassessment_soal_pilgan);
                if ($detail && !empty($detail->jawaban) && strtoupper(trim($detail->jawaban)) === strtoupper(trim($vq->jawaban))) {
                    $correctCount++;
                }
            }

            // Fallback 100 if all questions annulled, otherwise proportional
            $newScore = ($totalValid > 0) ? (int) round(($correctCount / $totalValid) * 100) : 100;
            $attempt->update(['nilai' => $newScore]);
            $count++;
        }

        return $count;
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
        $assessment = Assessment::with(['jenjang', 'kelas', 'mapel', 'examGroups'])->findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment)) {
            return $deny;
        }

        $attemptsCount = AssessmentJawabanPilgan::where('idassessment', $idassessment)->count();
        $isLocked = (bool) ($assessment->is_locked || ($attemptsCount > 0));
        $statusPaket = $assessment->status_paket;
        if (!$statusPaket) {
            $statusPaket = $isLocked ? 'terkunci' : ($assessment->status_aktif === 'Y' ? 'aktif' : 'draft');
        }

        $assessment->setAttribute('status_paket', $statusPaket);
        $assessment->setAttribute('is_locked', $isLocked);
        $assessment->setAttribute('can_edit', !$isLocked);
        $assessment->setAttribute('attempts_count', $attemptsCount);
        $assessment->setRelation('soal', AssessmentSoalPilgan::where('idassessment', $idassessment)->orderBy('urutan', 'asc')->get());

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

        if ($deny = $this->authorizeExamAccess($user, $assessment, true, true)) {
            return $deny;
        }

        // Integrity safeguard: Prevent deletion if students have already attempted or completed this exam!
        $hasAttempts = AssessmentJawabanPilgan::where('idassessment', $idassessment)->exists();
        if ($hasAttempts) {
            return response()->json([
                'message' => 'Paket ujian tidak dapat dihapus karena sudah memiliki data riwayat pengerjaan siswa. Silakan gunakan fitur nonaktifkan status jika ujian tidak ingin digunakan kembali.',
                'error_code' => 'CANNOT_DELETE_EXAM_WITH_STUDENT_ATTEMPTS'
            ], 422);
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
     * Toggle active/inactive status of an exam package
     */
    public function toggleStatus(Request $request, $idassessment)
    {
        $user = $this->resolveUser($request);
        $assessment = Assessment::findOrFail($idassessment);

        if ($deny = $this->authorizeExamAccess($user, $assessment, false, true)) {
            return $deny;
        }

        $newStatusAktif = ($assessment->status_aktif === 'Y') ? 'N' : 'Y';
        $newStatusPaket = ($newStatusAktif === 'Y') ? 'aktif' : 'draft';

        $updates = [
            'status_aktif' => $newStatusAktif,
            'status_paket' => $newStatusPaket,
        ];

        if ($user && !empty($user->idkategori) && (empty($assessment->idkategori) || (string)$assessment->idkategori === '27830150842287772')) {
            $updates['idkategori'] = $user->idkategori;
        }

        $assessment->update($updates);

        AuditLog::record(
            'TOGGLE_STATUS_PAKET_TRYOUT',
            'assessment',
            $idassessment,
            $assessment->nama_assessment,
            [
                'status_aktif' => $newStatusAktif,
                'status_paket' => $newStatusPaket,
                'updated_by' => $user?->name ?? 'Staff',
                'role' => $user?->role ?? 'guru'
            ]
        );

        return response()->json([
            'message' => 'Status jadwal ujian berhasil diubah (' . ($newStatusAktif === 'Y' ? 'Aktif' : 'Nonaktif/Draft') . ').',
            'status_aktif' => $newStatusAktif,
            'status_paket' => $newStatusPaket,
            'data' => $assessment
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
            $annulledCount = 0;

            foreach ($questions as $q) {
                if ($q->is_annulled) {
                    $annulledCount++;
                    continue; // Soal dianulir dikeluarkan dari perhitungan salah/kosong
                }

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
                'annulled_count' => $annulledCount,
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

            $isAnnulled = (bool) $q->is_annulled;
            $category = 'Sedang';
            if ($isAnnulled) {
                $category = 'Dianulir';
            } elseif ($accuracy >= 75) {
                $category = 'Mudah';
            } elseif ($accuracy < 40) {
                $category = 'Sukar';
            }

            $itemAnalysis[] = [
                'number' => $qNum++,
                'question_id' => $q->idassessment_soal_pilgan,
                'type' => 'multiple_choice_single',
                'content_preview' => strip_tags(substr($q->soal_text ?: 'Soal', 0, 80)),
                'topic' => $assessment->mapel?->nama_mapel ?? 'Umum',
                'difficulty' => $category,
                'weight' => $isAnnulled ? 0 : 2,
                'total_answered' => $answeredTotal,
                'correct_count' => $qCorrect,
                'incorrect_count' => $qIncorrect,
                'unanswered_count' => max(0, $unans),
                'accuracy_rate' => $isAnnulled ? 0 : $accuracy,
                'performance_category' => $category,
                'is_annulled' => $isAnnulled,
                'annulled_reason' => $q->annulled_reason,
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
            'class_progress' => (function() use ($studentsReport) {
                $progress = [];
                $grouped = collect($studentsReport)->groupBy('class_name');
                foreach ($grouped as $className => $classStudents) {
                    $total = $classStudents->count();
                    $completed = $classStudents->where('status', 'completed')->count();
                    $inProg = $classStudents->where('status', 'in_progress')->count();
                    $unattempted = $classStudents->where('status', 'unattempted')->count();
                    $pct = $total > 0 ? round(($completed / $total) * 100, 1) : 0;

                    $progress[] = [
                        'class_name' => $className ?: 'Umum / Tanpa Kelas',
                        'total_students' => $total,
                        'completed_count' => $completed,
                        'in_progress_count' => $inProg,
                        'unattempted_count' => $unattempted,
                        'progress_ratio' => "{$completed} / {$total}",
                        'percentage' => $pct,
                    ];
                }
                return $progress;
            })(),
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
                'is_annulled' => (bool)$q->is_annulled,
                'annulled_reason' => $q->annulled_reason,
                'explanation' => $q->is_annulled ? "Soal ini telah dianulir (Alasan: {$q->annulled_reason})." : ($q->penjelasan_jawaban ?: 'Tidak ada pembahasan khusus untuk nomor ini.'),
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
