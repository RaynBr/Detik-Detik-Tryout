# 02. Software Requirement Specification (SRS)
**Sistem CBT Ujian Online (Online Examination System)**  
*Basis Data: MySQL `sertidemi` | Backend: Laravel 12 | Frontend: React 19 SPA*

---

## 1. Pendahuluan (Introduction)

### 1.1. Tujuan Dokumen
Dokumen *Software Requirement Specification* (SRS) ini merinci seluruh kebutuhan sistem untuk **Sistem CBT Ujian Online**. Dokumen ini menjadi acuan spesifikasi fungsional dan teknis yang diturunkan langsung dari analisis implementasi *source code* backend (Laravel 12 REST API), frontend (React 19 Vite), serta skema database aktif `sertidemi`.

### 1.2. Lingkup Produk (Scope)
Sistem CBT Ujian Online mencakup:
1. Autentikasi dual-entitas (`user_bo` untuk staf/guru/admin dan `user` untuk siswa) dengan mekanisme penguncian sesi tunggal (*single-session lock*).
2. Manajemen multi-tenant instansi/sekolah berbasis `kategori_user_bo`.
3. Manajemen master data pendidikan: Jenjang (`master_jenjang`), Kelas (`master_kelas`), Mata Pelajaran (`master_mata_pelajaran`), Penugasan Guru (`guru_mata_pelajaran`), dan Distribusi Siswa (`siswa_kelas`).
4. Pengelolaan bank soal (`assessment_soal_pilgan`) dengan opsi A–E, formula KaTeX/LaTeX, gambar, serta fitur impor naskah soal Word (`.docx`) dan spreadsheet CSV.
5. Pembuatan paket ujian (`assessment`), penjadwalan sesi per kelompok/kelas dengan token (`exam_groups`), dan generator 50 butir soal acak.
6. Engine pengerjaan ujian daring siswa dengan penyimpanan jawaban otomatis per detik (*real-time autosave*) ke `assessment_jawaban_pilgan_detail`.
7. Mesin pengawasan daring (*online proctoring*): kewajiban layar penuh (*strict fullscreen*), deteksi pergantian tab/jendela (*tab switch*), auto-diskualifikasi siswa pada batas pelanggaran, pemblokiran klik kanan, inspect element, dan salin-tempel.
8. Evaluasi otomatis (*auto-grading*) pilihan ganda, rekapitulasi nilai, serta ekspor laporan hasil ujian.

### 1.3. Definisi, Akronim, dan Singkatan
- **CBT:** *Computer-Based Testing* (Ujian Berbasis Komputer).
- **SPA:** *Single Page Application* (Aplikasi web satu halaman interaktif).
- **Sanctum:** Pustaka autentikasi token stateless bawaan ekosistem Laravel.
- **Single-Session Lock:** Mekanisme pengamanan agar 1 akun hanya dapat aktif pada 1 perangkat/browser dalam satu waktu.
- **Attempt:** Satu sesi pelaksanaan ujian oleh seorang siswa (`assessment_jawaban_pilgan`).
- **KKM:** Kriteria Ketuntasan Minimal nilai mata pelajaran.
- **Proctoring:** Sistem pengawasan otomatis untuk memantau integritas peserta ujian.

---

## 2. Deskripsi Umum (Overall Description)

### 2.1. Perspektif Produk
Sistem dibangun dalam arsitektur *decoupled*:
- **Backend Service:** Laravel 12 REST API yang berjalan di port `8000`, terhubung ke MySQL database `sertidemi`.
- **Frontend Client:** React 19 + TypeScript + Tailwind CSS v4 yang berjalan di port `5173`.
- **Koneksi Eksternal:** Terintegrasi langsung dengan database `sertidemi` eksisting yang juga memuat data modul Sertidemi lainnya.

### 2.2. Karakteristik Pengguna
1. **Super Admin:** Memiliki akses global tanpa batasan tenant ke seluruh instansi dan fitur server.
2. **Admin Instansi:** Dibatasi hanya untuk mengelola master data dan pengguna di instansi miliknya (`idkategori`).
3. **Guru:** Berwenang mengelola bank soal, membuat paket ujian, mengatur jadwal/token, dan mengunduh laporan nilai.
4. **Siswa:** Berwenang mengikuti ujian yang dijadwalkan untuk kelasnya dan melihat hasil ujian.

### 2.3. Batasan Desain & Implementasi (Constraints)
- Menggunakan skema relasional tabel bawaan `sertidemi` dengan format primary key unik berbasis string angka/timestamp (contoh: `idassessment`, `iduser_bo`, `iduser`).
- Setiap inisialisasi ujian siswa wajib membuat record referensi di tabel `transaksi` (`status_transaksi = '7'`, `jenis_transaksi = 'assessment'`) untuk menjaga integritas *foreign key*.
- Antarmuka utama CBT berfokus pada soal pilihan ganda 5 opsi (A–E). Modul esai dan tipe soal kompleks berada pada tahap pengembangan lanjutan.

---

## 3. Spesifikasi Kebutuhan Antarmuka Eksternal (External Interface Requirements)

### 3.1. Antarmuka Pengguna (User Interface)
- Halaman login terpadu (`/login`) dengan tab pemisah antara portal Siswa (NISN) dan portal Staf/Guru (Username/Email).
- Antarmuka Siswa: Dashboard daftar ujian (`/student/dashboard`), ruang pengerjaan soal (`/student/session/:attemptId`).
- Antarmuka Guru: Dashboard metrik (`/teacher/dashboard`), manajemen bank soal (`/teacher/questions`), paket ujian (`/teacher/exams`), rekapitulasi nilai (`/teacher/reports`).
- Antarmuka Admin: Dashboard master data instansi (`/admin/instansi`), jenjang (`/admin/jenjang`), kelas (`/admin/classes`), mapel (`/admin/subjects`), guru (`/admin/teachers`), siswa (`/admin/students`), live monitoring (`/admin/proctoring`).

### 3.2. Antarmuka Perangkat Lunak (Software Interfaces)
- **Database Server:** MySQL 8.x / MariaDB 10.x+ (Laragon Environment).
- **Protokol Komunikasi:** RESTful API via HTTP/JSON.
- **Pustaka Formula:** KaTeX untuk merender sintaks LaTeX pada soal dan pilihan jawaban matematika/eksakta.
- **Pustaka Dokumen:** Ekstensi PHP `zip` dan `xml` untuk membedah naskah soal Word (`.docx`).

---

## 4. Kebutuhan Fungsional Sistem (System Features)

### SRS-F01: Autentikasi & Single-Session Enforcement
- Sistem wajib memvalidasi kredensial login staf di `user_bo` (mendukung hash Bcrypt dan dekode 5x Base64 legacy) dan siswa di `user`.
- Sistem wajib membuat token sesi unik (`active_session_token`) pada saat login berhasil.
- Sistem wajib menolak permintaan API jika header `X-Session-Token` tidak cocok dengan `active_session_token` di database, dan mencabut token Sanctum jika ada login baru di perangkat lain.

### SRS-F02: Manajemen Multi-Tenant Instansi
- Sistem wajib mengelompokkan instansi/sekolah pada tabel `kategori_user_bo`.
- Sistem wajib membatasi Admin Instansi (`role_type = 'admin_sekolah'`) hanya dapat melihat dan mengedit data guru, siswa, kelas, dan mapel dengan `idkategori` yang sama.

### SRS-F03: Manajemen Kurikulum & Master Akademik
- Sistem wajib mendukung pengelolaan data jenjang pendidikan (`master_jenjang`).
- Sistem wajib mendukung pengelolaan ruang kelas (`master_kelas`) dengan nama bebas (mendukung penamaan sekolah swasta) dan penugasan wali kelas dari `user_bo`.
- Sistem wajib mendukung pengelolaan mata pelajaran (`master_mata_pelajaran`) beserta nilai KKM.
- Sistem wajib memetakan guru pengampu ke mata pelajaran dan kelas spesifik (`guru_mata_pelajaran`).

### SRS-F04: Bank Soal & Ekstraksi Dokumen
- Sistem wajib mendukung pembuatan soal pilihan ganda lengkap dengan opsi A sampai E, gambar pendukung, kunci jawaban, dan pembahasan.
- Sistem wajib menyediakan layanan parsing naskah soal Word `.docx` (`DocxQuestionService`) yang otomatis mengekstrak butir pertanyaan, kunci jawaban, dan opsi A–E ke `assessment_soal_pilgan`.
- Sistem wajib mendukung impor naskah soal format CSV/Excel.

### SRS-F05: Paket Ujian & Pengelompokan Sesi
- Sistem wajib mendukung pembuatan paket ujian di `assessment` yang mencakup durasi waktu pengerjaan dan rentang tanggal aktif.
- Sistem wajib menyediakan generator 50 butir soal acak dari bank soal (`generateRandom50`).
- Sistem wajib mendukung penjadwalan kelompok ujian (`exam_groups`) dengan pembatasan token rahasia, waktu mulai, waktu selesai, dan penugasan kelas (`class_ids`).

### SRS-F06: Pengerjaan Ujian & Real-Time Autosave
- Sistem wajib menghitung *effective duration* pengerjaan jika siswa memulai ujian mendekati batas akhir sesi.
- Sistem wajib menyimpan setiap pilihan jawaban siswa secara instan ke tabel `assessment_jawaban_pilgan_detail` via endpoint `PATCH /student/attempts/{attempt}/answers`.
- Siswa dapat menandai soal dengan status ragu-ragu dan berpindah nomor soal secara fleksibel.

### SRS-F07: Proctoring & Deteksi Kecurangan
- Sistem wajib mewajibkan mode layar penuh (*strict fullscreen*) saat mengerjakan soal.
- Sistem wajib mendeteksi dan mencatat peristiwa keluar dari layar penuh, perpindahan tab browser, atau minimasi jendela aplikasi ke endpoint `/violations`.
- Sistem wajib secara otomatis mendiskualifikasi siswa (`status = disqualified`, nilai = 0) jika jumlah pelanggaran telah mencapai ambang batas (default: 5 kali).
- Sistem wajib memblokir fungsi klik kanan, kombinasi tombol copy/paste, dan tombol pintas inspect element (F12, Ctrl+Shift+I).

### SRS-F08: Penilaian Otomatis & Pelaporan
- Sistem wajib mencocokkan lembar jawaban `assessment_jawaban_pilgan_detail` dengan kunci di `assessment_soal_pilgan` pada saat siswa submit ujian.
- Nilai total wajib disimpan pada `assessment_jawaban_pilgan.nilai`.
- Sistem wajib menyajikan analisis butir soal, rekapitulasi nilai per kelas, serta ekspor laporan nilai.

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)

- **Keamanan (Security):** Seluruh endpoint privat diwajibkan melewati middleware `auth:sanctum`, `single_session`, dan `role`. Sandi disimpan terenkripsi.
- **Kinerja (Performance):** Endpoint autosave jawaban siswa dilengkapi *throttle rate limit* hingga 180 request/menit untuk menampung *burst concurrency*.
- **Ketersediaan (Availability):** Sistem dilengkapi endpoint `/admin/dashboard/pre-flight-check` untuk menguji latensi database dan cache sebelum ujian serentak dimulai.
- **Kompatibilitas:** Frontend responsif terhadap berbagai ukuran layar (desktop, laptop, dan tablet) menggunakan peramban modern berbasis Chromium dan WebKit.

---

## 6. Bagian yang Perlu Konfirmasi Klien (Pending Confirmation)
- ⚠ **[Perlu Konfirmasi]** Alur penerbitan sertifikat kelulusan otomatis dari tabel `assessment_sertifikat`.
- ⚠ **[Perlu Konfirmasi]** Kebijakan pengarsipan/penghapusan data detail jawaban siswa setelah tahun ajaran berakhir.
- ⚠ **[Perlu Konfirmasi]** Penambahan peran khusus "Pengawas Ruang" yang terpisah dari akun Guru.
