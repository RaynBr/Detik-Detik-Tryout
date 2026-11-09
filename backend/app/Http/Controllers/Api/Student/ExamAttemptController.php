<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\AssessmentJawabanPilgan;
use App\Models\AssessmentJawabanPilganDetail;
use App\Models\ExamGroup;
use App\Models\UserSiswa;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamAttemptController extends Controller
{
    /**
     * Retrieve list of available TryOuts for the logged in student
     */
    public function availableExams(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $idkelas = $user->idkelas;
        $idkategori = $user->idkategori;

        $query = Assessment::with(['mapel', 'jenjang', 'kelas', 'examGroups'])
            ->where('status_aktif', 'Y')
            ->where(function ($q) {
                $q->whereNull('status_paket')
                  ->orWhere('status_paket', '!=', 'draft');
            })
            ->where(function ($q) use ($idkelas, $idkategori, $user) {
                // Must be National exam OR belong to student's institution
                $q->where(function ($iq) use ($idkategori) {
                    $iq->whereNull('idkategori')
                       ->orWhere('idkategori', '27830150842287772');
                    if ($idkategori) {
                        $iq->orWhere('idkategori', $idkategori);
                    }
                });
            })
            ->where(function ($q) use ($idkelas, $user) {
                // Target class: general (null/empty/0) OR matches student's class OR targeted in exam groups
                $q->where(function ($sub) {
                    $sub->whereNull('idkelas')
                        ->orWhere('idkelas', '')
                        ->orWhere('idkelas', 0);
                });
                if ($idkelas) {
                    $q->orWhere('idkelas', $idkelas);
                }
                $q->orWhereHas('examGroups', function ($gq) use ($idkelas, $user) {
                    if ($idkelas) {
                        $gq->whereJsonContains('class_ids', (int)$idkelas)
                           ->orWhereJsonContains('class_ids', (string)$idkelas);
                    }
                    $gq->orWhereJsonContains('student_ids', (string)$user->iduser);
                });
            });

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_assessment', 'like', "%{$search}%")
                  ->orWhereHas('mapel', function ($mq) use ($search) {
                      $mq->where('nama_mapel', 'like', "%{$search}%")
                         ->orWhere('kode_mapel', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status')) {
            $status = $request->status;
            if ($status === 'completed') {
                $query->whereHas('attempts', function ($jq) use ($user) {
                    $jq->where('iduser', $user->iduser)
                       ->where('komentar', 'submitted');
                });
            } elseif ($status === 'unstarted') {
                $query->whereDoesntHave('attempts', function ($jq) use ($user) {
                    $jq->where('iduser', $user->iduser)
                       ->where('komentar', 'submitted');
                });
            }
        }

        $orderedQuery = $query->orderBy('tanggal_input', 'desc')->orderBy('idassessment', 'desc');

        $mapExam = function ($a) use ($user) {
            $attempt = AssessmentJawabanPilgan::where('idassessment', $a->idassessment)
                ->where('iduser', $user->iduser)
                ->first();

            $startTime = $a->tanggal_mulai_assessment ?: now()->subDays(1)->format('Y-m-d H:i:s');
            $endTime = $a->tanggal_batas_assessment ?: now()->addDays(30)->format('Y-m-d H:i:s');

            $attemptStatus = 'not_started';
            if ($attempt) {
                $attemptStatus = ($attempt->komentar === 'submitted') ? 'submitted' : 'in_progress';
            }

            // Match specific exam group for this student if any exists
            $matchedGroup = $a->examGroups->first(function ($g) use ($user) {
                $classIds = $g->class_ids ?: [];
                $studentIds = $g->student_ids ?: [];
                return in_array((string)$user->iduser, $studentIds) || 
                       ($user->idkelas && (in_array($user->idkelas, $classIds) || in_array((string)$user->idkelas, $classIds)));
            }) ?: $a->examGroups->first();

            $groupName = $matchedGroup ? $matchedGroup->name : ($a->kelas?->nama_kelas ?? 'Umum');
            if ($matchedGroup && $matchedGroup->start_time) {
                $startTime = $matchedGroup->start_time->format('Y-m-d H:i:s');
            }
            if ($matchedGroup && $matchedGroup->end_time) {
                $endTime = $matchedGroup->end_time->format('Y-m-d H:i:s');
            }

            $durationMinutes = (int) ($a->waktu_pengerjaan ?: 60);
            $effectiveDuration = $durationMinutes;

            // If session end time is approaching, calculate effective duration remaining
            $sessionEndCarbon = null;
            if ($matchedGroup && $matchedGroup->end_time) {
                $sessionEndCarbon = \Carbon\Carbon::parse($matchedGroup->end_time);
            } elseif ($a->tanggal_batas_assessment) {
                $sessionEndCarbon = \Carbon\Carbon::parse($a->tanggal_batas_assessment);
            }

            $isSessionEnded = true;
            if ($sessionEndCarbon) {
                $isSessionEnded = now()->gte($sessionEndCarbon);
                $secsUntilSessionEnd = max(0, $sessionEndCarbon->getTimestamp() - now()->getTimestamp());
                $minsUntilSessionEnd = (int) floor($secsUntilSessionEnd / 60);
                if ($minsUntilSessionEnd < $durationMinutes) {
                    $effectiveDuration = max(0, $minsUntilSessionEnd);
                }
            }

            return [
                'exam_group_id' => (string) ($matchedGroup ? $matchedGroup->id : $a->idassessment),
                'exam_id' => (string) $a->idassessment,
                'title' => $a->nama_assessment,
                'group_name' => $groupName,
                'token' => $matchedGroup?->token,
                'subject_code' => $a->mapel?->kode_mapel ?? 'TRYOUT',
                'subject_name' => $a->mapel?->nama_mapel ?? 'TryOut Ujian',
                'duration_minutes' => $durationMinutes,
                'effective_duration_minutes' => $effectiveDuration,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => 'published',
                'attempt' => $attempt ? [
                    'id' => (string) $attempt->idassessment_jawaban_pilgan,
                    'status' => $attemptStatus,
                    'started_at' => $attempt->tgl_input_time,
                    'submitted_at' => ($attempt->komentar === 'submitted') ? $attempt->tgl_input_time : null,
                    'total_score' => ($attempt->komentar === 'submitted' && $isSessionEnded) ? (float) $attempt->nilai : null,
                    'is_session_ended' => $isSessionEnded,
                ] : null
            ];
        };

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $assessments = $orderedQuery->get();
            $mapped = $assessments->map($mapExam);
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

        $paginator->through($mapExam);

        return response()->json($paginator);
    }

    /**
     * Start or resume an exam attempt
     */
    public function start(Request $request)
    {
        $request->validate([
            'exam_group_id' => 'required',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $groupIdOrAssessmentId = (string) $request->exam_group_id;

        // Resolve assessment ID from exam_group_id
        $group = ExamGroup::find($groupIdOrAssessmentId);
        if ($group) {
            $idassessment = (string) $group->exam_id;
        } else {
            $idassessment = $groupIdOrAssessmentId;
        }

        $assessment = Assessment::findOrFail($idassessment);

        // Active status check (Temuan 26)
        if ($assessment->status_aktif !== 'Y') {
            return response()->json([
                'message' => 'Ujian ini sedang tidak aktif atau dinonaktifkan oleh sekolah.'
            ], 403);
        }

        // Authorization check: Verify student is eligible/enrolled for this exam (Hierarchical Scoping - Temuan 22)
        $idkelas = $user->idkelas;
        $idkategori = $user->idkategori;
        $isInstansiTargeted = empty($assessment->idkategori) || ((string)$assessment->idkategori === (string)$idkategori) || ($assessment->idkategori === '27830150842287772');
        
        if (!$isInstansiTargeted) {
            return response()->json([
                'message' => 'Akses ditolak: Ujian bukan milik instansi Anda.'
            ], 403);
        }

        $isGroupTargeted = false;
        if ($group) {
            $classIds = $group->class_ids ?: [];
            $studentIds = $group->student_ids ?: [];
            $isGroupTargeted = in_array((string)$user->iduser, $studentIds) || 
                               ($idkelas && (in_array($idkelas, $classIds) || in_array((string)$idkelas, $classIds)));
        }

        // If exam has a specific class assigned, student must either belong to that class or be targeted via group
        if (!empty($assessment->idkelas) && ((string)$assessment->idkelas !== (string)$idkelas) && !$isGroupTargeted) {
            return response()->json([
                'message' => 'Akses ditolak: Ujian ini ditujukan khusus untuk kelas tertentu.'
            ], 403);
        }

        // If exam group is explicitly targeted, verify student is included
        if ($group && !$isGroupTargeted) {
            return response()->json([
                'message' => 'Akses ditolak: Anda tidak terdaftar pada sesi/gelombang ujian ini.'
            ], 403);
        }

        // Check session timing window constraints
        $sessionStartTime = null;
        $sessionEndTime = null;

        if ($group && $group->start_time) {
            $sessionStartTime = \Carbon\Carbon::parse($group->start_time);
        } elseif ($assessment->tanggal_mulai_assessment) {
            $sessionStartTime = \Carbon\Carbon::parse($assessment->tanggal_mulai_assessment);
        }

        if ($group && $group->end_time) {
            $sessionEndTime = \Carbon\Carbon::parse($group->end_time);
        } elseif ($assessment->tanggal_batas_assessment) {
            $sessionEndTime = \Carbon\Carbon::parse($assessment->tanggal_batas_assessment);
        }

        if ($sessionStartTime && now()->lt($sessionStartTime)) {
            return response()->json([
                'message' => 'Sesi ujian baru akan dimulai pada: ' . $sessionStartTime->format('d/m/Y H:i') . ' WIB.'
            ], 422);
        }

        if ($sessionEndTime && now()->gt($sessionEndTime)) {
            return response()->json([
                'message' => 'Sesi ujian telah berakhir pada: ' . $sessionEndTime->format('d/m/Y H:i') . ' WIB.'
            ], 422);
        }

        // Check if existing attempt exists
        $attempt = AssessmentJawabanPilgan::where('idassessment', $idassessment)
            ->where('iduser', $user->iduser)
            ->first();

        // Disqualification check (Temuan 04)
        if ($attempt && $attempt->komentar === 'disqualified') {
            return response()->json([
                'message' => 'Akses ditolak: Anda telah didiskualifikasi dari sesi ujian ini karena pelanggaran integritas.'
            ], 403);
        }

        $durationMinutes = (int) ($assessment->waktu_pengerjaan ?: 60);

        if (!$attempt) {
            // Atomic transaction for attempt + financial record creation (Temuan 28)
            $attempt = DB::transaction(function () use ($user, $idassessment, $assessment, $group) {
                $attemptId = (string) (time() . rand(1000000, 9999999));
                $trxId = (string) (time() . rand(1000000, 9999999));

                // Satisfy foreign key fk_assessment_transaksi -> transaksi(idtransaksi)
                DB::table('transaksi')->insert([
                    'idtransaksi' => $trxId,
                    'invoice' => 'TR-' . date('ymd') . '-' . rand(1000, 9999),
                    'nama_sertifikat' => $user->nama ?? 'Siswa',
                    'jumlah_point' => 0,
                    'jenis_transaksi' => 'assessment',
                    'iduser' => $user->iduser,
                    'status_transaksi' => '7',
                    'alasan_tolak_pembayaran' => '',
                    'status_payment' => '1',
                    'total_pembayaran' => 0,
                    'tanggal_input' => now(),
                ]);

                $newAttempt = AssessmentJawabanPilgan::create([
                    'idassessment_jawaban_pilgan' => $attemptId,
                    'idassessment' => $idassessment,
                    'iduser' => $user->iduser,
                    'idtransaksi' => $trxId,
                    'nilai' => 0,
                    'komentar' => 'in_progress',
                    'lama_dikerjakan' => '',
                    'tgl_input_time' => now(),
                ]);

                // Auto-lock exam package immediately on first student attempt (Requirement 7)
                if (!$assessment->is_locked || $assessment->status_paket !== 'terkunci') {
                    $assessment->update([
                        'status_paket' => 'terkunci',
                        'is_locked' => true,
                        'locked_at' => now(),
                    ]);
                }

                AuditLog::record(
                    'MULAI_UJIAN',
                    'assessment_jawaban_pilgan',
                    $attemptId,
                    "Siswa {$user->nama} mulai mengerjakan ujian {$assessment->nama_assessment}",
                    [
                        'idassessment' => $idassessment,
                        'exam_group_id' => $group->id ?? null,
                        'start_time' => now()->toIso8601String(),
                    ]
                );

                return $newAttempt;
            });
        } else {
            // If already submitted, return without modifying (Temuan 04)
            if ($attempt->komentar === 'submitted') {
                return response()->json([
                    'message' => 'Ujian telah selesai dikerjakan.',
                    'attempt' => [
                        'id' => $attempt->idassessment_jawaban_pilgan,
                        'status' => 'submitted',
                        'total_score' => (float)$attempt->nilai,
                    ]
                ]);
            }

            // If time expired, auto-submit instead of resetting timer (Temuan 04)
            $elapsedSeconds = abs(now()->diffInSeconds(\Carbon\Carbon::parse($attempt->tgl_input_time)));
            if ($elapsedSeconds >= ($durationMinutes * 60)) {
                $attempt->update([
                    'komentar' => 'submitted',
                    'lama_dikerjakan' => $durationMinutes . ' Menit',
                ]);
            }
        }

        $status = ($attempt->komentar === 'submitted') ? 'submitted' : 'in_progress';

        return response()->json([
            'message' => 'Sesi ujian berhasil dimulai.',
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'status' => $status,
                'total_score' => ($status === 'submitted') ? (float)$attempt->nilai : null,
            ]
        ]);
    }

    /**
     * Get attempt questions with dynamic time remaining based on personal start and session end time
     * User Requirement: "waktu pengerjaannya bergerak sesuai kapan siswa mengerjakan,
     * tetapi contoh jika waktu pengerjaan 2 jam tetapi 1jam lagi sesinya habis maka waktu siswa hanya 1 jam begitupun lainnya"
     */
    public function showAttempt(Request $request, $attemptId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $attempt = AssessmentJawabanPilgan::with(['assessment.mapel', 'details'])
            ->where('idassessment_jawaban_pilgan', $attemptId)
            ->where('iduser', $user->iduser)
            ->firstOrFail();

        // Disqualification check (Temuan 04)
        if ($attempt->komentar === 'disqualified') {
            return response()->json([
                'message' => 'Anda telah didiskualifikasi dari sesi ujian ini karena pelanggaran integritas.'
            ], 403);
        }

        $assessment = $attempt->assessment;
        $allQuestions = AssessmentSoalPilgan::where('idassessment', $assessment->idassessment)
            ->orderBy('idassessment_soal_pilgan', 'asc')
            ->get();

        // 1. Calculate student personal duration remaining based on start time
        $durationMinutes = (int) ($assessment->waktu_pengerjaan ?: 60);
        $startTime = \Carbon\Carbon::parse($attempt->tgl_input_time);
        $elapsedSeconds = (int) floor(abs(now()->diffInSeconds($startTime)));
        $personalRemainingSeconds = (int) max(0, ($durationMinutes * 60) - $elapsedSeconds);

        // 2. Identify the active session wave / window specifically for this student
        $matchedGroup = ExamGroup::where('exam_id', $assessment->idassessment)
            ->get()
            ->first(function ($g) use ($user) {
                $studentIds = $g->student_ids ?: [];
                $classIds = $g->class_ids ?: [];
                if (in_array((string)$user->iduser, $studentIds)) {
                    return true;
                }
                if ($user->idkelas && (in_array($user->idkelas, $classIds) || in_array((string)$user->idkelas, $classIds))) {
                    return true;
                }
                return false;
            });

        $sessionEndTime = null;
        if ($matchedGroup && $matchedGroup->end_time) {
            $sessionEndTime = \Carbon\Carbon::parse($matchedGroup->end_time);
        } elseif ($assessment->tanggal_batas_assessment) {
            $sessionEndTime = \Carbon\Carbon::parse($assessment->tanggal_batas_assessment);
        }

        // 3. User Requirement:
        // "waktu pengerjaannya bergerak sesuai kapan siswa mengerjakan,
        //  tetapi contoh jika waktu pengerjaan 2 jam tetapi 1jam lagi sesinya habis maka waktu siswa hanya 1 jam begitupun lainnya"
        $isSessionLimited = false;
        if ($sessionEndTime) {
            $nowTimestamp = now()->getTimestamp();
            $endTimestamp = $sessionEndTime->getTimestamp();
            $sessionRemainingSeconds = (int) max(0, $endTimestamp - $nowTimestamp);

            // Siswa hanya mendapat MINIMUM antara sisa durasi personal dan sisa waktu sesi!
            if ($sessionRemainingSeconds < $personalRemainingSeconds) {
                $timeRemaining = (int) floor($sessionRemainingSeconds);
                $isSessionLimited = true;
            } else {
                $timeRemaining = (int) floor($personalRemainingSeconds);
            }
        } else {
            $timeRemaining = (int) floor($personalRemainingSeconds);
        }

        // Map existing answers by question ID
        $savedAnswers = $attempt->details->keyBy('idassessment_soal_pilgan');

        // Build question payload: Same 50 questions, BUT randomized options per student attempt!
        $questionsPayload = [];
        foreach ($allQuestions as $q) {
            $existingDetail = $savedAnswers->get($q->idassessment_soal_pilgan);
            $selectedOption = $existingDetail ? $existingDetail->jawaban : null;

            // Collect available options
            $rawOptions = [];
            if (!empty($q->pilihan_a_text) || !empty($q->pilihan_a_gambar)) {
                $rawOptions[] = ['id' => 'A', 'content' => $q->pilihan_a_text ?: 'Pilihan A', 'media_url' => $q->pilihan_a_gambar];
            }
            if (!empty($q->pilihan_b_text) || !empty($q->pilihan_b_gambar)) {
                $rawOptions[] = ['id' => 'B', 'content' => $q->pilihan_b_text ?: 'Pilihan B', 'media_url' => $q->pilihan_b_gambar];
            }
            if (!empty($q->pilihan_c_text) || !empty($q->pilihan_c_gambar)) {
                $rawOptions[] = ['id' => 'C', 'content' => $q->pilihan_c_text ?: 'Pilihan C', 'media_url' => $q->pilihan_c_gambar];
            }
            if (!empty($q->pilihan_d_text) || !empty($q->pilihan_d_gambar)) {
                $rawOptions[] = ['id' => 'D', 'content' => $q->pilihan_d_text ?: 'Pilihan D', 'media_url' => $q->pilihan_d_gambar];
            }
            if (!empty($q->pilihan_e_text) || !empty($q->pilihan_e_gambar)) {
                $rawOptions[] = ['id' => 'E', 'content' => $q->pilihan_e_text ?: 'Pilihan E', 'media_url' => $q->pilihan_e_gambar];
            }

            // Deterministic randomized shuffle per student attempt using seeded shuffle (Temuan 10 & 27)
            $isAcakOpsi = in_array($assessment->acak_opsi, ['Y', '1', 1, true], true);
            if ($isAcakOpsi) {
                $seed = crc32($attempt->idassessment_jawaban_pilgan . '_' . $q->idassessment_soal_pilgan);
                mt_srand($seed);
                $shuffledOptions = $rawOptions;
                for ($i = count($shuffledOptions) - 1; $i > 0; $i--) {
                    $j = mt_rand(0, $i);
                    $tmp = $shuffledOptions[$i];
                    $shuffledOptions[$i] = $shuffledOptions[$j];
                    $shuffledOptions[$j] = $tmp;
                }
            } else {
                $shuffledOptions = $rawOptions;
            }

            $questionsPayload[] = [
                'answer_id' => $q->idassessment_soal_pilgan,
                'question_id' => $q->idassessment_soal_pilgan,
                'topic' => $assessment->mapel?->nama_mapel ?? 'TryOut',
                'type' => 'multiple_choice_single',
                'content' => $q->soal_text ?: 'Soal Ujian',
                'media_url' => $q->soal_gambar,
                'options' => $shuffledOptions,
                'matching_pairs' => [],
                'answer_content' => $selectedOption ? ['option_id' => $selectedOption] : null,
                'is_flagged' => false,
            ];
        }

        // Deterministic question sequence shuffle per student attempt if acak_soal enabled (Temuan 10 & 27)
        $isAcakSoal = in_array($assessment->acak_soal, ['Y', '1', 1, true], true);
        if ($isAcakSoal) {
            $qSeed = crc32($attempt->idassessment_jawaban_pilgan . '_questions_order');
            mt_srand($qSeed);
            for ($i = count($questionsPayload) - 1; $i > 0; $i--) {
                $j = mt_rand(0, $i);
                $tmp = $questionsPayload[$i];
                $questionsPayload[$i] = $questionsPayload[$j];
                $questionsPayload[$j] = $tmp;
            }
        }

        // Canonical attempt status check based strictly on komentar === 'submitted'
        $attemptStatus = ($attempt->komentar === 'submitted') ? 'submitted' : 'in_progress';

        return response()->json([
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'status' => $attemptStatus,
                'total_score' => ($attemptStatus === 'submitted') ? (float)$attempt->nilai : null,
                'time_remaining_seconds' => $timeRemaining,
                'is_session_limited' => $isSessionLimited,
                'session_end_time' => $sessionEndTime ? $sessionEndTime->format('Y-m-d H:i:s') : null,
                'tab_switch_count' => 0,
                'exam' => [
                    'title' => $assessment->nama_assessment,
                    'duration_minutes' => $durationMinutes,
                    'settings' => [
                        'max_tab_switches' => 5,
                    ]
                ]
            ],
            'time_remaining_seconds' => $timeRemaining,
            'is_session_limited' => $isSessionLimited,
            'session_end_time' => $sessionEndTime ? $sessionEndTime->format('Y-m-d H:i:s') : null,
            'questions' => $questionsPayload
        ]);
    }

    /**
     * Submit attempt and auto calculate score immediately
     * User Requirement: "langsung Skoring di akhir, Kunci Jawaban, dan Pembahasan"
     */
    public function submit(Request $request, $attemptId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $attempt = AssessmentJawabanPilgan::with(['assessment.soal', 'details'])
            ->where('idassessment_jawaban_pilgan', $attemptId)
            ->where('iduser', $user->iduser)
            ->firstOrFail();

        // Disqualification check: Do NOT allow disqualified attempt to be submitted or restore score (Temuan 04)
        if ($attempt->komentar === 'disqualified') {
            return response()->json([
                'message' => 'Akses ditolak: Lembar ujian Anda telah didiskualifikasi karena pelanggaran integritas.'
            ], 403);
        }

        // Idempotent check: If already submitted, return existing submission data (Temuan 04)
        if ($attempt->komentar === 'submitted') {
            return response()->json([
                'message' => 'Ujian ini sudah diselesaikan sebelumnya.',
                'is_session_ended' => true,
                'attempt' => [
                    'id' => $attempt->idassessment_jawaban_pilgan,
                    'status' => 'submitted',
                    'is_session_ended' => true,
                    'total_score' => (float)$attempt->nilai,
                    'total_questions' => $attempt->assessment?->soal?->count() ?? 0,
                ]
            ], 200);
        }

        $allQuestions = $attempt->assessment->soal;
        $totalQuestions = $allQuestions->count();
        $savedAnswers = $attempt->details->keyBy('idassessment_soal_pilgan');

        $correctCount = 0;
        foreach ($allQuestions as $q) {
            $studentAns = $savedAnswers->get($q->idassessment_soal_pilgan);
            if ($studentAns && strtoupper(trim($studentAns->jawaban)) === strtoupper(trim($q->jawaban))) {
                $correctCount++;
            }
        }

        $finalScore = ($totalQuestions > 0) ? round(($correctCount / $totalQuestions) * 100, 2) : 0;

        // Calculate duration spent
        $startTime = \Carbon\Carbon::parse($attempt->tgl_input_time);
        $durationSeconds = abs(now()->diffInSeconds($startTime));
        $durationFormatted = gmdate('H:i:s', $durationSeconds);

        $attempt->update([
            'nilai' => $finalScore,
            'komentar' => 'submitted',
            'lama_dikerjakan' => $durationFormatted,
        ]);

        $assessment = $attempt->assessment;

        AuditLog::record(
            'SELESAI_UJIAN',
            'assessment_jawaban_pilgan',
            $attemptId,
            "Siswa mengumpulkan lembar ujian " . ($assessment?->nama_assessment ?? 'Ujian') . " (Nilai: {$finalScore})",
            [
                'idassessment' => $assessment?->idassessment,
                'final_score' => $finalScore,
                'correct_answers' => $correctCount,
                'total_questions' => $totalQuestions,
                'duration' => $durationFormatted,
            ]
        );

        // Flow Requirement (mod-siswa-end-session-check):
        // Pengecekan Status Sesi: Apakah Sesi Ujian Benar-benar Berakhir? (End Session)
        // Jika Belum Berakhir -> mod-siswa-waiting-session: Skor & Pembahasan TIDAK Langsung Ditampilkan
        // Jika Sesi Berakhir -> mod-siswa-result-announced: Skor & Pembahasan Lengkap Diumumkan
        $sessionEndTime = null;
        $matchedGroup = ExamGroup::where('exam_id', $assessment?->idassessment)
            ->get()
            ->first(function ($g) use ($attempt) {
                $studentIds = $g->student_ids ?: [];
                $classIds = $g->class_ids ?: [];
                return in_array((string)$attempt->iduser, $studentIds);
            });

        if ($matchedGroup && $matchedGroup->end_time) {
            $sessionEndTime = \Carbon\Carbon::parse($matchedGroup->end_time);
        } elseif ($assessment->tanggal_batas_assessment) {
            $sessionEndTime = \Carbon\Carbon::parse($assessment->tanggal_batas_assessment);
        }

        $isSessionEnded = $sessionEndTime ? now()->gte($sessionEndTime) : true;

        if (!$isSessionEnded) {
            return response()->json([
                'message' => 'Ujian TryOut berhasil diselesaikan dan tersimpan. Skor & pembahasan soal akan diumumkan setelah seluruh sesi ujian ditutup resmi.',
                'is_session_ended' => false,
                'session_end_time' => $sessionEndTime ? $sessionEndTime->format('Y-m-d H:i:s') : null,
                'attempt' => [
                    'id' => $attempt->idassessment_jawaban_pilgan,
                    'status' => 'submitted',
                    'is_session_ended' => false,
                    'total_score' => null,
                    'correct_answers' => null,
                    'total_questions' => $totalQuestions,
                ]
            ]);
        }

        return response()->json([
            'message' => 'Ujian TryOut berhasil diselesaikan.',
            'is_session_ended' => true,
            'session_end_time' => $sessionEndTime ? $sessionEndTime->format('Y-m-d H:i:s') : null,
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'status' => 'submitted',
                'is_session_ended' => true,
                'total_score' => $finalScore,
                'correct_answers' => $correctCount,
                'total_questions' => $totalQuestions,
            ]
        ]);
    }
}
