# Requirement Change Analysis & Sign-Off

**Proyek:** Sistem CBT Ujian Online (Online Examination System)  
**Tanggal:** 15 Oktober 2026  
**Status:** Disetujui untuk Implementasi (*Approved by Client / PO*)  
**Dasar Kebenaran:** Source Code Faktual (Laravel 12 & React 19) & Database `sertidemi`

---

## 1. Hasil Validasi & Keputusan Kebutuhan

Berdasarkan review dan konfirmasi terakhir dari pengguna:
1. **Poin 1 & 2 (Landing Page & Login Role Selector):** Disetujui. Pengguna diarahkan ke Landing Page terlebih dahulu di root `/`, dengan tombol login yang memicu pemilihan peran bertingkat:
   - Level 1: Admin, Guru, Siswa
   - Level 2 (Admin): Super Admin vs Admin Instansi
2. **Poin 3 (Dashboard Admin Instansi - Metrik & Laporan):** **Dilanjutkan untuk dibuat.** Mencakup:
   - Metrik riil tenant: Jumlah Guru, Jumlah Siswa, Jumlah Kelas, Jumlah Paket Ujian, Jumlah Bank Soal (berdasarkan `idkategori` sekolah).
   - Laporan pemetaan Guru Mengajar Kelas Apa (Wali Kelas & Guru Pengampu).
   - Laporan Daftar Siswa per Rombel Kelas.
   - Laporan Rekapitulasi Nilai Siswa per Paket Ujian & Statistik KKM 75.
3. **Poin 4 (Bank Soal - Validasi Generate Paket):** Disetujui. Guru dilarang keras mengenerate paket soal jika bank soal untuk kombinasi jenjang dan mapel belum tersedia. Tampilkan validasi penolakan dan arahkan ke upload bank soal.
4. **Poin 5 (Upload Bank Soal):** **Mendukung format file .xlsx dan .csv**, serta opsi Input Manual.
5. **Poin 6 (Import Guru & Siswa):** **Mendukung format file .xlsx dan .csv** dengan validasi duplikasi, isolasi `idkategori`, dan transaksi database rollback.

---

## 2. Rincian Teknis Implementasi

### A. Backend Services & Controllers
1. **SimpleSpreadsheetService (`app/Services/SimpleSpreadsheetService.php`):**
   - Layanan pembaca file spreadsheet universal tanpa ketergantungan library luar yang berisiko.
   - Mendukung format `.csv` (dengan deteksi delimiter koma/titik koma dan UTF-8 BOM).
   - Mendukung format `.xlsx` (menggunakan ekstraksi arsip ZIP native PHP terhadap `xl/worksheets/sheet1.xml` dan `xl/sharedStrings.xml`).
2. **LoginController (`app/Http/Controllers/Api/Auth/LoginController.php`):**
   - Menerima parameter `expected_role`.
   - Memastikan pengguna yang memilih login Admin Instansi tidak bisa masuk jika kredensialnya milik Super Admin, Guru, atau Siswa.
3. **DashboardController (`app/Http/Controllers/Api/Admin/DashboardController.php`):**
   - Menambahkan pengkondisian `idkategori` pada method `stats()`.
   - Menambahkan endpoint `reports()` untuk menyajikan laporan akademik instansi.
4. **TeacherExamController (`app/Http/Controllers/Api/Teacher/TeacherExamController.php`):**
   - Pada method `generateRandom50()`, memvalidasi ketersediaan butir soal pada jenjang dan mapel terpilih. Jika 0, kembalikan HTTP 422 dengan pesan penolakan dan kode `EMPTY_QUESTION_BANK`. Menghapus fallback query acak lintas mapel.
5. **TeacherController (`app/Http/Controllers/Api/Admin/TeacherController.php`):**
   - Menambahkan method `downloadTemplate()` (format CSV/XLSX).
   - Menambahkan method `import(Request $request)` dengan validasi duplikasi email/username dan enkripsi 5x Base64 `user_bo`.
6. **StudentController (`app/Http/Controllers/Api/Admin/StudentController.php`):**
   - Menambahkan method `downloadTemplate()`.
   - Mengimplementasikan method `import(Request $request)` untuk menyimpan ke tabel `user` dan relasi `siswa_kelas`.

### B. Frontend Components & Routing
1. **LandingPage (`frontend/src/features/landing/LandingPage.tsx`):**
   - Halaman depan modern bertema glassmorphism dengan logo, deskripsi platform, tombol Login.
2. **RoleSelectionModal (`frontend/src/features/auth/components/RoleSelectionModal.tsx`):**
   - Modal 2 tahap untuk memilih peran: Siswa, Guru, Admin (Super Admin / Admin Instansi).
3. **LoginPage (`frontend/src/features/auth/components/LoginPage.tsx`):**
   - Menyesuaikan tampilan form sesuai role dari query parameter `?role=...`.
4. **AdminDashboard (`frontend/src/features/admin/AdminDashboard.tsx`):**
   - Menambahkan visualisasi metrik tenant dan widget tab laporan: Guru Mengajar, Siswa per Kelas, Nilai per Paket Ujian.
5. **ExamsPage (`frontend/src/features/teacher/ExamsPage.tsx`):**
   - Validasi generate soal dengan modal dialog peringatan dan tombol CTA langsung menuju Upload Bank Soal.
6. **TeacherImportModal & StudentImportModal (`frontend/src/features/admin/components/`):**
   - Modal unggah file Excel/CSV untuk import guru dan siswa dengan preview dan download template.
