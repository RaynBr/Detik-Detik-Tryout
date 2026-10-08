<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Jenjang
        $jenjangData = [
            ['kode_jenjang' => 'SD', 'nama_jenjang' => 'Sekolah Dasar (SD / MI)', 'urutan' => 1, 'keterangan' => 'Tingkat pendidikan dasar 6 tahun', 'status_aktif' => 'Y'],
            ['kode_jenjang' => 'SMP', 'nama_jenjang' => 'Sekolah Menengah Pertama (SMP / MTs)', 'urutan' => 2, 'keterangan' => 'Tingkat pendidikan menengah pertama 3 tahun', 'status_aktif' => 'Y'],
            ['kode_jenjang' => 'SMA', 'nama_jenjang' => 'Sekolah Menengah Atas (SMA / MA)', 'urutan' => 3, 'keterangan' => 'Tingkat pendidikan menengah atas peminatan IPA / IPS', 'status_aktif' => 'Y'],
            ['kode_jenjang' => 'SMK', 'nama_jenjang' => 'Sekolah Menengah Kejuruan (SMK)', 'urutan' => 4, 'keterangan' => 'Pendidikan vokasi dan kejuruan keahlian', 'status_aktif' => 'Y'],
        ];

        foreach ($jenjangData as $j) {
            DB::table('master_jenjang')->updateOrInsert(
                ['kode_jenjang' => $j['kode_jenjang']],
                array_merge($j, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        $sdId = DB::table('master_jenjang')->where('kode_jenjang', 'SD')->value('id');
        $smpId = DB::table('master_jenjang')->where('kode_jenjang', 'SMP')->value('id');
        $smaId = DB::table('master_jenjang')->where('kode_jenjang', 'SMA')->value('id');
        $smkId = DB::table('master_jenjang')->where('kode_jenjang', 'SMK')->value('id');

        // Fetch sample teachers from user_bo
        $teachers = DB::table('user_bo')->pluck('iduser_bo')->toArray();
        $t1 = $teachers[0] ?? null;
        $t2 = $teachers[1] ?? null;
        $t3 = $teachers[2] ?? null;
        $t4 = $teachers[3] ?? null;

        // 2. Seed Kelas
        $kelasData = [
            ['idjenjang' => $sdId, 'nama_kelas' => 'Kelas 6-A', 'tingkat' => 6, 'jurusan' => 'Umum', 'wali_kelas_id' => $t1, 'kapasitas' => 32],
            ['idjenjang' => $sdId, 'nama_kelas' => 'Kelas 6-B', 'tingkat' => 6, 'jurusan' => 'Umum', 'wali_kelas_id' => $t2, 'kapasitas' => 32],
            ['idjenjang' => $smpId, 'nama_kelas' => 'Kelas 7-A', 'tingkat' => 7, 'jurusan' => 'Umum', 'wali_kelas_id' => $t3, 'kapasitas' => 36],
            ['idjenjang' => $smpId, 'nama_kelas' => 'Kelas 8-A', 'tingkat' => 8, 'jurusan' => 'Umum', 'wali_kelas_id' => $t4, 'kapasitas' => 36],
            ['idjenjang' => $smpId, 'nama_kelas' => 'Kelas 9-A', 'tingkat' => 9, 'jurusan' => 'Umum', 'wali_kelas_id' => $t1, 'kapasitas' => 36],
            ['idjenjang' => $smaId, 'nama_kelas' => 'Kelas 10 MIPA 1', 'tingkat' => 10, 'jurusan' => 'MIPA', 'wali_kelas_id' => $t2, 'kapasitas' => 36],
            ['idjenjang' => $smaId, 'nama_kelas' => 'Kelas 11 MIPA 1', 'tingkat' => 11, 'jurusan' => 'MIPA', 'wali_kelas_id' => $t3, 'kapasitas' => 36],
            ['idjenjang' => $smaId, 'nama_kelas' => 'Kelas 12 MIPA 1', 'tingkat' => 12, 'jurusan' => 'MIPA', 'wali_kelas_id' => $t4, 'kapasitas' => 36],
            ['idjenjang' => $smaId, 'nama_kelas' => 'Kelas 10 IPS 1', 'tingkat' => 10, 'jurusan' => 'IPS', 'wali_kelas_id' => $t1, 'kapasitas' => 36],
            ['idjenjang' => $smkId, 'nama_kelas' => 'Kelas 10 RPL 1', 'tingkat' => 10, 'jurusan' => 'Rekayasa Perangkat Lunak', 'wali_kelas_id' => $t2, 'kapasitas' => 36],
            ['idjenjang' => $smkId, 'nama_kelas' => 'Kelas 11 TKJ 1', 'tingkat' => 11, 'jurusan' => 'Teknik Komputer & Jaringan', 'wali_kelas_id' => $t3, 'kapasitas' => 36],
        ];

        foreach ($kelasData as $k) {
            DB::table('master_kelas')->updateOrInsert(
                ['nama_kelas' => $k['nama_kelas'], 'idjenjang' => $k['idjenjang']],
                array_merge($k, ['status_aktif' => 'Y', 'created_at' => now(), 'updated_at' => now()])
            );
        }

        // 3. Seed Mata Pelajaran
        $mapelData = [
            ['idjenjang' => $sdId, 'kode_mapel' => 'MTK-SD', 'nama_mapel' => 'Matematika Dasar', 'kelompok' => 'Wajib', 'kkm' => 70.00, 'deskripsi' => 'Aritmatika dan logika dasar'],
            ['idjenjang' => $sdId, 'kode_mapel' => 'BIN-SD', 'nama_mapel' => 'Bahasa Indonesia SD', 'kelompok' => 'Wajib', 'kkm' => 75.00, 'deskripsi' => 'Tata bahasa dan membaca pemahaman'],
            ['idjenjang' => $smpId, 'kode_mapel' => 'MTK-SMP', 'nama_mapel' => 'Matematika SMP', 'kelompok' => 'Wajib', 'kkm' => 75.00, 'deskripsi' => 'Aljabar dan geometri'],
            ['idjenjang' => $smpId, 'kode_mapel' => 'IPA-SMP', 'nama_mapel' => 'IPA Terpadu SMP', 'kelompok' => 'Wajib', 'kkm' => 75.00, 'deskripsi' => 'Fisika dan Biologi dasar'],
            ['idjenjang' => $smpId, 'kode_mapel' => 'BIG-SMP', 'nama_mapel' => 'Bahasa Inggris SMP', 'kelompok' => 'Wajib', 'kkm' => 75.00, 'deskripsi' => 'Grammar and reading skills'],
            ['idjenjang' => $smaId, 'kode_mapel' => 'MTK-SMA', 'nama_mapel' => 'Matematika Peminatan', 'kelompok' => 'Peminatan', 'kkm' => 78.00, 'deskripsi' => 'Kalkulus, Trigonometri, dan Vektor'],
            ['idjenjang' => $smaId, 'kode_mapel' => 'FIS-SMA', 'nama_mapel' => 'Fisika SMA', 'kelompok' => 'Peminatan', 'kkm' => 75.00, 'deskripsi' => 'Mekanika, Termodinamika, dan Gelombang'],
            ['idjenjang' => $smaId, 'kode_mapel' => 'KIM-SMA', 'nama_mapel' => 'Kimia SMA', 'kelompok' => 'Peminatan', 'kkm' => 75.00, 'deskripsi' => 'Struktur atom dan stoikiometri'],
            ['idjenjang' => $smaId, 'kode_mapel' => 'BIO-SMA', 'nama_mapel' => 'Biologi SMA', 'kelompok' => 'Peminatan', 'kkm' => 76.00, 'deskripsi' => 'Genetika dan ekologi'],
            ['idjenjang' => $smaId, 'kode_mapel' => 'BIN-SMA', 'nama_mapel' => 'Bahasa Indonesia SMA', 'kelompok' => 'Wajib', 'kkm' => 75.00, 'deskripsi' => 'Karya ilmiah dan literasi'],
            ['idjenjang' => $smkId, 'kode_mapel' => 'RPL-PROG', 'nama_mapel' => 'Pemrograman Berorientasi Objek', 'kelompok' => 'Keahlian', 'kkm' => 80.00, 'deskripsi' => 'Konsep OOP dan implementasi bahasa modern'],
            ['idjenjang' => $smkId, 'kode_mapel' => 'TKJ-NET', 'nama_mapel' => 'Administrasi Infrastruktur Jaringan', 'kelompok' => 'Keahlian', 'kkm' => 80.00, 'deskripsi' => 'Routing, Switching, dan Server'],
        ];

        foreach ($mapelData as $m) {
            DB::table('master_mata_pelajaran')->updateOrInsert(
                ['kode_mapel' => $m['kode_mapel']],
                array_merge($m, ['status_aktif' => 'Y', 'created_at' => now(), 'updated_at' => now()])
            );
        }

        // 4. Assign Guru ke Mata Pelajaran
        $allMapels = DB::table('master_mata_pelajaran')->get();
        foreach ($allMapels as $idx => $mapel) {
            $assignedTeacher = $teachers[$idx % count($teachers)] ?? null;
            if ($assignedTeacher) {
                DB::table('guru_mata_pelajaran')->updateOrInsert(
                    ['iduser_bo' => $assignedTeacher, 'idmapel' => $mapel->id],
                    ['tahun_ajaran' => '2026/2027', 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // 5. Assign sample Siswa ke Kelas
        $sampleStudents = DB::table('user')->limit(30)->pluck('iduser')->toArray();
        $allKelas = DB::table('master_kelas')->pluck('id')->toArray();
        foreach ($sampleStudents as $sIdx => $studId) {
            $assignedKelas = $allKelas[$sIdx % count($allKelas)];
            $nisn = '00' . str_pad((string)(2026000 + $sIdx), 8, '0', STR_PAD_LEFT);
            DB::table('siswa_kelas')->updateOrInsert(
                ['iduser' => $studId],
                [
                    'idkelas' => $assignedKelas,
                    'nisn' => $nisn,
                    'tahun_ajaran' => '2026/2027',
                    'status' => 'aktif',
                    'created_at' => now(),
                    'updated_at' => now()
                ]
            );
            // Sync to user table columns
            DB::table('user')->where('iduser', $studId)->update([
                'nisn' => $nisn,
                'idkelas' => $assignedKelas
            ]);
        }

        // 6. Set role_type for user_bo
        // status_admin = 1 -> super_admin
        DB::table('user_bo')->where('status_admin', '1')->update(['role_type' => 'super_admin']);
        // status_admin = 2: divide between admin_sekolah and guru
        DB::table('user_bo')->where('status_admin', '2')->whereIn('login_username', ['testingpenyelenggara', 'pgrislcc', 'edulab.id', 'andioffset38'])->update(['role_type' => 'admin_sekolah']);
        DB::table('user_bo')->where('status_admin', '2')->whereNull('role_type')->update(['role_type' => 'guru']);
    }
}
