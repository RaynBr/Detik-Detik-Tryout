# 04. Functional Requirement Document (FRD)
**Sistem CBT Ujian Online (Online Examination System)**  
*Spesifikasi Fungsional Rinci Berdasarkan Implementasi Kode Backend & Frontend*

---

## 1. Daftar Kebutuhan Fungsional (Functional Requirements Breakdown)

### 1.1. Modul Autentikasi & Sesi (FR-AUTH)

#### FR-AUTH-01: Autentikasi Pengguna & Penerbitan Token
- **Deskripsi:** Sistem menyediakan mekanisme masuk (*login*) bagi Staf/Guru (`user_bo`) dan Siswa (`user`).
- **Endpoint Terkait:** `POST /api/auth/login` (`LoginController::login`).
- **Input:** `login` (string: username/email/NISN/nomor telepon), `password` (string).
- **Proses:**
  1. Cek tabel `user_bo` untuk staf/admin/guru. Verifikasi password via `UserBo::verifyPassword` (mendukung dekode 5x Base64, Bcrypt, atau teks polos).
  2. Jika tidak ditemukan, cek tabel `user` untuk siswa. Verifikasi password via `UserSiswa::verifyPassword` (Bcrypt atau teks polos).
  3. Cek status keaktifan akun (`status_aktif == 'Y'`).
  4. Hasilkan `active_session_token` baru berupa string acak 40 karakter.
  5. Hapus token Sanctum lama dan terbitkan token baru (`cbt_auth_token`).
- **Output:** JSON memuat token Sanctum, `session_token`, identitas pengguna, dan peran (`role`).

#### FR-AUTH-02: Single-Session Enforcement
- **Deskripsi:** Memastikan satu akun hanya dapat aktif pada satu sesi browser/perangkat dalam satu waktu.
- **Middleware Terkait:** `App\Http\Middleware\EnsureSingleSession` (`single_session`).
- **Input:** Header HTTP `X-Session-Token` dan Bearer Token Sanctum.
- **Proses:**
  1. Periksa apakah nilai `X-Session-Token` pada header permintaan sama dengan `user.active_session_token` di database.
  2. Jika berbeda, sistem otomatis mencabut token Sanctum yang sedang dipakai dan mengembalikan HTTP status 401 (`SESSION_OVERWRITE`).
- **Output:** Pesan penolakan: *"Sesi Anda telah aktif di perangkat lain. Anda telah dikeluarkan otomatis."*

---

### 1.2. Modul Multi-Tenant & Master Data Akademik (FR-MST)

#### FR-MST-01: Manajemen Multi-Tenant Instansi
- **Deskripsi:** Pengelolaan entitas sekolah/instansi mitra.
- **Endpoint Terkait:** `apiResource('admin/instansi', InstansiController::class)`.
- **Tabel Terkait:** `kategori_user_bo` (`idkategori`, `nama_kategori`).
- **Hak Akses:** Khusus Super Admin (`role:super_admin`).

#### FR-MST-02: Manajemen Jenjang Pendidikan
- **Deskripsi:** Pengelolaan tingkatan studi formal (SD, SMP, SMA, SMK).
- **Endpoint Terkait:** `apiResource('admin/jenjang', MasterJenjangController::class)`.
- **Tabel Terkait:** `master_jenjang` (`id`, `kode_jenjang`, `nama_jenjang`, `urutan`, `status_aktif`).

#### FR-MST-03: Manajemen Kelas & Penugasan Siswa
- **Deskripsi:** Pengelolaan ruang kelas dengan penamaan bebas dan pengalokasian siswa ke dalam kelas.
- **Endpoint Terkait:**
  - `apiResource('admin/classes', MasterKelasController::class)`
  - `POST /api/admin/classes/{id}/students` (`addStudent`)
  - `DELETE /api/admin/classes/{id}/students/{iduser}` (`removeStudent`)
- **Tabel Terkait:** `master_kelas`, `siswa_kelas`, `user`.

#### FR-MST-04: Manajemen Mata Pelajaran & Penugasan Guru
- **Deskripsi:** Pengelolaan katalog mata pelajaran, batas KKM, dan guru pengampu.
- **Endpoint Terkait:**
  - `apiResource('admin/subjects', MasterMataPelajaranController::class)`
  - `POST /api/admin/subjects/{id}/teachers` (`assignTeacher`)
  - `DELETE /api/admin/subjects/{id}/teachers/{iduser_bo}` (`removeTeacher`)
- **Tabel Terkait:** `master_mata_pelajaran`, `guru_mata_pelajaran`.

#### FR-MST-05: Impor Data Siswa Masal
- **Deskripsi:** Penambahan data siswa sekaligus menggunakan file Excel/CSV.
- **Endpoint Terkait:** `POST /api/admin/students/import` (`StudentController::import`).
- **Input:** Berkas spreadsheet (`.xlsx` / `.csv`).
- **Proses:** Membaca baris data (NISN, Nama, Email, Password, Kelas) dan melakukan *bulk insert/update* ke tabel `user` dan `siswa_kelas`.

---

### 1.3. Modul Bank Soal & Ekstraksi Dokumen (FR-SOAL)

#### FR-SOAL-01: Entri Bank Soal Pilihan Ganda
- **Deskripsi:** Pembuatan dan pembaruan butir soal pilihan ganda 5 opsi.
- **Endpoint Terkait:** `apiResource('teacher/questions', TeacherQuestionBankController::class)`.
- **Tabel Terkait:** `assessment_soal_pilgan`.
- **Input:** `idjenjang`, `idmapel`, `soal_text`, `soal_gambar`, `pilihan_a_text` s/d `pilihan_e_text`, `jawaban` (A/B/C/D/E), `penjelasan_jawaban`.
- **Output:** Record butir soal baru dengan primary key string angka timestamp.

#### FR-SOAL-02: Ekstraksi Naskah Soal Word (.docx)
- **Deskripsi:** Mengunggah naskah soal dari berkas Microsoft Word untuk di-parsing otomatis.
- **Endpoint Terkait:** `POST /api/teacher/questions/import` (`QuestionImportController::import`).
- **Service Terkait:** `App\Services\DocxQuestionService`.
- **Proses:**
  1. Membaca struktur berkas `.docx` menggunakan parser XML / ZipArchive.
  2. Mengekstrak teks pertanyaan, gambar naskah soal inline, pilihan jawaban A hingga E, dan tanda kunci jawaban.
  3. Menyimpan seluruh butir soal yang berhasil diparsing ke tabel `assessment_soal_pilgan`.
- **Output:** Jumlah soal yang berhasil diekstrak dan daftar butir soal yang diimpor.

---

### 1.4. Modul Paket Ujian & Penjadwalan (FR-EXAM)

#### FR-EXAM-01: Pembuatan Paket Ujian (TryOut)
- **Deskripsi:** Penyusunan paket ujian dengan menentukan durasi, tanggal mulai, dan batas selesai.
- **Endpoint Terkait:** `POST /api/teacher/exams` (`TeacherExamController::store`).
- **Tabel Terkait:** `assessment`.
- **Input:** `title`, `idmapel`, `idjenjang`, `duration_minutes`, `start_time`, `end_time`.

#### FR-EXAM-02: Generator Paket 50 Soal Acak
- **Deskripsi:** Menghasilkan paket ujian instan berisi 50 butir soal acak dari bank soal.
- **Endpoint Terkait:** `POST /api/teacher/exams/generate-random` (`TeacherExamController::generateRandom50`).
- **Proses:** Query mengambil 50 baris soal acak (`inRandomOrder`) dari `assessment_soal_pilgan` berdasarkan `idmapel` dan `idjenjang`, menduplikasikannya ke paket `assessment` baru.

#### FR-EXAM-03: Penjadwalan Sesi Ujian (Exam Group & Token)
- **Deskripsi:** Menetapkan jadwal pelaksanaan ujian spesifik, alokasi kelas, dan kode akses token.
- **Endpoint Terkait:**
  - `POST /api/teacher/exams/{id}/assign-class` (`TeacherExamController::assignToClass`)
  - `apiResource('teacher/exam-groups', ExamGroupController::class)`
- **Tabel Terkait:** `exam_groups` (`exam_id`, `name`, `start_time`, `end_time`, `token`, `class_ids`, `student_ids`).

---

### 1.5. Modul Pelaksanaan Ujian Siswa (FR-CBT)

#### FR-CBT-01: Daftar Ujian Siswa & Kalkulasi Durasi Efektif
- **Deskripsi:** Menyajikan daftar ujian yang dapat diikuti siswa beserta durasi pengerjaan efektif.
- **Endpoint Terkait:** `GET /api/student/exams` (`ExamAttemptController::availableExams`).
- **Proses:** Memfilter paket ujian berdasarkan `idkelas` dan `idkategori` siswa atau target `exam_groups`. Menghitung sisa waktu sesi jika waktu tersisa sesi lebih kecil dari durasi standar ujian.

#### FR-CBT-02: Inisialisasi Sesi Ujian (Start Attempt)
- **Deskripsi:** Memulai pengerjaan ujian oleh siswa.
- **Endpoint Terkait:** `POST /api/student/attempts/start` (`ExamAttemptController::start`).
- **Proses:**
  1. Validasi rentang waktu `start_time` dan `end_time`.
  2. Cek apakah record attempt sudah ada di `assessment_jawaban_pilgan`.
  3. Jika belum, buat record di tabel `transaksi` (`status_transaksi = '7'`) dan buat record di `assessment_jawaban_pilgan` (`komentar = 'in_progress'`).
- **Output:** ID sesi pengerjaan (`idassessment_jawaban_pilgan`) dan daftar soal ujian.

#### FR-CBT-03: Real-Time Autosave Jawaban Siswa
- **Deskripsi:** Menyimpan setiap pilihan jawaban siswa secara instan ke database.
- **Endpoint Terkait:** `PATCH /api/student/attempts/{attempt}/answers` (`AnswerController::saveAnswer`).
- **Rate Limit:** Throttle 180 request per menit.
- **Proses:** Melakukan upsert pada tabel `assessment_jawaban_pilgan_detail` mencocokkan `idassessment_jawaban_pilgan` dan `idassessment_soal_pilgan` dengan pilihan huruf jawaban ('A', 'B', 'C', 'D', 'E').

#### FR-CBT-04: Penyerahan & Evaluasi Nilai Ujian (Submit Attempt)
- **Deskripsi:** Mengakhiri sesi ujian dan menghitung skor akhir.
- **Endpoint Terkait:** `POST /api/student/attempts/{attempt}/submit` (`ExamAttemptController::submit`).
- **Proses:**
  1. Membaca seluruh jawaban siswa di `assessment_jawaban_pilgan_detail`.
  2. Mencocokkan jawaban siswa dengan kolom `jawaban` di `assessment_soal_pilgan`.
  3. Menghitung persentase nilai akhir: `(Jawaban Benar / Total Soal) * 100`.
  4. Memperbarui `assessment_jawaban_pilgan` (`nilai = skor`, `komentar = 'submitted'`).
- **Output:** Ringkasan hasil ujian (skor, benar, salah).

---

### 1.6. Modul Proctoring & Anti-Kecurangan (FR-PROC)

#### FR-PROC-01: Pencatatan Pelanggaran Pengawasan
- **Deskripsi:** Merekam tindakan pergantian tab, keluar dari mode layar penuh, atau kehilangan fokus jendela browser.
- **Endpoint Terkait:** `POST /api/student/attempts/{attempt}/violations` (`ViolationLogController::logViolation`).
- **Proses:**
  1. Menyimpan data kejadian (jenis: `tab_switch`, `window_blur`, `fullscreen_exit`) dan waktu kejadian.
  2. Menghitung akumulasi pelanggaran siswa pada sesi tersebut.
  3. JIKA jumlah pelanggaran mencapai batas maksimum (default: 5 kali), sistem otomatis mengubah status attempt menjadi `disqualified`, nilai menjadi 0, dan menghentikan ujian siswa.

---

### 1.7. Modul Pemantauan & Diagnostik Sistem (FR-SYS)

#### FR-SYS-01: Pre-Flight Health Check
- **Deskripsi:** Menguji kesiapan server dan latensi database sebelum ujian massal dimulai.
- **Endpoint Terkait:** `GET /api/admin/dashboard/pre-flight-check` (`DashboardController::preFlightCheck`).
- **Proses:** Menjalankan kueri uji ke basis data MySQL dan driver cache, mengukur latensi waktu respon dalam satuan milidetik (ms).

#### FR-SYS-02: Live Proctoring Monitoring
- **Deskripsi:** Menampilkan statistik real-time peserta yang sedang aktif mengerjakan dan log pelanggaran terkini.
- **Endpoint Terkait:** `GET /api/admin/dashboard/live-monitoring` (`DashboardController::liveMonitoring`).
