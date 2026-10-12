# 16. User Manual (Buku Panduan Operasional Pengguna)
**Sistem CBT Ujian Online (Online Examination System)**  
*Panduan Langkah demi Langkah untuk Siswa, Guru, Admin Sekolah, dan Super Administrator*

---

## 1. PANDUAN PENGGUNA: SISWA / PESERTA DIDIK

### 1.1. Cara Masuk ke Portal Ujian (Login)
1. Buka peramban internet (disarankan Google Chrome atau Microsoft Edge versi terbaru).
2. Akses alamat web ujian: `http://localhost:5173/login`.
3. Pada halaman login, pilih tab **"Portal Siswa"**.
4. Masukkan **NISN** (Nomor Induk Siswa Nasional) atau alamat email yang telah didaftarkan pihak sekolah.
5. Masukkan **Kata Sandi** akun Anda.
6. Klik tombol **"Masuk ke Portal Ujian"**.
7. *Penting:* Sistem menggunakan fitur *Single-Session*. Anda hanya boleh login pada satu perangkat. Jika Anda login di perangkat lain, sesi di perangkat sebelumnya otomatis keluar.

### 1.2. Memilih Ujian & Memasukkan Token
1. Setelah login berhasil, Anda akan diarahkan ke halaman **Daftar Ujian**.
2. Cari ujian yang dijadwalkan untuk kelas Anda pada hari tersebut.
3. Periksa informasi mata pelajaran, durasi pengerjaan, dan batas waktu ujian.
4. Klik tombol **"Mulai Ujian"**.
5. Jika ujian membutuhkan kode akses, masukkan **Token Ujian** (6 karakter) yang diberikan oleh guru/pengawas ruangan, lalu klik **"Konfirmasi & Mulai"**.

### 1.3. Aturan Selama Berada di Ruang Ujian (Anti-Cheat & Fullscreen)
1. **Wajib Mode Layar Penuh (Fullscreen):** Saat masuk ke lembar ujian, sistem akan meminta izin untuk beralih ke layar penuh. Anda wajib menyetujuinya. Jika Anda keluar dari layar penuh, lembar soal akan terkunci hingga Anda mengklik tombol "Kembali ke Layar Penuh".
2. **Larangan Berpindah Jendela / Tab:**
   - Dilarang menekan tombol Alt+Tab, membuka tab baru, atau meminimalkan browser.
   - Setiap kali Anda berpindah tab atau aplikasi lain, sistem akan mencatat **1 Pelanggaran**.
   - **Peringatan Keras:** Batas toleransi adalah **5 kali pelanggaran**. Jika Anda melakukan pelanggaran ke-5, sistem akan **MENDISKUALIFIKASI ANDA SECARA OTOMATIS** dengan nilai 0 dan Anda tidak dapat melanjutkan ujian.
3. **Larangan Klik Kanan & Salin Teks:** Fungsi klik kanan mouse, tombol pintas Ctrl+C, Ctrl+V, dan tombol F12 (Inspect Element) dinonaktifkan secara otomatis.

### 1.4. Mengerjakan Soal & Autosave Jawaban
1. **Memilih Jawaban:** Klik pada salah satu bulatan pilihan jawaban (A, B, C, D, atau E).
2. **Penyimpanan Otomatis (Autosave):** Jawaban Anda langsung tersimpan ke server dalam hitungan detik. Tidak ada tombol "Simpan Jawaban" manual. Nomor soal pada panel navigasi di sebelah kanan akan berubah warna menjadi biru/indigo menandakan jawaban telah aman tersimpan.
3. **Tombol Ragu-Ragu:** Jika Anda belum yakin dengan jawaban yang dipilih, klik tombol **"Ragu-ragu"**. Nomor soal akan berubah warna menjadi kuning.
4. **Navigasi Soal:** Anda dapat berpindah nomor soal secara bebas dengan mengklik nomor pada kisi navigasi atau tombol "Sebelumnya" dan "Berikutnya".
5. **Panel Waktu (Countdown Timer):** Perhatikan sisa waktu pengerjaan di pojok kanan atas layar.

### 1.5. Mengumpulkan Ujian & Melihat Hasil
1. Setelah seluruh soal terjawab, klik tombol **"Kumpulkan Ujian"** di bagian bawah soal terakhir.
2. Sistem akan menampilkan dialog konfirmasi berisi rekapitulasi jumlah soal yang sudah dijawab dan yang masih ragu-ragu.
3. Klik tombol konfirmasi **"Ya, Kumpulkan Sekarang"**.
4. Sistem akan otomatis keluar dari mode layar penuh dan menampilkan **Halaman Hasil Ujian** (Total Nilai, Jumlah Jawaban Benar, Jumlah Jawaban Salah, dan Status Kelulusan KKM).

---

## 2. PANDUAN PENGGUNA: GURU / PENGAJAR

### 2.1. Cara Masuk ke Portal Guru
1. Akses alamat web ujian: `http://localhost:5173/login`.
2. Pilih tab **"Portal Staf / Guru"**.
3. Masukkan **Username** atau **Email** guru dan **Kata Sandi**.
4. Klik tombol **"Masuk sebagai Guru"**.

### 2.2. Mengelola Bank Soal & Impor Dokumen Word (.docx)
1. Klik menu **"Bank Soal"** pada bilah navigasi sebelah kiri.
2. **Input Manual:** Klik tombol **"Tambah Soal"**, isi pertanyaan, opsi A–E, gambar pendukung (jika ada), kunci jawaban benar, dan penjelasan/pembahasan.
3. **Impor Otomatis dari Word (.docx):**
   - Klik tombol **"Import Soal"**.
   - Unduh template format naskah soal yang disediakan jika belum memiliki format standar.
   - Pilih berkas dokumen Microsoft Word (`.docx`) yang berisi naskah soal Anda.
   - Klik **"Proses Impor"**. Sistem akan otomatis mengekstrak seluruh teks, formula matematika, dan gambar inline ke dalam bank soal.

### 2.3. Membuat Paket Ujian & Menggunakan Generator 50 Acak
1. Klik menu **"Paket Ujian"**.
2. Klik tombol **"Buat Paket Baru"**.
3. Masukkan Judul Ujian (misal: "Asesmen Sumatif Matematika Kelas X"), pilih Mata Pelajaran, Jenjang, dan Durasi Waktu (misal: 60 menit).
4. **Pilihan Penyusunan Soal:**
   - *Opsi 1 (Generator Acak):* Klik tombol **"Generate 50 Soal Acak"**. Sistem akan secara instan memilih 50 butir soal acak dari bank soal sesuai mapel dan jenjang tersebut.
   - *Opsi 2 (Pilih Manual):* Centang butir-butir soal tertentu dari bank soal yang ingin diujikan.
5. Klik **"Simpan Paket Ujian"**.

### 2.4. Menjadwalkan Ujian ke Kelas & Menerbitkan Token
1. Pada daftar paket ujian, klik tombol **"Tugaskan ke Kelas"** (*Assign Class*).
2. Tentukan rombongan belajar kelas sasaran (misal: Kelas X-RPL 1).
3. Atur tanggal & jam mulai serta batas waktu penutupan ujian.
4. Buat kode **Token Ujian** (misal: `PAS2026`).
5. Klik **"Simpan & Aktifkan Jadwal"**. Bagikan kode token kepada siswa saat sesi ujian hendak dimulai.

### 2.5. Memantau Nilai & Mengunduh Rekapitulasi Hasil
1. Klik menu **"Laporan & Nilai"**.
2. Pilih paket ujian yang telah selesai dikerjakan.
3. Anda dapat melihat daftar nama siswa, nilai perolehan, waktu pengumpulan, dan analisis statistik butir soal.
4. Klik tombol **"Export Laporan (Excel/CSV)"** untuk mengunduh rekapitulasi nilai lengkap untuk arsip raport.

---

## 3. PANDUAN PENGGUNA: ADMIN INSTANSI / SEKOLAH

### 3.1. Mengelola Data Ruang Kelas
1. Masuk ke portal admin sekolah, lalu pilih menu **"Master Kelas"**.
2. Klik **"Tambah Kelas Baru"**.
3. Masukkan Nama Kelas (format bebas, misal: "X RPL 1", "7 Unggulan A"), pilih Jenjang, Tingkat, Kapasitas, dan pilih Guru yang ditugaskan sebagai Wali Kelas.
4. Klik **"Simpan"**.

### 3.2. Mengelola Mata Pelajaran & Penugasan Guru
1. Pilih menu **"Mata Pelajaran"**.
2. Klik **"Tambah Mata Pelajaran"**, masukkan Kode Mapel, Nama Mapel, dan standar batas nilai KKM (default: 75.00).
3. Pada baris mata pelajaran, klik tombol **"Tugaskan Guru"** untuk memetakan guru pengampu ke mata pelajaran dan ruang kelas yang sesuai.

### 3.3. Mendaftarkan Siswa & Impor Masal dari Excel
1. Pilih menu **"Data Siswa"**.
2. Untuk mendaftarkan siswa dalam jumlah banyak, klik tombol **"Import Siswa (Excel)"**.
3. Unduh berkas template spreadsheet yang disediakan.
4. Isi data siswa (NISN, Nama Lengkap, Kelas, Email, dan Kata Sandi Awal).
5. Unggah kembali berkas Excel tersebut dan klik **"Proses Impor"**. Seluruh akun siswa akan langsung terdaftar dan dapat login.

---

## 4. PANDUAN PENGGUNA: SUPER ADMINISTRATOR

### 4.1. Manajemen Multi-Tenant (Instansi Baru)
1. Masuk menggunakan akun Super Admin.
2. Buka menu **"Instansi / Mitra"**.
3. Klik **"Tambah Instansi Baru"**, masukkan nama sekolah/lembaga mitra.
4. Klik tombol **"Buat Akun Admin Sekolah"** untuk menerbitkan username dan password bagi petugas operator sekolah yang bersangkutan.

### 4.2. Menjalankan Pre-Flight System Check & Live Monitoring
1. Sebelum ujian akbar berlangsung, buka menu **"System Health"**.
2. Sistem akan menampilkan uji latensi database MySQL (`SELECT 1`), status cache, dan antrean job. Pastikan status berlabel **"OK"** dengan latensi di bawah 10 ms.
3. Buka menu **"Live Monitoring"** untuk memantau volume peserta yang sedang terhubung secara nasional serta mendeteksi sekolah yang mengalami kendala teknis.
