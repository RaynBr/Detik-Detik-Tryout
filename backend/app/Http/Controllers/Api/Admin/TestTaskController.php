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

        return response()->json($query->orderBy('created_at', 'desc')->get());
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
