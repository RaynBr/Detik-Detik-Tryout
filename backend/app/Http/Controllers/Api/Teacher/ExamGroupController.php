<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ExamGroup;
use App\Models\Assessment;
use App\Models\UserSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ExamGroupController extends Controller
{
    /**
     * List all exam groups / waves
     */
    public function index(Request $request)
    {
        $query = ExamGroup::with(['assessment.mapel', 'assessment.kelas']);

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store new exam group / wave
     */
    public function store(Request $request)
    {
        $request->validate([
            'exam_id' => 'required',
            'name' => 'required|string|max:255',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'token' => 'nullable|string|min:3|max:20',
            'max_participants' => 'nullable|integer|min:1',
            'class_ids' => 'nullable|array',
            'student_ids' => 'nullable|array',
        ]);

        $token = $request->token ?: strtoupper(Str::random(6));

        while (ExamGroup::where('token', $token)->exists()) {
            $token = strtoupper(Str::random(6));
        }

        $classIds = $request->input('class_ids', []);
        $studentIds = $request->input('student_ids', []);

        // If classes specified but student_ids empty, automatically map student IDs from UserSiswa
        if (!empty($classIds) && empty($studentIds)) {
            $studentIds = UserSiswa::whereIn('idkelas', $classIds)->pluck('iduser')->toArray();
        }

        $examGroup = ExamGroup::create([
            'exam_id' => (string) $request->exam_id,
            'name' => $request->name,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'token' => $token,
            'max_participants' => $request->max_participants ?? 100,
            'class_ids' => $classIds,
            'student_ids' => $studentIds,
        ]);

        // Synchronize timing & class to Assessment if appropriate
        $assessment = Assessment::find($request->exam_id);
        if ($assessment) {
            $updates = [];
            if ($request->filled('start_time')) {
                $updates['tanggal_mulai_assessment'] = $request->start_time;
            }
            if ($request->filled('end_time')) {
                $updates['tanggal_batas_assessment'] = $request->end_time;
            }
            if (!empty($classIds) && empty($assessment->idkelas)) {
                $updates['idkelas'] = $classIds[0];
            }
            if (!empty($updates)) {
                $assessment->update($updates);
            }
        }

        $examGroup->load(['assessment.mapel', 'assessment.kelas']);

        return response()->json([
            'message' => 'Gelombang ujian berhasil dibuat.',
            'data' => $examGroup
        ], 201);
    }

    /**
     * Show single exam group
     */
    public function show($id)
    {
        $group = ExamGroup::with(['assessment.mapel', 'assessment.kelas'])->findOrFail($id);
        return response()->json($group);
    }

    /**
     * Update exam group
     */
    public function update(Request $request, $id)
    {
        $group = ExamGroup::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'token' => 'nullable|string|min:3|max:20|unique:exam_groups,token,' . $id,
            'max_participants' => 'nullable|integer|min:1',
            'class_ids' => 'nullable|array',
            'student_ids' => 'nullable|array',
        ]);

        $token = $request->token ?: $group->token;

        $classIds = $request->has('class_ids') ? $request->class_ids : $group->class_ids;
        $studentIds = $request->has('student_ids') ? $request->student_ids : $group->student_ids;

        if (!empty($classIds) && empty($studentIds)) {
            $studentIds = UserSiswa::whereIn('idkelas', $classIds)->pluck('iduser')->toArray();
        }

        $group->update([
            'name' => $request->name,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'token' => $token,
            'max_participants' => $request->max_participants ?? $group->max_participants,
            'class_ids' => $classIds,
            'student_ids' => $studentIds,
        ]);

        $group->load(['assessment.mapel', 'assessment.kelas']);

        return response()->json([
            'message' => 'Gelombang ujian berhasil diperbarui.',
            'data' => $group
        ]);
    }

    /**
     * Delete exam group
     */
    public function destroy($id)
    {
        $group = ExamGroup::findOrFail($id);
        $group->delete();

        return response()->json([
            'message' => 'Gelombang ujian berhasil dihapus.'
        ]);
    }
}
