<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    protected $fillable = [
        'user_id',
        'user_name',
        'user_role',
        'instansi_name',
        'action',
        'module',
        'target_type',
        'target_id',
        'target_label',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Quick helper to record an audit entry
     */
    public static function record(
        string $action,
        ?string $targetType = null,
        ?string $targetId = null,
        ?string $targetLabel = null,
        ?array $metadata = null,
        ?string $userId = null,
        ?string $userName = null,
        ?string $userRole = null,
        ?string $module = null,
        ?string $instansiName = null
    ): self {
        $user = request()->user();

        // Resolve instansi name if not provided
        if (!$instansiName && $user) {
            if (!empty($user->kategori?->nama_kategori)) {
                $instansiName = $user->kategori->nama_kategori;
            } elseif (!empty($metadata['instansi'])) {
                $instansiName = is_string($metadata['instansi']) ? $metadata['instansi'] : null;
            }
        }

        // Infer module from targetType or action if not passed
        if (!$module) {
            if ($targetType === 'kategori_user_bo' || str_contains($action, 'INSTANSI')) {
                $module = 'Kelola Instansi';
            } elseif ($targetType === 'user_bo' || $targetType === 'user' || str_contains($action, 'USER') || str_contains($action, 'GURU') || str_contains($action, 'SISWA') || str_contains($action, 'ADMIN')) {
                $module = 'Kelola Pengguna';
            } elseif (str_contains($action, 'SUBSCRIPTION') || str_contains($action, 'KUOTA')) {
                $module = 'Subscription';
            } elseif (str_contains($action, 'SETTINGS') || str_contains($action, 'CONFIG') || str_contains($action, 'MAINTENANCE')) {
                $module = 'Pengaturan Platform';
            } elseif (str_contains($action, 'LOGIN') || str_contains($action, 'LOGOUT') || str_contains($action, 'AUTH')) {
                $module = 'Autentikasi';
            } else {
                $module = 'Master Akademik';
            }
        }

        return self::create([
            'user_id' => $userId ?? $user?->getAuthIdentifier(),
            'user_name' => $userName ?? ($user?->name ?? 'System'),
            'user_role' => $userRole ?? ($user?->role ?? 'system'),
            'instansi_name' => $instansiName,
            'action' => $action,
            'module' => $module,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_label' => $targetLabel,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent() ? substr(request()->userAgent(), 0, 255) : null,
        ]);
    }
}
