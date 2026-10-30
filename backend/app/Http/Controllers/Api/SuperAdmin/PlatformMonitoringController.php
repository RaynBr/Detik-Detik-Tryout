<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlatformMonitoringController extends Controller
{
    /**
     * Platform-wide activity log & login history
     */
    public function activity(Request $request)
    {
        $search = $request->query('search');
        $action = $request->query('action');
        $limit = min(100, max(10, (int)$request->query('per_page', 20)));

        $query = AuditLog::query()->orderBy('created_at', 'desc');

        if ($action) {
            $query->where('action', $action);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('user_name', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate($limit);

        return response()->json([
            'logs' => $logs,
            'summary' => [
                'total_today' => AuditLog::whereDate('created_at', today())->count(),
                'logins_today' => AuditLog::whereDate('created_at', today())->where('action', 'like', '%LOGIN%')->count(),
                'edits_today' => AuditLog::whereDate('created_at', today())->where('action', 'like', '%EDIT%')->count(),
            ]
        ]);
    }

    /**
     * Platform-wide security log (Failed logins, lockouts, unauthorized requests, anti-cheat disqualifications)
     */
    public function security(Request $request)
    {
        $limit = min(100, max(10, (int)$request->query('per_page', 20)));

        $query = AuditLog::where(function ($q) {
            $q->where('action', 'like', '%FAIL%')
              ->orWhere('action', 'like', '%AUTH%')
              ->orWhere('action', 'like', '%SECURITY%')
              ->orWhere('action', 'like', '%DISQUALIF%')
              ->orWhere('action', 'like', '%VIOLAT%')
              ->orWhere('action', 'like', '%LOCK%');
        })->orderBy('created_at', 'desc');

        $logs = $query->paginate($limit);

        return response()->json([
            'security_events' => $logs,
            'metrics' => [
                'total_security_events' => AuditLog::where('action', 'like', '%SECURITY%')->orWhere('action', 'like', '%DISQUALIF%')->count(),
                'disqualifications_count' => AuditLog::where('action', 'like', '%DISQUALIF%')->count(),
                'single_session_locks' => AuditLog::where('action', 'like', '%LOCK%')->count(),
            ]
        ]);
    }
}
