<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\KategoriUserBo;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class PlatformSubscriptionController extends Controller
{
    /**
     * List all institutions with their access authorization status (Aktif / Non Aktif).
     * No prices, billing, invoices, or payments.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $statusFilter = $request->query('status'); // aktif, nonaktif, warning, expired
        $perPage = (int) $request->input('per_page', 15);
        $today = now()->startOfDay();

        // Auto-synchronize backend database: if tanggal_berakhir is past, sync status
        KategoriUserBo::syncExpiredSubscriptions($today);

        $query = KategoriUserBo::withCount(['siswa', 'guru', 'adminSekolah', 'kelas']);

        if ($search) {
            $query->where('nama_kategori', 'like', "%{$search}%");
        }

        if ($statusFilter === 'aktif') {
            $query->activeAccess($today);
        } elseif ($statusFilter === 'warning') {
            $query->warningAccess($today);
        } elseif ($statusFilter === 'expired') {
            $query->expiredAccess($today);
        } elseif ($statusFilter === 'nonaktif') {
            $query->inactiveAccess($today);
        }

        $processItem = function ($item) use ($today) {
            $endDate = $item->tanggal_berakhir ? \Carbon\Carbon::parse($item->tanggal_berakhir)->endOfDay() : null;
            $isExpired = $endDate ? $today->greaterThan($endDate) : false;
            $daysRemaining = null;

            if ($endDate) {
                $daysRemaining = (int) $today->diffInDays($endDate, false);
            }

            // Determine indicator: 'expired' | 'warning' | 'nonaktif' | 'aktif'
            if ($isExpired) {
                $indicator = 'expired';
                $indicatorLabel = 'Expired';
                $status = 'expired';
                $isActive = false;
            } elseif ($item->subscription_status === 'nonaktif' || $item->status_remove === 'Y' || $item->status_aktif === 'N') {
                $indicator = 'nonaktif';
                $indicatorLabel = 'Nonaktif';
                $status = 'nonaktif';
                $isActive = false;
            } elseif ($daysRemaining !== null && $daysRemaining >= 0 && $daysRemaining <= 7) {
                $indicator = 'warning';
                $indicatorLabel = 'Akan Berakhir';
                $status = 'aktif';
                $isActive = true;
            } else {
                $indicator = 'aktif';
                $indicatorLabel = 'Aktif';
                $status = 'aktif';
                $isActive = true;
            }

            return [
                'idkategori' => (string) $item->idkategori,
                'name' => $item->nama_kategori,
                'nama_instansi' => $item->nama_kategori,
                'status' => $status,
                'indicator' => $indicator,
                'indicator_label' => $indicatorLabel,
                'days_remaining' => $daysRemaining !== null ? max(0, $daysRemaining) : null,
                'is_active' => $isActive,
                'is_expired' => $isExpired,
                'is_warning' => $indicator === 'warning',
                'tanggal_aktif' => $item->tanggal_aktif ? \Carbon\Carbon::parse($item->tanggal_aktif)->toDateString() : ($item->tgl_input ? \Carbon\Carbon::parse($item->tgl_input)->toDateString() : null),
                'tanggal_berakhir' => $item->tanggal_berakhir ? \Carbon\Carbon::parse($item->tanggal_berakhir)->toDateString() : null,
                'keterangan' => $item->keterangan_subscription ?? 'Izin penggunaan platform CBT',
                'active_teachers' => $item->guru_count ?? 0,
                'active_students' => $item->siswa_count ?? 0,
                'active_admins' => $item->admin_sekolah_count ?? 0,
                'classes_count' => $item->kelas_count ?? 0,
            ];
        };

        // Single Source of Truth for Platform Access Statistics
        $summary = KategoriUserBo::getPlatformAccessSummary();

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('nama_kategori', 'asc')->get();
            $data = $items->map($processItem);

            return response()->json([
                'data' => $data,
                'institutions' => $data,
                'total' => $data->count(),
                'summary' => $summary,
            ]);
        }

        $paginator = $query->orderBy('nama_kategori', 'asc')->paginate($perPage);
        $paginator->getCollection()->transform($processItem);

        return response()->json([
            'data' => $paginator->items(),
            'institutions' => $paginator->items(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
            'summary' => $summary,
        ]);
    }

    /**
     * Update access authorization status of an institution.
     */
    public function updateQuota(Request $request, $idkategori)
    {
        return $this->update($request, $idkategori);
    }

    /**
     * Update subscription / permission of an institution (Aktif / Non Aktif).
     */
    public function update(Request $request, $idkategori)
    {
        $validated = $request->validate([
            'status' => 'required|string',
            'tanggal_aktif' => 'nullable|date',
            'tanggal_berakhir' => 'nullable|date',
            'keterangan' => 'nullable|string|max:1000',
        ]);

        $instansi = KategoriUserBo::where('idkategori', $idkategori)->firstOrFail();
        $today = now()->startOfDay();

        $endDateStr = array_key_exists('tanggal_berakhir', $validated) 
            ? $validated['tanggal_berakhir'] 
            : $instansi->tanggal_berakhir;

        $isExpired = false;
        if ($endDateStr) {
            $endDate = \Carbon\Carbon::parse($endDateStr)->endOfDay();
            $isExpired = $today->greaterThan($endDate);
        }

        $requestedStatus = strtolower($validated['status']);
        $updates = [];

        if (array_key_exists('tanggal_aktif', $validated)) {
            $updates['tanggal_aktif'] = $validated['tanggal_aktif'];
        }
        if (array_key_exists('tanggal_berakhir', $validated)) {
            $updates['tanggal_berakhir'] = $validated['tanggal_berakhir'];
        }
        if (array_key_exists('keterangan', $validated)) {
            $updates['keterangan_subscription'] = $validated['keterangan'];
        }

        $previousWasExpired = false;
        if ($instansi->tanggal_berakhir) {
            $previousWasExpired = $today->greaterThan(\Carbon\Carbon::parse($instansi->tanggal_berakhir)->endOfDay());
        }

        if ($isExpired) {
            // Expired: date has passed, force inactive status
            $updates['subscription_status'] = 'nonaktif';
            $updates['status_aktif'] = 'N';
            $newStatus = 'expired';
            $message = "Masa berlaku instansi telah berakhir pada {$endDateStr}. Status otomatis menjadi Expired / Nonaktif.";
        } else {
            // Date is in future or unlimited:
            // If previously expired and now extended, ALWAYS restore to Aktif!
            $isExtendedFromExpired = $previousWasExpired && !$isExpired;
            $wantsExplicitNonaktif = in_array($requestedStatus, ['nonaktif', 'non aktif', 'suspended', 'n']) && !$isExtendedFromExpired;

            if ($wantsExplicitNonaktif) {
                $updates['subscription_status'] = 'nonaktif';
                $updates['status_aktif'] = 'N';
                $newStatus = 'nonaktif';
                $message = "Hak akses instansi {$instansi->nama_kategori} dinonaktifkan.";
            } else {
                // Extended or activated
                $updates['subscription_status'] = 'aktif';
                $updates['status_aktif'] = 'Y';
                $updates['status_remove'] = 'N';
                $newStatus = 'aktif';
                $message = "Tanggal berakhir diperpanjang hingga " . ($endDateStr ?? 'tidak terbatas') . ". Hak akses instansi {$instansi->nama_kategori} kembali Aktif.";
            }
        }

        $instansi->update($updates);

        $action = ($newStatus === 'aktif') ? 'Aktivasi Subscription' : 'Nonaktif/Expired Subscription';

        AuditLog::record(
            $action,
            'kategori_user_bo',
            (string) $instansi->idkategori,
            "{$action} untuk instansi {$instansi->nama_kategori}",
            [
                'status' => $newStatus,
                'tanggal_aktif' => $updates['tanggal_aktif'] ?? $instansi->tanggal_aktif,
                'tanggal_berakhir' => $updates['tanggal_berakhir'] ?? $instansi->tanggal_berakhir,
                'keterangan' => $updates['keterangan_subscription'] ?? $instansi->keterangan_subscription,
            ],
            null,
            null,
            null,
            'Subscription',
            $instansi->nama_kategori
        );

        return response()->json([
            'message' => $message,
            'data' => [
                'idkategori' => $instansi->idkategori,
                'nama_instansi' => $instansi->nama_kategori,
                'status' => $newStatus,
                'tanggal_aktif' => $instansi->tanggal_aktif,
                'tanggal_berakhir' => $instansi->tanggal_berakhir,
                'keterangan' => $instansi->keterangan_subscription,
            ]
        ]);
    }

    /**
     * Toggle subscription / access status of an institution (Aktif / Non Aktif).
     */
    public function toggleStatus(Request $request, $idkategori)
    {
        $instansi = KategoriUserBo::where('idkategori', $idkategori)->firstOrFail();
        $today = now()->startOfDay();
        $isExpired = $instansi->tanggal_berakhir ? $today->greaterThan(\Carbon\Carbon::parse($instansi->tanggal_berakhir)->endOfDay()) : false;

        $isCurrentlyActive = ($instansi->status_remove !== 'Y') 
            && ($instansi->status_aktif !== 'N') 
            && (($instansi->subscription_status ?? 'aktif') === 'aktif')
            && !$isExpired;

        $newStatus = $isCurrentlyActive ? 'nonaktif' : 'aktif';

        $updates = [
            'subscription_status' => $newStatus,
            'status_remove' => 'N',
            'status_aktif' => $isCurrentlyActive ? 'N' : 'Y',
        ];

        // If activating and previously expired, automatically extend expiration date by 1 year
        if (!$isCurrentlyActive && $isExpired) {
            $updates['tanggal_berakhir'] = now()->addYear()->toDateString();
        }

        $instansi->update($updates);

        $action = ($newStatus === 'aktif') ? 'Aktivasi Subscription' : 'Nonaktif Subscription';

        AuditLog::record(
            $action,
            'kategori_user_bo',
            (string) $instansi->idkategori,
            "{$action} untuk instansi {$instansi->nama_kategori}",
            ['new_status' => $newStatus],
            null,
            null,
            null,
            'Subscription',
            $instansi->nama_kategori
        );

        return response()->json([
            'message' => "Status akses instansi {$instansi->nama_kategori} berhasil diubah menjadi {$newStatus}.",
            'data' => [
                'idkategori' => $instansi->idkategori,
                'status' => $newStatus,
            ]
        ]);
    }
}
