<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditTrailController extends Controller
{
    /**
     * List audit logs with filters & pagination
     * Requirement 10: Audit Trail utama HANYA menampilkan aktivitas Super Admin & Admin Instansi
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = AuditLog::query()->orderBy('created_at', 'desc');

        // Scoping for Admin Instansi
        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->iduser_bo)
                  ->orWhere('metadata', 'LIKE', '%"idkategori":"' . $user->idkategori . '"%')
                  ->orWhere('metadata', 'LIKE', '%"idkategori":' . $user->idkategori . '%')
                  ->orWhere('metadata', 'LIKE', '%"idinstansi":"' . $user->idkategori . '"%');
            });
        }

        // Requirement 10: Audit Trail utama hanya menampilkan Super Admin & Admin Instansi
        if (!$request->boolean('all_roles') && !$request->filled('user_role')) {
            $query->whereIn('user_role', ['super_admin', 'admin']);
        } elseif ($request->filled('user_role')) {
            $query->where('user_role', $request->user_role);
        }

        // Filter by action type
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search by user_name, target_label, or action
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'LIKE', "%{$search}%")
                  ->orWhere('target_label', 'LIKE', "%{$search}%")
                  ->orWhere('action', 'LIKE', "%{$search}%")
                  ->orWhere('module', 'LIKE', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    /**
     * Requirement 11: Dedicated panel/menu for Guru & Siswa activities in Admin Instansi
     */
    public function teacherStudentActivities(Request $request)
    {
        $user = $request->user();
        $query = AuditLog::query()->orderBy('created_at', 'desc');

        // Target strictly Guru and Siswa
        if ($request->filled('user_role')) {
            $query->where('user_role', $request->user_role);
        } else {
            $query->whereIn('user_role', ['guru', 'siswa']);
        }

        // Multi-tenant isolation for Admin Instansi
        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where(function ($q) use ($user) {
                $q->where('instansi_name', $user->kategori?->nama_kategori)
                  ->orWhere('metadata', 'LIKE', '%"idkategori":"' . $user->idkategori . '"%')
                  ->orWhere('metadata', 'LIKE', '%"idkategori":' . $user->idkategori . '%')
                  ->orWhere('metadata', 'LIKE', '%"idinstansi":"' . $user->idkategori . '"%');
            });
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'LIKE', "%{$search}%")
                  ->orWhere('target_label', 'LIKE', "%{$search}%")
                  ->orWhere('action', 'LIKE', "%{$search}%");
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        return response()->json($query->paginate($perPage));
    }

    /**
     * Requirement 14: Export Excel / CSV for Audit Trail
     */
    public function export(Request $request)
    {
        $user = $request->user();
        $query = AuditLog::query()->orderBy('created_at', 'desc');

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->iduser_bo)
                  ->orWhere('metadata', 'LIKE', '%"idkategori":"' . $user->idkategori . '"%')
                  ->orWhere('metadata', 'LIKE', '%"idkategori":' . $user->idkategori . '%');
            });
        }

        if (!$request->boolean('all_roles') && !$request->filled('user_role')) {
            $query->whereIn('user_role', ['super_admin', 'admin']);
        } elseif ($request->filled('user_role')) {
            $query->where('user_role', $request->user_role);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->limit(2000)->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="audit_trail_' . date('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($file, ['No', 'Waktu', 'Pelaku', 'Peran', 'Instansi', 'Modul', 'Aksi', 'Target', 'Deskripsi Lengkap', 'Browser & Perangkat', 'Alamat IP']);

            foreach ($logs as $idx => $log) {
                fputcsv($file, [
                    $idx + 1,
                    $log->created_at ? $log->created_at->format('d/m/Y H:i:s') : '-',
                    $log->user_name,
                    $log->user_role,
                    $log->instansi_name ?: '-',
                    $log->module ?: '-',
                    $log->action,
                    $log->target_label ?: ($log->target_type ?: '-'),
                    $log->human_description,
                    $log->device_browser,
                    $log->ip_address ?: '-'
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Requirement 14: Export Excel / CSV for Teacher & Student Activities
     */
    public function exportTeacherStudentActivities(Request $request)
    {
        $user = $request->user();
        $query = AuditLog::query()->orderBy('created_at', 'desc');

        if ($request->filled('user_role')) {
            $query->where('user_role', $request->user_role);
        } else {
            $query->whereIn('user_role', ['guru', 'siswa']);
        }

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where(function ($q) use ($user) {
                $q->where('instansi_name', $user->kategori?->nama_kategori)
                  ->orWhere('metadata', 'LIKE', '%"idkategori":"' . $user->idkategori . '"%');
            });
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->limit(2000)->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="aktivitas_guru_siswa_' . date('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($file, ['No', 'Waktu', 'Pengguna', 'Peran', 'Aktivitas', 'Rincian', 'Perangkat', 'Alamat IP']);

            foreach ($logs as $idx => $log) {
                fputcsv($file, [
                    $idx + 1,
                    $log->created_at ? $log->created_at->format('d/m/Y H:i:s') : '-',
                    $log->user_name,
                    $log->user_role === 'guru' ? 'Guru' : 'Siswa',
                    $log->action,
                    $log->human_description,
                    $log->device_browser,
                    $log->ip_address ?: '-'
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
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
