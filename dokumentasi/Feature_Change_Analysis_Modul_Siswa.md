# Feature Change Analysis: Penambahan Fitur pada Modul Siswa
**Proyek:** Sistem CBT Ujian Online (Online Examination System)  
**Konteks Basis Data:** MySQL `sertidemi` (Laragon Local Environment)  
**Peran:** Senior Business Analyst & System Analyst  
**Status:** Dokumen Analisis Perubahan (Sebelum Tahap Implementasi / Coding)

---

## Ringkasan Eksekutif Permintaan Perubahan (Change Request Summary)
Dokumen ini disusun untuk menganalisis dampak teknis, kebutuhan arsitektur, ketersediaan data, dan potensi risiko dari penambahan 5 (lima) fitur baru pada **Modul Siswa**, yaitu:
1. **Pencarian Jadwal Ujian Siswa (Search Jadwal Ujian)**
2. **Dropdown Menu Profil pada Header / Navbar Siswa**
3. **Halaman Khusus Profil Siswa (Dedicated Profile Page)**
4. **Pengingat Jadwal Ujian Siswa (Exam Reminder Engine)**
5. **Penyempurnaan Alur Keluar Sistem (Logout Siswa)**

Analisis ini dilakukan murni berdasarkan kondisi faktual *source code* backend Laravel 12, frontend React 19 SPA, dan struktur tabel database `sertidemi`.

---

# 1. Analisis Fitur 1: Search Jadwal Ujian Siswa

### 1.1. Kondisi Saat Ini (Berdasarkan Source Code)
- **Frontend (`StudentExamsPage.tsx`):**
  - Data jadwal ujian dimuat satu kali saat halaman dibuka melalui `GET /api/student/exams` dan disimpan ke state `exams: ExamListItem[]`.
  - Seluruh kartu ujian langsung dirender ke dalam grid card (`exams.map(...)`, baris 289–403).
  - Belum terdapat input teks pencarian (*search bar*), tombol filter, maupun mekanisme penyaringan data pada tampilan saat ini.
- **Backend (`ExamAttemptController.php` - method `availableExams`):**
  - Mengambil data dari model `Assessment::with(['mapel', 'jenjang', 'kelas', 'examGroups'])`.
  - Filter yang diterapkan saat ini hanya membatasi ujian berdasarkan `idkelas`, `idkategori`, atau penugasan `examGroups` yang menargetkan siswa/kelas tersebut.
  - Endpoint `availableExams` belum memiliki penanganan parameter query `search` (`$request->search`).
- **Data yang Tersedia di Response API Saat Ini:**
  - `title` (Nama ujian / assessment)
  - `subject_name` (Nama mata pelajaran, misal: "Matematika")
  - `subject_code` (Kode mata pelajaran, misal: "MAT-10")
  - `start_time` & `end_time` (Waktu mulai dan batas selesai)
  - `group_name` (Nama kelompok ujian / kelas)
  - `attempt.status` ('not_started', 'in_progress', 'submitted', 'disqualified')

### 1.2. Perubahan yang Dibutuhkan
- **Frontend:**
  - Menambahkan baris input pencarian interaktif di atas daftar kartu ujian (`Daftar Seluruh Jadwal Ujian`).
  - Menambahkan filter instan pada state `exams` berdasarkan kata kunci pencarian (*instant reactive filter*).
  - Menyediakan penanganan kondisi jika hasil pencarian kosong (*No search results found state*).
- **Pendekatan Implementasi (Rekomendasi Analis):**
  - **Rekomendasi Utama (Client-Side Search Filter):** Karena jumlah paket ujian aktif untuk satu siswa umumnya berkisar 5–20 paket per semester, pemfilteran langsung di sisi React (`exams.filter(...)`) jauh lebih efisien, responsif tanpa jeda waktu ketik (*zero network latency*), dan tidak menambah beban request ke server database.
  - **Opsi Alternatif (Server-Side Query Filter):** Jika di kemudian hari jumlah riwayat ujian siswa mencapai ratusan, dapat ditambahkan query `where('nama_assessment', 'like', "%{$search}%")` pada `ExamAttemptController.php`.

### 1.3. File yang Kemungkinan Terpengaruh
- **Frontend Component:** `frontend/src/features/student/StudentExamsPage.tsx` (Penambahan state `searchQuery`, komponen input teks, dan variabel `filteredExams`).
- **Backend Controller (Opsional):** `backend/app/Http/Controllers/Api/Student/ExamAttemptController.php` (Jika diputuskan menggunakan pencarian server-side).

### 1.4. Database Impact
- **Tidak ada perubahan skema database.** Tabel `assessment` dan `master_mata_pelajaran` sudah menyediakan seluruh kolom yang dibutuhkan (`nama_assessment`, `nama_mapel`, `kode_mapel`).
- Tidak memerlukan penambahan tabel atau kolom baru.

### 1.5. Risiko Perubahan
- **Rendah (Low Risk).** Filter di sisi klien tidak mengubah struktur data, alur pengerjaan ujian, atau integritas sesi ujian siswa.

### 1.6. Status Konfirmasi Klien
- ✅ **[DISETUJUI / DIKONFIRMASI]**: Pencarian berjalan instan di peramban siswa (client-side) mencakup judul ujian dan mata pelajaran, serta **menyertakan tombol tab filter status**: **"Semua"**, **"Belum Dikerjakan"**, dan **"Selesai"**.

---

# 2. Analisis Fitur 2: Dropdown Profile Siswa pada Header / Navbar

### 2.1. Kondisi Saat Ini (Berdasarkan Source Code)
- **Frontend (`StudentExamsPage.tsx` baris 162–191):**
  - Komponen header saat ini berbentuk bilah navigasi statis:
    - Sisi kiri: Ikon topi toga + Teks "Detik Detik TryOut" + Subteks Instansi/Kelas.
    - Sisi kanan: `ThemeToggle`, sebuah kotak abu-abu statis yang hanya menampilkan ikon user dan teks nama siswa (`{user?.name}`), serta tombol terpisah "Keluar" (`logout`).
  - Belum ada elemen dropdown atau menu interaktif yang dapat diklik (*clickable popup menu*) pada nama siswa.

### 2.2. Perubahan yang Dibutuhkan
- Mengganti tampilan badge nama siswa statis menjadi tombol dropdown interaktif:
  ```
  [Avatar Inisial / Ikon User] Nama Siswa ▼
  ```
- Saat tombol diklik, membuka menu dropdown (*floating card*) yang berisi:
  1. **Menu Profil:** Mengarahkan ke halaman profil siswa (`/student/profile`).
  2. **Menu Pengingat:** Mengarahkan/fokus ke panel pengingat ujian atau membuka modal jadwal mendatang.
  3. **Pemisah (Divider)**
  4. **Menu Keluar (Logout):** Memicu aksi konfirmasi logout dengan ikon merah.
- Menambahkan penanganan penutupan menu otomatis saat siswa mengklik di luar area dropdown (*click outside handler*).

### 2.3. File yang Kemungkinan Terpengaruh
- **Frontend Component:** `frontend/src/features/student/StudentExamsPage.tsx` (Penggantian elemen header baris 179–190 dengan komponen dropdown menu).
- **Komponen Pendukung (Opsional):** Dapat dibuat sebagai komponen terpisah `StudentNavbar.tsx` agar seragam jika digunakan di beberapa halaman siswa.

### 2.4. Database Impact
- **Tidak ada perubahan database sama sekali.** Seluruh data identitas siswa sudah tersimpan di `AuthContext` yang bersumber dari tabel `user`.

### 2.5. Risiko Perubahan
- **Sangat Rendah (Very Low Risk).** Hanya perubahan antarmuka UI/UX pada elemen header.

### 2.6. Status Konfirmasi Klien
- ✅ **[DISETUJUI / DIKONFIRMASI]**: Menu "Pengingat" pada dropdown cukup melakukan auto-scroll halus (*smooth scroll*) ke widget pengingat di dashboard siswa.

---

# 3. Analisis Fitur 3: Halaman Profile Siswa (Dedicated Profile Page)

### 3.1. Kondisi Saat Ini (Berdasarkan Source Code)
- **Frontend Routing (`App.tsx` baris 66–69):**
  - Rute siswa yang terdaftar saat ini hanya dua:
    - `/student/dashboard` (mengarah ke `StudentExamsPage.tsx`)
    - `/student/session/:attemptId` (mengarah ke `ExamSessionPage.tsx`)
  - Belum ada rute `/student/profile`.
- **Ketersediaan Data di Backend (`SessionController.php` baris 34–56):**
  - Endpoint `GET /api/auth/me` **SUDAH** mengembalikan struktur data profil siswa yang sangat lengkap:
    - `id` (string ID siswa dari `user.iduser`)
    - `name` (nama siswa dari `user.nama`)
    - `nisn` (nomor induk dari `user.nisn`)
    - `email` (dari `user.login_email`)
    - `phone` (nomor telepon dari `user.telp`)
    - `address` (alamat dari `user.alamat`)
    - `institution` (nama instansi dari relasi `kategori.nama_kategori` atau `kelas.kategori.nama_kategori`)
    - `jenjang` (jenjang pendidikan dari relasi `kelas.jenjang.nama_jenjang`)
    - `class_name` (nama kelas dari relasi `kelas.nama_kelas`)
    - `class_room` (detail lengkap kelas & tingkat)
- **Catatan Gap:** Pada `LoginController.php` (saat login pertama sebelum `/auth/me` dipanggil), data instansi dan jenjang siswa belum dieager-load selengkap di `SessionController.php`.

### 3.2. Perubahan yang Dibutuhkan
- **Frontend:**
  - Membuat halaman baru: `StudentProfilePage.tsx` di folder `frontend/src/features/student/`.
  - Halaman memuat tata letak kartu profil profesional (Read-Only):
    - Header Profil (Avatar inisial, Nama Lengkap, NISN, Badge Status "Siswa Aktif").
    - Seksi Data Akademik: Instansi/Sekolah, Jenjang Pendidikan, Ruang Kelas, Tingkat.
    - Seksi Kontak & Akun: Alamat Email terdaftar, Nomor Telepon/WhatsApp, Alamat Domisili.
    - Seksi Keamanan Sesi: Status sesi aktif, Waktu login terakhir.
    - Tombol navigasi kembali ke Daftar Ujian (`/student/dashboard`).
  - Mendaftarkan rute baru di `App.tsx`:
    ```tsx
    <Route path="/student/profile" element={<StudentProfilePage />} />
    ```
- **Backend (Penyempurnaan Kecil di LoginController):**
  - Memastikan `LoginController::login` juga memuat `kategori` pada relasi `userSiswa` agar data instansi langsung terisi sejak detik pertama login tanpa harus menunggu request `/auth/me`.

### 3.3. File yang Kemungkinan Terpengaruh
- **Frontend Page (File Baru):** `frontend/src/features/student/StudentProfilePage.tsx`.
- **Frontend Routing:** `frontend/src/App.tsx` (Penambahan rute `/student/profile`).
- **Backend Controller:** `backend/app/Http/Controllers/Api/Auth/LoginController.php` (Penyamaan payload profil siswa dengan `SessionController.php`).

### 3.4. Database Impact
- **Tidak ada perubahan skema database.** Seluruh kolom yang dibutuhkan (`nama`, `nisn`, `login_email`, `telp`, `alamat`, `idkelas`, `idkategori`) sudah tersedia secara faktual pada tabel `user`, `kategori_user_bo`, `master_kelas`, dan `master_jenjang`.

### 3.5. Risiko Perubahan
- **Rendah (Low Risk).** Penambahan halaman baru yang terisolasi dan tidak mengganggu alur pengerjaan ujian.

### 3.6. Status Konfirmasi Klien
- ✅ **[DISETUJUI / DIKONFIRMASI]**: Halaman profil siswa bersifat **murni hanya-baca (Read-Only)**.

---

# 4. Analisis Fitur 4: Pengingat Jadwal Ujian Siswa (Exam Reminder Engine)

### 4.1. Kondisi Saat Ini (Berdasarkan Source Code)
- **Data Jadwal di Backend:**
  - Tabel `assessment` memiliki kolom `tanggal_mulai_assessment` dan `tanggal_batas_assessment`.
  - Tabel `exam_groups` memiliki kolom `start_time` dan `end_time`.
  - Endpoint `GET /api/student/exams` sudah mengirimkan string `start_time` dan `end_time` untuk setiap paket ujian ke siswa.
- **Komponen Frontend Saat Ini (`StudentExamsPage.tsx` baris 141–157 & 460–464):**
  - Komponen `RemindersList` sudah terpasang di kolom sebelah kanan dashboard.
  - Namun, data yang ditampilkan saat ini masih berupa data teks statis (dummy):
    1. *"Integritas & Anti-Cheat Aktif"* (Tipe warning)
    2. *"Simpan Jawaban Otomatis"* (Tipe info)
- **Tabel `notifikasi` pada Database `sertidemi`:**
  - Tabel `notifikasi` fisik memang ada di database `sertidemi` (berisi kolom `idnotifikasi`, `iduser`, `judul`, `isi_notifikasi`, `tgl_notifikasi`, `status_baca`).
  - Namun, saat ini tabel ini tidak memiliki model Eloquent atau controller aktif di dalam modul CBT.

### 4.2. Perubahan yang Dibutuhkan
- **Pendekatan Pengingat Berdasarkan Jadwal Faktual (Dynamic Schedule Reminder):**
  - Mengubah logika pengisian data pada komponen `RemindersList` di `StudentExamsPage.tsx` agar dihitung secara dinamis dari array `exams`:
    1. Filter ujian yang belum selesai dikerjakan (`attempt === null` atau `status === 'not_started'`).
    2. Urutkan berdasarkan waktu mulai terdekat (`start_time`).
    3. Buat item pengingat otomatis dengan kalkulasi sisa waktu (*countdown friendly*):
       - *Contoh 1:* **"Ujian Dimulai Hari Ini"** — Judul Ujian (Dimulai pukul 08:00 WIB). Tipe: `warning`.
       - *Contoh 2:* **"Batas Akhir Ujian Mendekati"** — Ditutup dalam 3 jam lagi. Tipe: `danger`.
       - *Contoh 3:* **"Jadwal Mendatang"** — Ujian Bahasa Indonesia (Besok, 13 Okt). Tipe: `info`.
    4. Menyediakan tombol pintas (*quick action*) pada item pengingat untuk langsung mengarahkan siswa ke kartu ujian tersebut.

### 4.3. File yang Kemungkinan Terpengaruh
- **Frontend Component:** `frontend/src/features/student/StudentExamsPage.tsx` (Perubahan konstruksi array `studentReminders` dari array statis menjadi fungsi komputasi dinamis berbasis data `exams`).
- **Komponen UI:** `frontend/src/shared/components/dashboard/RemindersList.tsx` (Komponen ini sudah siap menerima data dinamis dan fungsi `onClick`).

### 4.4. Database Impact
- **0% Perubahan Database.** Menggunakan data `start_time` dan `end_time` yang sudah ada dari tabel `assessment` dan `exam_groups`.

### 4.5. Risiko Perubahan
- **Rendah (Low Risk).** Tidak ada penulisan data baru ke database, murni kalkulasi waktu pengerjaan untuk kenyamanan siswa.

### 4.6. Status Konfirmasi Klien
- ✅ **[DISETUJUI / DIKONFIRMASI]**: Pengingat cukup ditampilkan pada widget **Informasi & Pengingat** di halaman dashboard (tidak memerlukan sistem notifikasi manual terpisah ataupun perubahan database).

---

# 5. Analisis Fitur 5: Logout Siswa

### 5.1. Kondisi Saat Ini (Berdasarkan Source Code)
- **Arsitektur Autentikasi Saat Ini:**
  - Menggunakan **Laravel Sanctum** (Token-Based Stateless Auth). Token tersimpan di tabel `personal_access_tokens`.
  - Menggunakan **Single-Session Token**: String acak 40 karakter disimpan di kolom `user.active_session_token` dan dicocokkan via header `X-Session-Token` oleh middleware `EnsureSingleSession`.
- **Backend Logout (`LoginController.php` baris 131–143):**
  - Endpoint `POST /api/auth/logout` sudah tersedia dan berfungsi dengan baik.
- **Frontend Logout (`AuthContext.tsx` baris 148–163):**
  - Fungsi `logout` mengirim request ke `POST /api/auth/logout`, menghapus `localStorage`, dan mengosongkan state `user = null`.

### 5.2. Perubahan yang Dibutuhkan
- Menempatkan tombol logout di dalam menu dropdown profil siswa.
- **Sesuai instruksi klien:** Proses keluar dijalankan **langsung seketika tombol 'Keluar' diklik** tanpa memunculkan dialog modal konfirmasi tambahan.

### 5.3. File yang Kemungkinan Terpengaruh
- **Frontend Component:** `frontend/src/features/student/StudentExamsPage.tsx`.

### 5.4. Database Impact
- **Tidak ada perubahan struktur database.**

### 5.5. Risiko Perubahan
- **Sangat Rendah (Very Low Risk).**

### 5.6. Status Konfirmasi Klien
- ✅ **[DISETUJUI / DIKONFIRMASI]**: Tombol logout **langsung keluar seketika diklik** tanpa modal pop-up konfirmasi.

---

# 6. Matriks Dampak File & Komponen Sistem (Impact Matrix)

| Fitur yang Diubah | File Backend Terkait | File Frontend Terkait | Perubahan Database? | Status Implementasi |
| :--- | :--- | :--- | :---: | :---: |
| **1. Search & Filter Status Ujian** | `ExamAttemptController.php` (Read-only data) | `features/student/StudentExamsPage.tsx` | **Tidak** | ✅ Selesai |
| **2. Dropdown Profile Siswa** | *Tidak ada* | `features/student/StudentExamsPage.tsx` | **Tidak** | ✅ Selesai |
| **3. Halaman Profile Siswa (Read-Only)** | `LoginController.php` (Eager load kelas & instansi) | `features/student/StudentProfilePage.tsx`, `App.tsx` | **Tidak** | ✅ Selesai |
| **4. Pengingat Jadwal Ujian Dinamis** | *Tidak ada* (Dihitung dari jadwal `exams`) | `features/student/StudentExamsPage.tsx` | **Tidak** | ✅ Selesai |
| **5. Instant Logout Siswa** | `LoginController.php` (Sanctum revoke) | `features/student/StudentExamsPage.tsx` | **Tidak** | ✅ Selesai |

---

# 7. Status Keputusan Klien (Final Decision Log)

Seluruh 5 poin spesifikasi fitur telah diputuskan secara resmi oleh pengguna/klien:

1. **Fitur 1 (Search & Filter Status):**  
   ✅ Disetujui: Menyertakan bar pencarian instan (nama ujian, mapel, kode mapel) dan tab filter kategori status ("Semua", "Belum Dikerjakan", "Selesai").
2. **Fitur 2 (Dropdown Profile Header):**  
   ✅ Disetujui: Mengganti badge statis dengan dropdown interaktif yang berisi "Profil Saya", "Pengingat Jadwal" (auto-scroll ke widget pengingat dashboard), dan "Keluar".
3. **Fitur 3 (Halaman Profil Siswa):**  
   ✅ Disetujui: Bersifat murni **Read-Only** untuk menjaga validitas data master siswa dari pihak sekolah.
4. **Fitur 4 (Pengingat Jadwal Ujian):**  
   ✅ Disetujui: Cukup ditampilkan di widget "Informasi & Pengingat" pada dashboard siswa, dihitung secara dinamis dari jadwal ujian mendatang.
5. **Fitur 5 (Logout Siswa):**  
   ✅ Disetujui: Tombol keluar **langsung keluar seketika diklik** tanpa konfirmasi dialog demi kecepatan interaksi pengguna.

---

# 8. Status Akhir Implementasi

Semua 5 fitur telah selesai dikembangkan, diintegrasikan ke dalam antarmuka portal siswa, dan telah divalidasi berhasil dikompilasi (`npm run build` sukses 100% tanpa error).
