<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\AssessmentJawabanPilgan;
use App\Models\AssessmentJawabanPilganDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        // Disqualification check (Temuan 04)
        if ($attempt->komentar === 'disqualified') {
            return response()->json(['message' => 'Akses ditolak: Anda telah didiskualifikasi dari sesi ujian ini.'], 403);
        }

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

        $answerVal = $chosenLetter !== null ? (string)$chosenLetter : '';

        // Atomic transaction with row locking to eliminate race condition (Temuan 09)
        DB::transaction(function () use ($attemptId, $questionId, $answerVal) {
            $detail = AssessmentJawabanPilganDetail::where('idassessment_jawaban_pilgan', $attemptId)
                ->where('idassessment_soal_pilgan', $questionId)
                ->lockForUpdate()
                ->first();

            if (!$detail) {
                $detailId = (string) (time() . rand(1000000, 9999999));
                AssessmentJawabanPilganDetail::create([
                    'idassessment_jawaban_pilgan_detail' => $detailId,
                    'idassessment_jawaban_pilgan' => $attemptId,
                    'idassessment_soal_pilgan' => $questionId,
                    'jawaban' => $answerVal,
                ]);
            } else {
                $detail->update([
                    'jawaban' => $answerVal,
                ]);
            }
        });

        return response()->json([
            'message' => 'Jawaban berhasil disimpan.',
            'data' => [
                'question_id' => $questionId,
                'chosen_option' => $chosenLetter,
            ]
        ]);
    }
}
