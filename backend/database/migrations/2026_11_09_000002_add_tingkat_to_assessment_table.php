<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('assessment', function (Blueprint $table) {
            if (!Schema::hasColumn('assessment', 'tingkat')) {
                $table->unsignedInteger('tingkat')->nullable()->after('idjenjang')->index();
            }
            if (!Schema::hasColumn('assessment', 'idtingkat')) {
                $table->unsignedBigInteger('idtingkat')->nullable()->after('tingkat')->index();
            }
        });

        // Backfill tingkat from master_kelas if available for existing assessments
        try {
            DB::statement("
                UPDATE assessment a 
                JOIN master_kelas k ON a.idkelas = k.id 
                SET a.tingkat = k.tingkat 
                WHERE a.tingkat IS NULL AND a.idkelas IS NOT NULL AND k.tingkat IS NOT NULL
            ");

            // Backfill idtingkat from master_tingkat_kelas if matching tingkat and idjenjang exist
            DB::statement("
                UPDATE assessment a 
                JOIN master_tingkat_kelas tk ON a.tingkat = tk.tingkat AND (a.idjenjang = tk.idjenjang OR tk.idjenjang IS NULL)
                SET a.idtingkat = tk.id 
                WHERE a.idtingkat IS NULL AND a.tingkat IS NOT NULL
            ");
        } catch (\Throwable $e) {
            // Ignore backfill errors if tables empty or differing collation
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessment', function (Blueprint $table) {
            if (Schema::hasColumn('assessment', 'idtingkat')) {
                $table->dropColumn('idtingkat');
            }
            if (Schema::hasColumn('assessment', 'tingkat')) {
                $table->dropColumn('tingkat');
            }
        });
    }
};
