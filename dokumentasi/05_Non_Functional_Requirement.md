# 05. Non-Functional Requirement Document (NFRD)
**Sistem CBT Ujian Online (Online Examination System)**  
*Spesifikasi Kualitas Layanan, Keamanan, Kinerja, dan Reliabilitas Sistem*

---

## 1. Kebutuhan Kinerja & Skalabilitas (Performance & Scalability)

### 1.1. Waktu Respon Sistem (Response Time)
- **NFR-PERF-01 (Autosave Latency):** Endpoint penyimpanan pilihan jawaban siswa (`PATCH /api/student/attempts/{attempt}/answers`) wajib merespon dengan waktu rata-rata di bawah **100 ms** dalam kondisi beban normal, dan tidak melebihi **250 ms** pada kondisi beban puncak (*burst traffic*).
- **NFR-PERF-02 (Exam Question Loading):** Permintaan memuat naskah soal ujian (`GET /api/student/attempts/{attempt}/questions`) wajib tuntas di bawah **800 ms** untuk paket berukuran hingga 50–100 butir soal lengkap dengan pilihan jawaban.
- **NFR-PERF-03 (Auto-Grading Calculation):** Proses kalkulasi skor ujian saat siswa submit (`POST /api/student/attempts/{attempt}/submit`) wajib selesai di bawah **1 detik** untuk 50 soal pilihan ganda.

### 1.2. Penanganan Konkurensi & Beban Puncak (Concurrency & Rate Limiting)
- **NFR-PERF-04 (Burst Rate Limiting):**
  - Endpoint `PATCH .../answers` dibatasi dengan kuota *throttle* **180 request per menit per siswa** untuk mengizinkan pergantian jawaban yang cepat tanpa memicu HTTP 429.
  - Endpoint login `POST /api/auth/login` dibatasi dengan kuota **30 request per menit** untuk mencegah serangan brute force.
  - Endpoint submit ujian dibatasi dengan kuota **20 request per menit**.
- **NFR-PERF-05 (Pre-Flight Server Check):** Sistem menyediakan endpoint diagnostik (`/admin/dashboard/pre-flight-check`) yang memverifikasi latensi query database MySQL harus bernilai **< 10 ms** pada server lokal sebelum ujian serentak dimulai.

---

## 2. Kebutuhan Keamanan Sistem (Security Requirements)

### 2.1. Autentikasi & Manajemen Sesi
- **NFR-SEC-01 (Stateless Token Authentication):** Menggunakan **Laravel Sanctum** dengan penyimpanan token pada tabel `personal_access_tokens` yang memiliki batas kadaluarsa (*expiration*) 480 menit (8 jam).
- **NFR-SEC-02 (Single-Session Enforcement):** Sistem wajib memvalidasi kecocokan token sesi klien pada header `X-Session-Token` dengan kolom `active_session_token` di database. Jika siswa mencoba masuk dari browser/perangkat kedua, sesi pada perangkat pertama langsung dicabut secara otomatis.
- **NFR-SEC-03 (Credential Hashing):** Seluruh kata sandi siswa baru dan staf wajib disimpan menggunakan algoritma hashing **Bcrypt** dengan cost factor 12. Sistem menyediakan kompatibilitas backward terhadap format sandi lama (5x Base64) saat autentikasi.

### 2.2. Proteksi Injeksi & Integritas Data
- **NFR-SEC-04 (SQL Injection Prevention):** Seluruh interaksi database wajib menggunakan parameter binding bawaan **Laravel Eloquent ORM** dan query builder, mencegah eksekusi string SQL mentah tanpa sanitasi.
- **NFR-SEC-05 (Cross-Site Scripting / XSS Prevention):** Seluruh input teks naskah soal dan data siswa wajib disanitasi saat pemrosesan request dan di-escape secara otomatis oleh parser React JSX pada sisi antarmuka.

### 2.3. Pengawasan Daring (Anti-Cheat Security)
- **NFR-SEC-06 (Strict Fullscreen Mode):** Layar ujian wajib mengunci mode fullscreen (`document.documentElement.requestFullscreen`). Sistem mendeteksi peristiwa `fullscreenchange` dan memunculkan modal peringatan jika siswa keluar dari layar penuh.
- **NFR-SEC-07 (Client-Side Inspection Blocker):** Antarmuka ujian wajib menonaktifkan fungsi klik kanan (`contextmenu`), pintasan keyboard salin/tempel (Ctrl+C, Ctrl+V), melihat kode sumber (Ctrl+U), dan Developer Tools (F12, Ctrl+Shift+I).
- **NFR-SEC-08 (Automatic Disqualification):** Akumulasi pelanggaran perpindahan tab/jendela yang mencapai ambang batas (default: 5 kali) wajib langsung mendiskualifikasi sesi siswa dengan nilai nol permanen.

---

## 3. Kebutuhan Reliabilitas & Ketersediaan (Reliability & Availability)

### 3.1. Ketahanan Terhadap Kehilangan Data (Fault Tolerance)
- **NFR-REL-01 (Zero Data Loss Autosave):** Setiap perubahan jawaban siswa wajib disimpan secara independen per butir soal ke tabel `assessment_jawaban_pilgan_detail`. Jika perangkat siswa mati atau koneksi terputus, seluruh jawaban yang telah diklik sebelumnya tetap tersimpan utuh di server.
- **NFR-REL-02 (Session Resumption):** Siswa yang mengalami gangguan teknis dapat melanjutkan kembali ujiannya pada perangkat yang sama dengan sisa durasi waktu yang terhitung secara akurat berdasarkan catatan waktu awal pengerjaan (`tgl_input_time`).

### 3.2. Integritas Relasional Basis Data
- **NFR-REL-03 (Referential Integrity):** Pembuatan entri pengerjaan ujian siswa (`assessment_jawaban_pilgan`) wajib disertai record pendukung di tabel `transaksi` dengan `status_transaksi = '7'` guna menjaga integritas kunci asing (*foreign key*) warisan platform Sertidemi.

---

## 4. Kebutuhan Kegunaan & Aksesibilitas (Usability & Accessibility)

- **NFR-USE-01 (Responsive Interface):** Antarmuka React SPA wajib beradaptasi dengan baik pada resolusi desktop, laptop, dan tablet (minimal lebar layar 768px).
- **NFR-USE-02 (Scientific & Math Formula Rendering):** Naskah soal yang memuat persamaan matematika, fisika, atau kimia wajib dirender secara tajam dan presisi menggunakan pustaka **KaTeX**.
- **NFR-USE-03 (Intuitive Status Navigation):** Lembar ujian wajib menyediakan kisi nomor soal dengan visualisasi warna yang kontras: Abu-abu (Belum Dijawab), Indigo/Biru (Sudah Dijawab), dan Kuning (Ragu-ragu).

---

## 5. Kebutuhan Pemeliharaan & Arsitektur (Maintainability)

- **NFR-MNT-01 (Decoupled Architecture):** Backend API dan Frontend client wajib terpisah secara modular sehingga pembaruan antarmuka web tidak mengganggu stabilitas logika bisnis API.
- **NFR-MNT-02 (Multi-Tenant Isolation):** Seluruh query administrasi instansi wajib mengikutsertakan filter `idkategori` untuk menjamin data antar-sekolah tidak saling bocor.
