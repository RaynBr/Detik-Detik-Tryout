# 14. Testing Plan (Rencana & Kasus Pengujian Sistem)
**Sistem CBT Ujian Online (Online Examination System)**  
*Strategi Jaminan Kualitas (Quality Assurance), Matriks Kasus Uji, dan Prosedur Validasi*

---

## 1. Strategi Pengujian (Testing Strategy)

Rencana pengujian ini dirancang untuk memastikan keandalan, akurasi penilaian, keamanan sesi, serta ketahanan sistem saat menangani beban puncak ujian daring.

### 1.1. Lingkup Pengujian (Scope of Testing)
1. **Pengujian Fungsional (Functional Testing):** Memverifikasi kebenaran alur login dual-entitas, manajemen master data, impor naskah soal Word `.docx`, pembuatan paket ujian acak, autosave jawaban, dan rekapitulasi nilai.
2. **Pengujian Keamanan & Proctoring (Security & Anti-Cheat Testing):** Menguji ketahanan *single-session locking*, kepatuhan mode layar penuh wajib, deteksi perpindahan tab, pemblokiran inspect element/klik kanan, dan auto-diskualifikasi.
3. **Pengujian Kinerja & Konkurensi (Performance & Burst Testing):** Menguji stabilitas endpoint autosave jawaban terhadap *rate limiter* 180 req/menit serta latensi database.
4. **User Acceptance Testing (UAT):** Skenario pengujian berbasis peran nyata (Super Admin, Admin Sekolah, Guru, Siswa).

### 1.2. Lingkungan Pengujian (Test Environment)
- **Backend:** PHP 8.2+, Laravel 12 (Localhost: 8000), PHPUnit / Pest.
- **Database:** MySQL 8.x (Database: `sertidemi`, Laragon).
- **Frontend:** Node.js 18+, React 19, Vite (Localhost: 5173).
- **Peramban Uji:** Google Chrome v120+, Microsoft Edge v120+, Mozilla Firefox v120+.

---

## 2. Matriks Kasus Uji Faktual (Test Cases Matrix)

### 2.1. Modul Autentikasi & Sesi (TC-AUTH)

| ID Uji | Skenario Pengujian | Langkah Pengujian / Input | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Login Siswa dengan Kredensial Valid | Input NISN dan kata sandi benar pada form portal siswa. | HTTP 200 OK, Bearer token terbit, `active_session_token` tersimpan, dialihkan ke dashboard siswa. | Pass |
| **TC-AUTH-02** | Login Staf/Guru dengan Kredensial Valid | Input email/username staf dan sandi benar (uji format Bcrypt & Base64 legacy). | HTTP 200 OK, profil peran ('guru'/'admin'/'super_admin') teridentifikasi dengan tepat. | Pass |
| **TC-AUTH-03** | Login dengan Sandi Salah | Input username valid dengan kata sandi acak/salah. | HTTP 422 Unprocessable Entity dengan pesan *"Kredensial yang Anda masukkan salah."* | Pass |
| **TC-AUTH-04** | Single-Session Kick (Akun Dibuka di 2 Browser) | 1. Siswa login di Browser A.<br>2. Siswa login dengan akun yang sama di Browser B.<br>3. Siswa di Browser A mengklik menu/jawaban. | Browser B berhasil masuk. Browser A menerima HTTP 401 (`SESSION_OVERWRITE`) dan otomatis dikeluarkan paksa. | Pass |
| **TC-AUTH-05** | Rate Limit Brute Force Login | Mengirim lebih dari 30 request login dalam waktu kurang dari 60 detik. | Sistem mengembalikan HTTP 429 Too Many Requests. | Pass |

### 2.2. Modul Bank Soal & Impor Dokumen (TC-SOAL)

| ID Uji | Skenario Pengujian | Langkah Pengujian / Input | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-SOAL-01** | Impor Soal dari Berkas Word (.docx) Valid | Guru mengunggah file `.docx` yang memuat format naskah soal, opsi A–E, dan kunci jawaban. | `DocxQuestionService` berhasil mengekstrak seluruh butir soal ke tabel `assessment_soal_pilgan`. | Pass |
| **TC-SOAL-02** | Impor Soal dengan Formula LaTeX | Mengunggah soal yang memuat formula matematika seperti `\frac{a}{b}` atau `\sqrt{x}`. | Formula tersimpan dengan benar dan dirender sempurna oleh KaTeX di layar pengerjaan siswa. | Pass |
| **TC-SOAL-03** | Generator 50 Soal Acak | Guru memilih mapel & jenjang lalu menekan "Generate 50 Soal Acak". | Terbentuk paket `assessment` baru berisi tepat 50 butir soal terkloning dari bank soal secara acak. | Pass |

### 2.3. Modul Pengerjaan Ujian & Autosave (TC-CBT)

| ID Uji | Skenario Pengujian | Langkah Pengujian / Input | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-CBT-01** | Mulai Ujian (Start Attempt) | Siswa mengklik "Mulai Ujian" dan memasukkan token yang cocok. | Record `transaksi` status 7 terbuat, record `assessment_jawaban_pilgan` status 'in_progress' terbentuk. | Pass |
| **TC-CBT-02** | Validasi Token Salah | Siswa memasukkan kode token yang salah saat memulai ujian. | Sistem menolak dengan notifikasi *"Token ujian tidak valid."* | Pass |
| **TC-CBT-03** | Real-Time Autosave Jawaban | Siswa mengklik opsi 'C' pada soal nomor 5. | Request `PATCH .../answers` merespon HTTP 200 OK (< 100ms), baris di `assessment_jawaban_pilgan_detail` ter-update. | Pass |
| **TC-CBT-04** | Ketahanan Gangguan Koneksi (Power Loss) | Siswa menjawab 10 soal, browser ditutup paksa, kemudian dibuka kembali. | Sesi pengerjaan dapat dilanjutkan (*resume*), 10 jawaban sebelumnya tetap terpilih utuh. | Pass |
| **TC-CBT-05** | Pengumpulan Ujian & Auto-Grading | Siswa mengklik "Kumpulkan Ujian" pada paket 50 soal. | Jawaban dicocokkan otomatis dengan kunci, skor dihitung akurat (0–100), status attempt diubah jadi 'submitted'. | Pass |

### 2.4. Modul Proctoring & Anti-Kecurangan (TC-PROC)

| ID Uji | Skenario Pengujian | Langkah Pengujian / Input | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-PROC-01** | Peringatan Keluar Mode Layar Penuh | Siswa menekan tombol ESC saat ujian berlangsung. | Muncul modal peringatan seketika, mewajibkan siswa kembali ke layar penuh agar lembar soal terlihat. | Pass |
| **TC-PROC-02** | Deteksi Pergantian Tab (Tab Switch) | Siswa menekan Alt+Tab atau membuka tab peramban baru. | Event `visibilitychange` mengirim log ke `/violations`, jumlah pelanggaran bertambah 1. | Pass |
| **TC-PROC-03** | Ambang Batas Auto-Diskualifikasi | Siswa berpindah jendela browser sebanyak 5 kali berturut-turut. | Pada pelanggaran ke-5, status sesi diubah menjadi 'disqualified', nilai diset 0, dan siswa dikeluarkan permanen. | Pass |
| **TC-PROC-04** | Pemblokiran Pintasan Keyboard & Klik Kanan | Siswa menekan Ctrl+C, Ctrl+V, F12, Ctrl+Shift+I, atau klik kanan. | Peristiwa dibatalkan (*preventDefault*), clipboard dan Developer Tools tidak dapat diakses. | Pass |

### 2.5. Modul Administrasi & Multi-Tenant (TC-ADM)

| ID Uji | Skenario Pengujian | Langkah Pengujian / Input | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-01** | Isolasi Data Antar-Instansi | Admin Instansi A mencoba mengakses data kelas atau siswa milik Instansi B via API. | Sistem mengembalikan HTTP 403 Forbidden dengan pesan *"Akses ditolak: Admin instansi tidak diizinkan..."* | Pass |
| **TC-ADM-02** | Pre-Flight Server Health Check | Super Admin membuka menu diagnostik server. | Tampil status koneksi basis data MySQL, nilai latensi query (ms), dan status cache secara akurat. | Pass |

---

## 3. Kriteria Keberatan & Kelulusan Pengujian (Pass/Fail Criteria)

- **Kriteria Lulus (Pass):** Seluruh kasus uji prioritas tinggi (Autentikasi, Single-Session, Autosave Jawaban, Auto-Grading, dan Auto-Diskualifikasi) wajib lulus 100% tanpa adanya data yang hilang (*Zero Data Loss*).
- **Kriteria Gagal (Fail):** Ditemukan insiden kegagalan autosave yang menyebabkan jawaban siswa tidak tersimpan di database, atau kegagalan isolasi data yang memungkinkan admin melihat data sekolah lain.
