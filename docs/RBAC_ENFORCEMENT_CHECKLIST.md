# Panduan Enforcement Bertahap & Operasional RBAC Dinamis

Dokumen ini adalah checklist praktis untuk mengaktifkan enforcement RBAC dan isolasi tenant secara aman di proyek **Detik-Detik Tryout CBT** (Laravel 12 + React/Vite), melakukan rollback cepat jika terjadi kendala, memantau log, menambah permission baru, serta menyiapkan database pada mesin rekan setim.

> **Status Default Aman**:
> - `RBAC_ENFORCE=false` (shadow mode — izin tetap dicatat di log tanpa menolak request)
> - `RBAC_TENANT_ENFORCE=false` (shadow mode — isolasi tenant dicatat di log tanpa memfilter/menolak)
> - `RBAC_AUTO_ASSIGN_ON_CREATE=true` (akun baru otomatis mendapat role default di `user_roles`)

---

## 1. Backup Database (WAJIB Sebelum Mengubah Flag)

Selalu buat backup database `sertidemi` sebelum mengaktifkan enforcement atau menjalankan seeder.

### Via PowerShell (Laragon MySQL)
```powershell
# Sesuaikan path mysqldump Laragon jika berbeda
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
New-Item -ItemType Directory -Force -Path ".\backups" | Out-Null
mysqldump -u root sertidemi > ".\backups\sertidemi_pre_enforce_$timestamp.sql"
```

### Verifikasi Cepat Sebelum Enforcement (Read-Only)
```powershell
cd backend
php artisan rbac:audit-users
```
Pastikan:
- **Akun Tanpa Baris di `user_roles` = `0`**
- **Akun Dengan Role Tidak Cocok Tipe = `0`**

---

## 2. Tahap 1: Aktifkan `RBAC_TENANT_ENFORCE=true`

Aktifkan isolasi tenant terlebih dahulu sementara `RBAC_ENFORCE` tetap `false`.

### Langkah Aktivasi
1. Edit `backend/.env`:
   ```env
   RBAC_TENANT_ENFORCE=true
   RBAC_ENFORCE=false
   ```
2. Bersihkan cache konfigurasi Laravel:
   ```powershell
   cd backend
   php artisan config:clear
   ```

### Checklist Uji 4 Akun (Tahap Tenant Enforce)
- [ ] **Super Admin**:
  - Login berhasil, `/super-admin/dashboard` memuat statistik lintas instansi.
  - Halaman Instansi, Pengguna Platform, Bank Soal Global, dan Role Management tampil normal tanpa terfilter ke satu instansi.
- [ ] **Admin Instansi** (uji dengan 2 instansi berbeda jika tersedia):
  - Login berhasil, `/admin/dashboard` hanya menampilkan statistik instansi miliknya.
  - Data Siswa, Guru, Kelas, Jadwal Ujian (`assessment`), dan Pengumuman hanya menampilkan data instansi miliknya (ditambah pengumuman nasional `idkategori = NULL`).
  - Mencoba memanggil API dengan `idkategori` atau ID user instansi lain ditolak `403 TENANT_FORBIDDEN`.
- [ ] **Guru**:
  - Login berhasil, dashboard guru, Bank Soal Guru, Jadwal Ujian, Hasil/Laporan, dan Pengumuman berjalan normal (tampilan & perilaku tidak berubah).
- [ ] **Siswa**:
  - Login berhasil, daftar ujian tersedia, mulai ujian (`start`), simpan jawaban (`answers`), submit ujian, lihat hasil (`results`), dan pengumuman berjalan normal (tampilan & perilaku tidak berubah).

Pantau `backend/storage/logs/laravel.log` selama pengujian (lihat Bagian 5). Jika bersih dan tidak ada penolakan tak terduga, lanjut ke Tahap 2.

---

## 3. Tahap 2: Aktifkan `RBAC_ENFORCE=true`

Setelah Tahap 1 stabil, aktifkan enforcement permission penuh.

### Langkah Aktivasi
1. Edit `backend/.env`:
   ```env
   RBAC_TENANT_ENFORCE=true
   RBAC_ENFORCE=true
   ```
2. Bersihkan cache konfigurasi Laravel:
   ```powershell
   cd backend
   php artisan config:clear
   ```

### Checklist Uji 4 Akun (Tahap Full Enforce)
- [ ] **Super Admin**:
  - Dashboard (`/super-admin/dashboard`), Instansi (`/super-admin/instansi`), Pengguna (`/super-admin/users`), Master Akademik Global, Bank Soal (`/super-admin/bank-soal`), Audit Trail (`/super-admin/audit-logs`), Pengumuman Global, Langganan, Pengaturan Platform, dan Kelola Role (`/super-admin/roles`) semua terbuka normal (`200`).
- [ ] **Admin Instansi**:
  - Dashboard Sekolah (`/admin/dashboard`), Kelola Pengguna (`/admin/users`), Master Akademik (Kelas, Mapel, Tahun Ajaran), Jadwal Ujian (`/admin/exams`), Monitoring (`/admin/proctoring`), Aktivitas (`/admin/activities`), Pengumuman (`/admin/announcements`), Laporan (`/admin/reports`), Profil (`/admin/profile`), dan Role & Akses Sekolah (`/admin/roles`) semua terbuka normal (`200`).
  - Akses paksa ke URL `/super-admin/*` atau API `/api/super-admin/*` ditolak (`403`).
  - Buat 1 akun guru baru dan 1 akun siswa baru → pastikan akun baru langsung punya baris di `user_roles` dan bisa langsung login + membuka fitur utamanya tanpa `403`.
- [ ] **Guru**:
  - Dashboard Guru, Bank Soal Guru, Katalog Bank Soal Global (read-only), Jadwal Ujian, Dropdown Tahun Soal/Semester/Tahun Ajaran, Hasil & Export Laporan, serta Pengumuman berjalan normal.
  - Akses paksa ke `/api/admin/students` atau `POST /api/teacher/global-question-bank` ditolak (`403`).
- [ ] **Siswa**:
  - Daftar Ujian, Mulai Ujian, Jawab Soal, Submit, Lihat Nilai/Hasil, Pengumuman, dan Ganti Password berjalan normal.
  - Akses paksa ke `/api/admin/*`, `/api/teacher/*`, `/api/super-admin/*`, atau `/api/roles` ditolak (`403`).

---

## 4. Cara Rollback Cepat (< 30 Detik)

Jika ditemukan fitur yang terblokir `403` saat operasional:

1. Buka `backend/.env` dan kembalikan flag ke `false`:
   ```env
   RBAC_ENFORCE=false
   RBAC_TENANT_ENFORCE=false
   ```
   *(Atau cukup matikan salah satu yang bermasalah.)*
2. Jalankan:
   ```powershell
   cd backend
   php artisan config:clear
   ```
3. Tidak perlu rollback migrasi maupun mengubah database — aplikasi langsung kembali ke mode shadow.
4. Periksa `backend/storage/logs/laravel.log` untuk melihat permission key atau rute yang memicu penolakan, perbaiki di role/seeder, lalu uji ulang.

---

## 5. Cara Membaca & Memantau `laravel.log`

File log berada di `backend/storage/logs/laravel.log`. Gunakan kata kunci berikut untuk menyaring kejadian RBAC:

| Kata Kunci Log | Sumber | Arti & Tindak Lanjut |
| :--- | :--- | :--- |
| `"RBAC SHADOW DENIED"` / `"akan ditolak"` | `CheckPermission` middleware | User mengakses route tanpa permission yang dibutuhkan. Cek `Status Enforce: SHADOW (DIIZINKAN)` vs `STRICT (403)`, periksa `required_permissions` apakah memang seharusnya dimiliki role tersebut. |
| `"TENANT_OWNERSHIP SHADOW"` | `EnsureTenantOwnership` middleware | User mencoba mengakses parameter (`idkategori`, `iduser_bo`, `iduser`, `masterKela`, `idassessment`) milik instansi lain. Periksa apakah itu bug frontend mengirim ID salah atau percobaan akses lintas tenant. |
| `"USER_WITHOUT_RBAC_ROLE"` | `HasDynamicRbac` / `RbacAssignmentService` | User login/mengakses API tetapi tidak memiliki satu pun baris di `user_roles` (fallback read-only aktif). Jalankan `php artisan rbac:audit-users` untuk memeriksa dan perbaiki titik pembuatan akun yang terlewat. |
| `"RBAC_SYSTEM_ROLE_MISSING"` | `RbacAssignmentService` | Role sistem global (`super_admin`, `admin_instansi`, `guru`, atau `siswa`) tidak ditemukan di tabel `roles`. Pastikan `DynamicRbacSeeder` sudah dijalankan. |

### Perintah Filter Cepat di PowerShell
```powershell
Select-String -Path "backend\storage\logs\laravel.log" -Pattern "akan ditolak|RBAC SHADOW DENIED|TENANT_OWNERSHIP SHADOW|USER_WITHOUT_RBAC_ROLE|RBAC_SYSTEM_ROLE_MISSING" | Select-Object -Last 30
```

### Pantau Real-Time (Tail) di PowerShell
```powershell
Get-Content "backend\storage\logs\laravel.log" -Wait -Tail 50 | Select-String -Pattern "akan ditolak|RBAC SHADOW DENIED|TENANT_OWNERSHIP SHADOW|USER_WITHOUT_RBAC_ROLE|RBAC_SYSTEM_ROLE_MISSING"
```

---

## 6. Skenario Tes Dinamis: Role Kustom "Operator Ujian"

Uji ini membuktikan bahwa RBAC dinamis benar-benar bekerja end-to-end (sidebar dinamis, route guard, backend 403, dan cache invalidation tanpa login ulang).

1. Login sebagai **Admin Instansi** dan buka menu **Role & Akses Sekolah** (`/admin/roles`).
2. Buat role kustom baru:
   - **Nama (slug)**: `operator_ujian`
   - **Label**: `Operator Ujian`
   - **Permission**: centang **HANYA** `jadwal.view` dan `monitoring.view` (plus `dashboard_sekolah.view` opsional jika ingin tetap bisa membuka dashboard; untuk uji ketat cukup `jadwal.view` + `monitoring.view`).
3. Buka menu **Kelola Pengguna** (`/admin/users`), pilih satu akun admin sekolah uji (bukan akun utama Anda sendiri agar tidak terkena proteksi anti-lockout), klik **Atur Role**, lalu ganti role-nya menjadi **hanya** `operator_ujian`.
4. Login di browser/incognito lain menggunakan akun uji tersebut:
   - [ ] **Sidebar dinamis**: hanya menu **Jadwal Ujian** dan **Monitoring Ujian** yang tampil; menu lain (Kelola Pengguna, Master Akademik, Laporan, Role & Akses, dll.) hilang.
   - [ ] **Akses halaman yang diizinkan**: `/admin/exams` dan `/admin/proctoring` terbuka normal (`200`).
   - [ ] **Akses URL langsung yang tidak diizinkan**: ketik `/admin/users` atau `/admin/reports` di address bar → frontend menampilkan halaman **Unauthorized** dan panggilan API langsung ke `/api/admin/students` mengembalikan **`403 FORBIDDEN`**.
5. **Uji perubahan permission real-time tanpa login ulang**:
   - Di browser Admin Instansi utama, edit permission role `operator_ujian` → tambahkan `laporan.view`, lalu simpan.
   - Di browser akun uji `operator_ujian`, **cukup refresh halaman (`F5`) tanpa logout/login ulang**:
     - [ ] `/api/auth/me` memuat permission terbaru secara otomatis.
     - [ ] Menu **Laporan Rekap Nilai** langsung muncul di sidebar dan halaman `/admin/reports` langsung dapat diakses (`200`).
6. Setelah selesai uji, kembalikan role akun uji dan hapus role percobaan `operator_ujian` (setelah tidak dipakai user mana pun).

---

## 7. Cara Menambah Permission Baru di Masa Depan

Setiap kali menambahkan modul atau fitur baru yang membutuhkan hak akses baru:

1. **Tambahkan Permission di Seeder** (`backend/database/seeders/DynamicRbacSeeder.php`):
   - Tambahkan entri baru pada `seedPermissions()` dengan `key` (`module.action`), `label`, `module`, dan `scope` (`platform` atau `instansi`).
   - Pastikan role sistem yang berhak menerimanya ikut mendapatkan key tersebut di `seedRoles()`:
     - `super_admin`: otomatis mendapat semua permission.
     - `admin_instansi`: otomatis mendapat semua permission `scope = 'instansi'` kecuali `banksoal_global.manage`.
     - `guru` / `siswa`: tambahkan secara eksplisit ke array `$guruKeys` / `$siswaKeys` jika memang untuk guru/siswa.
2. **Pasang Middleware pada Route Backend** (`backend/routes/api.php`):
   - Tambahkan `->middleware('permission:nama_modul.aksi')` (mendukung logika OR dengan `|`, misal `permission:a.view|b.view`).
3. **Tambahkan Menu (jika fitur berupa halaman baru)**:
   - Tambahkan item menu di `seedMenus()` pada `DynamicRbacSeeder.php` dengan `path` yang **persis sama** dengan route di `frontend/src/App.tsx`.
   - Lindungi route frontend dengan `<PermissionRoute perm="nama_modul.aksi">` di `frontend/src/App.tsx`, dan lindungi tombol aksi dengan `<Can perm="nama_modul.manage">`.
4. **Jalankan Seeder (Idempotent)**:
   ```powershell
   cd backend
   php artisan db:seed --class=DynamicRbacSeeder
   ```
   *(Seeder menggunakan `updateOrCreate` dan tidak menghapus role kustom yang sudah dibuat instansi.)*
5. **Tambahkan / Jalankan Test**:
   ```powershell
   cd backend
   php artisan test --filter="DynamicRbacTest|RbacEnforcementSimulationTest"
   ```

---

## 8. Cara Menyiapkan Database RBAC untuk Rekan Setim

Jika rekan setim melakukan `git pull` dengan database `sertidemi` lokal yang sudah berisi data existing namun belum memiliki tabel RBAC:

```powershell
cd backend

# 1. Jalankan HANYA migration tabel Dynamic RBAC (WAJIB pakai --path!)
php artisan migrate --path=database/migrations/2026_11_17_000001_create_dynamic_rbac_tables.php

# 2. Seed permissions, 4 role sistem, dan menus
php artisan db:seed --class=DynamicRbacSeeder

# 3. Preview migrasi user lama ke user_roles (dry-run)
php artisan rbac:migrate-users --dry-run

# 4. Jalankan migrasi user lama ke user_roles (idempotent)
php artisan rbac:migrate-users

# 5. Verifikasi integritas (harus 0 akun tanpa role & 0 mismatch)
php artisan rbac:audit-users

# 6. Bersihkan cache config
php artisan config:clear
```

*(Jika di kemudian hari ditemukan akun baru yang terlewat tanpa baris di `user_roles`, gunakan `php artisan rbac:audit-users` terlebih dahulu untuk cek, lalu `php artisan rbac:audit-users --fix` hanya bila sudah diverifikasi.)*

---

## 9. PERINGATAN KERAS: Jangan Pernah Jalankan `php artisan migrate` Polos

> **BAHAYA — WAJIB DIPATUHI SEMUA DEVELOPER:**
>
> **JANGAN PERNAH** menjalankan:
> - `php artisan migrate` (tanpa `--path=...`)
> - `php artisan migrate:fresh`
> - `php artisan migrate:refresh`
> - `php artisan migrate:reset`
> - `php artisan db:wipe`
>
> **Alasan Teknis:**
> Database live `sertidemi` berasal dari dump/struktur produksi yang memiliki **24 file migration lama berstatus `Pending`** (antara lain `2026_08_11_*` hingga `2026_11_13_*`) yang tabelnya sudah ada atau memiliki struktur berbeda. Menjalankan `php artisan migrate` polos akan memicu error bentrok tabel/kolom atau mengubah skema secara tidak terkendali, sedangkan `migrate:fresh`/`db:wipe` akan **menghapus seluruh data siswa, guru, soal, dan ujian**.
>
> **Aturan Baku:** Setiap menjalankan migrasi baru di proyek ini **HARUS selalu** menyertakan flag spesifik:
> ```powershell
> php artisan migrate --path=database/migrations/<nama_file_migration>.php
> ```

