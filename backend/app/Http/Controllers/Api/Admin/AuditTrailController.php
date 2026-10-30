<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditTrailController extends Controller
{
    /**
     * List audit logs with filters & pagination
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = AuditLog::query()->orderBy('created_at', 'desc');

        // Scoping for Admin Instansi (Requirement 3: Terbatas instansinya)
        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->iduser_bo)
                  ->orWhere('metadata', 'LIKE', '%"idkategori":"' . $user->idkategori . '"%')
                  ->orWhere('metadata', 'LIKE', '%"idkategori":' . $user->idkategori . '%')
                  ->orWhere('metadata', 'LIKE', '%"idinstansi":"' . $user->idkategori . '"%')
                  ->orWhereIn('user_role', ['guru', 'siswa']);
            });
        }

        // Filter by action type
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by user role
        if ($request->filled('user_role')) {
            $query->where('user_role', $request->user_role);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search by user_name or target_label
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'LIKE', "%{$search}%")
                  ->orWhere('target_label', 'LIKE', "%{$search}%")
                  ->orWhere('action', 'LIKE', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    /**
     * Get distinct action types for filter dropdown
     */
    public function actions()
    {
        $actions = AuditLog::select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return response()->json($actions);
    }

    /**
     * Get summary stats for audit dashboard
     */
    public function summary()
    {
        $today = now()->toDateString();
        $thisWeek = now()->startOfWeek()->toDateString();

        return response()->json([
            'total_logs' => AuditLog::count(),
            'today_logs' => AuditLog::whereDate('created_at', $today)->count(),
            'week_logs' => AuditLog::whereDate('created_at', '>=', $thisWeek)->count(),
            'recent_logs' => AuditLog::orderBy('created_at', 'desc')->limit(5)->get(),
        ]);
    }
}
