<?php

namespace App\Http\Resources\Rbac;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $item = is_array($this->resource) ? $this->resource : $this->resource->toArray();

        return [
            'id' => $item['id'] ?? null,
            'label' => $item['label'] ?? '',
            'name' => $item['name'] ?? ($item['label'] ?? ''),
            'icon' => $item['icon'] ?? null,
            'path' => $item['path'] ?? null,
            'permission_key' => $item['permission_key'] ?? null,
            'scope' => $item['scope'] ?? 'instansi',
            'sort_order' => (int) ($item['sort_order'] ?? 0),
            'children' => !empty($item['children']) ? self::collection($item['children']) : [],
        ];
    }
}
