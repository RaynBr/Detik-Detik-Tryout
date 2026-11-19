<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DynamicRbacSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            $this->seedPermissions();
            $this->seedRoles();
            $this->seedMenus();
        });
    }

    protected function seedPermissions(): void
    {
        $permissions = [
            // ==========================================
            // SCOPE: PLATFORM (Super Administrator)
            // ==========================================
            [
                'key' => 'dashboard_platform.view',
                'label' => 'Lihat Dashboard & Statistik Platform',
                'module' => 'Dashboard Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'instansi.view',
                'label' => 'Lihat Data Instansi',
                'module' => 'Kelola Instansi',
                'scope' => 'platform',
            ],
            [
                'key' => 'instansi.create',
                'label' => 'Tambah Instansi Baru',
                'module' => 'Kelola Instansi',
                'scope' => 'platform',
            ],
            [
                'key' => 'instansi.edit',
                'label' => 'Ubah Data Instansi',
                'module' => 'Kelola Instansi',
                'scope' => 'platform',
            ],
            [
                'key' => 'instansi.delete',
                'label' => 'Hapus Instansi',
                'module' => 'Kelola Instansi',
                'scope' => 'platform',
            ],
            [
                'key' => 'user_platform.view',
                'label' => 'Lihat Pengguna Platform',
                'module' => 'Kelola Pengguna Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'user_platform.create',
                'label' => 'Tambah Pengguna Platform',
                'module' => 'Kelola Pengguna Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'user_platform.edit',
                'label' => 'Ubah Pengguna Platform',
                'module' => 'Kelola Pengguna Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'user_platform.delete',
                'label' => 'Hapus Pengguna Platform',
                'module' => 'Kelola Pengguna Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'master.view',
                'label' => 'Lihat Master Akademik Global',
                'module' => 'Master Akademik Global',
                'scope' => 'platform',
            ],
            [
                'key' => 'master.manage',
                'label' => 'Kelola Master Akademik Global',
                'module' => 'Master Akademik Global',
                'scope' => 'platform',
            ],
            [
                'key' => 'banksoal.view',
                'label' => 'Lihat Bank Soal Global',
                'module' => 'Bank Soal Global',
                'scope' => 'platform',
            ],
            [
                'key' => 'banksoal.manage',
                'label' => 'Kelola Bank Soal Global',
                'module' => 'Bank Soal Global',
                'scope' => 'platform',
            ],
            [
                'key' => 'audit.view',
                'label' => 'Lihat Audit Trail & Monitoring Global',
                'module' => 'Audit Trail & Monitoring',
                'scope' => 'platform',
            ],
            [
                'key' => 'announcement_global.view',
                'label' => 'Lihat Pengumuman Global',
                'module' => 'Pengumuman Global',
                'scope' => 'platform',
            ],
            [
                'key' => 'announcement_global.manage',
                'label' => 'Kelola Pengumuman Global',
                'module' => 'Pengumuman Global',
                'scope' => 'platform',
            ],
            [
                'key' => 'subscription.view',
                'label' => 'Lihat Langganan Platform',
                'module' => 'Langganan Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'subscription.manage',
                'label' => 'Kelola Langganan Platform',
                'module' => 'Langganan Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'platform_setting.view',
                'label' => 'Lihat Pengaturan Platform',
                'module' => 'Pengaturan Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'platform_setting.manage',
                'label' => 'Kelola Pengaturan Platform',
                'module' => 'Pengaturan Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'role_platform.view',
                'label' => 'Lihat Role & Hak Akses Platform',
                'module' => 'Manajemen Role Platform',
                'scope' => 'platform',
            ],
            [
                'key' => 'role_platform.manage',
                'label' => 'Kelola Role & Hak Akses Platform',
                'module' => 'Manajemen Role Platform',
                'scope' => 'platform',
            ],

            // ==========================================
            // SCOPE: INSTANSI (Admin Instansi & Guru & Siswa)
            // ==========================================
            [
                'key' => 'dashboard_sekolah.view',
                'label' => 'Lihat Dashboard & Statistik Sekolah',
                'module' => 'Dashboard Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'admin_sekolah.manage',
                'label' => 'Kelola Akun Administrator Sekolah',
                'module' => 'Kelola Pengguna Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'guru.view',
                'label' => 'Lihat Data Guru',
                'module' => 'Kelola Guru',
                'scope' => 'instansi',
            ],
            [
                'key' => 'guru.create',
                'label' => 'Tambah Guru',
                'module' => 'Kelola Guru',
                'scope' => 'instansi',
            ],
            [
                'key' => 'guru.edit',
                'label' => 'Ubah Data Guru',
                'module' => 'Kelola Guru',
                'scope' => 'instansi',
            ],
            [
                'key' => 'guru.delete',
                'label' => 'Hapus Guru',
                'module' => 'Kelola Guru',
                'scope' => 'instansi',
            ],
            [
                'key' => 'guru.import',
                'label' => 'Import Massal Guru',
                'module' => 'Kelola Guru',
                'scope' => 'instansi',
            ],
            [
                'key' => 'siswa.view',
                'label' => 'Lihat Data Siswa',
                'module' => 'Kelola Siswa',
                'scope' => 'instansi',
            ],
            [
                'key' => 'siswa.create',
                'label' => 'Tambah Siswa',
                'module' => 'Kelola Siswa',
                'scope' => 'instansi',
            ],
            [
                'key' => 'siswa.edit',
                'label' => 'Ubah Data Siswa',
                'module' => 'Kelola Siswa',
                'scope' => 'instansi',
            ],
            [
                'key' => 'siswa.delete',
                'label' => 'Hapus Siswa',
                'module' => 'Kelola Siswa',
                'scope' => 'instansi',
            ],
            [
                'key' => 'siswa.import',
                'label' => 'Import Massal Siswa',
                'module' => 'Kelola Siswa',
                'scope' => 'instansi',
            ],
            [
                'key' => 'kelas.view',
                'label' => 'Lihat Kelas & Rombel',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'kelas.manage',
                'label' => 'Kelola Kelas & Rombel',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'mapel.view',
                'label' => 'Lihat Mata Pelajaran',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'mapel.manage',
                'label' => 'Kelola Mata Pelajaran & KKM',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'guru_pengampu.manage',
                'label' => 'Kelola Guru Pengampu Mapel',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'wali_kelas.manage',
                'label' => 'Kelola Penugasan Wali Kelas',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'akademik_sekolah.view',
                'label' => 'Lihat Master Akademik Sekolah',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'akademik_sekolah.manage',
                'label' => 'Kelola Master Akademik Sekolah',
                'module' => 'Master Akademik Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'instansi_sekolah.view',
                'label' => 'Lihat Profil Instansi Sekolah',
                'module' => 'Profil Instansi Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'instansi_sekolah.manage',
                'label' => 'Kelola Profil Instansi Sekolah',
                'module' => 'Profil Instansi Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'jadwal.view',
                'label' => 'Lihat Jadwal Ujian',
                'module' => 'Jadwal Ujian',
                'scope' => 'instansi',
            ],
            [
                'key' => 'jadwal.manage',
                'label' => 'Kelola Jadwal & Penugasan Ujian',
                'module' => 'Jadwal Ujian',
                'scope' => 'instansi',
            ],
            [
                'key' => 'monitoring.view',
                'label' => 'Lihat Monitoring Ujian & Statistik',
                'module' => 'Monitoring & Proctoring',
                'scope' => 'instansi',
            ],
            [
                'key' => 'proctoring.view',
                'label' => 'Lihat Log Pelanggaran Proctoring Siswa',
                'module' => 'Monitoring & Proctoring',
                'scope' => 'instansi',
            ],
            [
                'key' => 'aktivitas.view',
                'label' => 'Lihat Aktivitas Guru & Siswa',
                'module' => 'Aktivitas Pengguna',
                'scope' => 'instansi',
            ],
            [
                'key' => 'announcement.view',
                'label' => 'Lihat Pengumuman Sekolah',
                'module' => 'Pengumuman Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'announcement.manage',
                'label' => 'Kelola Pengumuman Sekolah',
                'module' => 'Pengumuman Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'laporan.view',
                'label' => 'Lihat Laporan & Rekap Nilai',
                'module' => 'Laporan Rekap Nilai',
                'scope' => 'instansi',
            ],
            [
                'key' => 'laporan.export',
                'label' => 'Ekspor Laporan Rekap Nilai',
                'module' => 'Laporan Rekap Nilai',
                'scope' => 'instansi',
            ],
            [
                'key' => 'profil.manage',
                'label' => 'Kelola Profil & Keamanan Akun',
                'module' => 'Profil Pengguna',
                'scope' => 'instansi',
            ],
            [
                'key' => 'role_instansi.view',
                'label' => 'Lihat Role & Akses Sekolah',
                'module' => 'Role & Akses Sekolah',
                'scope' => 'instansi',
            ],
            [
                'key' => 'role_instansi.manage',
                'label' => 'Kelola Role & Akses Sekolah',
                'module' => 'Role & Akses Sekolah',
                'scope' => 'instansi',
            ],
            // Khusus Guru: Soal Guru & Katalog Bank Soal Global (Read-only)
            [
                'key' => 'soal.view',
                'label' => 'Lihat Bank Soal Guru',
                'module' => 'Bank Soal Guru',
                'scope' => 'instansi',
            ],
            [
                'key' => 'soal.manage',
                'label' => 'Kelola Butir Soal Guru',
                'module' => 'Bank Soal Guru',
                'scope' => 'instansi',
            ],
            [
                'key' => 'banksoal_global.view',
                'label' => 'Lihat Katalog Bank Soal Global',
                'module' => 'Katalog Bank Soal Global',
                'scope' => 'instansi',
            ],
            [
                'key' => 'banksoal_global.manage',
                'label' => 'Kelola Katalog Bank Soal Global (Khusus Super Admin)',
                'module' => 'Katalog Bank Soal Global',
                'scope' => 'instansi',
            ],
            // Khusus Siswa: Ujian CBT & Nilai
            [
                'key' => 'ujian.ikut',
                'label' => 'Mengikuti Ujian CBT Online',
                'module' => 'Portal Ujian Siswa',
                'scope' => 'instansi',
            ],
            [
                'key' => 'nilai.view',
                'label' => 'Melihat Hasil & Nilai Ujian Siswa',
                'module' => 'Portal Ujian Siswa',
                'scope' => 'instansi',
            ],
        ];

        foreach ($permissions as $p) {
            Permission::updateOrCreate(
                ['key' => $p['key']],
                [
                    'label' => $p['label'],
                    'module' => $p['module'],
                    'scope' => $p['scope'],
                ]
            );
        }
    }

    protected function seedRoles(): void
    {
        // 1. Super Admin Role (Platform Owner)
        $superAdmin = Role::updateOrCreate(
            ['name' => 'super_admin', 'instansi_id' => null],
            [
                'label' => 'Super Administrator Platform',
                'is_system' => true,
            ]
        );
        // Super Admin gets all permissions
        $allPermissions = Permission::all();
        $superAdmin->permissions()->sync($allPermissions->pluck('id')->all());

        // 2. Admin Instansi Role (School Admin Template)
        $adminInstansi = Role::updateOrCreate(
            ['name' => 'admin_instansi', 'instansi_id' => null],
            [
                'label' => 'Administrator Sekolah / Instansi',
                'is_system' => true,
            ]
        );
        // Admin Instansi gets all instansi permissions EXCEPT banksoal_global.manage (reserved strictly for Super Admin)
        $instansiPermissions = Permission::where('scope', 'instansi')
            ->where('key', '!=', 'banksoal_global.manage')
            ->get();
        $adminInstansi->permissions()->sync($instansiPermissions->pluck('id')->all());

        // 3. Guru Role (Teacher Global Template) - Strictly instansi scope
        $guru = Role::updateOrCreate(
            ['name' => 'guru', 'instansi_id' => null],
            [
                'label' => 'Guru Pengajar',
                'is_system' => true,
            ]
        );
        $guruKeys = [
            'soal.view',
            'soal.manage',
            'banksoal_global.view',
            'jadwal.view',
            'jadwal.manage',
            'laporan.view',
            'laporan.export',
            'kelas.view',
            'mapel.view',
            'announcement.view',
            'announcement.manage',
            'profil.manage',
        ];
        $guruPermissions = Permission::whereIn('key', $guruKeys)->pluck('id')->all();
        $guru->permissions()->sync($guruPermissions);

        // 4. Siswa Role (Student Global Template) - Strictly instansi scope
        $siswa = Role::updateOrCreate(
            ['name' => 'siswa', 'instansi_id' => null],
            [
                'label' => 'Siswa CBT',
                'is_system' => true,
            ]
        );
        $siswaKeys = [
            'ujian.ikut',
            'nilai.view',
            'announcement.view',
            'profil.manage',
        ];
        $siswaPermissions = Permission::whereIn('key', $siswaKeys)->pluck('id')->all();
        $siswa->permissions()->sync($siswaPermissions);
    }

    protected function seedMenus(): void
    {
        // ==========================================
        // SCOPE: PLATFORM (Super Admin Sidebar Menus)
        // ==========================================
        $superAdminMenus = [
            [
                'label' => 'Dashboard',
                'icon' => 'LayoutDashboard',
                'path' => '/super-admin/dashboard',
                'permission_key' => 'dashboard_platform.view',
                'scope' => 'platform',
                'sort_order' => 1,
            ],
            [
                'label' => 'Kelola Instansi',
                'icon' => 'Building2',
                'path' => '/super-admin/instansi',
                'permission_key' => 'instansi.view',
                'scope' => 'platform',
                'sort_order' => 2,
            ],
            [
                'label' => 'Kelola Pengguna',
                'icon' => 'Users',
                'path' => '/super-admin/users',
                'permission_key' => 'user_platform.view',
                'scope' => 'platform',
                'sort_order' => 3,
            ],
            [
                'label' => 'Master Akademik Global',
                'icon' => 'Layers',
                'path' => '/super-admin/master-akademik/tahun-ajaran',
                'permission_key' => 'master.view',
                'scope' => 'platform',
                'sort_order' => 4,
                'children' => [
                    [
                        'label' => 'Tahun Ajaran',
                        'icon' => 'CalendarDays',
                        'path' => '/super-admin/master-akademik/tahun-ajaran',
                        'permission_key' => 'master.view',
                        'scope' => 'platform',
                        'sort_order' => 1,
                    ],
                    [
                        'label' => 'Semester',
                        'icon' => 'History',
                        'path' => '/super-admin/master-akademik/semester',
                        'permission_key' => 'master.view',
                        'scope' => 'platform',
                        'sort_order' => 2,
                    ],
                    [
                        'label' => 'Kurikulum',
                        'icon' => 'BookOpen',
                        'path' => '/super-admin/master-akademik/kurikulum',
                        'permission_key' => 'master.view',
                        'scope' => 'platform',
                        'sort_order' => 3,
                    ],
                    [
                        'label' => 'Jenjang',
                        'icon' => 'Layers',
                        'path' => '/super-admin/master-akademik/jenjang',
                        'permission_key' => 'master.view',
                        'scope' => 'platform',
                        'sort_order' => 4,
                    ],
                    [
                        'label' => 'Tingkat',
                        'icon' => 'UserCheck',
                        'path' => '/super-admin/master-akademik/tingkat-kelas',
                        'permission_key' => 'master.view',
                        'scope' => 'platform',
                        'sort_order' => 5,
                    ],
                ]
            ],
            [
                'label' => 'Kelola Bank Soal',
                'icon' => 'BookOpen',
                'path' => '/super-admin/bank-soal',
                'permission_key' => 'banksoal.view',
                'scope' => 'platform',
                'sort_order' => 5,
                'children' => [
                    [
                        'label' => 'Paket Bank Soal',
                        'icon' => 'BookOpen',
                        'path' => '/super-admin/bank-soal',
                        'permission_key' => 'banksoal.view',
                        'scope' => 'platform',
                        'sort_order' => 1,
                    ],
                    [
                        'label' => 'Referensi Tahun Soal',
                        'icon' => 'Calendar',
                        'path' => '/super-admin/bank-soal/tahun-soal',
                        'permission_key' => 'banksoal.view',
                        'scope' => 'platform',
                        'sort_order' => 2,
                    ],
                ]
            ],
            [
                'label' => 'Audit Trail',
                'icon' => 'History',
                'path' => '/super-admin/audit-logs',
                'permission_key' => 'audit.view',
                'scope' => 'platform',
                'sort_order' => 6,
            ],
            [
                'label' => 'Pengumuman Global',
                'icon' => 'Megaphone',
                'path' => '/super-admin/announcements',
                'permission_key' => 'announcement_global.view',
                'scope' => 'platform',
                'sort_order' => 7,
            ],
            [
                'label' => 'Langganan Platform',
                'icon' => 'CreditCard',
                'path' => '/super-admin/subscriptions',
                'permission_key' => 'subscription.view',
                'scope' => 'platform',
                'sort_order' => 8,
            ],
            [
                'label' => 'Pengaturan Platform',
                'icon' => 'Settings',
                'path' => '/super-admin/settings',
                'permission_key' => 'platform_setting.view',
                'scope' => 'platform',
                'sort_order' => 9,
            ],
            [
                'label' => 'Kelola Role & Hak Akses',
                'icon' => 'ShieldCheck',
                'path' => '/super-admin/roles',
                'permission_key' => 'role_platform.manage',
                'scope' => 'platform',
                'sort_order' => 10,
            ],
        ];

        foreach ($superAdminMenus as $menuData) {
            $children = $menuData['children'] ?? [];
            unset($menuData['children']);

            $parent = Menu::updateOrCreate(
                [
                    'path' => $menuData['path'],
                    'scope' => $menuData['scope'],
                    'parent_id' => null,
                ],
                $menuData
            );

            foreach ($children as $childData) {
                Menu::updateOrCreate(
                    [
                        'path' => $childData['path'],
                        'scope' => $childData['scope'],
                        'parent_id' => $parent->id,
                    ],
                    $childData
                );
            }
        }

        // ==========================================
        // SCOPE: INSTANSI (Admin Instansi Sidebar Menus)
        // ==========================================
        $adminInstansiMenus = [
            [
                'label' => 'Dashboard Sekolah',
                'icon' => 'LayoutDashboard',
                'path' => '/admin/dashboard',
                'permission_key' => 'dashboard_sekolah.view',
                'scope' => 'instansi',
                'sort_order' => 1,
            ],
            [
                'label' => 'Kelola Pengguna',
                'icon' => 'Users',
                'path' => '/admin/users',
                'permission_key' => 'guru.view',
                'scope' => 'instansi',
                'sort_order' => 2,
            ],
            [
                'label' => 'Master Akademik',
                'icon' => 'Layers',
                'path' => '/admin/classes',
                'permission_key' => 'kelas.view',
                'scope' => 'instansi',
                'sort_order' => 3,
                'children' => [
                    [
                        'label' => 'Kelas & Rombel',
                        'icon' => 'School',
                        'path' => '/admin/classes',
                        'permission_key' => 'kelas.view',
                        'scope' => 'instansi',
                        'sort_order' => 1,
                    ],
                    [
                        'label' => 'Mata Pelajaran',
                        'icon' => 'BookOpen',
                        'path' => '/admin/master-akademik/mata-pelajaran',
                        'permission_key' => 'mapel.view',
                        'scope' => 'instansi',
                        'sort_order' => 2,
                    ],
                    [
                        'label' => 'Guru Pengampu',
                        'icon' => 'UserCheck',
                        'path' => '/admin/classes?tab=guru-mapel',
                        'permission_key' => 'guru_pengampu.manage',
                        'scope' => 'instansi',
                        'sort_order' => 3,
                    ],
                    [
                        'label' => 'Wali Kelas',
                        'icon' => 'GraduationCap',
                        'path' => '/admin/classes?tab=wali-kelas',
                        'permission_key' => 'wali_kelas.manage',
                        'scope' => 'instansi',
                        'sort_order' => 4,
                    ],
                    [
                        'label' => 'Tahun Ajaran & Semester',
                        'icon' => 'CalendarDays',
                        'path' => '/admin/master-akademik/tahun-ajaran',
                        'permission_key' => 'akademik_sekolah.view',
                        'scope' => 'instansi',
                        'sort_order' => 5,
                    ],
                ]
            ],
            [
                'label' => 'Jadwal Ujian',
                'icon' => 'CalendarDays',
                'path' => '/admin/exams',
                'permission_key' => 'jadwal.view',
                'scope' => 'instansi',
                'sort_order' => 4,
            ],
            [
                'label' => 'Monitoring Ujian',
                'icon' => 'BarChart3',
                'path' => '/admin/proctoring',
                'permission_key' => 'monitoring.view',
                'scope' => 'instansi',
                'sort_order' => 5,
            ],
            [
                'label' => 'Aktivitas Guru & Siswa',
                'icon' => 'History',
                'path' => '/admin/activities',
                'permission_key' => 'aktivitas.view',
                'scope' => 'instansi',
                'sort_order' => 6,
            ],
            [
                'label' => 'Pengumuman',
                'icon' => 'Megaphone',
                'path' => '/admin/announcements',
                'permission_key' => 'announcement.view',
                'scope' => 'instansi',
                'sort_order' => 7,
            ],
            [
                'label' => 'Laporan Rekap Nilai',
                'icon' => 'BarChart3',
                'path' => '/admin/reports',
                'permission_key' => 'laporan.view',
                'scope' => 'instansi',
                'sort_order' => 8,
            ],
            [
                'label' => 'Profil & Keamanan',
                'icon' => 'UserCheck',
                'path' => '/admin/profile',
                'permission_key' => 'profil.manage',
                'scope' => 'instansi',
                'sort_order' => 9,
            ],
            [
                'label' => 'Role & Akses Sekolah',
                'icon' => 'ShieldCheck',
                'path' => '/admin/roles',
                'permission_key' => 'role_instansi.manage',
                'scope' => 'instansi',
                'sort_order' => 10,
            ],
        ];

        foreach ($adminInstansiMenus as $menuData) {
            $children = $menuData['children'] ?? [];
            unset($menuData['children']);

            $parent = Menu::updateOrCreate(
                [
                    'path' => $menuData['path'],
                    'scope' => $menuData['scope'],
                    'parent_id' => null,
                ],
                $menuData
            );

            foreach ($children as $childData) {
                Menu::updateOrCreate(
                    [
                        'path' => $childData['path'],
                        'scope' => $childData['scope'],
                        'parent_id' => $parent->id,
                    ],
                    $childData
                );
            }
        }
    }
}

