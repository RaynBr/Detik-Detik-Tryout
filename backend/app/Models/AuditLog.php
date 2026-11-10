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

    protected $appends = [
        'device_browser',
        'human_description',
    ];

    /**
     * Parse browser and device from User-Agent string
     */
    public function getDeviceBrowserAttribute(): string
    {
        $ua = $this->user_agent ?? '';
        if (empty($ua)) return 'Perangkat Tidak Diketahui';

        $os = 'Perangkat Lain';
        if (stripos($ua, 'Windows NT 10.0') !== false) $os = 'Windows 10/11';
        elseif (stripos($ua, 'Windows NT 6.3') !== false) $os = 'Windows 8.1';
        elseif (stripos($ua, 'Windows') !== false) $os = 'Windows';
        elseif (stripos($ua, 'Macintosh') !== false || stripos($ua, 'Mac OS') !== false) $os = 'macOS';
        elseif (stripos($ua, 'iPhone') !== false) $os = 'iPhone (iOS)';
        elseif (stripos($ua, 'iPad') !== false) $os = 'iPad (iPadOS)';
        elseif (stripos($ua, 'Android') !== false) $os = 'Android';
        elseif (stripos($ua, 'Linux') !== false) $os = 'Linux';

        $browser = 'Browser';
        if (stripos($ua, 'Edg/') !== false) $browser = 'Microsoft Edge';
        elseif (stripos($ua, 'Chrome/') !== false) $browser = 'Google Chrome';
        elseif (stripos($ua, 'Firefox/') !== false) $browser = 'Mozilla Firefox';
        elseif (stripos($ua, 'Safari/') !== false) $browser = 'Apple Safari';
        elseif (stripos($ua, 'Opera') !== false || stripos($ua, 'OPR/') !== false) $browser = 'Opera';

        return "{$browser} pada {$os}";
    }

    /**
     * Produce human-friendly Indonesian description
     */
    public function getHumanDescriptionAttribute(): string
    {
        $roleTitle = match($this->user_role) {
            'super_admin' => 'Super Administrator',
            'admin' => 'Admin Instansi',
            'guru' => 'Guru',
            'siswa' => 'Siswa',
            default => ucfirst((string)$this->user_role)
        };

        $actor = "{$roleTitle} ({$this->user_name})";
        $target = $this->target_label ?: ($this->target_type ?: 'data');

        if (str_contains($this->action, 'LOGIN')) {
            return "{$actor} berhasil masuk ke sistem melalui {$this->device_browser}";
        }
        if (str_contains($this->action, 'LOGOUT')) {
            return "{$actor} keluar dari sesi akun";
        }
        if (str_contains($this->action, 'CREATE') || str_contains($this->action, 'TAMBAH')) {
            return "{$actor} menambahkan data baru: {$target}";
        }
        if (str_contains($this->action, 'UPDATE') || str_contains($this->action, 'EDIT') || str_contains($this->action, 'UBAH')) {
            $meta = $this->metadata;
            if (is_array($meta) && isset($meta['before']) && isset($meta['after'])) {
                $changes = [];
                foreach ($meta['after'] as $k => $v) {
                    $b = $meta['before'][$k] ?? '-';
                    $changes[] = "{$k} dari '{$b}' menjadi '{$v}'";
                }
                return "{$actor} mengubah {$target}: " . implode(', ', $changes);
            }
            return "{$actor} mengubah rincian data: {$target}";
        }
        if (str_contains($this->action, 'DELETE') || str_contains($this->action, 'HAPUS')) {
            return "{$actor} menghapus data: {$target}";
        }
        if (str_contains($this->action, 'START_EXAM') || str_contains($this->action, 'MULAI_UJIAN')) {
            return "{$actor} mulai mengerjakan ujian: {$target}";
        }
        if (str_contains($this->action, 'SUBMIT_EXAM') || str_contains($this->action, 'SELESAI_UJIAN')) {
            return "{$actor} menyelesaikan dan mengirimkan lembar jawaban: {$target}";
        }
        if (str_contains($this->action, 'IMPORT')) {
            return "{$actor} melakukan import berkas ke: {$target}";
        }
        if (str_contains($this->action, 'EXPORT')) {
            return "{$actor} mengunduh berkas laporan/data: {$target}";
        }

        return "{$actor} melakukan aksi {$this->action} pada {$target}";
    }

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
