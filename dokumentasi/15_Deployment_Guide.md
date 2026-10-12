# 15. Deployment Guide (Panduan Instalasi & Penerapan Sistem)
**Sistem CBT Ujian Online (Online Examination System)**  
*Petunjuk Teknis Penerapan pada Lingkungan Lokal (Laragon) dan Server Produksi (Linux Nginx)*

---

## 1. Prasyarat Lingkungan & Spesifikasi Sistem (Prerequisites)

### 1.1. Perangkat Lunak Minimum
- **Sistem Operasi:** Windows 10/11 (Pengembangan Lokal) atau Linux Ubuntu 22.04 / 24.04 LTS (Produksi).
- **PHP:** Versi `>= 8.2` dengan ekstensi aktif:
  - `pdo`, `pdo_mysql` (koneksi basis data MySQL)
  - `zip`, `xml` (wajib untuk ekstraksi naskah soal Word `.docx` via `DocxQuestionService`)
  - `mbstring`, `curl`, `fileinfo`, `openssl`, `tokenizer`
- **Node.js:** Versi `>= 18.x` (LTS) & npm `>= 9.x`
- **Composer:** Versi `>= 2.5.x`
- **Database Server:** MySQL Server `>= 8.0` atau MariaDB `>= 10.5` (Database target: `sertidemi`)
- **Web Server (Produksi):** Nginx dengan PHP-FPM 8.2/8.3

---

## 2. Panduan Penerapan di Lingkungan Lokal (Laragon / Windows)

### 2.1. Konfigurasi Basis Data MySQL
1. Buka aplikasi **Laragon**, pastikan service **Apache / Nginx** dan **MySQL** telah berstatus *Running*.
2. Buka terminal atau HeidiSQL/phpMyAdmin, pastikan basis data bernama **`sertidemi`** telah dibuat:
   ```sql
   CREATE DATABASE IF NOT EXISTS sertidemi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 2.2. Setup Backend (Laravel 12 API)
1. Buka terminal PowerShell dan navigasikan ke direktori backend:
   ```bash
   cd d:\MAGANG\exam\Sistem-Ujian-Online\backend
   ```
2. Pasang dependensi pustaka PHP menggunakan Composer:
   ```bash
   composer install
   ```
3. Konfigurasikan berkas `.env` (pastikan pengaturan mengarah ke database `sertidemi` lokal):
   ```env
   APP_NAME="CBT Sistem Ujian Online"
   APP_ENV=local
   APP_KEY=base64:fdfw7CXTFhJbHGGX7iy5r0kkWsjrBpffqZc0HZ0mCVk=
   APP_DEBUG=true
   APP_URL=http://127.0.0.1:8000

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=sertidemi
   DB_USERNAME=root
   DB_PASSWORD=

   SESSION_DRIVER=file
   SESSION_LIFETIME=480
   SANCTUM_EXPIRATION=480
   ```
4. Jalankan migrasi tabel CBT tambahan (jika belum dijalankan):
   ```bash
   php artisan migrate
   ```
5. Buat symlink penyimpanan berkas publik (untuk lampiran gambar soal):
   ```bash
   php artisan storage:link
   ```
6. Jalankan server backend pengembang:
   ```bash
   php artisan serve --port=8000
   ```
   *Layanan backend aktif pada URL: `http://127.0.0.1:8000`*

### 2.3. Setup Frontend (React 19 + Vite SPA)
1. Buka tab terminal baru dan navigasikan ke direktori frontend:
   ```bash
   cd d:\MAGANG\exam\Sistem-Ujian-Online\frontend
   ```
2. Pasang dependensi Node.js:
   ```bash
   npm install
   ```
3. Jalankan server pengembang frontend:
   ```bash
   npm run dev
   ```
   *Layanan frontend aktif pada URL: `http://localhost:5173`*

---

## 3. Panduan Penerapan di Server Produksi (Linux Ubuntu Nginx)

### 3.1. Build Artefak Frontend
Pada komputer pengembang atau server CI/CD, lakukan kompilasi aset statis frontend:
```bash
cd frontend
npm run build
```
*Hasil kompilasi akan berada pada direktori `frontend/dist/`.*

### 3.2. Konfigurasi Backend & Cache Produksi
Di server produksi, lakukan optimasi konfigurasi dan perutean Laravel:
```bash
cd /var/www/cbt-backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 3.3. Konfigurasi Nginx Virtual Host (Reverse Proxy & SPA Routing)
Buat berkas konfigurasi Nginx di `/etc/nginx/sites-available/cbt`:
```nginx
server {
    listen 80;
    server_name cbt.sekolah.sch.id;

    # 1. Routing Frontend SPA (React Dist)
    root /var/www/cbt-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Reverse Proxy / Routing Backend Laravel API
    location ^~ /api/ {
        root /var/www/cbt-backend/public;
        try_files $uri $uri/ /index.php?$query_string;

        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME /var/www/cbt-backend/public/index.php;
            include fastcgi_params;
        }
    }

    # 3. Penanganan Berkas Gambar Soal
    location ^~ /storage/ {
        alias /var/www/cbt-backend/storage/app/public/;
        expires 30d;
        access_log off;
    }

    client_max_body_size 50M;
}
```

### 3.4. Optimasi Konfigurasi PHP-FPM & MySQL untuk Ujian Masal
- **PHP-FPM (`/etc/php/8.2/fpm/pool.d/www.conf`):**
  ```ini
  pm = dynamic
  pm.max_children = 120
  pm.start_servers = 20
  pm.min_spare_servers = 10
  pm.max_spare_servers = 40
  pm.max_requests = 1000
  ```
- **MySQL (`/etc/mysql/my.cnf`):**
  ```ini
  max_connections = 500
  innodb_buffer_pool_size = 2G  # Sesuaikan 50-70% total RAM server
  innodb_log_file_size = 256M
  ```

---

## 4. Panduan Pemecahan Masalah (Troubleshooting Guide)

1. **Galat Koneksi Basis Data (`SQLSTATE[HY000] [2002]`):**
   - *Penyebab:* Service MySQL di Laragon belum aktif atau port 3306 terblokir.
   - *Solusi:* Pastikan tombol *Start All* pada Laragon sudah ditekan, atau jalankan perintah PowerShell `Test-NetConnection -ComputerName 127.0.0.1 -Port 3306` untuk memverifikasi port.
2. **Galat Impor Soal Word Gagal (`Class 'ZipArchive' not found`):**
   - *Penyebab:* Ekstensi PHP `zip` dinonaktifkan pada `php.ini`.
   - *Solusi:* Buka berkas `php.ini` pada Laragon (`etc/php/php-8.x/php.ini`), hilangkan tanda titik koma `;` pada baris `extension=zip`, lalu restart Laragon.
3. **Galat CORS saat Akses API dari Frontend:**
   - *Penyebab:* URL frontend tidak diizinkan di middleware CORS backend.
   - *Solusi:* Pastikan konfigurasi `config/cors.php` mengizinkan `http://localhost:5173` pada `allowed_origins` dengan `supports_credentials => true`.
4. **Siswa Terkena Diskualifikasi Otomatis yang Tidak Disengaja:**
   - *Penyebab:* Notifikasi pop-up sistem operasi atau aplikasi background memicu event `window_blur`.
   - *Solusi:* Guru atau Admin dapat mereset status attempt siswa melalui endpoint admin/guru (`TeacherExamController::attemptDetail`) untuk memungkinkan siswa melanjutkan ujian.
