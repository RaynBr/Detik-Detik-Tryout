<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Menu extends Model
{
    use HasFactory;

    protected $table = 'menus';

    protected $fillable = [
        'label',
        'icon',
        'path',
        'parent_id',
        'permission_key',
        'scope',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Menu::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Menu::class, 'parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc');
    }

    /**
     * Retrieve tree of active menus filtered by given permissions and scope.
     * If user is super_admin (isSuperAdmin = true), all menus in that scope are returned.
     */
    public static function getTreeForUser(array $userPermissions, string $scope, bool $isSuperAdmin = false): array
    {
        $rootMenus = self::with(['children' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order', 'asc');
        }])
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->where(function ($q) use ($scope, $isSuperAdmin) {
                if ($isSuperAdmin) {
                    // Super Admin sees platform menus, or matching scope
                    $q->where('scope', $scope);
                } else {
                    $q->where('scope', $scope);
                }
            })
            ->orderBy('sort_order', 'asc')
            ->get();

        $tree = [];

        foreach ($rootMenus as $root) {
            $hasRootAccess = $isSuperAdmin 
                || empty($root->permission_key) 
                || in_array($root->permission_key, $userPermissions);

            $filteredChildren = [];
            foreach ($root->children as $child) {
                $hasChildAccess = $isSuperAdmin 
                    || empty($child->permission_key) 
                    || in_array($child->permission_key, $userPermissions);

                if ($hasChildAccess) {
                    $filteredChildren[] = [
                        'id' => $child->id,
                        'label' => $child->label,
                        'name' => $child->label,
                        'icon' => $child->icon,
                        'path' => $child->path,
                        'permission_key' => $child->permission_key,
                        'sort_order' => $child->sort_order,
                    ];
                }
            }

            // Include root if user has access to root, or has access to at least one child
            if ($hasRootAccess || count($filteredChildren) > 0) {
                $item = [
                    'id' => $root->id,
                    'label' => $root->label,
                    'name' => $root->label,
                    'icon' => $root->icon,
                    'path' => $root->path,
                    'permission_key' => $root->permission_key,
                    'sort_order' => $root->sort_order,
                ];

                if (!empty($filteredChildren)) {
                    $item['subItems'] = $filteredChildren;
                    $item['children'] = $filteredChildren;
                }

                $tree[] = $item;
            }
        }

        return $tree;
    }
}

