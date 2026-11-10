<?php

namespace App\Http\Controllers\Api\Proctoring;

use App\Http\Controllers\Controller;
use App\Models\AssessmentJawabanPilgan;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class ViolationLogController extends Controller
{
    public function logViolation(Request $request, $attempt = null)
    {
        $resolvedAttemptId = $attempt ?: $request->route('attempt') ?: $request->input('attempt_id') ?: $request->input('attempt');

        if (!$resolvedAttemptId) {
            return response()->json(['message' => 'ID sesi pengerjaan (attempt_id) wajib disertakan.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        // Verify attempt belongs to the student (Temuan 14)
        $attemptModel = AssessmentJawabanPilgan::with('assessment')
            ->where('idassessment_jawaban_pilgan', $resolvedAttemptId)
            ->where('iduser', $user->iduser)
            ->first();

        if (!$attemptModel) {
            return response()->json(['message' => 'Sesi pengerjaan ujian tidak ditemukan.'], 404);
        }

        if ($attemptModel->komentar === 'submitted') {
            return response()->json(['message' => 'Ujian telah diserahkan sebelumnya.'], 403);
        }

        $type = $request->input('violation_type', $request->input('type', 'tab_switch'));

        // Count previous violations for this attempt
        $previousCount = AuditLog::where('action', 'PELANGGARAN_UJIAN')
            ->where('target_id', $attemptModel->idassessment_jawaban_pilgan)
            ->count();
        $violationsCount = $previousCount + 1;

        // Record violation in AuditLog
        AuditLog::record(
            'PELANGGARAN_UJIAN',
            'assessment_jawaban_pilgan',
            $attemptModel->idassessment_jawaban_pilgan,
            "Pelanggaran {$type} ke-{$violationsCount} oleh siswa {$user->nama}",
            [
                'type' => $type,
                'violation_count' => $violationsCount,
                'metadata' => $request->input('metadata', []),
            ],
            (string)$user->iduser,
            $user->nama,
            'siswa',
            'proctoring',
            $user->kategori?->nama_kategori
        );

        $maxAllowed = 5;

        $shouldDisqualify = $request->boolean('is_disqualified') 
            || $request->boolean('force_disqualify') 
            || ($violationsCount >= $maxAllowed);

        if ($shouldDisqualify) {
            $attemptModel->update([
                'komentar' => 'disqualified',
                'nilai' => 0,
            ]);

            AuditLog::record(
                'DISKUALIFIKASI_UJIAN',
                'assessment_jawaban_pilgan',
                $attemptModel->idassessment_jawaban_pilgan,
                "Siswa {$user->nama} didiskualifikasi dari ujian " . ($attemptModel->assessment?->nama_assessment ?? 'Ujian') . " karena pelanggaran batas tab",
                [
                    'violations_count' => max($violationsCount, $maxAllowed),
                    'max_allowed' => $maxAllowed,
                ],
                (string)$user->iduser,
                $user->nama,
                'siswa',
                'proctoring',
                $user->kategori?->nama_kategori
            );

            return response()->json([
                'message' => 'Anda telah didiskualifikasi karena melebihi batas perpindahan tab/jendela yang diizinkan.',
                'is_disqualified' => true,
                'disqualified' => true,
                'tab_switch_count' => max($violationsCount, $maxAllowed),
                'violations_count' => max($violationsCount, $maxAllowed),
                'max_allowed' => $maxAllowed,
            ], 200);
        }

        return response()->json([
            'message' => 'Pelanggaran tercatat.',
            'is_disqualified' => false,
            'disqualified' => false,
            'tab_switch_count' => $violationsCount,
            'violations_count' => $violationsCount,
            'max_allowed' => $maxAllowed,
        ]);
    }

    public function disqualify(Request $request, $attempt = null)
    {
        $resolvedAttemptId = $attempt ?: $request->route('attempt') ?: $request->input('attempt_id') ?: $request->input('attempt');

        if (!$resolvedAttemptId) {
            return response()->json(['message' => 'ID sesi pengerjaan (attempt_id) wajib disertakan.'], 422);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $attemptModel = AssessmentJawabanPilgan::with('assessment')
            ->where('idassessment_jawaban_pilgan', $resolvedAttemptId)
            ->where('iduser', $user->iduser)
            ->first();

        if (!$attemptModel) {
            return response()->json(['message' => 'Sesi pengerjaan ujian tidak ditemukan.'], 404);
        }

        $attemptModel->update([
            'komentar' => 'disqualified',
            'nilai' => 0,
        ]);

        AuditLog::record(
            'DISKUALIFIKASI_UJIAN',
            'assessment_jawaban_pilgan',
            $attemptModel->idassessment_jawaban_pilgan,
            "Siswa {$user->nama} didiskualifikasi secara permanen",
            ['reason' => 'explicit_disqualify'],
            (string)$user->iduser,
            $user->nama,
            'siswa',
            'proctoring',
            $user->kategori?->nama_kategori
        );

        return response()->json([
            'message' => 'Sesi ujian telah didiskualifikasi secara permanen.',
            'is_disqualified' => true,
            'disqualified' => true,
            'status' => 'disqualified',
            'score' => 0,
            'attempt' => [
                'id' => $attemptModel->idassessment_jawaban_pilgan,
                'status' => 'disqualified',
                'total_score' => 0,
            ]
        ], 200);
    }
}
