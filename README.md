# Detik-Detik TryOut — Modul Autentikasi Admin (Isolated Repo)

Repositori ini adalah versi terisolasi (clean build) yang dikhususkan untuk **Otentikasi Administrator** dan **Landing Page Portal Admin** tanpa menyertakan modul ujian, bank soal, jadwal, atau dashboard siswa/guru.

---

## 🚀 Fitur yang Disertakan

### 1. Backend (Laravel 12 + Laravel Sanctum)
- **Model `UserBo`**: Model pengguna Back Office dengan dukungan verifikasi hash Bcrypt dan migrasi otomatis dari hash legacy (5x base64).
- **Model `KategoriUserBo`**: Relasi role/kategori pengguna admin.
- **Controller `AdminAuthController`**:
  - `POST /api/auth/login` : Login administrator dan penerbitan Sanctum Bearer Token.
  - `GET /api/auth/me` : Memeriksa profil dan status sesi admin yang sedang login.
  - `POST /api/auth/logout` : Menghapus token aktif (revoke).
  - `GET /api/ping` : Health check status API.
- **CORS Config**: Dikonfigurasi mendukung frontend di port `5173` atau origin lokal.

### 2. Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
- **Landing Page (`/`)**: Beranda modern neo-brutalist dengan pengenalan platform dan tombol akses portal admin.
- **Form Login Admin (`/login`)**: Halaman login back-office dengan integrasi API, tombol auto-fill untuk testing, toggle show/hide password, dan penanganan error.
- **Halaman Hasil Uji Login (`/admin/test`)**: Dashboard pengujian token Sanctum, tampilan profil admin, live test endpoint `GET /api/auth/me`, dan tombol logout.
- **Theme Toggle**: Dukungan mode Terang (☀️) dan Gelap (🌙).

---

## 🛠️ Panduan Menjalankan

### Backend
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Pastikan file `.env` sudah sesuai (default terhubung ke database MySQL `sertidemi`):
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=sertidemi
   DB_USERNAME=root
   DB_PASSWORD=
   ```
3. Jalankan server Laravel:
   ```bash
   php artisan serve --port=8000
   ```
   API akan berjalan di `http://127.0.0.1:8000/api`.

### Frontend
1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Pastikan dependensi sudah terpasang (jika belum, jalankan `npm install`).
3. Jalankan server development Vite:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:5173`.

---

## 🔑 Kredensial Pengujian (Database `sertidemi`)

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `123456` | `12345` | Tersedia tombol *Isi Otomatis* di halaman login |

