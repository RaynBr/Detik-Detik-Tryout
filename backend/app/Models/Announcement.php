<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'attachment_url',
        'attachment_name',
        'category',
        'priority',
        'status',
        'publish_at',
        'expired_at',
        'badge_text',
        'target_role',
        'target_type',
        'target_id',
        'idkategori',
        'is_active',
        'created_by',
        'role',
        'created_by_user_id',
        'id_guru',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'publish_at' => 'datetime',
        'expired_at' => 'datetime',
    ];

    public function instansi(): BelongsTo
    {
        return $this->belongsTo(KategoriUserBo::class, 'idkategori', 'idkategori');
    }

    public function guru(): BelongsTo
    {
        return $this->belongsTo(UserBo::class, 'id_guru', 'iduser_bo');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id', 'id');
    }

    /**
     * Scope for active announcements based on status and dates
     */
    public function scopeActive($query)
    {
        $now = now();
        return $query->where('is_active', true)
            ->whereIn('status', ['Aktif', 'active'])
            ->where(function ($q) use ($now) {
                $q->whereNull('publish_at')->orWhere('publish_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('expired_at')->orWhere('expired_at', '>=', $now);
            });
    }
}
