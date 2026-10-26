# 🎓 Sistem CBT Ujian Online (Online Examination System)

Sistem Computer-Based Testing (CBT) modern, responsif, dan aman berbasis **Laravel 12.66 (RESTful API)** dan **React 19.2 (Vite 8 + Tailwind CSS v4 Engine)**. Dirancang untuk skala multi-instansi, dilengkapi sistem pengawasan anti-cheat ketat, manajemen bank soal, generator 50 butir soal acak, penilaian instan, live proctoring, serta antarmuka modern dengan dukungan tema gelap (*Dark Mode*) dan sidebar responsif yang persisten.

---

## 🛠️ Tech Stack & Versi Faktual

Seluruh versi di bawah ini diambil secara langsung dan faktual dari file kunci dependensi (`composer.lock` & `package-lock.json`):

| Lapisan / Komponen | Teknologi | Versi Terkunci (Source Code) | Keterangan |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | [Laravel](https://laravel.com) | **v12.66.0** | RESTful API, Single Session Gatekeeper |
| **Backend Language** | PHP | **8.2.34** (CLI) / `^8.2` | Runtime Backend |
| **API Authentication** | Laravel Sanctum | **v4.3.3** | Stateless Bearer Tokens |
| **Role & Permission** | Spatie Laravel Permission | **6.25.0** | Multi-Role Authorization & Guards |
| **Word Generator** | PHPOffice / PHPWord | **1.4.0** | Template generator dokumen naskah soal |
| **Database Server** | MySQL (Laragon) | **10.4.x / 8.0.x** | Database `sertidemi` (Host: 127.0.0.1:3306) |
| **Frontend Framework** | [React](https://react.dev) & React DOM | **19.2.8** | Modern Functional Component SPA |
| **Build Tool & Bundler** | [Vite](https://vitejs.dev) | **8.2.1** | Lightning-fast HMR Bundler |
| **Styling Engine** | [Tailwind CSS](https://tailwindcss.com) | **4.3.3** | Tailwind CSS v4 Engine via `@tailwindcss/vite` |
| **Routing** | React Router DOM | **7.18.2** | Declarative Client-Side Routing |
| **Server State Sync** | TanStack React Query | **5.101.4** | Asynchronous Query & Cache Management |
| **HTTP Client** | Axios | **1.19.0** | Interceptor Token & Auto Session Expire |
| **Icons Library** | Lucide React | **1.31.0** | Modern UI Icons |
| **Math Renderer** | KaTeX | **0.18.4** | LaTeX Math Formula Renderer |
| **Language Support** | TypeScript | **6.0.3** (`~6.0.2`) | Strict Type-Safety |

---

## 🚀 Fitur Utama Sistem

### 1. 🛡️ Keamanan & Anti-Cheat Canggih (Proctoring Engine)
- **Single-Session Token Locking**: Mencegah akun siswa digunakan secara bersamaan di lebih dari satu perangkat/browser secara simultan (`active_session_token`).
- **Strict Fullscreen Gatekeeper**: Mode layar penuh (*fullscreen*) wajib saat pengerjaan ujian.
- **Tab & Window Switch Tracking**: Memantau perpindahan tab/jendela (Alt+Tab, minimize) dengan sistem pencatatan pelanggaran bertingkat dan auto-diskualifikasi permanen saat batas pelanggaran tercapai.
- **Anti-Copy & Anti-Inspect Protection**: Memblokir aksi copy (Ctrl+C), cut, drag, select text, inspect element (F12 / Ctrl+Shift+I), dan klik kanan pada lembar soal.
- **Auto-Exit Fullscreen**: Otomatis keluar dari mode layar penuh seketika ujian selesai dikumpulkan.

### 2. 📝 Bank Soal & Generator Ujian
- **Pilihan Ganda (A–E) & Essay**: Pengelolaan naskah butir soal lengkap dengan kunci jawaban, pembahasan, dan media gambar.
- **TryOut Generator (50 Soal Acak)**: Guru dapat mengenerate paket ujian 50 butir soal secara acak berdasarkan jenjang dan mata pelajaran dari ribuan bank soal yang tersedia.
- **Import Bank Soal Massal (CSV/Excel)**: Guru dapat mengunduh template spreadsheet standar dan mengimpor naskah soal sekaligus.
- **Dukungan Formula Matematika & Sains**: Rendering rumus matematika KaTeX/LaTeX secara presisi dan responsif.

### 3. 👥 Manajemen Multi-Role Lengkap (Multi-Tenant Ready)
Sistem memiliki 4 hirarki peran pengguna:
- **👑 Super Admin IP**: Hak akses global mengelola multi-instansi mitra (`kategori_user_bo`), mengontrol seluruh master data, memantau live proctoring siswa di seluruh sekolah, serta manajemen akun admin sekolah.
- **🏢 Admin Sekolah**: Mengelola data sekolah/instansinya sendiri (data kelas, guru pengajar, dan siswa terdaftar).
- **👨‍🏫 Guru / Pengajar**: Mengelola bank soal, membuat paket ujian, menugaskan ujian ke kelas, dan merekap nilai siswa.
- **👨‍🎓 Siswa**: Portal ujian interaktif, autosave lembar jawaban real-time per nomor soal (`throttle:180,1`), navigasi soal ragu-ragu, dan perolehan skor akhir.

### 4. 🎨 UI/UX Modern & Collapsible Persistent Sidebar
- **Collapsible Sidebar (Back Office)**: Sidebar desktop dapat diciutkan (*collapsed*) untuk memaksimalkan area kerja tabel data dan kembali diperluas (*expanded*).
- **Persistent State**: Status sidebar tersimpan otomatis di `localStorage` peramban, sehingga tetap konsisten saat berpindah halaman maupun saat browser di-refresh.
- **Glassmorphism & Dark Mode**: Dilengkapi transisi tema (*Light / Dark / System Mode*) dengan latar tembus pandang (*glass-panel*).

---

## 🔑 Kredensial Akun Pengujian (Siap Pakai)

Untuk keperluan pengujian lokal, gunakan akun-akun terverifikasi berikut yang telah tersedia di database `sertidemi`:

| Peran (Role) | Login (Username / Email) | Password | Nama / Lingkup Akun |
| :--- | :--- | :--- | :--- |
| **Super Admin IP** | `adminnyaadmin` | `coreofthecore` | Admin SertiDemi (Akses Global Seluruh Instansi) |
| **Admin Sekolah** | `pgrislcc` | `12345` | PGRI SLCC (Manajemen Sekolah Mitra) |
| **Guru** | `edismulyanta` | `12345` | Edi S. Mulyanta (Bank Soal & Paket Ujian) |
| **Siswa** | `verinakris@gmail.com` | `123456` | Verina Kristanti (Pengerjaan TryOut & Hasil) |

---

## 📁 Struktur Direktori Proyek

```
Sistem-Ujian-Online/
├── backend/                       # Laravel 12 API Project
│   ├── app/
│   │   ├── Http/Controllers/Api/  # Auth, Admin, Teacher, Student, Proctoring
│   │   ├── Models/                # UserBo, UserSiswa, Assessment, MasterJenjang, dll.
│   │   └── Services/              # Helper & Dokumen Services
│   ├── routes/api.php             # Seluruh definisi route RESTful API
│   ├── database/                  # Migrations & Seeders
│   └── composer.json              # Konfigurasi dependensi backend
├── frontend/                      # React 19 + Vite 8 SPA Project
│   ├── src/
│   │   ├── features/
│   │   │   ├── admin/             # Layout Admin & Halaman Master Data
│   │   │   ├── auth/              # Halaman Login Terpadu
│   │   │   ├── student/           # Dashboard Siswa & Halaman Ujian Interaktif
│   │   │   └── teacher/           # Layout Guru, Bank Soal, TryOut Generator
│   │   ├── shared/                # Context (Auth, Theme, Toast), API Client, Komponen
│   │   ├── App.tsx                # Routing utama & Protected Routes
│   │   └── index.css              # Tailwind v4 import & custom glass theme
│   ├── package.json               # Konfigurasi dependensi frontend
│   └── vite.config.ts             # Konfigurasi Vite & Tailwind plugin
└── dokumentasi/                   # Dokumen Business Analyst & Analisis Fitur
```

---

## ⚡ Panduan Instalasi & Menjalankan Lokal

### 1. Prasyarat Sistem
- **PHP** >= 8.2 (dengan ekstensi `pdo_mysql`, `mbstring`, `zip`, `fileinfo`)
- **Node.js** >= 20.19.0 atau >= 22.12.0 & **npm**
- **Composer** (v2.x)
- **Laragon / MySQL** Server (Database: `sertidemi`, Port: `3306`)

### 2. Setup Backend (Laravel 12)
1. Buka terminal dan masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Pasang dependensi PHP via Composer:
   ```bash
   composer install
   ```
3. Pastikan file `.env` telah mengarah ke database `sertidemi` di MySQL Laragon:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=sertidemi
   DB_USERNAME=root
   DB_PASSWORD=
   ```
4. Generate Application Key (jika belum ada):
   ```bash
   php artisan key:generate
   ```
5. Jalankan server Laravel API:
   ```bash
   php artisan serve --host=127.0.0.1 --port=8000
   ```

### 3. Setup Frontend (React 19 + Vite 8)
1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Pasang dependensi JavaScript via npm:
   ```bash
   npm install
   ```
3. Jalankan server Vite development:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

Akses aplikasi di browser Anda:
- **Aplikasi Web (Frontend Client)**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **RESTful API Endpoint**: [http://127.0.0.1:8000/api](http://127.0.0.1:8000/api)

---

## 📄 Lisensi
Hak Cipta © 2026. Dikembangkan untuk Computer Based Testing (CBT) Detik Detik TryOut.
