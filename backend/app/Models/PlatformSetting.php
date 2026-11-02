<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $table = 'platform_settings';
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Get a setting by key with fallback
     */
    public static function get(string $key, $default = null)
    {
        $setting = static::find($key);
        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value
     */
    public static function set(string $key, $value): self
    {
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value]
        );
    }

    /**
     * Get all settings as key-value array
     */
    public static function allKeyed(): array
    {
        return static::pluck('value', 'key')->toArray();
    }

    /**
     * Check if maintenance mode is enabled
     */
    public static function isMaintenance(): bool
    {
        $val = static::get('maintenance_mode', '0');
        return $val === '1' || $val === 'true' || $val === true || $val === 1;
    }
}
