<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class PlatformSettingController extends Controller
{
    /**
     * Get all platform settings
     */
    public function index()
    {
        $settings = PlatformSetting::allKeyed();

        $maintenanceMode = ($settings['maintenance_mode'] ?? '0') === '1' || ($settings['maintenance_mode'] ?? '') === 'true';

        return response()->json([
            'platform' => [
                'name' => $settings['platform_name'] ?? 'Detik Detik TryOut',
                'logo_url' => $settings['platform_logo'] ?? '',
                'favicon_url' => $settings['platform_favicon'] ?? '',
                'copyright' => $settings['copyright'] ?? '© 2026 Detik Detik TryOut. Hak Cipta Dilindungi.',
                'support_email' => $settings['support_email'] ?? 'support@detiktryout.id',
                'support_phone' => $settings['support_phone'] ?? '+62 812-3456-7890',
                'maintenance_mode' => $maintenanceMode,
                'app_version' => '2.5.0-enterprise',
            ],
            'smtp' => [
                'host' => $settings['smtp_host'] ?? 'smtp.mailgun.org',
                'port' => (int) ($settings['smtp_port'] ?? 587),
                'encryption' => $settings['smtp_encryption'] ?? 'tls',
                'sender_name' => $settings['smtp_sender_name'] ?? 'Detik Detik CBT',
                'sender_email' => $settings['smtp_sender_email'] ?? 'noreply@detiktryout.id',
                'is_configured' => true,
            ],
            'security' => [
                'single_session_lock' => true,
                'tab_switch_limit' => 5,
                'session_lifetime_minutes' => 120,
            ],
            'settings' => array_merge($settings, [
                'platform_name' => $settings['platform_name'] ?? 'Detik Detik TryOut',
                'maintenance_mode' => $maintenanceMode,
            ]),
            'platform_name' => $settings['platform_name'] ?? 'Detik Detik TryOut',
            'maintenance_mode' => $maintenanceMode,
        ]);
    }

    /**
     * Public platform settings (available to landing page & guest users)
     */
    public function publicSettings()
    {
        $settings = PlatformSetting::allKeyed();
        $maintenanceMode = ($settings['maintenance_mode'] ?? '0') === '1' || ($settings['maintenance_mode'] ?? '') === 'true';

        return response()->json([
            'platform_name' => $settings['platform_name'] ?? 'Detik Detik TryOut',
            'logo_url' => $settings['platform_logo'] ?? '',
            'favicon_url' => $settings['platform_favicon'] ?? '',
            'copyright' => $settings['copyright'] ?? '© 2026 Detik Detik TryOut. Hak Cipta Dilindungi.',
            'support_email' => $settings['support_email'] ?? 'support@detiktryout.id',
            'support_phone' => $settings['support_phone'] ?? '+62 812-3456-7890',
            'maintenance_mode' => $maintenanceMode,
        ]);
    }

    /**
     * Update platform configuration from dashboard
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'platform.name' => 'nullable|string|max:100',
            'platform.logo_url' => 'nullable|string|max:500',
            'platform.favicon_url' => 'nullable|string|max:500',
            'platform.copyright' => 'nullable|string|max:255',
            'platform.support_email' => 'nullable|email|max:100',
            'platform.support_phone' => 'nullable|string|max:50',
            'platform.maintenance_mode' => 'nullable|boolean',
            'name' => 'nullable|string|max:100',
            'logo_url' => 'nullable|string|max:500',
            'favicon_url' => 'nullable|string|max:500',
            'copyright' => 'nullable|string|max:255',
            'support_email' => 'nullable|email|max:100',
            'support_phone' => 'nullable|string|max:50',
            'maintenance_mode' => 'nullable|boolean',
        ]);

        $platform = $request->input('platform', []);

        $name = $platform['name'] ?? $request->input('name');
        $logo = $platform['logo_url'] ?? $request->input('logo_url');
        $favicon = $platform['favicon_url'] ?? $request->input('favicon_url');
        $copyright = $platform['copyright'] ?? $request->input('copyright');
        $email = $platform['support_email'] ?? $request->input('support_email');
        $phone = $platform['support_phone'] ?? $request->input('support_phone');
        $maintenance = isset($platform['maintenance_mode']) ? $platform['maintenance_mode'] : $request->input('maintenance_mode');

        if ($name !== null) PlatformSetting::set('platform_name', $name);
        if ($logo !== null) PlatformSetting::set('platform_logo', $logo);
        if ($favicon !== null) PlatformSetting::set('platform_favicon', $favicon);
        if ($copyright !== null) PlatformSetting::set('copyright', $copyright);
        if ($email !== null) PlatformSetting::set('support_email', $email);
        if ($phone !== null) PlatformSetting::set('support_phone', $phone);
        if ($maintenance !== null) PlatformSetting::set('maintenance_mode', $maintenance ? '1' : '0');

        $user = $request->user();

        AuditLog::record(
            'Edit Data',
            'platform_settings',
            '1',
            "Super Admin {$user->name} memperbarui pengaturan platform",
            [
                'platform_name' => $name,
                'maintenance_mode' => $maintenance ? 'Aktif' : 'Non Aktif',
                'support_email' => $email,
                'support_phone' => $phone,
            ],
            null,
            null,
            null,
            'Pengaturan Platform'
        );

        return response()->json([
            'message' => 'Pengaturan platform berhasil disimpan dan diterapkan.',
            'settings' => $this->index()->original
        ]);
    }
}
