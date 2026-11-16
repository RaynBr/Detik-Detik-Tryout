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
     * Authorize whether user can access or manage this exam group resource.
     */
    protected function authorizeGroupAccess($user, ExamGroup $group): ?\Illuminate\Http\JsonResponse
    {
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->role === 'super_admin') {
            return null;
        }

        $assessment = $group->assessment;
        if (!$assessment) {
            return null;
        }

        if ($user->role === 'admin' || $user->role === 'admin_instansi') {
            if (!empty($user->idkategori) && !empty($assessment->idkategori) 
                && (string)$assessment->idkategori !== (string)$user->idkategori 
                && (string)$assessment->idkategori !== '27830150842287772') {
                return response()->json(['message' => 'Akses ditolak: Jadwal ujian bukan milik instansi Anda.'], 403);
            }
            return null;
        }

        if ($user->role === 'guru') {
            $isOwner = !empty($assessment->iduser_bo) && (string)$assessment->iduser_bo === (string)$user->iduser_bo;
            $sameSchool = !empty($user->idkategori) && (string)$assessment->idkategori === (string)$user->idkategori;
            $isGlobal = empty($assessment->idkategori) || (string)$assessment->idkategori === '27830150842287772';
            if (!$isOwner && !$sameSchool && !$isGlobal) {
                return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki akses ke jadwal ujian ini.'], 403);
            }
            return null;
        }

        return response()->json(['message' => 'Akses ditolak.'], 403);
    }

    /**
     * List all exam groups / waves
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = ExamGroup::with(['assessment.mapel', 'assessment.kelas']);

        // Multi-tenant isolation: Only super admin sees all groups across schools
        if ($user && $user->role !== 'super_admin') {
            $query->whereHas('assessment', function ($aq) use ($user) {
                if ($user->role === 'admin' && !empty($user->idkategori)) {
                    $aq->where('idkategori', $user->idkategori);
                } elseif ($user->role === 'guru') {
                    $aq->where(function ($sub) use ($user) {
                        $sub->where('iduser_bo', $user->iduser_bo);
                        if (!empty($user->idkategori)) {
                            $sub->orWhere('idkategori', $user->idkategori);
                        }
                    });
                }
            });
        }

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('token', 'like', "%{$s}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->latest()->get();
            return response()->json([
                'data' => $items,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $items->count(),
                'total' => $items->count(),
                'from' => $items->count() > 0 ? 1 : null,
                'to' => $items->count() > 0 ? $items->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        return response()->json($query->latest()->paginate($perPage));
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

        $assessment = Assessment::findOrFail($request->exam_id);

        $user = $request->user();
        if ($user && $user->role !== 'super_admin') {
            if (($user->role === 'admin' || $user->role === 'admin_instansi') && !empty($user->idkategori)) {
                if (!empty($assessment->idkategori) && (string)$assessment->idkategori !== (string)$user->idkategori && (string)$assessment->idkategori !== '27830150842287772') {
                    return response()->json(['message' => 'Akses ditolak: Anda tidak dapat membuat jadwal ujian instansi lain.'], 403);
                }
            }
            if ($user->role === 'guru') {
                $isOwner = !empty($assessment->iduser_bo) && (string)$assessment->iduser_bo === (string)$user->iduser_bo;
                $sameSchool = !empty($user->idkategori) && (string)$assessment->idkategori === (string)$user->idkategori;
                $isGlobal = empty($assessment->idkategori) || (string)$assessment->idkategori === '27830150842287772';
                if (!$isOwner && !$sameSchool && !$isGlobal) {
                    return response()->json(['message' => 'Akses ditolak: Anda tidak dapat membuat jadwal ujian paket ini.'], 403);
                }
            }
        }

        // If assessment was in draft, auto-activate upon scheduling a wave
        if ($assessment->status_paket === 'draft') {
            $assessment->update([
                'status_paket' => 'aktif',
                'status_aktif' => 'Y',
            ]);
        }
        // Bind to user institution if unassigned or global
        if ($user && !empty($user->idkategori) && (empty($assessment->idkategori) || (string)$assessment->idkategori === '27830150842287772')) {
            $assessment->update(['idkategori' => $user->idkategori]);
        }

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

        // Synchronize timing, class & activate Assessment so students can immediately see and access it
        $assessment = Assessment::find($request->exam_id);
        if ($assessment) {
            $updates = [
                'status_aktif' => 'Y',
            ];
            if ($request->filled('start_time')) {
                $updates['tanggal_mulai_assessment'] = $request->start_time;
            }
            if ($request->filled('end_time')) {
                $updates['tanggal_batas_assessment'] = $request->end_time;
            }
            if (!empty($classIds) && empty($assessment->idkelas)) {
                $updates['idkelas'] = $classIds[0];
            }
            $assessment->update($updates);
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
    public function show(Request $request, $id)
    {
        $group = ExamGroup::with(['assessment.mapel', 'assessment.kelas'])->findOrFail($id);

        if ($deny = $this->authorizeGroupAccess($request->user(), $group)) {
            return $deny;
        }

        return response()->json($group);
    }

    /**
     * Update exam group
     */
    public function update(Request $request, $id)
    {
        $group = ExamGroup::findOrFail($id);

        if ($deny = $this->authorizeGroupAccess($request->user(), $group)) {
            return $deny;
        }

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

        if ($group->assessment) {
            $group->assessment->update(['status_aktif' => 'Y']);
        }

        $group->load(['assessment.mapel', 'assessment.kelas']);

        return response()->json([
            'message' => 'Gelombang ujian berhasil diperbarui.',
            'data' => $group
        ]);
    }

    /**
     * Delete exam group
     */
    public function destroy(Request $request, $id)
    {
        $group = ExamGroup::findOrFail($id);

        if ($deny = $this->authorizeGroupAccess($request->user(), $group)) {
            return $deny;
        }

        $group->delete();

        return response()->json([
            'message' => 'Gelombang ujian berhasil dihapus.'
        ]);
    }
}
