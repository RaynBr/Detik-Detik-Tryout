<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TestTask;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class TestTaskController extends Controller
{
    public function index(Request $request)
    {
        $query = TestTask::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $tasks = $query->orderBy('created_at', 'desc')->get();
            return response()->json([
                'data' => $tasks,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $tasks->count(),
                'total' => $tasks->count(),
                'from' => $tasks->count() > 0 ? 1 : null,
                'to' => $tasks->count() > 0 ? $tasks->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        return response()->json($query->orderBy('created_at', 'desc')->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:pending,in_progress,completed',
            'priority' => 'nullable|in:low,medium,high',
        ]);

        $user = $request->user();

        $task = TestTask::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'pending',
            'priority' => $validated['priority'] ?? 'medium',
            'created_by' => $user?->iduser_bo ?? $user?->id,
            'creator_name' => $user?->name ?? 'Admin',
        ]);

        AuditLog::record(
            'CREATE_TEST_TASK',
            'test_tasks',
            $task->id,
            $task->title,
            ['status' => $task->status, 'priority' => $task->priority]
        );

        return response()->json([
            'message' => 'Test Task berhasil dibuat.',
            'data' => $task
        ], 201);
    }

    public function show(TestTask $testTask)
    {
        return response()->json($testTask);
    }

    public function update(Request $request, TestTask $testTask)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:pending,in_progress,completed',
            'priority' => 'nullable|in:low,medium,high',
        ]);

        $testTask->update($validated);

        return response()->json([
            'message' => 'Test Task berhasil diperbarui.',
            'data' => $testTask
        ]);
    }

    public function destroy(TestTask $testTask)
    {
        $title = $testTask->title;
        $id = $testTask->id;
        $testTask->delete();

        AuditLog::record(
            'DELETE_TEST_TASK',
            'test_tasks',
            $id,
            $title,
            []
        );

        return response()->json([
            'message' => 'Test Task berhasil dihapus.'
        ]);
    }
}
