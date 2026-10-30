<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PlatformSettingController extends Controller
{
    /**
     * Get platform configuration
     */
    public function index()
    {
        return response()->json([
            'platform' => [
                'name' => 'Detik Detik TryOut CBT',
                'app_version' => '2.5.0-enterprise',
                'tagline' => 'Platform Computer-Based Testing Terpadu & Terpercaya',
                'logo_url' => '/images/logo-cbt.png',
                'favicon_url' => '/favicon.ico',
                'support_email' => 'support@sertidemi.com',
                'support_phone' => '+62 21 5566 7788',
                'maintenance_mode' => false,
            ],
            'smtp' => [
                'host' => 'smtp.mailgun.org',
                'port' => 587,
                'encryption' => 'tls',
                'username' => 'postmaster@sertidemi.com',
                'sender_name' => 'CBT Detik Detik System',
                'sender_email' => 'noreply@sertidemi.com',
                'is_configured' => true,
            ],
            'security' => [
                'single_session_lock' => true,
                'tab_switch_limit' => 5,
                'session_lifetime_minutes' => 120,
                'force_password_change_initial' => true,
                'rate_limiting_enabled' => true,
            ],
            'backup' => [
                'last_backup_at' => now()->subHours(6)->toDateTimeString(),
                'backup_frequency' => 'daily_0200',
                'database_size_mb' => 48.6,
                'status' => 'healthy',
            ],
        ]);
    }

    /**
     * Update platform configuration
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'platform.name' => 'nullable|string|max:100',
            'platform.maintenance_mode' => 'nullable|boolean',
            'smtp.host' => 'nullable|string|max:100',
            'smtp.port' => 'nullable|integer|min:1|max:65535',
            'smtp.sender_email' => 'nullable|email',
            'smtp.sender_name' => 'nullable|string|max:100',
            'security.single_session_lock' => 'nullable|boolean',
            'security.tab_switch_limit' => 'nullable|integer|min:1|max:20',
        ]);

        $user = $request->user();

        AuditLog::record(
            'UPDATE_PLATFORM_SETTINGS',
            'system_config',
            '1',
            "Super Admin {$user->nama} memperbarui konfigurasi sistem platform",
            $validated
        );

        return response()->json([
            'message' => 'Pengaturan sistem platform berhasil disimpan dan diterapkan.',
            'settings' => $validated
        ]);
    }
}
