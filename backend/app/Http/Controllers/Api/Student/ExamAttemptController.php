<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\AssessmentJawabanPilgan;
use App\Models\AssessmentJawabanPilganDetail;
use App\Models\UserSiswa;
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

        $assessments = Assessment::with(['mapel', 'jenjang', 'kelas'])
            ->where(function ($q) use ($idkelas, $idkategori) {
                if ($idkelas) {
                    $q->where('idkelas', $idkelas);
                }
                if ($idkategori) {
                    $q->orWhere('idkategori', $idkategori);
                }
                $q->orWhereNull('idkelas');
            })
            ->orderBy('idassessment', 'desc')
            ->get();

        $mapped = $assessments->map(function ($a) use ($user) {
            $attempt = AssessmentJawabanPilgan::where('idassessment', $a->idassessment)
                ->where('iduser', $user->iduser)
                ->first();

            $startTime = $a->tanggal_mulai_assessment ?: now()->subDays(1)->format('Y-m-d H:i:s');
            $endTime = $a->tanggal_batas_assessment ?: now()->addDays(30)->format('Y-m-d H:i:s');

            $attemptStatus = 'not_started';
            if ($attempt) {
                $attemptStatus = ($attempt->komentar === 'submitted') ? 'submitted' : 'in_progress';
            }

            return [
                'exam_group_id' => (string) $a->idassessment,
                'exam_id' => (string) $a->idassessment,
                'title' => $a->nama_assessment,
                'group_name' => $a->kelas?->nama_kelas ?? 'Umum',
                'subject_code' => $a->mapel?->kode_mapel ?? 'TRYOUT',
                'subject_name' => $a->mapel?->nama_mapel ?? 'TryOut Ujian',
                'duration_minutes' => (int) ($a->waktu_pengerjaan ?: 60),
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => 'published',
                'attempt' => $attempt ? [
                    'id' => (string) $attempt->idassessment_jawaban_pilgan,
                    'status' => $attemptStatus,
                    'started_at' => $attempt->tgl_input_time,
                    'submitted_at' => ($attempt->komentar === 'submitted') ? $attempt->tgl_input_time : null,
                    'total_score' => ($attempt->komentar === 'submitted') ? (float) $attempt->nilai : null,
                ] : null
            ];
        });

        return response()->json($mapped);
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

        $idassessment = (string) $request->exam_group_id;
        $assessment = Assessment::findOrFail($idassessment);

        // Check if existing attempt exists
        $attempt = AssessmentJawabanPilgan::where('idassessment', $idassessment)
            ->where('iduser', $user->iduser)
            ->first();

        if (!$attempt) {
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

            $attempt = AssessmentJawabanPilgan::create([
                'idassessment_jawaban_pilgan' => $attemptId,
                'idassessment' => $idassessment,
                'iduser' => $user->iduser,
                'idtransaksi' => $trxId,
                'nilai' => 0,
                'komentar' => 'in_progress',
                'lama_dikerjakan' => '',
                'tgl_input_time' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Sesi ujian berhasil dimulai.',
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'status' => ($attempt->komentar === 'submitted') ? 'submitted' : 'in_progress',
                'total_score' => $attempt->nilai,
            ]
        ]);
    }

    /**
     * Get attempt questions with randomized options per student
     * User Requirement: "siswa mendapan 50 soal yang sama sesuai apa yang di berikan oleh guru tetapi urutan jawabannya acak"
     */
    public function showAttempt(Request $request, $attemptId)
    {
        $user = $request->user();
        $attempt = AssessmentJawabanPilgan::with(['assessment.mapel', 'details'])
            ->where('idassessment_jawaban_pilgan', $attemptId)
            ->firstOrFail();

        $assessment = $attempt->assessment;
        $allQuestions = AssessmentSoalPilgan::where('idassessment', $assessment->idassessment)
            ->orderBy('idassessment_soal_pilgan', 'asc')
            ->get();

        // Calculate time remaining in seconds
        $durationMinutes = (int) ($assessment->waktu_pengerjaan ?: 60);
        $startTime = \Carbon\Carbon::parse($attempt->tgl_input_time);
        $elapsedSeconds = now()->diffInSeconds($startTime);
        $totalDurationSeconds = $durationMinutes * 60;
        $timeRemaining = max(0, $totalDurationSeconds - $elapsedSeconds);

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

            // Deterministic randomized shuffle per student attempt using seeded shuffle
            // This ensures each student gets distinct option ordering while keeping consistent during reloads
            $seed = crc32($attempt->idassessment_jawaban_pilgan . '_' . $q->idassessment_soal_pilgan);
            mt_srand($seed);
            $shuffledOptions = $rawOptions;
            for ($i = count($shuffledOptions) - 1; $i > 0; $i--) {
                $j = mt_rand(0, $i);
                $tmp = $shuffledOptions[$i];
                $shuffledOptions[$i] = $shuffledOptions[$j];
                $shuffledOptions[$j] = $tmp;
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

        $attemptStatus = ($attempt->nilai !== null) ? 'submitted' : 'in_progress';

        return response()->json([
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'status' => $attemptStatus,
                'total_score' => $attempt->nilai,
                'time_remaining_seconds' => $timeRemaining,
                'tab_switch_count' => 0,
                'exam' => [
                    'title' => $assessment->nama_assessment,
                    'duration_minutes' => $durationMinutes,
                    'settings' => [
                        'max_tab_switches' => 5,
                    ]
                ]
            ],
            'questions' => $questionsPayload
        ]);
    }

    /**
     * Submit attempt and auto calculate score immediately
     * User Requirement: "langsung Skoring di akhir, Kunci Jawaban, dan Pembahasan"
     */
    public function submit(Request $request, $attemptId)
    {
        $attempt = AssessmentJawabanPilgan::with(['assessment.soal', 'details'])
            ->where('idassessment_jawaban_pilgan', $attemptId)
            ->firstOrFail();

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

        return response()->json([
            'message' => 'Ujian TryOut berhasil diselesaikan.',
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'status' => 'submitted',
                'total_score' => $finalScore,
                'correct_answers' => $correctCount,
                'total_questions' => $totalQuestions,
            ]
        ]);
    }
}
