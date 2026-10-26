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
        'action',
        'target_type',
        'target_id',
        'target_label',
        'metadata',
        'ip_address',
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
        ?string $userRole = null
    ): self {
        $user = request()->user();

        return self::create([
            'user_id' => $userId ?? $user?->getAuthIdentifier(),
            'user_name' => $userName ?? ($user?->name ?? 'System'),
            'user_role' => $userRole ?? ($user?->role ?? 'system'),
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_label' => $targetLabel,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
        ]);
    }
}
