<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Flag to temporarily bypass tenant scoping.
     */
    public static bool $disabled = false;

    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (static::$disabled) {
            return;
        }

        // 1. Inactive in console commands, migrations, and seeders (unless in unit testing)
        if (app()->runningInConsole() && !app()->runningUnitTests()) {
            return;
        }

        // 2. Safe check: Do NOT trigger user resolution on login/credential check routes
        $request = request();
        if (!$request || $request->is('api/auth/login') || $request->is('auth/login')) {
            return;
        }

        // Safe resolution without recursion: prioritize already resolved user
        $user = null;
        if (app('auth')->guard('sanctum')->hasUser()) {
            $user = app('auth')->guard('sanctum')->user();
        } elseif (app('auth')->check()) {
            $user = app('auth')->user();
        } elseif ($request) {
            $user = $request->user();
        }

        if (!$user) {
            return;
        }

        // 3. Super Admin bypasses all tenant isolation
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return;
        }
        if (isset($user->role) && $user->role === 'super_admin') {
            return;
        }

        // 4. Resolve user's instansi ID strictly as string (prevents 17-digit numeric truncation/float cast)
        $rawInstansiId = $user->idkategori ?? null;
        $userInstansiId = ($rawInstansiId !== null && $rawInstansiId !== '') ? (string) $rawInstansiId : null;
        if ($userInstansiId === null) {
            return;
        }

        // 5. Check if tenant isolation is strictly enforced
        $isTenantEnforced = (bool) config('rbac.tenant_enforce', false);
        if (!$isTenantEnforced) {
            // Mode Shadow: tidak memfilter query, membiarkan query berjalan seperti perilaku legacy
            return;
        }

        // 6. Determine model column for instansi
        $column = method_exists($model, 'getInstansiColumn') 
            ? $model->getInstansiColumn() 
            : ($model->instansiColumn ?? 'idkategori');

        $table = $model->getTable();
        $qualifiedColumn = "{$table}.{$column}";

        // Special logic for Announcements: read user's instansi OR NULL (national announcements)
        if ($model instanceof \App\Models\Announcement) {
            $builder->where(function ($q) use ($qualifiedColumn, $userInstansiId) {
                $q->where($qualifiedColumn, $userInstansiId)
                  ->orWhereNull($qualifiedColumn);
            });
            return;
        }

        // Standard tenant filtering
        $builder->where($qualifiedColumn, $userInstansiId);
    }
}

