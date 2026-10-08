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
        $reviewQuestions = [];

        foreach ($questions as $idx => $q) {
            $studentAns = $savedAnswers->get($q->idassessment_soal_pilgan);
            $chosen = $studentAns ? strtoupper(trim($studentAns->jawaban)) : null;
            $correctKey = strtoupper(trim($q->jawaban));
            $isCorrect = ($chosen !== null && $chosen === $correctKey);

            if ($isCorrect) {
                $correctCount++;
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

            $reviewQuestions[] = [
                'number' => $idx + 1,
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

        $totalQuestions = count($questions);
        $score = ($totalQuestions > 0) ? round(($correctCount / $totalQuestions) * 100, 2) : 0;

        return response()->json([
            'attempt' => [
                'id' => $attempt->idassessment_jawaban_pilgan,
                'assessment_id' => $assessment->idassessment,
                'title' => $assessment->nama_assessment,
                'subject' => $assessment->mapel?->nama_mapel ?? 'TryOut',
                'status' => 'submitted',
                'total_score' => (float) ($attempt->nilai ?? $score),
                'total_questions' => $totalQuestions,
                'total_correct' => $correctCount,
                'total_incorrect' => $totalQuestions - $correctCount,
                'duration_spent' => $attempt->lama_dikerjakan ?: '-',
                'submitted_at' => $attempt->tgl_input_time,
            ],
            'questions' => $reviewQuestions,
            'results_hidden' => false,
        ]);
    }
}
