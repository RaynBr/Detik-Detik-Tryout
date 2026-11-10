<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\AssessmentJawabanPilgan;
use App\Models\AssessmentSoalPilgan;
use Illuminate\Http\Request;

class ResultController extends Controller
{
    public function showResult(Request $request, $attemptId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $attempt = AssessmentJawabanPilgan::with(['assessment.mapel', 'details'])
            ->where('idassessment_jawaban_pilgan', $attemptId)
            ->where('iduser', $user->iduser)
            ->firstOrFail();

        $assessment = $attempt->assessment;
        $questions = AssessmentSoalPilgan::where('idassessment', $assessment->idassessment)
            ->orderBy('idassessment_soal_pilgan', 'asc')
            ->get();

        $savedAnswers = $attempt->details->keyBy('idassessment_soal_pilgan');

        $correctCount = 0;
        $incorrectCount = 0;
        $unansweredCount = 0;
        $reviewQuestions = [];

        foreach ($questions as $idx => $q) {
            $studentAns = $savedAnswers->get($q->idassessment_soal_pilgan);
            $rawAnswer = $studentAns ? trim((string)$studentAns->jawaban) : '';
            $chosen = ($rawAnswer !== '') ? strtoupper($rawAnswer) : null;
            $correctKey = strtoupper(trim((string)$q->jawaban));

            $status = 'unanswered';
            if ($chosen !== null) {
                if ($chosen === $correctKey) {
                    $status = 'correct';
                    $correctCount++;
                } else {
                    $status = 'incorrect';
                    $incorrectCount++;
                }
            } else {
                $unansweredCount++;
            }

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

            // Consistent deterministic seeded shuffle matching ExamAttemptController (Temuan 27)
            $isAcakOpsi = in_array($assessment->acak_opsi, ['Y', '1', 1, true], true);
            if ($isAcakOpsi) {
                $seed = crc32($attempt->idassessment_jawaban_pilgan . '_' . $q->idassessment_soal_pilgan);
                mt_srand($seed);
                $shuffledOptions = $options;
                for ($i = count($shuffledOptions) - 1; $i > 0; $i--) {
                    $j = mt_rand(0, $i);
                    $tmp = $shuffledOptions[$i];
                    $shuffledOptions[$i] = $shuffledOptions[$j];
                    $shuffledOptions[$j] = $tmp;
                }
                $options = $shuffledOptions;
            }

            $reviewQuestions[] = [
                'number' => $idx + 1,
                'question_id' => $q->idassessment_soal_pilgan,
                'soal_text' => $q->soal_text ?: 'Pertanyaan',
                'soal_gambar' => $q->soal_gambar,
                'options' => $options,
                'student_answer' => $chosen,
                'correct_answer' => $correctKey,
                'is_correct' => ($status === 'correct'),
                'status' => $status, // 'correct' | 'incorrect' | 'unanswered'
                'explanation' => $q->penjelasan_jawaban ?: 'Tidak ada pembahasan khusus untuk nomor ini.',
            ];
        }

        // Consistent deterministic question shuffle matching ExamAttemptController (Temuan 27)
        $isAcakSoal = in_array($assessment->acak_soal, ['Y', '1', 1, true], true);
        if ($isAcakSoal) {
            $qSeed = crc32($attempt->idassessment_jawaban_pilgan . '_questions_order');
            mt_srand($qSeed);
            for ($i = count($reviewQuestions) - 1; $i > 0; $i--) {
                $j = mt_rand(0, $i);
                $tmp = $reviewQuestions[$i];
                $reviewQuestions[$i] = $reviewQuestions[$j];
                $reviewQuestions[$j] = $tmp;
            }
            foreach ($reviewQuestions as $k => &$rq) {
                $rq['number'] = $k + 1;
            }
            unset($rq);
        }

        $totalQuestions = count($questions);
        $score = ($totalQuestions > 0) ? round(($correctCount / $totalQuestions) * 100, 2) : 0;
        $kkm = (float) ($assessment->mapel?->kkm ?? 75);
        $finalScore = (float) ($attempt->nilai ?? $score);

        // Flow Requirement (mod-siswa-end-session-check):
        // Pengecekan Status Sesi: Apakah Sesi Ujian Benar-benar Berakhir? (End Session)
        // Jika Belum Berakhir -> mod-siswa-waiting-session: Skor & Pembahasan TIDAK Langsung Ditampilkan
        // Jika Sesi Berakhir -> mod-siswa-result-announced: Skor & Pembahasan Lengkap Diumumkan
        $sessionEndTime = null;
        $matchedGroup = \App\Models\ExamGroup::where('exam_id', $assessment->idassessment)
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

        if ($matchedGroup && $matchedGroup->end_time) {
            $sessionEndTime = \Carbon\Carbon::parse($matchedGroup->end_time);
        } elseif ($assessment->tanggal_batas_assessment) {
            $sessionEndTime = \Carbon\Carbon::parse($assessment->tanggal_batas_assessment);
        }

        $isSessionEnded = $sessionEndTime ? now()->gte($sessionEndTime) : true;

        if (!$isSessionEnded) {
            return response()->json([
                'is_session_ended' => false,
                'results_hidden' => true,
                'message' => 'Sesi ujian masih berlangsung. Skor dan pembahasan soal belum dapat diakses. Menunggu jadwal sesi ujian ditutup resmi' . ($sessionEndTime ? ' pada ' . $sessionEndTime->format('d/m/Y H:i') . ' WIB.' : '.'),
                'session_end_time' => $sessionEndTime ? $sessionEndTime->format('Y-m-d H:i:s') : null,
                'attempt' => [
                    'id' => $attempt->idassessment_jawaban_pilgan,
                    'assessment_id' => $assessment->idassessment,
                    'title' => $assessment->nama_assessment,
                    'subject' => $assessment->mapel?->nama_mapel ?? 'TryOut',
                    'status' => 'submitted',
                    'total_score' => null,
                    'total_questions' => $totalQuestions,
                    'total_correct' => null,
                    'total_incorrect' => null,
                    'duration_spent' => $attempt->lama_dikerjakan ?: '-',
                    'submitted_at' => $attempt->tgl_input_time,
                    'is_session_ended' => false,
                ],
                'questions' => [],
            ]);
        }

        return response()->json([
            'is_session_ended' => true,
            'results_hidden' => false,
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'assessment_id' => $assessment->idassessment,
                'title' => $assessment->nama_assessment,
                'subject' => $assessment->mapel?->nama_mapel ?? 'TryOut',
                'kkm' => $kkm,
                'status' => 'submitted',
                'total_score' => $finalScore,
                'total_questions' => $totalQuestions,
                'total_correct' => $correctCount,
                'total_incorrect' => $incorrectCount,
                'total_unanswered' => $unansweredCount,
                'is_passed_kkm' => ($finalScore >= $kkm),
                'duration_spent' => $attempt->lama_dikerjakan ?: '-',
                'submitted_at' => $attempt->tgl_input_time,
                'is_session_ended' => true,
            ],
            'questions' => $reviewQuestions,
        ]);
    }
}
