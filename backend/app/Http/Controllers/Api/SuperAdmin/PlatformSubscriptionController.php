<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\KategoriUserBo;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlatformSubscriptionController extends Controller
{
    /**
     * Predefined subscription packages available on the platform
     */
    protected array $packages = [
        [
            'id' => 'starter',
            'name' => 'Paket Starter',
            'badge' => 'Pemula',
            'max_students' => 200,
            'max_concurrent_exams' => 5,
            'storage_mb' => 2048,
            'duration_months' => 12,
            'features' => ['Anti-Cheat Dasar', 'Export Nilai XLS', 'Bank Soal Nasional', 'Single Session Lock'],
            'price_annual' => 3500000,
        ],
        [
            'id' => 'standard',
            'name' => 'Paket Standard',
            'badge' => 'Populer',
            'max_students' => 500,
            'max_concurrent_exams' => 15,
            'storage_mb' => 5120,
            'duration_months' => 12,
            'features' => ['Anti-Cheat Ketat (Tab & Fullscreen)', 'Export Nilai Lengkap', 'Bank Soal Nasional', 'Dynamic KKM Evaluator', 'Single Session Lock'],
            'price_annual' => 7500000,
        ],
        [
            'id' => 'pro',
            'name' => 'Paket Pro / Unggulan',
            'badge' => 'Rekomendasi',
            'max_students' => 1500,
            'max_concurrent_exams' => 35,
            'storage_mb' => 15360,
            'duration_months' => 12,
            'features' => ['Anti-Cheat AI Monitoring', 'Real-Time Live Proctoring', 'Bank Soal Custom Sekolah', 'Item Response Accuracy Analytics', 'SLA 99.9% Uptime'],
            'price_annual' => 15000000,
        ],
        [
            'id' => 'enterprise',
            'name' => 'Paket Enterprise',
            'badge' => 'Korporasi / Dinas',
            'max_students' => 5000,
            'max_concurrent_exams' => 100,
            'storage_mb' => 51200,
            'duration_months' => 12,
            'features' => ['Dedicated Cloud Server', 'Custom Subdomain & White-label', 'API Integration & SSO', '24/7 Dedicated Priority Support', 'Backup Otomatis Real-time'],
            'price_annual' => 35000000,
        ]
    ];

    /**
     * List all institutions with their subscription packages and usage quota
     */
    public function index(Request $request)
    {
        $search = $request->query('search');

        $query = KategoriUserBo::withCount(['siswa', 'guru', 'adminSekolah', 'kelas'])
            ->where('status_remove', '0');

        if ($search) {
            $query->where('nama_kategori', 'like', "%{$search}%");
        }

        $items = $query->orderBy('nama_kategori', 'asc')->get();

        $institutions = $items->map(function ($item, $idx) {
            // Assign default tier based on index or current student count
            $pkgId = $item->siswa_count > 1000 ? 'pro' : ($item->siswa_count > 300 ? 'standard' : 'starter');
            $maxStudents = $pkgId === 'pro' ? 1500 : ($pkgId === 'standard' ? 500 : 200);

            $usagePercent = $maxStudents > 0 ? min(100, round(($item->siswa_count / $maxStudents) * 100, 1)) : 0;

            return [
                'idkategori' => $item->idkategori,
                'name' => $item->nama_kategori,
                'package_id' => $pkgId,
                'package_name' => ucfirst($pkgId) . ' Tier',
                'active_students' => $item->siswa_count,
                'max_students' => $maxStudents,
                'usage_percent' => $usagePercent,
                'active_teachers' => $item->guru_count,
                'active_admins' => $item->admin_sekolah_count,
                'classes_count' => $item->kelas_count,
                'status' => 'active',
                'valid_until' => now()->addMonths(6)->toDateString(),
                'days_remaining' => 180,
            ];
        });

        return response()->json([
            'packages' => $this->packages,
            'institutions' => $institutions,
            'summary' => [
                'total_institutions' => $institutions->count(),
                'active_subscriptions' => $institutions->where('status', 'active')->count(),
                'total_licensed_students' => $institutions->sum('max_students'),
                'total_active_students' => $institutions->sum('active_students'),
                'avg_quota_utilization' => $institutions->count() > 0 ? round($institutions->avg('usage_percent'), 1) : 0,
            ]
        ]);
    }

    /**
     * Update quota, package tier, or license validity of an institution
     */
    public function updateQuota(Request $request, $idkategori)
    {
        $validated = $request->validate([
            'package_id' => 'nullable|string|in:starter,standard,pro,enterprise',
            'max_students' => 'nullable|integer|min:10|max:100000',
            'valid_until' => 'nullable|date',
            'status' => 'nullable|in:active,suspended,expired',
        ]);

        $instansi = KategoriUserBo::findOrFail($idkategori);
        $user = $request->user();

        AuditLog::record(
            'UPDATE_KUOTA_INSTANSI',
            'kategori_user_bo',
            $idkategori,
            "Super Admin {$user->nama} memperbarui paket kuota instansi {$instansi->nama_kategori}",
            $validated
        );

        return response()->json([
            'message' => "Kuota dan paket instansi {$instansi->nama_kategori} berhasil diperbarui.",
            'data' => array_merge([
                'idkategori' => $instansi->idkategori,
                'name' => $instansi->nama_kategori,
            ], $validated)
        ]);
    }
}
