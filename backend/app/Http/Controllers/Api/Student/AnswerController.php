<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\AssessmentJawabanPilgan;
use App\Models\AssessmentJawabanPilganDetail;
use Illuminate\Http\Request;

class AnswerController extends Controller
{
    public function saveAnswer(Request $request, $attemptId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $attempt = AssessmentJawabanPilgan::where('idassessment_jawaban_pilgan', $attemptId)
            ->where('iduser', $user->iduser)
            ->firstOrFail();

        if ($attempt->komentar === 'submitted') {
            return response()->json(['message' => 'Sesi ujian telah diselesaikan. Tidak dapat mengubah jawaban.'], 403);
        }

        $request->validate([
            'question_id' => 'required',
            'answer_content' => 'nullable',
        ]);

        $questionId = (string) $request->question_id;
        $answerContent = $request->answer_content;

        $chosenLetter = null;
        if (is_array($answerContent) && isset($answerContent['option_id'])) {
            $chosenLetter = (string) $answerContent['option_id'];
        } elseif (is_string($answerContent)) {
            $chosenLetter = $answerContent;
        }

        // Upsert answer in assessment_jawaban_pilgan_detail
        $detail = AssessmentJawabanPilganDetail::where('idassessment_jawaban_pilgan', $attemptId)
            ->where('idassessment_soal_pilgan', $questionId)
            ->first();

        if (!$detail) {
            $detailId = (string) (time() . rand(1000000, 9999999));
            $detail = AssessmentJawabanPilganDetail::create([
                'idassessment_jawaban_pilgan_detail' => $detailId,
                'idassessment_jawaban_pilgan' => $attemptId,
                'idassessment_soal_pilgan' => $questionId,
                'jawaban' => $chosenLetter ?: 'A',
            ]);
        } else {
            $detail->update([
                'jawaban' => $chosenLetter ?: $detail->jawaban,
            ]);
        }

        return response()->json([
            'message' => 'Jawaban berhasil disimpan.',
            'data' => [
                'question_id' => $questionId,
                'chosen_option' => $chosenLetter,
            ]
        ]);
    }
}
