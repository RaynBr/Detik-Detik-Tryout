<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('platform_settings')) {
            Schema::create('platform_settings', function (Blueprint $table) {
                $table->string('key', 100)->primary();
                $table->longText('value')->nullable();
                $table->timestamps();
            });

            // Seed default settings
            $defaults = [
                'platform_name' => 'Detik Detik TryOut',
                'platform_logo' => '',
                'platform_favicon' => '',
                'copyright' => '© 2026 Detik Detik TryOut. Hak Cipta Dilindungi.',
                'support_email' => 'support@detiktryout.id',
                'support_phone' => '+62 812-3456-7890',
                'maintenance_mode' => '0',
            ];

            foreach ($defaults as $key => $val) {
                DB::table('platform_settings')->insert([
                    'key' => $key,
                    'value' => $val,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
