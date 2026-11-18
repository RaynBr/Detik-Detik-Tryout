<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\UserBo;
use App\Models\UserSiswa;
use App\Services\RbacAssignmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AuditRbacUsers extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'rbac:audit-users
        {--fix : Tambahkan role default HANYA untuk akun yang belum memiliki baris di user_roles (default: dry-run tanpa mengubah data)}';

    /**
     * The console command description.
     */
    protected $description = 'Audit integritas user_roles: deteksi akun tanpa role, role tidak cocok tipe akun, dan ringkasan jumlah per role';

    public function handle(RbacAssignmentService $assignmentService): int
    {
        $shouldFix = (bool) $this->option('fix');

        $this->info('====================================================');
        $this->info('       AUDIT INTEGRITAS RBAC PENGGUNA (user_roles)  ');
        $this->info('====================================================');
        $this->line($shouldFix
            ? 'MODE: --fix (Akan menambahkan role default bagi akun tanpa role saja)'
            : 'MODE: DRY-RUN (Read-only, tidak ada perubahan data di database)');
        $this->newLine();

        // Load all existing user_roles mappings with role metadata
        $assignments = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->select(
                'user_roles.user_type',
                'user_roles.user_id',
                'roles.id as role_id',
                'roles.name as role_name',
                'roles.instansi_id'
            )
            ->get();

        $rolesByUserKey = [];
        foreach ($assignments as $row) {
            $key = $row->user_type . ':' . $row->user_id;
            $rolesByUserKey[$key][] = $row->role_name;
        }

        $missingRoleModels = [];
        $missingRoleTable = [];
        $mismatchedRoleTable = [];

        // 1. Audit UserBo (super_admin, admin_instansi, guru)
        $usersBo = UserBo::all();
        foreach ($usersBo as $bo) {
            $key = UserBo::class . ':' . $bo->iduser_bo;
            $expectedRole = $assignmentService->resolveDefaultRoleName($bo);
            $assignedNames = $rolesByUserKey[$key] ?? [];

            if (empty($assignedNames)) {
                $missingRoleModels[] = $bo;
                $missingRoleTable[] = [
                    'UserBo',
                    (string) $bo->iduser_bo,
                    (string) ($bo->nama ?? '-'),
                    (string) ($bo->login_username ?? '-'),
                    (string) ($expectedRole ?? '-'),
                ];
                continue;
            }

            // Check incompatible role assignments for UserBo
            $incompatible = [];
            foreach ($assignedNames as $rName) {
                if ($rName === 'siswa') {
                    $incompatible[] = $rName;
                } elseif ($expectedRole === 'guru' && in_array($rName, ['super_admin', 'admin_instansi'], true)) {
                    $incompatible[] = $rName;
                } elseif ($expectedRole === 'admin_instansi' && $rName === 'super_admin') {
                    $incompatible[] = $rName;
                }
            }

            if (!empty($incompatible)) {
                $mismatchedRoleTable[] = [
                    'UserBo',
                    (string) $bo->iduser_bo,
                    (string) ($bo->nama ?? '-'),
                    (string) $expectedRole,
                    implode(', ', $assignedNames),
                    'Role tidak cocok: ' . implode(', ', $incompatible),
                ];
            }
        }

        // 2. Audit UserSiswa (table `user`)
        $usersSiswa = UserSiswa::all();
        foreach ($usersSiswa as $siswa) {
            $key = UserSiswa::class . ':' . $siswa->iduser;
            $assignedNames = $rolesByUserKey[$key] ?? [];

            if (empty($assignedNames)) {
                $missingRoleModels[] = $siswa;
                $missingRoleTable[] = [
                    'UserSiswa',
                    (string) $siswa->iduser,
                    (string) ($siswa->nama ?? '-'),
                    (string) ($siswa->nisn ?? '-'),
                    'siswa',
                ];
                continue;
            }

            $incompatible = array_values(array_filter($assignedNames, fn ($rName) => $rName !== 'siswa'));
            if (!empty($incompatible)) {
                $mismatchedRoleTable[] = [
                    'UserSiswa',
                    (string) $siswa->iduser,
                    (string) ($siswa->nama ?? '-'),
                    'siswa',
                    implode(', ', $assignedNames),
                    'Siswa tidak boleh memiliki role: ' . implode(', ', $incompatible),
                ];
            }
        }

        // 3. Display Missing Roles Report
        $this->info('1) Akun Tanpa Baris di user_roles: ' . count($missingRoleTable));
        if (!empty($missingRoleTable)) {
            $this->table(
                ['Tipe Model', 'User ID', 'Nama', 'Username/NISN', 'Role Default Seharusnya'],
                $missingRoleTable
            );
        } else {
            $this->line('   Semua akun sudah memiliki baris di user_roles.');
        }
        $this->newLine();

        // 4. Display Mismatched Roles Report
        $this->info('2) Akun Dengan Role Tidak Cocok Tipe: ' . count($mismatchedRoleTable));
        if (!empty($mismatchedRoleTable)) {
            $this->warn('   PERINGATAN: Ditemukan ketidaksesuaian tipe akun & role:');
            $this->table(
                ['Tipe Model', 'User ID', 'Nama', 'Tipe Seharusnya', 'Role Terpasang', 'Keterangan'],
                $mismatchedRoleTable
            );
        } else {
            $this->line('   Tidak ditemukan akun dengan role yang melanggar tipe akun.');
        }
        $this->newLine();

        // 5. Optional --fix ONLY for accounts without any user_roles row
        if ($shouldFix) {
            if (empty($missingRoleModels)) {
                $this->info('[--fix] Tidak ada akun tanpa role yang perlu diperbaiki.');
            } else {
                $fixedCount = DB::transaction(function () use ($assignmentService, $missingRoleModels) {
                    return $assignmentService->assignDefaultRoleBatch($missingRoleModels);
                });
                $this->info("[--fix] Berhasil menambahkan role default untuk {$fixedCount} akun tanpa role.");
            }
            $this->newLine();
        } elseif (!empty($missingRoleModels)) {
            $this->warn('Jalankan "php artisan rbac:audit-users --fix" secara eksplisit untuk menambahkan role default pada akun tanpa role.');
            $this->newLine();
        }

        // 6. Display Role Counts Summary (live after optional fix)
        $roleCounts = DB::table('roles')
            ->leftJoin('user_roles', 'roles.id', '=', 'user_roles.role_id')
            ->groupBy('roles.id', 'roles.name', 'roles.label', 'roles.instansi_id')
            ->select(
                'roles.name',
                'roles.label',
                'roles.instansi_id',
                DB::raw('COUNT(user_roles.user_id) as total_users')
            )
            ->orderBy('roles.id')
            ->get();

        $this->info('3) Ringkasan Jumlah Pengguna Per Role:');
        $this->table(
            ['Role', 'Label', 'Instansi', 'Jumlah Pengguna'],
            $roleCounts->map(fn ($r) => [
                $r->name,
                $r->label,
                $r->instansi_id ?? 'GLOBAL',
                (int) $r->total_users,
            ])->all()
        );

        return 0;
    }
}

