<?php

namespace App\Http\Resources\Rbac;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class RoleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $permissions = $this->whenLoaded('permissions', function () {
            return $this->permissions->map(function ($p) {
                return [
                    'id' => $p->id,
                    'key' => $p->key,
                    'label' => $p->label,
                    'module' => $p->module,
                    'scope' => $p->scope,
                ];
            });
        });

        $usersCount = $this->users_count ?? DB::table('user_roles')->where('role_id', $this->id)->count();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'label' => $this->label,
            'instansi_id' => $this->instansi_id,
            'is_system' => (bool) $this->is_system,
            'is_global' => empty($this->instansi_id),
            'users_count' => (int) $usersCount,
            'permissions_count' => $this->relationLoaded('permissions') ? $this->permissions->count() : DB::table('role_permissions')->where('role_id', $this->id)->count(),
            'permissions' => $permissions,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

