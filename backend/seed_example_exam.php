<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\ExamGroup;
use App\Models\UserSiswa;
use App\Models\AssessmentJawabanPilgan;

// 1. Ensure Bobby password is 'password'
$bobby = UserSiswa::where('iduser', 'US202207220000000000')->first();
if ($bobby) {
    $bobby->update([
        'login_password' => \Illuminate\Support\Facades\Hash::make('password'),
        'status_aktif' => 'Y',
        'force_change_password' => 0
    ]);
    echo "Bobby password updated to 'password'. NISN: {$bobby->nisn}, idkategori: {$bobby->idkategori}, idkelas: {$bobby->idkelas}\n";
} else {
    echo "Bobby not found!\n";
}

// 2. Delete any previous test example exam to keep database clean
Assessment::where('nama_assessment', 'LIKE', '%Simulasi Ujian CBT Mandiri 2026%')->delete();

$examId = '2026000010001';

$exam = Assessment::create([
    'idassessment' => $examId,
    'nama_assessment' => 'Simulasi Ujian CBT Mandiri 2026 - Matematika & Logika',
    'deskripsi_assessment' => 'Paket Ujian CBT Resmi untuk Siswa Kelas 6-A. Silakan kerjakan dengan teliti dan jujur.',
    'idjenjang' => 1,
    'idmapel' => 1,
    'idkelas' => 1,
    'id_tahun_ajaran' => 1,
    'idkategori' => '17932612406512071',
    'iduser_bo' => 17936106494129999, // Admin Instansi user_bo
    'source_type' => 'guru',
    'acak_soal' => true,
    'acak_opsi' => true,
    'waktu_pengerjaan' => 60,
    'tampil_assessment_pilgan' => 5,
    'tampil_assessment_essay' => 0,
    'tanggal_mulai_assessment' => now()->subHours(2)->toDateTimeString(),
    'tanggal_batas_assessment' => now()->addDays(14)->toDateTimeString(),
    'status_aktif' => 'Y',
    'status_paket' => 'aktif',
    'is_locked' => false,
    'tanggal_input' => now(),
]);

echo "Created Exam: {$exam->nama_assessment} (ID: {$exam->idassessment})\n";

// 3. Create 5 sample questions
$questions = [
    [
        'urutan' => 1,
        'soal' => 'Hasil dari 150 + 75 x 2 - 50 adalah ...',
        'a' => '250',
        'b' => '400',
        'c' => '350',
        'd' => '200',
        'e' => '175',
        'kunci' => 'a',
        'penjelasan' => 'Operasi perkalian didahulukan: 75 x 2 = 150. Kemudian penjumlahan dan pengurangan berurutan dari kiri: 150 + 150 - 50 = 250.'
    ],
    [
        'urutan' => 2,
        'soal' => 'Sebuah persegi memiliki keliling 48 cm. Luas persegi tersebut adalah ...',
        'a' => '120 cm²',
        'b' => '144 cm²',
        'c' => '160 cm²',
        'd' => '196 cm²',
        'e' => '256 cm²',
        'kunci' => 'b',
        'penjelasan' => 'Sisi persegi = Keliling / 4 = 48 / 4 = 12 cm. Luas persegi = sisi x sisi = 12 x 12 = 144 cm².'
    ],
    [
        'urutan' => 3,
        'soal' => 'Faktor Persekutuan Terbesar (FPB) dari 24, 36, dan 72 adalah ...',
        'a' => '6',
        'b' => '8',
        'c' => '12',
        'd' => '18',
        'e' => '24',
        'kunci' => 'c',
        'penjelasan' => 'Faktorisasi prima: 24 = 2³ x 3, 36 = 2² x 3², 72 = 2³ x 3². FPB diambil faktor sama pangkat terkecil: 2² x 3 = 4 x 3 = 12.'
    ],
    [
        'urutan' => 4,
        'soal' => 'Rata-rata nilai ulangan matematika dari 5 orang siswa adalah 80. Jika ditambah nilai Anton, rata-ratanya menjadi 82. Berapakah nilai Anton?',
        'a' => '88',
        'b' => '90',
        'c' => '92',
        'd' => '94',
        'e' => '96',
        'kunci' => 'c',
        'penjelasan' => 'Jumlah nilai 5 siswa = 5 x 80 = 400. Jumlah nilai 6 siswa = 6 x 82 = 492. Nilai Anton = 492 - 400 = 92.'
    ],
    [
        'urutan' => 5,
        'soal' => 'Sebuah mobil melaju dengan kecepatan rata-rata 60 km/jam selama 2,5 jam. Berapakah jarak yang ditempuh mobil tersebut?',
        'a' => '120 km',
        'b' => '140 km',
        'c' => '150 km',
        'd' => '160 km',
        'e' => '175 km',
        'kunci' => 'c',
        'penjelasan' => 'Jarak = Kecepatan x Waktu = 60 km/jam x 2,5 jam = 150 km.'
    ],
];

foreach ($questions as $q) {
    $qId = (string) (time() . rand(1000000, 9999999));
    AssessmentSoalPilgan::create([
        'idassessment_soal_pilgan' => $qId,
        'idassessment' => $examId,
        'idjenjang' => 1,
        'idmapel' => 1,
        'urutan' => $q['urutan'],
        'tingkat_kesulitan' => 'Sedang',
        'source_type' => 'guru',
        'soal_text' => $q['soal'],
        'pilihan_a_text' => $q['a'],
        'pilihan_b_text' => $q['b'],
        'pilihan_c_text' => $q['c'],
        'pilihan_d_text' => $q['d'],
        'pilihan_e_text' => $q['e'],
        'jawaban' => $q['kunci'],
        'penjelasan_jawaban' => $q['penjelasan'],
        'status_aktif' => 'Y',
        'tanggal_input' => now(),
    ]);
}
echo "Created " . count($questions) . " questions for exam.\n";

// 4. Create Active Exam Group (Sesi Gelombang Ujian)
$group = ExamGroup::create([
    'exam_id' => $examId,
    'name' => 'Sesi 1 - Ujian CBT Utama',
    'token' => 'CBT2026',
    'start_time' => now()->subHours(2),
    'end_time' => now()->addDays(14),
    'max_participants' => 50,
    'class_ids' => [1],
    'student_ids' => ['US202207220000000000'],
]);
echo "Created Exam Group Sesi: {$group->name} (ID: {$group->id}, Token: {$group->token})\n";

// Ensure no previous unfinished attempt exists for Bobby on this exam
AssessmentJawabanPilgan::where('idassessment', $examId)->where('iduser', 'US202207220000000000')->delete();

echo "Done! Exam is fully ready for testing.\n";

