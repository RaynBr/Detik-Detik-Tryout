# Dokumen Spesifikasi Proyek: Project Overview
**Sistem CBT Ujian Online (Online Examination System)**  
*Terintegrasi dengan Basis Data Platform Sertidemi*

---

## 1. Informasi Dokumen & Metadata Proyek

| Atribut Dokumen | Rincian / Nilai |
| :--- | :--- |
| **Nama Proyek** | Sistem CBT Ujian Online (*Computer-Based Testing System*) |
| **Nama Aplikasi (Konfigurasi)** | `CBT Sistem Ujian Online` / `sertidemi` |
| **Kategori Sistem** | Web Application (Decoupled SPA + RESTful API Engine) |
| **Lingkungan Basis Data** | MySQL Server (Database: `sertidemi`, Laragon Local Environment) |
| **Teknologi Backend** | PHP >= 8.2, Laravel Framework 12.x, Laravel Sanctum |
| **Teknologi Frontend** | React 19.x, TypeScript, Vite 8.x, Tailwind CSS v4, TanStack Query v5 |
| **Tingkat Akses & Tenant** | Multi-Tenant Scoped System (Super Admin, Admin Instansi/Sekolah, Guru, Siswa) |
| **Status Dokumen** | Dokumen Awal (Tahap 1 dari 17 Seri Dokumentasi Rekayasa Perangkat Lunak) |
| **Penyusun** | Tim Pengembang Perangkat Lunak CBT |

---

## 2. Ringkasan Eksekutif (Executive Summary)

**Sistem CBT Ujian Online** adalah platform asesmen dan ujian berbasis komputer (*Computer-Based Testing*) generasi modern yang dirancang untuk menyelenggarakan evaluasi akademik berskala besar dengan integritas tinggi, performa andal, serta terintegrasi langsung dengan ekosistem database `sertidemi`.

Sistem ini mengadopsi arsitektur terpisah (*decoupled architecture*) dengan backend berbasis **Laravel 12 RESTful API** dan frontend **Single Page Application (SPA)** berbasis **React 19 + TypeScript + Vite**. Sistem mendukung penyelenggaraan ujian multi-institusi (*multi-tenant*), manajemen bank soal bertingkat, pembuatan paket soal berbasis kurikulum jenjang pendidikan, pengacakan soal (*randomizer*), autosave lembar jawaban terdistribusi per detik, serta mekanisme pengawasan daring (*online proctoring & anti-cheat engine*) yang ketat guna meminimalisir potensi kecurangan peserta ujian.

---

## 3. Latar Belakang & Masalah Bisnis

### 3.1. Latar Belakang
Transformasi digital dalam institusi pendidikan dan lembaga sertifikasi menuntut efisiensi dalam pelaksanaan asesmen siswa, mulai dari tingkat Sekolah Dasar (SD), Sekolah Menengah Pertama (SMP), Sekolah Menengah Atas (SMA), hingga Sekolah Menengah Kejuruan (SMK) serta lembaga bimbingan/penyelenggara sertifikasi. Platform database `sertidemi` yang telah memiliki ekosistem pengguna (*back-office staff* dan *siswa/anggota*) memerlukan modul ujian daring terdedikasi yang mampu menangani beban akses tinggi (*burst concurrency*) secara aman dan terkontrol.

### 3.2. Masalah yang Diselesaikan
1. **Risiko Kecurangan Ujian Daring:** Praktik umum membuka tab baru, mencari kunci jawaban via search engine, berbagi akun, atau melakukan inspeksi elemen (*inspect element*) saat ujian daring berlangsung.
2. **Duplikasi Sesi Pengguna (*Account Sharing*):** Penggunaan satu akun peserta oleh lebih dari satu orang secara bersamaan.
3. **Kompleksitas Penyusunan Soal:** Kebutuhan guru untuk memasukkan soal dalam jumlah banyak dari berkas Microsoft Word (`.docx`) dan spreadsheet (`.csv`), penulisan formula matematika/sains berbasis notasi LaTeX, serta kebutuhan generator acak 50 soal secara instan.
4. **Isolasi Data Antar-Instansi (*Multi-Tenancy*):** Kebutuhan sekolah atau institusi yang berbeda untuk mengelola guru, siswa, kelas, dan ujian masing-masing tanpa kebocoran data (*data leakage*) ke institusi lain.
5. **Kehilangan Progres Pengerjaan (*Data Loss*):** Gangguan koneksi internet atau ketidaksengajaan menutup browser yang menyebabkan hilangnya jawaban siswa yang telah diisi.

---

## 4. Tujuan & Sasaran Proyek (Project Goals & Objectives)

### 4.1. Tujuan Utama
1. Membangun sistem Computer-Based Testing yang tangguh, aman, dan berintegritas tinggi dengan mekanisme *single-session locking*, *strict fullscreen mode*, dan *anti-cheat proctoring*.
2. Mengintegrasikan seluruh proses penilaian dan manajemen master akademik (Jenjang, Kelas, Mata Pelajaran, Instansi) secara langsung ke skema basis data `sertidemi` tanpa merusak integritas data eksisting.
3. Menyediakan portal guru yang efisien untuk mengimpor soal, membuat paket soal, menjadwalkan sesi ujian per kelas atau token, serta memantau hasil ujian secara komprehensif.
4. Menghadirkan portal pengerjaan siswa yang ringan, cepat, responsif di berbagai perangkat, dengan penyimpanan jawaban otomatis per detik (*real-time autosave*).

### 4.2. Sasaran Terukur (Measurable Targets)
- **Zero Account Overlap:** Mengeliminasi penggunaan akun ganda secara simultan melalui validasi `active_session_token` dan header `X-Session-Token`.
- **High Concurrency Stability:** Penanganan lonjakan trafik penyimpanan jawaban melalui optimasi database query dan rate limiting (*throttle* hingga 180 request/menit untuk penyimpanan jawaban).
- **Automated Score Computation:** Perhitungan nilai otomatis seketika siswa menyelesaikan sesi ujian untuk soal bertipe objektif/pilihan ganda.

---

## 5. Ruang Lingkup Proyek (Scope of Work)

Dokumentasi ini mencakup ruang lingkup modul-modul fungsional yang telah diimplementasikan pada *source code* dan basis data:

### 5.1. Modul Autentikasi & Manajemen Sesi (Dual-Entity Authentication)
- Autentikasi dua tabel entitas:
  - Entitas Staf/Guru/Admin melalui tabel `user_bo` dengan mekanisme verifikasi kata sandi bertingkat (mendukung enkripsi legacy dekode 5x Base64, standar Bcrypt hash, maupun fallback teks polos).
  - Entitas Siswa melalui tabel `user` dengan verifikasi kata sandi Bcrypt hash / teks polos.
- Penerbitan Bearer Token berbasis **Laravel Sanctum** (`personal_access_tokens`).
- Penguncian sesi tunggal (*Single-Session Enforcement*) menggunakan middleware `single_session` (`EnsureSingleSession.php`) yang membandingkan token sesi aktif (`active_session_token`) dengan header permintaan client `X-Session-Token`.
- Pembatasan laju percobaan login (*Rate Limiting Throttle*: 30 request per menit).

### 5.2. Modul Multi-Tenancy & Organisasi Instansi
- Pengelompokan data berbasis instansi menggunakan tabel `kategori_user_bo` (`idkategori`).
- Hak akses hierarkis:
  - **Super Admin (`status_admin = '1'` / `role_type = 'super_admin'`):** Akses penuh lintas seluruh instansi, manajemen kategori instansi, admin instansi, guru, dan siswa secara global.
  - **Admin Instansi (`role_type = 'admin_sekolah'`):** Dibatasi secara ketat hanya pada ruang lingkup instansi miliknya (`user_bo.idkategori`).
  - **Guru (`role_type = 'guru'`):** Mengelola paket soal, bank soal, dan ujian yang ditugaskan di instansinya.
  - **Siswa (`role = 'siswa'`):** Terikat pada kelas (`user.idkelas`) dan instansi (`user.idkategori`).

### 5.3. Modul Manajemen Master Data Akademik
- **Master Jenjang Pendidikan (`master_jenjang`):** Pengelolaan jenjang studi (SD, SMP, SMA, SMK) dengan kode jenjang unik dan urutan tingkat.
- **Master Kelas (`master_kelas`):** Pendataan ruang kelas dinamis dengan penamaan fleksibel (mendukung format penamaan bebas sekolah swasta/negeri), penugasan wali kelas dari staf `user_bo`, kapasitas, dan relasi ke jenjang serta instansi.
- **Master Mata Pelajaran (`master_mata_pelajaran`):** Manajemen mapel dengan kode unik, kelompok kurikulum (Wajib, Peminatan, Muatan Lokal, Keahlian), dan Kriteria Ketuntasan Minimal (KKM).
- **Penugasan Guru Mapel (`guru_mata_pelajaran`):** Pemetaan guru pengampu terhadap mata pelajaran, kelas spesifik, dan tahun ajaran.
- **Distribusi Siswa Kelas (`siswa_kelas`):** Riwayat penempatan siswa dalam kelas per tahun ajaran beserta status keaktifan.

### 5.4. Modul Bank Soal & Paket Ujian
- Penyimpanan bank soal pilihan ganda melalui tabel `assessment_soal_pilgan` dengan opsi A hingga E, gambar pendukung soal/opsi, pembahasan, dan kunci jawaban.
- Dukungan rumus matematika dan sains menggunakan KaTeX / notasi LaTeX.
- Fitur impor soal:
  - Ekstraksi dan parsing berkas Microsoft Word (`.docx`) melalui `DocxQuestionService` (mendukung parsing otomatis teks soal, gambar inline, opsi A-E, dan penanda jawaban).
  - Impor berkas format CSV / Excel.
- Generator Paket Soal Acak: Pembuatan paket asesmen instan dengan mengambil 50 soal acak dari bank soal sesuai mata pelajaran dan jenjang terpilih (`generateRandom50`).

### 5.5. Modul Penjadwalan Ujian & Sesi Kelas
- Penyusunan paket asesmen pada tabel `assessment` (durasi waktu pengerjaan, batas tanggal mulai dan akhir, bobot nilai, jumlah tampilan soal).
- Penjadwalan spesifik kelompok ujian melalui tabel `exam_groups`: penentuan waktu mulai (`start_time`), waktu berakhir (`end_time`), token akses ujian khusus (`token`), kuota peserta (`max_participants`), serta filter peserta berdasarkan kelas (`class_ids`) atau ID siswa individual (`student_ids`).
- Validasi durasi efektif (*Effective Duration*): Perhitungan sisa waktu otomatis apabila siswa memulai ujian mendekati batas akhir jendela sesi.

### 5.6. Modul Pelaksanaan Ujian Siswa (Exam Delivery)
- Antarmuka pengerjaan interaktif responsif dengan tata letak lembar soal, navigasi daftar nomor soal, penanda ragu-ragu, dan panel sisa waktu (*timer countdown*).
- Otomatisasi pembentukan transaksi pengerjaan pada tabel `transaksi` (`status_transaksi = '7'`, `jenis_transaksi = 'assessment'`) dan rekaman pengerjaan pada tabel `assessment_jawaban_pilgan`.
- Penyimpanan jawaban berkala (*Autosave*): Penyimpanan instan tiap pemilihan opsi jawaban ke tabel `assessment_jawaban_pilgan_detail` via endpoint `PATCH /student/attempts/{attempt}/answers` (dengan *burst rate limiter* hingga 180 request per menit).
- Navigasi kembali (*backtracking*) dan peninjauan lembar jawaban sebelum pengumpulan akhir.

### 5.7. Modul Proctoring & Sistem Anti-Kecurangan (Anti-Cheat Engine)
- **Strict Fullscreen Gatekeeper:** Kewajiban mode layar penuh saat pengerjaan; siswa dipandu untuk masuk kembali jika keluar dari layar penuh.
- **Pendeteksian Perpindahan Tab & Aplikasi (Tab Switch Detection):** Memantau peristiwa `visibilitychange`, `blur`, dan `fullscreenchange`. Setiap pelanggaran dicatat ke sistem dengan batas maksimum toleransi (standar: 5 kali).
- **Auto-Disqualification Mechanism:** Peserta yang melewati batas perpindahan jendela didiskualifikasi secara otomatis (`status = disqualified`, nilai dinolkan).
- **Anti-Copy & Anti-Inspection:** Pencegahan klik kanan (*context menu*), pemblokiran kombinasi tombol pintas keyboard (Ctrl+C, Ctrl+V, Ctrl+U, F12, Ctrl+Shift+I).
- **Live Monitoring Dashboard:** Pemantauan status ujian aktif, jumlah peserta yang sedang mengerjakan, peserta yang sudah mengumpulkan, dan status kesehatan server (*Pre-Flight Health Check* menguji latensi database dan cache).

### 5.8. Modul Penilaian, Rekapitulasi & Pelaporan
- **Auto-Grading Engine:** Kalkulasi nilai instan pada saat ujian di-submit (`komentar = 'submitted'`), membandingkan opsi pada `assessment_jawaban_pilgan_detail` terhadap kunci jawaban di `assessment_soal_pilgan`.
- Rekapitulasi nilai siswa, persentase kelulusan terhadap KKM, statistik butir soal, dan ekspor laporan nilai.

---

## 6. Stakeholder & Peran Pengguna (User Roles)

Sistem membedakan hak akses dan tanggung jawab ke dalam 4 (empat) peran utama:

```
+----------------------------------------------------------------------------+
|                                SUPER ADMIN                                 |
| (Multi-Tenant Management, Master Jenjang, System Health & Live Monitoring) |
+-------------------------------------+--------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-------------------------------+                         +------------------+
|         ADMIN INSTANSI        |                         |       GURU       |
| (Manajemen Siswa, Guru, Kelas,|                         | (Bank Soal,      |
|  Mapel per Sekolah/Instansi)  |                         |  Paket TryOut,   |
+-------------------------------+                         |  Jadwal & Token, |
                                                          |  Rekap Nilai)    |
                                                          +--------+---------+
                                                                   |
                                                                   v
                                                          +------------------+
                                                          |      SISWA       |
                                                          | (Mengerjakan     |
                                                          |  Ujian Online,   |
                                                          |  Lihat Hasil)    |
                                                          +------------------+
```

| Peran (Role) | Tabel Sumber Data | Identifikasi Kredensial | Tanggung Jawab & Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `user_bo` | `login_username` / `login_email` (`status_admin = '1'` atau `role_type = 'super_admin'`) | Mengelola seluruh instansi (`kategori_user_bo`), mengelola akun admin instansi, mengonfigurasi jenjang pendidikan global, serta memantau kesehatan server (*pre-flight check*) dan metrik global. |
| **Admin Instansi** | `user_bo` | `login_username` / `login_email` (`role_type = 'admin_sekolah'`) | Mengelola entitas internal sekolahnya: pendataan guru, pendataan siswa, kelas, penugasan guru mapel, serta impor siswa masal. Dibatasi secara ketat oleh `idkategori`. |
| **Guru / Pengajar** | `user_bo` | `login_username` / `login_email` (`role_type = 'guru'`) | Membuat dan mengelola bank soal, mengimpor soal dari Word/Excel, membuat paket ujian/tryout, menjadwalkan sesi kelas atau token, serta meninjau rekapitulasi nilai dan analisis butir soal. |
| **Siswa / Peserta** | `user` | `nisn` / `login_email` / `iduser` / `telp` | Mengakses portal ujian siswa, memilih ujian yang terjadwal untuk kelasnya, memasukkan token ujian (jika ada), mengerjakan soal dalam mode aman, serta melihat skor perolehan. |

---

## 7. Arsitektur Teknologi & Lingkungan Pengembangan

### 7.1. Backend Architecture
- **Framework:** Laravel 12.x
- **Bahasa Pemrograman:** PHP 8.2+
- **Database Engine:** MySQL Server (versi kompatibel Laragon 8.x / MariaDB 10.x+)
- **ORM:** Eloquent ORM dengan relasi aktif ke model basis data `sertidemi`
- **Autentikasi API:** Laravel Sanctum (Personal Access Token, model: `UserBo` dan `UserSiswa`)
- **Keamanan Sesi:** Custom Single-Session Header Middleware (`EnsureSingleSession`, `X-Session-Token`)
- **Authorization & Access Control:** Custom Role Middleware (`CheckRole`) mendukung pemisahan role multi-guard
- **Layanan Ekstraksi Dokumen:** `PhpOffice\PhpWord` / ZipArchive parser untuk membaca file `.docx`

### 7.2. Frontend Architecture
- **Framework & Runtime:** React 19.x dengan TypeScript
- **Build Tool & Bundler:** Vite 8.x
- **Styling Framework:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **State & Server Cache Management:** TanStack React Query v5
- **Routing:** React Router DOM v7 (dilengkapi *Guarded Routes* untuk Guest, Protected Siswa, Protected Guru, Protected Admin)
- **Ikonografi & Desain:** Lucide React
- **Engine Notasi Matematika:** KaTeX (`katex`, `@types/katex`)
- **HTTP Client:** Axios dengan interceptor otomatis untuk injeksi `Authorization: Bearer <token>` dan `X-Session-Token: <token>`

### 7.3. Konfigurasi Lingkungan Lokal (Berdasarkan `.env`)
- **Nama Aplikasi:** `CBT Sistem Ujian Online`
- **URL Backend:** `http://127.0.0.1:8000`
- **URL Frontend Client:** `http://localhost:5173`
- **Koneksi Database:** `mysql`
- **Host / Port Database:** `127.0.0.1:3306`
- **Nama Database:** `sertidemi`
- **Username / Password:** `root` / *(kosong)*
- **Driver Sesi & Cache:** `file`
- **Masa Berlaku Sesi / Token:** `480` menit (8 jam)

---

## 8. Ringkasan Entitas & Struktur Modul Kode

Berikut adalah pemetaan komponen *controller*, *model*, *middleware*, dan *service* yang secara faktual terdaftar dan aktif di dalam *source code*:

### 8.1. Pemetaan Controller Berdasarkan Domain
1. **Domain Autentikasi (`App\Http\Controllers\Api\Auth`):**
   - `LoginController.php`: Menangani proses login dual-entitas (`user_bo` dan `user`), regenerasi `active_session_token`, penerbitan Sanctum token, dan logout.
   - `SessionController.php`: Mengembalikan profil pengguna aktif (`/auth/me`).
2. **Domain Administrasi (`App\Http\Controllers\Api\Admin`):**
   - `InstansiController.php`: CRUD instansi (`kategori_user_bo`) dan manajemen akun admin, guru, siswa terisolasi per instansi.
   - `MasterJenjangController.php`: CRUD jenjang pendidikan (`master_jenjang`).
   - `MasterKelasController.php`: CRUD kelas (`master_kelas`) dan penambahan/penghapusan siswa ke kelas.
   - `MasterMataPelajaranController.php`: CRUD mata pelajaran (`master_mata_pelajaran`) dan penugasan guru pengampu.
   - `TeacherController.php`: CRUD data guru lingkup instansi.
   - `StudentController.php`: CRUD dan impor masal data siswa (`user`).
   - `DashboardController.php`: Menyajikan agregat statistik, *live monitoring*, dan *pre-flight system health check*.
3. **Domain Guru & Ujian (`App\Http\Controllers\Api\Teacher`):**
   - `TeacherExamController.php`: Pengelolaan paket ujian (`assessment`), pembuatan ujian manual, generator 50 soal acak, penugasan ke kelas, serta hasil ujian.
   - `TeacherQuestionBankController.php`: Pengelolaan bank soal (`assessment_soal_pilgan`), unduh format template, dan entri manual.
   - `ExamGroupController.php`: Manajemen sesi ujian, token, dan pembatasan jadwal (`exam_groups`).
   - `ExamReportController.php`: Pelaporan komprehensif dan ekspor nilai.
4. **Domain Siswa & Pengerjaan (`App\Http\Controllers\Api\Student`):**
   - `ExamAttemptController.php`: Menampilkan daftar ujian tersedia, validasi jadwal/token, inisialisasi sesi (`start`), dan penyerahan ujian (`submit`).
   - `AnswerController.php`: Penyimpanan dan pembaruan instan pilihan jawaban siswa ke detail jawaban (`saveAnswer`).
   - `ResultController.php`: Menampilkan hasil skor akhir ujian siswa yang telah diselesaikan.
5. **Domain Pengawasan (`App\Http\Controllers\Api\Proctoring`):**
   - `ViolationLogController.php`: Pencatatan log pelanggaran proctoring dan eksekusi diskualifikasi otomatis.

### 8.2. Pemetaan Service Class (`App\Services`)
- `AutoGradingService.php`: Layanan evaluasi dan penilaian skor otomatis.
- `DocxQuestionService.php`: Layanan ekstraksi dan parsing naskah soal dari berkas Word `.docx`.

### 8.3. Pemetaan Middleware Kunci (`App\Http\Middleware`)
- `EnsureSingleSession.php` (Alias: `single_session`): Memvalidasi kecocokan token client dengan sesi aktif di database untuk mencegah login ganda.
- `CheckRole.php` (Alias: `role`): Memvalidasi hak akses peran pengguna berdasarkan hirarki `super_admin`, `admin`, `guru`, dan `siswa`.

---

## 9. Batasan Sistem & Karakteristik Arsitektur (System Boundaries)

1. **Dependensi Skema Legacy Basis Data Sertidemi:**
   Sistem CBT terintegrasi secara langsung dengan tabel-tabel bawaan platform Sertidemi (`user`, `user_bo`, `assessment`, `transaksi`, `kategori_user_bo`). Oleh karena itu, *primary key* pada beberapa entitas utama bertipe string numerik acak/timestamp berukuran bervariasi (contoh: `idassessment` varchar 30, `iduser_bo` varchar 25, `iduser` varchar 36), bukan integer auto-increment standar Laravel.
2. **Keterkaitan dengan Tabel Transaksi:**
   Setiap pengerjaan ujian oleh siswa (`assessment_jawaban_pilgan`) memiliki ketergantungan relasional (*foreign key*) terhadap tabel `transaksi` (`idtransaksi`). Sistem secara otomatis membentuk rekaman transaksi pendukung dengan status `7` (selesai) agar integritas referensial basis data tetap terjaga.
3. **Format Soal Utama:**
   Arsitektur ujian yang aktif pada antarmuka saat ini difokuskan pada format pilihan ganda (*multiple choice*) 5 opsi (A–E) berbasis tabel `assessment_soal_pilgan` dan `assessment_jawaban_pilgan_detail`. Format soal esai dan kompleks lainnya tersedia pada skema tabel pelengkap.
4. **Ketergantungan Ekstensi PHP:**
   Proses impor soal dari file Microsoft Word mewajibkan ketersediaan ekstensi PHP `zip` dan `xml` aktif pada instalasi PHP runtime.

---

## 10. Catatan Konfirmasi & Hal yang Perlu Dikonfirmasi (Perlu Konfirmasi)

Berdasarkan analisis langsung terhadap *source code* dan database, terdapat beberapa aspek operasional di luar kode program yang ditandai sebagai **[Perlu Konfirmasi]**:

1. **[Perlu Konfirmasi] Spesifikasi Server Produksi:**
   Spesifikasi perangkat keras definitif (*vCPU, RAM, Storage SSD*) untuk server produksi saat sistem di-deploy secara luas di luar server lokal Laragon.
2. **[Perlu Konfirmasi] Kebijakan Toleransi Diskualifikasi Default:**
   Batas toleransi perpindahan tab/jendela diatur secara *default* sebanyak 5 kali di *ViolationLogController*; apakah parameter ini akan dibuat dapat dikonfigurasi secara dinamis oleh guru per paket ujian di antarmuka web.
3. **[Perlu Konfirmasi] Kebijakan Retensi Log Transaksi dan Jawaban:**
   Kebijakan masa simpan (*data retention policy*) terhadap rekaman detail jawaban siswa (`assessment_jawaban_pilgan_detail`) setelah periode tahun ajaran berakhir.

---

## 11. Kesimpulan & Langkah Selanjutnya

Dokumen **Project Overview** ini memberikan landasan faktual mengenai identitas, arsitektur, ruang lingkup modul, batasan teknis, dan relasi sistem CBT Ujian Online dengan basis data `sertidemi`. Seluruh komponen yang dipaparkan diverifikasi langsung dari struktur kode program Laravel backend, React frontend, dan skema MySQL Laragon yang ada.

Setelah dokumen pertama ini ditinjau dan disetujui, penyusunan akan dilanjutkan ke dokumen berikutnya sesuai urutan:
- **Dokumen Selanjutnya:** `02. Software Requirement Specification (SRS)`
