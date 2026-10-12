# 03. User Requirement Document (URD)
**Sistem CBT Ujian Online (Online Examination System)**  
*Analisis Kebutuhan Berdasarkan Aktor & Peran Nyata pada Source Code*

---

## 1. Identifikasi Aktor Sistem

Berdasarkan struktur autentikasi tabel `user_bo` dan `user` serta middleware `CheckRole.php`, sistem mendefinisikan 4 (empat) aktor utama:

| Aktor | Sumber Identitas di Database | Keterangan & Lingkup Tanggung Jawab |
| :--- | :--- | :--- |
| **Super Admin** | `user_bo` (`status_admin = '1'` / `role_type = 'super_admin'`) | Penanggung jawab teknis global lintas instansi/sekolah. |
| **Admin Instansi** | `user_bo` (`role_type = 'admin_sekolah'`) | Staf manajemen operasional internal sekolah/instansi mitra (`idkategori`). |
| **Guru / Pengajar** | `user_bo` (`role_type = 'guru'` / `status_admin = '2'`) | Pendidik pembuat konten soal, perancang paket ujian, dan penilai. |
| **Siswa / Peserta** | `user` (`role = 'siswa'`) | Peserta didik yang terdaftar dalam kelas dan instansi tertentu. |

---

## 2. Kebutuhan Pengguna Berdasarkan Peran (User Requirements by Role)

### 2.1. Kebutuhan Super Administrator (Super Admin)
1. **UR-SA-01:** Super Admin membutuhkan kemampuan untuk melihat, menambah, mengubah, dan menonaktifkan data instansi (`kategori_user_bo`) secara global.
2. **UR-SA-02:** Super Admin membutuhkan kemampuan untuk membuat dan mengelola akun Administrator Sekolah untuk setiap instansi yang terdaftar.
3. **UR-SA-03:** Super Admin membutuhkan kemampuan untuk mengonfigurasi master jenjang pendidikan (`master_jenjang`: SD, SMP, SMA, SMK) yang berlaku di sistem.
4. **UR-SA-04:** Super Admin membutuhkan alat diagnostik kesehatan server (*Pre-Flight Check*) untuk memverifikasi latensi koneksi basis data MySQL dan performa penyimpanan cache sebelum pelaksanaan ujian berskala besar.
5. **UR-SA-05:** Super Admin membutuhkan panel pemantauan langsung (*Live Monitoring*) untuk melihat jumlah total ujian yang sedang aktif dan volume peserta yang sedang terhubung.

### 2.2. Kebutuhan Administrator Instansi / Sekolah (Admin Instansi)
1. **UR-AI-01:** Admin Instansi membutuhkan antarmuka untuk mengelola data ruang kelas (`master_kelas`) dengan penamaan fleksibel, kuota siswa, dan penetapan guru wali kelas.
2. **UR-AI-02:** Admin Instansi membutuhkan fitur untuk mengelola mata pelajaran (`master_mata_pelajaran`) dan menetapkan nilai Kriteria Ketuntasan Minimal (KKM).
3. **UR-AI-03:** Admin Instansi membutuhkan fitur pemetaan guru pengampu ke mata pelajaran dan ruang kelas spesifik (`guru_mata_pelajaran`).
4. **UR-AI-04:** Admin Instansi membutuhkan fitur pendataan akun guru (`user_bo`) dan akun siswa (`user`) di bawah instansinya, termasuk fasilitas impor data siswa masal dari berkas spreadsheet Excel.
5. **UR-AI-05:** Admin Instansi membutuhkan jaminan bahwa data sekolahnya tidak dapat dilihat, diubah, atau diakses oleh admin dari instansi sekolah lain (*Multi-Tenant Isolation*).

### 2.3. Kebutuhan Guru / Pengajar (Teacher)
1. **UR-GU-01:** Guru membutuhkan fasilitas pembuatan dan pengelolaan butir soal pilihan ganda (opsi A hingga E), dilengkapi media gambar pada soal maupun pilihan jawaban, serta kolom pembahasan.
2. **UR-GU-02:** Guru membutuhkan dukungan penulisan formula matematika dan sains menggunakan simbol LaTeX / KaTeX pada naskah soal.
3. **UR-GU-03:** Guru membutuhkan fitur impor naskah soal instan dari dokumen Microsoft Word (`.docx`) dan spreadsheet CSV agar tidak perlu memasukkan soal satu per satu secara manual.
4. **UR-GU-04:** Guru membutuhkan generator otomatis yang dapat menyusun paket ujian 50 butir soal acak dari bank soal sesuai mata pelajaran dan jenjang terpilih.
5. **UR-GU-05:** Guru membutuhkan fitur penjadwalan ujian (`exam_groups`): menetapkan tanggal/jam mulai, batas selesai, kode token akses, serta membatasi peserta berdasarkan rombongan belajar kelas.
6. **UR-GU-06:** Guru membutuhkan laporan hasil ujian siswa yang memuat nilai akhir, status kelulusan KKM, analisis benar/salah, serta fasilitas ekspor data laporan.

### 2.4. Kebutuhan Siswa / Peserta Ujian (Student)
1. **UR-SI-01:** Siswa membutuhkan akses login yang mudah menggunakan Nomor Induk Siswa Nasional (NISN) atau Email terdaftar.
2. **UR-SI-02:** Siswa membutuhkan perlindungan sesi (*Single-Session Lock*) agar akunnya tidak dapat disalahgunakan oleh pihak lain saat ujian sedang berlangsung.
3. **UR-SI-03:** Siswa membutuhkan portal yang menampilkan daftar ujian aktif yang ditujukan untuk kelasnya, lengkap dengan informasi mata pelajaran, durasi waktu, dan status pengerjaan.
4. **UR-SI-04:** Siswa membutuhkan lembar pengerjaan ujian yang responsif dengan nomor soal navigasi, opsi penanda "Ragu-ragu", dan panel sisa waktu pengerjaan (*countdown timer*).
5. **UR-SI-05:** Siswa membutuhkan kepastian penyimpanan jawaban otomatis (*real-time autosave*) setiap kali opsi jawaban diklik, sehingga jawaban tidak hilang jika koneksi internet terputus.
6. **UR-SI-06:** Siswa membutuhkan tampilan konfirmasi pengumpulan ujian dan informasi perolehan nilai akhir setelah ujian selesai diserahkan.

---

## 3. Matriks Hak Akses Pengguna (Access Control Matrix)

| Modul & Entitas Fungsional | Super Admin | Admin Instansi | Guru | Siswa |
| :--- | :---: | :---: | :---: | :---: |
| **Manajemen Instansi (`kategori_user_bo`)** | Full Access | Ditolak | Ditolak | Ditolak |
| **Master Jenjang (`master_jenjang`)** | Full Access | Read-Only | Read-Only | Ditolak |
| **Master Kelas (`master_kelas`)** | Full Access | Scoped Tenant | Read-Only | Ditolak |
| **Master Mapel (`master_mata_pelajaran`)** | Full Access | Scoped Tenant | Read-Only | Ditolak |
| **Penugasan Guru Mapel (`guru_mata_pelajaran`)** | Full Access | Scoped Tenant | Read-Only | Ditolak |
| **Data Guru (`user_bo`)** | Full Access | Scoped Tenant | Profil Sendiri | Ditolak |
| **Data Siswa (`user`)** | Full Access | Scoped Tenant | Read-Only | Profil Sendiri |
| **Bank Soal (`assessment_soal_pilgan`)** | Full Access | Scoped Tenant | Full Access (Buat/Edit/Impor) | Ditolak (Hanya Soal Ujian) |
| **Paket Ujian (`assessment` & `exam_groups`)** | Full Access | Scoped Tenant | Full Access | Read Ujian Terjadwal |
| **Pengerjaan Ujian Siswa (`attempts`)** | Read Metrik | Read Metrik | Read Nilai | Create / Update (Pengerjaan) |
| **Pre-Flight Health Check Server** | Full Access | Ditolak | Ditolak | Ditolak |
| **Live Monitoring Proctoring** | Full Access | Scoped Tenant | Scoped Ujian | Ditolak |

---

## 4. Bagian yang Perlu Konfirmasi Klien (Pending Confirmation)
- ⚠ **[Perlu Konfirmasi]** Kebutuhan hak akses Wali Kelas: Apakah wali kelas memiliki dashboard khusus untuk memantau rekap nilai seluruh siswa di kelas bimbingannya?
- ⚠ **[Perlu Konfirmasi]** Kebijakan pengubahan kunci jawaban pasca-ujian: Apakah guru diizinkan mengoreksi kunci jawaban soal setelah ujian selesai dan memicu penilaian ulang (*re-grading*) otomatis?
