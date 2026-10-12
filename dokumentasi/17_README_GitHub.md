# 🎓 Sistem CBT Ujian Online (Online Examination System)
> **Platform Computer-Based Testing (CBT) Modern, Skalabel, dan Berintegritas Tinggi**  
> *Terintegrasi Langsung dengan Ekosistem Basis Data Multi-Tenant MySQL `sertidemi`*

---

## 🌟 Ikhtisar Proyek (Project Overview)

**Sistem CBT Ujian Online** adalah platform evaluasi akademik berbasis komputer modern yang dibangun dengan arsitektur terpisah (*Decoupled Architecture*), menggabungkan ketangguhan **Laravel 12 RESTful API** di sisi backend dan kecepatan **React 19 + TypeScript + Vite + Tailwind CSS v4** di sisi frontend.

Sistem ini dirancang khusus untuk memenuhi standar ujian berskala institusi (SD, SMP, SMA, SMK) dengan fokus utama pada **integritas akademik tanpa kompromi**, fleksibilitas pembuatan bank soal multi-format, serta stabilitas penyimpanan jawaban saat menangani ribuan siswa secara serentak.

---

## 🚀 Fitur Unggulan Sistem (Key Highlights)

### 1. 🛡️ Keamanan & Anti-Cheat Canggih (Online Proctoring Engine)
- **Single-Session Token Locking:** Mencegah satu akun siswa digunakan bersamaan di lebih dari satu perangkat/browser melalui validasi header `X-Session-Token` dan `active_session_token`.
- **Strict Fullscreen Gatekeeper:** Mewajibkan mode layar penuh selama ujian berlangsung; lembar soal otomatis terkunci jika siswa keluar dari layar penuh.
- **Tab & Window Switch Tracking:** Mendeteksi perpindahan tab browser, membuka aplikasi lain, atau kehilangan fokus jendela (Alt+Tab) dengan sistem peringatan bertingkat.
- **Auto-Disqualification Threshold:** Siswa yang mencapai batas maksimal 5 kali pelanggaran langsung didiskualifikasi secara otomatis dengan nilai nol permanen.
- **Anti-Copy & Anti-Inspect Protection:** Memblokir fungsi klik kanan (*context menu*), kombinasi tombol pintas salin/tempel (Ctrl+C, Ctrl+V), melihat source code (Ctrl+U), dan Developer Tools (F12, Ctrl+Shift+I).

### 2. 📝 Manajemen Bank Soal & Multi-Format
- **Dukungan 5 Opsi Pilihan Ganda (A–E):** Dilengkapi teks pertanyaan, gambar pendukung pada soal maupun opsi jawaban, kunci jawaban, dan pembahasan.
- **Ekstraksi Dokumen Microsoft Word (.docx):** Guru dapat mengunggah naskah soal langsung dari file Word standar; sistem secara otomatis membedah butir pertanyaan, opsi A–E, dan kunci jawaban via `DocxQuestionService`.
- **Impor Spreadsheet (CSV / Excel):** Fasilitas impor data butir soal dan data siswa secara massal.
- **Dukungan Formula Matematika & Sains:** Render rumus presisi tinggi menggunakan notasi LaTeX berbasis **KaTeX**.
- **Generator 50 Soal Acak (Randomizer):** Menghasilkan paket ujian instan berisi 50 butir soal acak dari bank soal sesuai jenjang dan mata pelajaran terpilih.

### 3. 👥 Manajemen Multi-Tenant & Hierarki Pengguna
- **👑 Super Admin:** Pengelolaan global lintas instansi (`kategori_user_bo`), pembuatan akun admin sekolah, master jenjang, serta *Pre-Flight System Health Check*.
- **🏢 Admin Instansi / Sekolah:** Dibatasi ketat pada instansinya (`idkategori`); mengelola master kelas, mata pelajaran, penugasan guru pengampu, dan pendataan siswa.
- **👨‍🏫 Guru / Pengajar:** Penyusunan bank soal, pembuatan paket ujian, penjadwalan sesi kelas dengan token akses rahasia, serta analisis rekapitulasi nilai.
- **👨‍🎓 Siswa / Peserta:** Portal ujian interaktif dengan *real-time autosave* per detik ke database, penanda ragu-ragu, timer countdown, dan kalkulasi skor otomatis.

---

## 🛠️ Tech Stack & Arsitektur

| Komponen | Teknologi yang Digunakan |
| :--- | :--- |
| **Backend Framework** | Laravel 12.x (PHP 8.2+) |
| **API Authentication** | Laravel Sanctum (Token-Based Stateless Auth) |
| **Database Engine** | MySQL Server / MariaDB (Database Target: `sertidemi`, Laragon) |
| **Database ORM** | Eloquent ORM (Mendukung Primary Key String / Timestamp Non-Increment) |
| **Frontend Framework** | React 19.x SPA (Single Page Application) |
| **Language & Typings** | TypeScript (~6.0) |
| **Bundler & Build Tool** | Vite 8.x |
| **Styling & Design** | Tailwind CSS v4 (`@tailwindcss/vite`) |
| **Server State Cache** | TanStack React Query v5 |
| **Client Routing** | React Router DOM v7 (Route Guards per Role) |
| **Formula Engine** | KaTeX (`katex`, `@types/katex`) |
| **Iconography** | Lucide React |

---

## ⚡ Panduan Instalasi & Menjalankan Lokal

### 1. Prasyarat Sistem
- PHP `>= 8.2` (dengan ekstensi aktif: `zip`, `xml`, `pdo`, `pdo_mysql`, `mbstring`, `curl`, `fileinfo`)
- Node.js `>= 18.x` & npm
- Composer `>= 2.5.x`
- MySQL Server (Laragon aktif di port 3306)

---

### 2. Setup Backend (Laravel 12 API)
```bash
# Masuk ke direktori backend
cd backend

# Pasang dependensi PHP
composer install

# Siapkan konfigurasi .env
cp .env.example .env

# Generate Application Encryption Key
php artisan key:generate

# Konfigurasikan koneksi database di file .env:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=sertidemi
# DB_USERNAME=root
# DB_PASSWORD=

# Jalankan migrasi tabel CBT tambahan
php artisan migrate

# Hubungkan symlink storage publik
php artisan storage:link

# Jalankan server backend lokal
php artisan serve --port=8000
```
*Backend API aktif di: `http://127.0.0.1:8000`*

---

### 3. Setup Frontend (React 19 + Vite)
```bash
# Masuk ke direktori frontend
cd frontend

# Pasang dependensi pustaka Node.js
npm install

# Jalankan server pengembangan Vite
npm run dev
```
*Frontend client aktif di: `http://localhost:5173`*

---

## 📁 Struktur Direktori Repositori

```
Sistem-Ujian-Online/
├── backend/               # Core Engine API (Laravel 12)
│   ├── app/Http/Controllers/Api/  # Admin, Auth, Proctoring, Student, Teacher
│   ├── app/Models/                # 28 Eloquent Models (Assessment, UserBo, User, dll)
│   ├── app/Services/              # DocxQuestionService & AutoGradingService
│   ├── database/migrations/       # 28 Skrip Migrasi Skema CBT
│   └── routes/api.php             # Seluruh Definisi Endpoint REST API
├── frontend/              # User Interface Client (React 19 + TypeScript)
│   ├── src/features/admin/        # Halaman Administrasi Sekolah & Super Admin
│   ├── src/features/teacher/      # Halaman Bank Soal, Paket Ujian, Nilai
│   ├── src/features/student/      # Halaman Ujian Siswa (ExamSessionPage)
│   ├── src/features/auth/         # Halaman Login Dual-Pintu
│   └── src/routes/guards.tsx      # Proteksi Hak Akses & Role Guard
└── dokumentasi/           # 17 Seri Dokumen Rekayasa Perangkat Lunak Lengkap
```

---

## 📚 Seri Dokumentasi Lengkap (Folder `dokumentasi/`)

Proyek ini telah dilengkapi dengan 17 seri dokumen rekayasa perangkat lunak standar industri:
1. `01_Project_Overview.md` - Gambaran umum sistem dan ruang lingkup integrasi Sertidemi.
2. `02_Software_Requirement_Specification_SRS.md` - Spesifikasi kebutuhan perangkat lunak (SRS).
3. `03_User_Requirement.md` - Pemetaan kebutuhan pengguna berdasarkan peran nyata.
4. `04_Functional_Requirement.md` - Rincian kebutuhan fungsional (FR) dan aturan bisnis.
5. `05_Non_Functional_Requirement.md` - Standar kualitas, keamanan, kinerja, dan konkurensi.
6. `06_Use_Case_Diagram.md` - Diagram Use Case dan spesifikasi alur use case.
7. `07_Activity_Diagram.md` - Diagram aktivitas autentikasi, pengerjaan, autosave, dan proctoring.
8. `08_ERD_Documentation.md` - Diagram hubungan entitas (ERD) skema database `sertidemi`.
9. `09_Database_Dictionary.md` - Kamus data lengkap 15 tabel utama basis data.
10. `10_API_Documentation.md` - Referensi endpoint RESTful API, request body, dan respon JSON.
11. `11_Folder_Structure_Documentation.md` - Dokumentasi struktur folder backend dan frontend.
12. `12_Software_Architecture.md` - Arsitektur software, diagram tier, dan pipeline autosave.
13. `13_Sequence_Diagram.md` - Sequence diagram interaksi objek (Login, Start, Autosave, Submit).
14. `14_Testing_Plan.md` - Rencana pengujian, matriks kasus uji (Test Cases), dan kriteria kelulusan.
15. `15_Deployment_Guide.md` - Panduan instalasi lokal Laragon dan konfigurasi Nginx produksi.
16. `16_User_Manual.md` - Buku panduan operasional langkah demi langkah untuk seluruh aktor.
17. `17_README_GitHub.md` - Berkas ringkasan proyek GitHub ini.

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 **Sistem CBT Ujian Online**. Dikembangkan untuk standardisasi evaluasi akademik dan Computer-Based Testing institusi pendidikan terintegrasi platform Sertidemi.
