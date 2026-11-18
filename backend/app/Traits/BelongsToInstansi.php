<?php

namespace App\Traits;

use App\Scopes\TenantScope;

trait BelongsToInstansi
{
    /**
     * Boot the BelongsToInstansi trait for a model.
     */
    public static function bootBelongsToInstansi(): void
    {
        static::addGlobalScope(new TenantScope);

        // Auto-populate instansi column on creation if caller is authenticated non-super_admin
        static::creating(function ($model) {
            $column = method_exists($model, 'getInstansiColumn') 
                ? $model->getInstansiColumn() 
                : ($model->instansiColumn ?? 'idkategori');

            $request = request();
            $user = $request ? $request->user() : null;

            if ($user && empty($model->{$column}) && (!method_exists($user, 'isSuperAdmin') || !$user->isSuperAdmin())) {
                if (!empty($user->idkategori)) {
                    $model->{$column} = (string) $user->idkategori;
                }
            }
        });
    }

    /**
     * Get the name of the instansi foreign key column.
     */
    public function getInstansiColumn(): string
    {
        return $this->instansiColumn ?? 'idkategori';
    }
}

