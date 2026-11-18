<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MigrateUsersToRbac extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rbac:migrate-users {--dry-run : Jalankan simulasi pemetaan role tanpa menyimpan data ke database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrasikan user existing (user_bo dan user siswa) ke tabel user_roles sesuai role historis mereka';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');

        $this->info("==================================================");
        $this->info("  MIGRASI PENGGUNA KE SISTEM RBAC (user_roles)   ");
        $this->info("==================================================");

        if ($isDryRun) {
            $this->warn("MODE: DRY-RUN (Simulasi saja, tidak ada data yang diubah di database)\n");
        } else {
            $this->info("MODE: LIVE MIGRATION (Data akan disimpan ke tabel user_roles)\n");
        }

        // 1. Resolve role IDs from roles table
        $roles = Role::whereNull('instansi_id')->pluck('id', 'name');
        
        $requiredRoleKeys = ['super_admin', 'admin_instansi', 'guru', 'siswa'];
        $missingRoles = [];
        foreach ($requiredRoleKeys as $k) {
            if (!isset($roles[$k])) {
                $missingRoles[] = $k;
            }
        }

        if (!empty($missingRoles)) {
            $this->error("FATAL: Role sistem berikut belum tersedia di tabel roles: " . implode(', ', $missingRoles));
            $this->error("Silakan jalankan seeder [DynamicRbacSeeder] terlebih dahulu.");
            return 1;
        }

        // 2. Scan and categorize Back Office Users (user_bo)
        $usersBo = UserBo::all();
        $this->line("Memindai tabel [user_bo] ({$usersBo->count()} akun ditemukan)...");

        $superAdmins = [];
        $schoolAdmins = [];
        $gurus = [];
        $unmappedBo = [];

        foreach ($usersBo as $bo) {
            $statusAdmin = (string) $bo->status_admin;
            $roleType = (string) $bo->role_type;

            if ($statusAdmin === '1' || $roleType === 'super_admin') {
                $superAdmins[] = $bo;
            } elseif ($statusAdmin === '2' && in_array($roleType, ['admin_sekolah', 'admin', 'admin_instansi'], true)) {
                $schoolAdmins[] = $bo;
            } elseif ($roleType === 'guru' || ($statusAdmin === '2' && empty($roleType))) {
                $gurus[] = $bo;
            } else {
                $unmappedBo[] = [
                    'id' => $bo->iduser_bo,
                    'username' => $bo->login_username,
                    'nama' => $bo->nama,
                    'status_admin' => $statusAdmin,
                    'role_type' => $roleType,
                ];
            }
        }

        // 3. Scan Students (table user)
        $usersSiswa = UserSiswa::all();
        $this->line("Memindai tabel [user] (siswa) ({$usersSiswa->count()} akun ditemukan)...\n");

        // 4. CRITICAL SAFETY CHECK: At least 1 Super Admin MUST be detected
        if (count($superAdmins) === 0) {
            $this->error("*************************************************************************");
            $this->error(" FATAL: Tidak ada akun Super Admin yang terdeteksi di tabel user_bo!   ");
            $this->error(" Migrasi dibatalkan demi keamanan agar tidak terjadi lockout sistem.    ");
            $this->error("*************************************************************************");
            return 1;
        }

        // 5. Display Summary Table
        $this->table(
            ['Role Sistem', 'Model Pengguna', 'Tabel Sumber', 'Jumlah Akun'],
            [
                ['super_admin', UserBo::class, 'user_bo', count($superAdmins)],
                ['admin_instansi', UserBo::class, 'user_bo', count($schoolAdmins)],
                ['guru', UserBo::class, 'user_bo', count($gurus)],
                ['siswa', UserSiswa::class, 'user', $usersSiswa->count()],
            ]
        );

        if (!empty($unmappedBo)) {
            $this->warn("\nPERINGATAN: Ditemukan " . count($unmappedBo) . " akun Back Office yang tidak ter-mapping:");
            $this->table(['ID', 'Username', 'Nama', 'status_admin', 'role_type'], $unmappedBo);
        } else {
            $this->info("Semua akun terpetakan 100% tanpa ada akun yang terabaikan.");
        }

        if ($isDryRun) {
            $this->info("\n[DRY-RUN SELESAI] Simulasi pemetaan berhasil. Database tetap utuh tanpa perubahan.");
            return 0;
        }

        // 6. Execute Live Migration within Transaction
        $this->line("\nMenulis pemetaan role ke tabel [user_roles]...");

        DB::transaction(function () use ($superAdmins, $schoolAdmins, $gurus, $usersSiswa, $roles) {
            $now = now();

            // Insert Super Admins
            foreach ($superAdmins as $u) {
                DB::table('user_roles')->updateOrInsert([
                    'user_type' => UserBo::class,
                    'user_id' => (string) $u->iduser_bo,
                    'role_id' => $roles['super_admin'],
                ], [
                    'updated_at' => $now,
                    'created_at' => $now,
                ]);
                Cache::forget("user_permissions_" . UserBo::class . "_{$u->iduser_bo}");
            }

            // Insert School Admins
            foreach ($schoolAdmins as $u) {
                DB::table('user_roles')->updateOrInsert([
                    'user_type' => UserBo::class,
                    'user_id' => (string) $u->iduser_bo,
                    'role_id' => $roles['admin_instansi'],
                ], [
                    'updated_at' => $now,
                    'created_at' => $now,
                ]);
                Cache::forget("user_permissions_" . UserBo::class . "_{$u->iduser_bo}");
            }

            // Insert Gurus
            foreach ($gurus as $u) {
                DB::table('user_roles')->updateOrInsert([
                    'user_type' => UserBo::class,
                    'user_id' => (string) $u->iduser_bo,
                    'role_id' => $roles['guru'],
                ], [
                    'updated_at' => $now,
                    'created_at' => $now,
                ]);
                Cache::forget("user_permissions_" . UserBo::class . "_{$u->iduser_bo}");
            }

            // Insert Students in chunks
            $siswaRoleId = $roles['siswa'];
            foreach ($usersSiswa as $s) {
                DB::table('user_roles')->updateOrInsert([
                    'user_type' => UserSiswa::class,
                    'user_id' => (string) $s->iduser,
                    'role_id' => $siswaRoleId,
                ], [
                    'updated_at' => $now,
                    'created_at' => $now,
                ]);
                Cache::forget("user_permissions_" . UserSiswa::class . "_{$s->iduser}");
            }
        });

        $this->info("SUKSES: Seluruh pengguna berhasil dimigrasikan ke tabel user_roles secara idempotent!");
        return 0;
    }
}

