# DOKUMEN ANALISIS AWAL SISTEM (MEETING PERSIAPAN & VALIDASI KLIEN)
**Proyek Detik detik Tryout:** Sistem CBT Ujian Online (Online Examination System)  
**Konteks Integrasi:** Basis Data Multi-Tenant Platform `sertidemi`  
**Tujuan Dokumen:** Bahan Pembahasan Meeting Awal (*Initial Client Alignment*), Validasi Flow Faktual, Pemetaan Gap, dan Klarifikasi Kebutuhan Bisnis.

---

# 1. PROJECT OVERVIEW

### 1.1. Nama Sistem
**Detik Detik Tryout (Online Examination System / Sertidemi CBT Engine)**

### 1.2. Deskripsi Singkat Sistem
Detik Detik Tryout adalah platform evaluasi akademik dan asesmen berbasis komputer (*Computer-Based Testing*) yang terintegrasi secara langsung dengan basis data `sertidemi`. Sistem ini dirancang untuk melayani kebutuhan ujian terstruktur lintas jenjang pendidikan (SD, SMP, SMA, SMK) dan multi-institusi (*multi-tenant*), memfasilitasi guru dalam manajemen bank soal dan penjadwalan ujian, serta menyediakan portal ujian daring bagi siswa yang dilengkapi proteksi anti-kecurangan (*proctoring*) dan penyimpanan jawaban otomatis (*real-time autosave*).

### 1.3. Tujuan Sistem
1. Menyediakan infrastruktur ujian daring terpusat yang aman, transparan, dan mampu mencegah kecurangan peserta ujian.
2. Mengintegrasikan proses asesmen akademik dengan struktur data organisasi, guru, dan siswa yang sudah ada pada platform `sertidemi`.
3. Mempermudah guru dalam memproduksi paket ujian (impor naskah soal Word `.docx`/Excel, maupun pembuatan paket acak 50 soal instan).
4. Menghasilkan rekapitulasi nilai dan analisis butir soal secara otomatis seketika ujian selesai dikumpulkan.

### 1.4. Masalah Bisnis yang Diselesaikan
- **Risiko Integritas & Kecurangan Ujian:** Siswa berganti jendela (*tab switching*), mencari jawaban di internet, berbagi akun (*account sharing*), atau menyalin teks soal.
- **Beban Kerja Guru dalam Entri Soal:** Proses input soal manual satu per satu yang memakan waktu lama diatasi melalui fitur ekstraksi naskah soal dari dokumen Microsoft Word (`.docx`) dan tabel spreadsheet.
- **Kerentanan Kehilangan Jawaban (*Data Loss*):** Kendala jaringan internet atau listrik padam saat ujian diatasi dengan mekanisme penyimpanan berkala (*autosave*) per detik ke basis data.
- **Isolasi Data Antar-Sekolah/Lembaga:** Kebutuhan pengelolaan data sekolah masing-masing tanpa terjadi percampuran data siswa, kelas, maupun soal antar-instansi.

### 1.5. Target Pengguna
1. **Super Administrator:** Pengelola pusat sistem dan penanggung jawab teknis platform lintas instansi.
2. **Admin Instansi / Sekolah:** Staf administrasi sekolah yang mengelola data lokal sekolah (guru, siswa, kelas, mapel).
3. **Guru / Pengajar:** Pendidik yang menyusun bank soal, menerbitkan paket ujian, membagikan token, dan mengunduh laporan nilai.
4. **Siswa / Peserta Didik:** Peserta yang mengikuti ujian secara daring sesuai jadwal dan kelasnya.

### 1.6. Ruang Lingkup Sistem (Scope)
- **Dalam Ruang Lingkup (In-Scope):**
  - Autentikasi dua pintu (Portal Staf `user_bo` dan Portal Siswa `user`) dengan *single-session locking*.
  - Manajemen master data instansi, jenjang pendidikan, kelas, mata pelajaran, dan penugasan pengajar.
  - Manajemen bank soal pilihan ganda (5 opsi A–E), dukungan rumus matematika (LaTeX/KaTeX), dan media gambar.
  - Impor naskah soal dari Word (`.docx`) dan CSV.
  - Pembuatan paket ujian, generator acak 50 butir soal, dan pengelompokan sesi ujian (*exam group*) dengan token.
  - Engine pelaksanaan ujian siswa (navigasi, penanda ragu-ragu, timer mundur, kalkulasi durasi efektif).
  - Mekanisme *Online Proctoring* (layar penuh wajib, deteksi pindah tab, batas diskualifikasi otomatis, blokir klik kanan & inspect element).
  - Penilaian otomatis (*auto-grading*) untuk soal pilihan ganda, rekap nilai, dan ekspor laporan hasil ujian.
- **Di Luar Ruang Lingkup / Belum Diimplementasikan (Out-of-Scope saat ini):**
  - ⚠ Pembayaran/transaksi berbayar langsung oleh siswa (meskipun ada tabel `transaksi`, sistem saat ini mengisinya secara bypass otomatis).
  - ⚠ Penilaian otomatis untuk soal esai berbasis kecerdasan buatan (hanya ada modul penilaian manual terpisah).

---

# 2. SYSTEM FLOW ANALYSIS

*Seluruh alur di bawah ini dirangkum murni berdasarkan penelusuran kode program aktif pada controller, route, middleware, dan antarmuka frontend.*

## 2.1. Alur Siswa (Student Journey)

```
[Halaman Login Siswa]
         │
         ▼
[Validasi Kredensial (tabel 'user')]
 ├─ Generate 'active_session_token' baru
 ├─ Terbitkan Sanctum Bearer Token
 └─ Kick sesi lama di perangkat lain (Single-Session Lock)
         │
         ▼
[Dashboard Siswa / Student Exams Page]
 ├─ Query API: GET /api/student/exams
 └─ Menampilkan daftar ujian yang cocok dengan 'idkelas' atau 'idkategori' siswa
         │
         ▼
[Pilih Ujian & Klik "Mulai Ujian"]
 ├─ Validasi Tanggal/Jam Sesi (start_time & end_time)
 ├─ Validasi Token Ujian (bila sesi membutuhkan token)
 └─ Hitung "Effective Duration" (penyesuaian durasi jika mendekati batas akhir sesi)
         │
         ▼
[Inisialisasi Sesi (POST /api/student/attempts/start)]
 ├─ Cek apakah attempt sudah pernah dibuat
 ├─ Jika belum: Buat record pendukung di tabel 'transaksi' (status = 7)
 └─ Buat record attempt di tabel 'assessment_jawaban_pilgan' (status: in_progress)
         │
         ▼
[Masuk Ruang Ujian / Exam Session Page]
 ├─ Wajib masuk Mode Layar Penuh (Strict Fullscreen Gatekeeper)
 ├─ Pasang proteksi browser (blokir Context Menu, Copy, Paste, F12 / Inspect)
 └─ Muat daftar soal dari API
         │
         ▼
[Pengerjaan Soal & Autosave]
 ├─ Siswa memilih opsi jawaban (A, B, C, D, atau E)
 ├─ Trigger API: PATCH /api/student/attempts/{attempt}/answers
 └─ Jawaban langsung tersimpan ke tabel 'assessment_jawaban_pilgan_detail'
         │
         ├────────────────── [Pelanggaran Proctoring Terdeteksi] ──────────────────┐
         │ (Keluar fullscreen / ganti tab / buka aplikasi lain)                   │
         │  ├─ Catat log via POST /api/student/attempts/{attempt}/violations       │
         │  ├─ Tampilkan peringatan visual                                        │
         │  └─ JIKA akumulasi pelanggaran >= 5 kali:                              │
         │       └─ STATUS DIUBAH: 'disqualified', nilai 0, siswa dikeluarkan! ───┘
         ▼
[Siswa Menekan "Kumpulkan Ujian" / Waktu Habis]
 ├─ Kirim POST /api/student/attempts/{attempt}/submit
 ├─ Backend mencocokkan setiap jawaban siswa dengan kunci jawaban soal
 ├─ Hitung nilai akhir: (Jumlah Benar / Total Soal) * 100
 ├─ Update tabel 'assessment_jawaban_pilgan': nilai tersimpan, komentar = 'submitted'
 └─ Keluar dari mode layar penuh secara otomatis
         │
         ▼
[Tampilan Hasil Akhir / Result Page]
 └─ Menampilkan perolehan nilai, jumlah jawaban benar/salah, dan status kelulusan (KKM)
```

## 2.2. Alur Guru (Teacher Journey)

```
[Login Guru (tabel 'user_bo')] ──► [Dashboard Guru]
         │
         ├──► [Kelola Bank Soal]
         │     ├─ Input manual soal + pilihan A-E + gambar + pembahasan
         │     ├─ Upload berkas Word (.docx) ──► Diekstraksi otomatis oleh DocxQuestionService
         │     └─ Upload berkas CSV / Excel
         │
         ├──► [Penyusunan Paket Ujian]
         │     ├─ Buat paket manual dari bank soal yang ada, ATAU
         │     └─ Gunakan Fitur: "Generate 50 Soal Acak" berdasarkan Jenjang & Mata Pelajaran
         │
         ├──► [Penjadwalan & Distribusi Ujian (Exam Group)]
         │     ├─ Tentukan Tanggal & Jam Mulai serta Batas Waktu Selesai
         │     ├─ Buat Token Ujian (Access Code)
         │     └─ Alokasikan ke kelas spesifik (class_ids) atau siswa tertentu
         │
         └──► [Monitoring & Laporan Hasil Ujian]
               ├─ Pantau siswa yang telah menyelesaikan ujian
               ├─ Koreksi soal esai (jika paket menyertakan soal esai)
               └─ Ekspor rekapitulasi nilai siswa ke format file laporan
```

## 2.3. Alur Administrator (Super Admin & Admin Instansi)

```
[Login Staf Admin (tabel 'user_bo')]
         │
         ├─────────────────────────────────────────┬─────────────────────────────────────────┐
         ▼                                         ▼                                         ▼
[SUPER ADMIN]                             [ADMIN INSTANSI / SEKOLAH]                [MONITORING SISTEM]
 ├─ Kelola Seluruh Instansi                ├─ Dibatasi khusus instansinya            ├─ Pre-Flight Health Check
 │  (tabel 'kategori_user_bo')             │  (filter 'idkategori')                  │  (Cek koneksi & latensi DB/Cache)
 ├─ Buat Akun Admin Sekolah                ├─ Kelola Kelas (nama kelas bebas,        └─ Live Proctoring Overview
 ├─ Kelola Master Jenjang                  │  kapasitas, wali kelas)                    (Jumlah ujian aktif, peserta online,
 │  (SD, SMP, SMA, SMK)                    ├─ Kelola Mapel & Guru Pengampu              dan log pelanggaran)
 └─ Akses metrik platform global           ├─ Kelola Siswa & Impor Excel Siswa
                                           └─ Pantau kelancaran ujian lokal
```

---

# 3. USER ROLE MAPPING

| Role Bisnis | Sumber Data Database | Identifikasi di Sistem | Hak Akses Faktual yang Ditemukan di Code | Status Validasi |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Tabel `user_bo` | `status_admin = '1'` ATAU `role_type = 'super_admin'` | - Akses tanpa batas ke semua instansi (`kategori_user_bo`)<br>- CRUD Akun Admin Sekolah, Guru, Siswa secara global<br>- CRUD Master Jenjang (`master_jenjang`)<br>- Akses Pre-Flight Check dan monitoring sistem server | **Terkonfirmasi di Code** |
| **Admin Instansi / Sekolah** | Tabel `user_bo` | `role_type = 'admin_sekolah'` (Didukung fallback username legacy) | - Terisolasi ketat pada `idkategori` instansinya<br>- CRUD Master Kelas (`master_kelas`) & alokasi siswa<br>- CRUD Mata Pelajaran (`master_mata_pelajaran`) & penugasan guru<br>- CRUD & impor data siswa (`user`) instansi<br>- CRUD guru instansi | **Terkonfirmasi di Code** |
| **Guru / Pengajar** | Tabel `user_bo` | `role_type = 'guru'` ATAU `status_admin = '2'` | - Kelola bank soal (`assessment_soal_pilgan`)<br>- Impor soal Word `.docx` dan CSV<br>- Buat paket ujian (`assessment`) & generate acak 50 soal<br>- Atur jadwal ujian & token (`exam_groups`)<br>- Akses rekap nilai dan ekspor hasil siswa | **Terkonfirmasi di Code** |
| **Siswa** | Tabel `user` | Kredensial NISN / Email / Telepon (`role = 'siswa'`) | - Akses daftar ujian kelas/instansinya<br>- Memulai ujian menggunakan token<br>- Pengerjaan soal dengan autosave jawaban<br>- Melihat skor hasil ujian mandiri | **Terkonfirmasi di Code** |
| *Role Pengawas Khusus* | - | Tidak ada field/tabel terpisah | Fungsi pengawasan saat ini menyatu pada menu Live Monitoring milik Admin / Guru | ⚠ **PERLU KONFIRMASI CLIENT** |

---

# 4. FEATURE LIST

| Modul | Fitur Faktual | Status Implementasi | Catatan Analisis Teknis |
| :--- | :--- | :--- | :--- |
| **Autentikasi** | Login Siswa (NISN / Email / No. HP) | **Sudah Ada** | Membaca tabel `user`, validasi password hash/plain |
| **Autentikasi** | Login Staf & Guru (Username / Email) | **Sudah Ada** | Membaca tabel `user_bo`, mendukung multi-enkripsi legacy |
| **Autentikasi** | Single-Session Token Lock | **Sudah Ada** | Mencegah login ganda dengan token `active_session_token` |
| **Master Data** | Multi-Instansi / Multi-Tenant | **Sudah Ada** | Menggunakan tabel `kategori_user_bo` |
| **Master Data** | Master Jenjang Pendidikan | **Sudah Ada** | Tabel `master_jenjang` (SD, SMP, SMA, SMK) |
| **Master Data** | Master Kelas (Nama Bebas) | **Sudah Ada** | Tabel `master_kelas`, ada relasi ke wali kelas (`user_bo`) |
| **Master Data** | Master Mata Pelajaran & KKM | **Sudah Ada** | Tabel `master_mata_pelajaran`, KKM standar 75.00 |
| **Master Data** | Penugasan Guru ke Mata Pelajaran | **Sudah Ada** | Tabel `guru_mata_pelajaran` |
| **Master Data** | Impor Siswa Masal (Excel) | **Sudah Ada** | Endpoint `POST /admin/students/import` |
| **Bank Soal** | Bank Soal Pilihan Ganda (A-E) | **Sudah Ada** | Tabel `assessment_soal_pilgan` |
| **Bank Soal** | Notasi Matematika / Sains (LaTeX) | **Sudah Ada** | Menggunakan library KaTeX pada frontend |
| **Bank Soal** | Impor Soal Microsoft Word (`.docx`) | **Sudah Ada** | Diproses via `DocxQuestionService` |
| **Bank Soal** | Impor Soal Format Spreadsheet (CSV) | **Sudah Ada** | Disediakan format template unduhan |
| **Bank Soal** | Format Soal Kompleks (Esai, Menjodohkan, B/S) | **Sebagian Ada** | Skema tabel pendukung ada, namun antarmuka utama CBT saat ini fokus pada pilihan ganda |
| **Ujian** | Paket Ujian Mandiri | **Sudah Ada** | Tabel `assessment` |
| **Ujian** | Generator Paket 50 Soal Acak | **Sudah Ada** | Mengambil 50 soal acak dari bank soal sesuai jenjang & mapel |
| **Ujian** | Sesi Kelompok & Token Ujian | **Sudah Ada** | Tabel `exam_groups` (jadwal, kuota, token) |
| **Ujian** | Durasi Efektif (Late Arrival Calculation) | **Sudah Ada** | Menyesuaikan sisa durasi jika waktu sesi hampir habis |
| **CBT Engine** | Antarmuka Ujian Siswa & Navigasi | **Sudah Ada** | Nomor soal, navigasi ragu-ragu, timer countdown |
| **CBT Engine** | Real-time Autosave Jawaban | **Sudah Ada** | Disimpan per detik ke `assessment_jawaban_pilgan_detail` |
| **Anti-Cheat** | Strict Fullscreen Gatekeeper | **Sudah Ada** | Memaksa layar penuh selama ujian berlangsung |
| **Anti-Cheat** | Tab / Window Switch Detector | **Sudah Ada** | Mendeteksi perpindahan tab atau jendela aplikasi |
| **Anti-Cheat** | Auto-Diskualifikasi Siswa | **Sudah Ada** | Otomatis mendiskualifikasi jika pelanggaran >= 5 kali |
| **Anti-Cheat** | Anti-Copy, Anti-Inspect, Anti-Klik Kanan | **Sudah Ada** | Diblokir pada event listener browser |
| **Penilaian** | Penilaian Otomatis Pilgan | **Sudah Ada** | Skor langsung dihitung saat submit |
| **Laporan** | Rekap Hasil Ujian & Ekspor Data | **Sudah Ada** | Tabel hasil dan ekspor laporan rekapitulasi |
| **Sertifikasi** | Penerbitan Sertifikat Ujian Otomatis | **Belum Ditemukan di Flow Siswa** | Tabel `assessment_sertifikat` ada di DB, tapi belum ada trigger penerbitan di flow selesai ujian siswa |

---

# 5. DATABASE BUSINESS ANALYSIS

Berikut adalah analisis terhadap tabel-tabel aktif pada database `sertidemi` berdasarkan keterlibatan proses bisnisnya:

```
┌───────────────────────┐             ┌─────────────────────────┐
│   kategori_user_bo    │◄────────────┤         user_bo         │
│ (Instansi / Sekolah)  │             │   (Admin / Guru / Staf) │
└──────────┬────────────┘             └────────────┬────────────┘
           │                                       │
           │                                       ▼
           │                          ┌─────────────────────────┐
           ├─────────────────────────►│       master_kelas      │
           │                          └────────────┬────────────┘
           │                                       │
           ▼                                       ▼
┌───────────────────────┐             ┌─────────────────────────┐
│         user          ├────────────►│       siswa_kelas       │
│    (Data Siswa)       │             │   (Alokasi Kelas Siswa) │
└──────────┬────────────┘             └─────────────────────────┘
           │
           │ (Mulai Ujian)
           ▼
┌───────────────────────┐             ┌─────────────────────────┐
│       transaksi       │◄────────────┤       assessment        │
│ (Bypass Billing CBT)  │             │  (Paket Ujian / TryOut) │
└──────────┬────────────┘             └────────────┬────────────┘
           │                                       │
           ▼                                       ▼
┌─────────────────────────────────┐   ┌─────────────────────────┐
│    assessment_jawaban_pilgan    │   │ assessment_soal_pilgan  │
│  (Sesi Pengerjaan / Attempt)    │   │ (Butir Soal & Kunci A-E)│
└────────────────┬────────────────┘   └────────────┬────────────┘
                 │                                 │
                 ▼                                 ▼
┌───────────────────────────────────────────────────────────────┐
│               assessment_jawaban_pilgan_detail                │
│         (Lembar Jawaban Siswa per Butir Soal / Autosave)      │
└───────────────────────────────────────────────────────────────┘
```

| Nama Tabel | Peran & Fungsi Bisnis | Hubungan / Relasi Antar Tabel | Role yang Menggunakan | Kemungkinan Alur Bisnis |
| :--- | :--- | :--- | :--- | :--- |
| **`kategori_user_bo`** | Menyimpan profil Instansi / Lembaga / Sekolah mitra penyelenggara ujian. | Berelasi ke `user_bo.idkategori`, `master_kelas.idkategori`, `user.idkategori`. | Super Admin | Dasar pemisahan data (*multi-tenancy*). Setiap sekolah hanya boleh melihat datanya sendiri. |
| **`user_bo`** | Menyimpan akun staf internal: Super Admin, Admin Sekolah, dan Guru. | Berelasi ke `kategori_user_bo`. Relasi wali kelas ke `master_kelas`. | Super Admin, Admin Sekolah, Guru | Akun pembuat materi, pembuat soal, dan pengawas ujian. |
| **`user`** | Menyimpan identitas siswa / peserta didik. | Berelasi ke `master_kelas` (kelas aktif), `kategori_user_bo`, dan `siswa_kelas`. | Siswa, Admin Sekolah | Akun peserta yang berhak login ke portal ujian. |
| **`master_jenjang`** | Klasifikasi tingkat pendidikan (SD, SMP, SMA, SMK). | Dihubungkan ke `master_kelas`, `master_mata_pelajaran`, dan `assessment`. | Super Admin | Standarisasi kurikulum dan penyaringan bank soal berdasarkan tingkatan. |
| **`master_kelas`** | Pendataan rombongan belajar / ruang kelas. | Terhubung ke `master_jenjang`, `user_bo` (wali kelas), dan `kategori_user_bo`. | Admin Sekolah, Guru | Sasaran penugasan ujian dan pengelompokan siswa. |
| **`master_mata_pelajaran`** | Katalog mata pelajaran beserta batas nilai KKM. | Terhubung ke `master_jenjang` dan `kategori_user_bo`. | Admin Sekolah, Guru | Pengelompokan butir soal dan penentuan kelulusan ujian. |
| **`guru_mata_pelajaran`** | Pemetaan hak mengajar guru terhadap mapel dan kelas spesifik. | Menghubungkan `user_bo`, `master_mata_pelajaran`, dan `master_kelas`. | Admin Sekolah | Batasan agar guru hanya bisa membuat soal pada mapel yang diampunya. |
| **`siswa_kelas`** | Riwayat penempatan kelas siswa per tahun ajaran. | Menghubungkan `user` dengan `master_kelas`. | Admin Sekolah | Pencatatan riwayat kenaikan kelas atau mutasi siswa. |
| **`assessment`** | Data induk paket ujian / tryout (durasi, rentang tanggal, bobot). | Terhubung ke `master_mapel`, `master_jenjang`, `master_kelas`, `user_bo`. | Guru, Admin, Siswa | Menjadi entitas utama ujian yang diterbitkan untuk siswa. |
| **`assessment_soal_pilgan`** | Butir-butir soal pilihan ganda (teks, opsi A-E, kunci, pembahasan). | Terhubung ke paket induk `assessment` dan master mapel/jenjang. | Guru, Siswa (Read-only) | Bank soal dan materi ujian yang dimuat ke layar siswa. |
| **`exam_groups`** | Manajemen sesi pelaksanaan ujian (token, waktu sesi, filter kelas). | Berelasi ke `assessment.idassessment`. | Guru, Siswa | Mengatur teknis pelaksanaan: sesi pagi/siang, pembagian token rahasia per kelas. |
| **`transaksi`** | Tabel sistem transaksi bawaan Sertidemi. | Terhubung sebagai referensi integritas bagi `assessment_jawaban_pilgan`. | Sistem (Internal Engine) | Memenuhi syarat *foreign key* legacy agar pengerjaan siswa tercatat sah. |
| **`assessment_jawaban_pilgan`** | Lembar pengerjaan induk siswa (*Exam Attempt*). | Berelasi ke `assessment`, `user`, dan `transaksi`. | Siswa, Guru, Admin | Mencatat status ujian siswa (in_progress / submitted), lama pengerjaan, dan total skor. |
| **`assessment_jawaban_pilgan_detail`** | Rekaman setiap butir opsi yang dipilih oleh siswa (*Autosave Engine*). | Berelasi ke `assessment_jawaban_pilgan` dan `assessment_soal_pilgan`. | Siswa (Write), Guru (Review) | Tempat penyimpanan riwayat jawaban siswa per butir soal secara real-time. |
| **`assessment_sertifikat`** | Penyimpanan sertifikat kelulusan siswa. | Berelasi ke `assessment` dan `user`. | ⚠ **Perlu Konfirmasi** | Skema sertifikat tersedia di database, namun otomatisasi cetak/unduh belum dihubungkan ke flow CBT. |

---

# 6. QUESTION LIST FOR INITIAL MEETING

Berikut adalah daftar pertanyaan prioritas yang **WAJIB** dikonfirmasikan kepada pihak klien dalam meeting awal guna memastikan arah pengembangan tidak meleset:

### A. Business Flow & Alur Operasional
1. **Penerbitan Ujian:** Apakah seluruh guru bebas menerbitkan paket ujian langsung ke siswa, ataukah harus ada proses persetujuan (*approval*) dari Kepala Sekolah / Admin Instansi terlebih dahulu?
2. **Kompensasi Gangguan (Resume Exam):** Jika siswa mengalami kendala teknis (mati lampu, koneksi internet terputus, atau perangkat rusak), apakah guru berhak mereset sesi siswa, atau siswa diizinkan langsung melanjutkan sisa waktu ujian dari perangkat lain?
3. **Penerbitan Sertifikat:** Pada database terdapat tabel `assessment_sertifikat`. Apakah sistem ujian ini diwajibkan menerbitkan sertifikat digital otomatis setelah siswa mencapai batas KKM, ataukah cukup rekap nilai biasa?

### B. User Role & Wewenang
4. **Pemisahan Peran Admin:** Apa batasan wewenang definitif antara **Admin Pusat (Super Admin)** dan **Admin Sekolah (Admin Instansi)**? Apakah Admin Sekolah berhak mengakses bank soal milik sekolah lain?
5. **Akses Guru Antar-Kelas:** Apakah guru mata pelajaran tertentu diizinkan melihat data dan nilai kelas yang bukan tanggung jawab mengajarnya?
6. **Peran Pengawas Ujian:** Apakah dibutuhkan akun khusus dengan peran **Pengawas Ujian** (yang hanya bisa melihat Live Monitoring dan mereset token, tanpa hak mengedit soal)?

### C. Mekanisme Ujian (Exam Process & Anti-Cheat)
7. **Pengacakan Soal & Jawaban:** Saat ini generator 50 soal mengambil soal acak dari bank soal. Apakah urutan soal dan urutan pilihan jawaban (A–E) di layar masing-masing siswa **wajib diacak (*shuffle*)** antar-peserta?
8. **Toleransi Pelanggaran (*Tab Switch*):** Di kode program, batas keluar fullscreen/pindah tab diatur sebanyak **5 kali** sebelum diskualifikasi permanen. Apakah nilai 5 kali ini sudah sesuai standar klien, atau harus bisa disesuaikan sendiri oleh guru pada setiap ujian?
9. **Ujian Susulan & Remidi:** Apakah sistem perlu mendukung mekanisme ujian perbaikan (remidial) untuk siswa yang nilainya di bawah KKM tanpa harus membuat paket soal baru?

### D. Struktur Basis Data & Multi-Tenancy
10. **Kondisi Basis Data Sertidemi:** Apakah struktur tabel database `sertidemi` saat ini sudah berstatus *final/freeze*, atau masih ada potensi perubahan skema dari tim backend inti Sertidemi?
11. **Retensi & Arsip Data Jawaban:** Setiap klik jawaban siswa disimpan ke tabel `assessment_jawaban_pilgan_detail`. Untuk ribuan siswa serentak, tabel ini akan bertambah sangat cepat. Apakah ada kebijakan pengarsipan/penghapusan data jawaban setelah tahun ajaran selesai?

### E. Format Pelaporan (Reporting)
12. **Format Ekspor Nilai:** Format rekapitulasi nilai seperti apa yang dibutuhkan sekolah (apakah format Excel spreadsheet umum, format nilai rapor Kurikulum Merdeka, atau dokumen PDF berita acara ujian)?
13. **Transparansi Hasil ke Siswa:** Apakah siswa diizinkan langsung melihat pembahasan dan kunci jawaban setelah menekan tombol submit, ataukah hasil harus disembunyikan sampai pengumuman resmi dari guru?

---

# 7. RISK AND GAP ANALYSIS

| No | Kategori Temuan | Kondisi Faktual pada Source Code / Database | Dampak terhadap Bisnis & Sistem | Rekomendasi / Tindak Lanjut |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Arsitektur Skema Ganda (Dual Schema Gap)** | Terdapat 2 kelompok migrasi: kelompok migrasi `exams` & `question_banks` (standar baru), dan kelompok migrasi yang aktif dipakai yaitu tabel `assessment` & `assessment_soal_pilgan` (tabel bawaan sertidemi). | Kebingungan arsitektur data; kode aplikasi yang berjalan sekarang terikat pada tabel `assessment` bawaan Sertidemi. | Tetap gunakan skema `assessment` sesuai kode aktif, dan jadwalkan pembersihan file migrasi yang tidak terpakai setelah konfirmasi klien. |
| **2** | **Keterikatan Tabel Transaksi (Legacy Dependency)** | Setiap siswa memulai ujian (`attempts/start`), kode program menyisipkan data transaksi ke tabel `transaksi` (`status_transaksi = '7'`, `jenis_transaksi = 'assessment'`). | Jika skema tabel `transaksi` diubah oleh modul lain, alur mulai ujian siswa dapat mengalami kegagalan (*crash*). | ⚠ Konfirmasikan ke tim arsitek database apakah relasi ke tabel `transaksi` ini masih menjadi keharusan bisnis. |
| **3** | **Enkripsi Password Legacy (Security Risk)** | Model `UserBo` masih mendukung verifikasi password dekode 5x Base64 dan perbandingan teks polos di samping Bcrypt. | Standar keamanan data rentan jika akun-akun lama belum di-hash ulang menggunakan algoritma enkripsi modern. | Lakukan program migrasi sandi bertahap (*auto-rehash to Bcrypt*) setiap kali staf lama berhasil login. |
| **4** | **Fitur Soal Esai & Kompleks Belum Terhubung Penuh** | Tabel `assessment_soal_essay` dan `assessment_jawaban_essay` ada di database, namun portal ujian siswa dan autosave saat ini difokuskan pada pilihan ganda. | Ekspektasi klien jika mengira sistem sudah siap menggelar ujian esai dan menjodohkan secara penuh di antarmuka web. | Jelaskan batasan fase rilis saat ini kepada klien; posisikan soal esai sebagai fase pengembangan lanjutan (*Phase 2*). |
| **5** | **Shared Database Load (Performance Risk)** | Database `sertidemi` menampung modul aplikasi lain (buku, kursus, transaksi, event). | Beban query *burst* saat ratusan siswa serentak mengirim autosave jawaban per detik berpotensi memperlambat modul lain di database yang sama. | Pastikan indeks database pada kolom `idassessment`, `iduser`, dan `idassessment_jawaban_pilgan` telah optimal, serta terapkan *connection pooling*. |

---

# 8. INTERNAL REVIEW (SEBELUM FINALISASI KE KLIEN)

Sebagai bentuk kendali mutu analisis sebelum dokumen ini dibawa ke forum meeting dengan klien, berikut adalah rangkuman validasi internal:

### 1. Informasi yang 100% Faktual Ditemukan dari Source Code & Database
- Mekanisme login ganda: Portal Staf `user_bo` dan Portal Siswa `user`.
- Validasi keamanan sesi: Token `active_session_token` dengan header `X-Session-Token`.
- Pengelompokan multi-sekolah menggunakan kolom `idkategori` pada `kategori_user_bo`.
- Master data aktif: `master_jenjang`, `master_kelas`, `master_mata_pelajaran`, `guru_mata_pelajaran`, `siswa_kelas`.
- Pengelolaan ujian: Tabel `assessment`, `assessment_soal_pilgan`, `exam_groups`, `assessment_jawaban_pilgan`, `assessment_jawaban_pilgan_detail`.
- Fitur anti-kecurangan aktif: Layar penuh wajib, deteksi ganti tab via API `/violations`, auto-diskualifikasi pada ambang 5 kali, blokir pintasan keyboard dan klik kanan.
- Fitur impor: Ekstraksi naskah soal Word `.docx` via `DocxQuestionService` dan format CSV.

### 2. Informasi yang Masih Menjadi Asumsi (Belum Ada Bukti di Kode)
- Asumsi bahwa setiap sekolah memiliki kurikulum dan kalender ujian yang sepenuhnya independen.
- Asumsi bahwa batas toleransi 5 kali pelanggaran proctoring dapat diterima oleh seluruh guru tanpa protes dari siswa.
- Asumsi bahwa siswa tidak memerlukan sertifikat kelulusan digital instan di akhir ujian.

### 3. Informasi yang Wajib Dikonfirmasi Klien (*Client Action Items*)
- Apakah hak akses Admin Sekolah perlu dibatasi agar tidak bisa melihat bank soal sekolah lain yang berstatus umum.
- Kebutuhan modul ujian esai: apakah harus masuk di rilis pertama ini atau masuk di rilis berikutnya.
- Kebijakan jika koneksi internet siswa mati mendadak saat ujian: apakah timer terus berjalan atau dibekukan.
- Kebijakan penerbitan sertifikat ujian dari tabel `assessment_sertifikat`.

### 4. Perubahan yang Disarankan (*System Analyst Recommendations*)
- **Rekomendasi 1 (Peningkatan Keamanan):** Lakukan auto-hash password ke Bcrypt pada login pertama untuk akun lama yang masih berformat Base64.
- **Rekomendasi 2 (Parameter Dinamis Proctoring):** Pindahkan nilai ambang batas toleransi ganti tab (saat ini hardcoded = 5) menjadi kolom pengaturan pada paket ujian agar guru dapat menentukan toleransi sendiri (misal: 3 kali untuk ujian ketat, 10 kali untuk latihan soal).
- **Rekomendasi 3 (Indeks Performa Database):** Pastikan tabel `assessment_jawaban_pilgan_detail` memiliki composite index pada `(idassessment_jawaban_pilgan, idassessment_soal_pilgan)` untuk menjamin kestabilan respon autosave saat beban puncak.
