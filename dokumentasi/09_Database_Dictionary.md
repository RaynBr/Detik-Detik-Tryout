# 09. Database Dictionary (Kamus Data)
**Sistem CBT Ujian Online (Online Examination System)**  
*Kamus Data Rinci Seluruh Tabel Aktif pada Basis Data MySQL `sertidemi`*

---

## 1. Tabel: `kategori_user_bo`
Menyimpan identitas entitas Instansi, Lembaga, atau Sekolah mitra penyelenggara ujian (dasar *multi-tenancy*).

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `idkategori` | `varchar(25)` | NO | PRI | - | Kode pengenal unik instansi (primary key). |
| `nama_kategori` | `text` | NO | - | - | Nama lengkap sekolah atau institusi. |
| `tgl_input` | `datetime` | NO | - | CURRENT_TIMESTAMP | Waktu pertama kali instansi didaftarkan. |
| `status_remove` | `varchar(1)` | NO | - | 'N' | Status penghapusan logis ('Y': terhapus, 'N': aktif). |

---

## 2. Tabel: `user_bo`
Menyimpan data staf back-office internal, mencakup Super Admin, Admin Instansi, dan Guru/Pengajar.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `iduser_bo` | `varchar(25)` | NO | PRI | - | ID unik staf/guru (primary key). |
| `idkategori` | `varchar(25)` | YES | MUL | NULL | Relasi ke instansi (`kategori_user_bo.idkategori`). |
| `nama` | `text` | YES | - | NULL | Nama lengkap staf/guru. |
| `telp` | `varchar(25)` | YES | - | NULL | Nomor kontak telepon/WhatsApp. |
| `alamat` | `text` | YES | - | NULL | Alamat tempat tinggal. |
| `login_email` | `text` | YES | - | NULL | Email resmi untuk masuk ke sistem. |
| `login_username`| `text` | YES | - | NULL | Username unik staf untuk login. |
| `login_password`| `text` | YES | - | NULL | Hash kata sandi (Bcrypt / 5x Base64 legacy). |
| `status_admin` | `varchar(1)` | NO | - | '2' | Kode peran legacy ('1': Super Admin, '2': Guru/Admin). |
| `role_type` | `varchar(30)` | YES | - | NULL | Peran terstruktur ('super_admin', 'admin_sekolah', 'guru'). |
| `status_aktif` | `varchar(2)` | NO | - | 'Y' | Status akun ('Y': Aktif, 'N': Nonaktif). |
| `status_remove`| `varchar(1)` | NO | - | 'N' | Status penghapusan ('Y': Terhapus, 'N': Tidak). |
| `active_session_token` | `varchar(100)` | YES | - | NULL | Token sesi login aktif (*single-session lock*). |
| `last_login_at`| `datetime` | YES | - | NULL | Waktu terakhir kali staf berhasil login. |

---

## 3. Tabel: `user`
Menyimpan data peserta didik / siswa yang berhak mengikuti ujian online.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `iduser` | `varchar(36)` | NO | PRI | - | ID unik siswa (primary key). |
| `nama` | `varchar(50)` | YES | - | NULL | Nama lengkap siswa. |
| `nisn` | `varchar(30)` | YES | - | NULL | Nomor Induk Siswa Nasional (kredensial login utama). |
| `idkelas` | `int unsigned` | YES | MUL | NULL | ID kelas aktif siswa (`master_kelas.id`). |
| `idkategori` | `varchar(25)` | YES | MUL | NULL | ID instansi sekolah siswa (`kategori_user_bo.idkategori`). |
| `telp` | `varchar(25)` | YES | - | NULL | Nomor telepon siswa/wali. |
| `alamat` | `varchar(100)` | YES | - | NULL | Alamat tempat tinggal. |
| `login_email` | `varchar(50)` | YES | - | NULL | Alamat email terdaftar siswa. |
| `login_password`| `varchar(100)`| YES | - | NULL | Kata sandi login terenkripsi Bcrypt / teks polos. |
| `status_aktif` | `varchar(2)` | NO | - | 'N' | Status keaktifan akun siswa ('Y': Aktif, 'N': Nonaktif). |
| `url_image` | `varchar(100)` | NO | - | 'default.png' | Foto profil siswa. |
| `active_session_token` | `varchar(100)` | YES | - | NULL | Token sesi login aktif siswa (*single-session lock*). |
| `last_login_at`| `datetime` | YES | - | NULL | Waktu terakhir siswa berhasil login. |

---

## 4. Tabel: `master_jenjang`
Menyimpan klasifikasi jenjang pendidikan formal.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `int unsigned` | NO | PRI | Auto Inc | Primary key jenjang. |
| `kode_jenjang` | `varchar(20)` | NO | UNI | - | Kode unik jenjang (contoh: 'SD', 'SMP', 'SMA', 'SMK'). |
| `nama_jenjang` | `varchar(100)`| NO | - | - | Nama lengkap jenjang pendidikan. |
| `urutan` | `int` | NO | - | 1 | Urutan hierarki tampilan jenjang. |
| `keterangan` | `text` | YES | - | NULL | Catatan deskripsi tambahan. |
| `status_aktif` | `enum('Y','N')`| NO | - | 'Y' | Status aktif jenjang. |

---

## 5. Tabel: `master_kelas`
Menyimpan data rombongan belajar / ruang kelas per instansi.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `int unsigned` | NO | PRI | Auto Inc | Primary key kelas. |
| `idjenjang` | `int unsigned` | NO | MUL | - | Relasi ke `master_jenjang.id`. |
| `idkategori` | `varchar(25)` | YES | MUL | NULL | Relasi ke `kategori_user_bo.idkategori`. |
| `nama_kelas` | `varchar(50)` | NO | - | - | Nama ruang kelas (format penamaan bebas). |
| `tingkat` | `int` | NO | - | 10 | Angka tingkat kelas (misal: 10, 11, 12). |
| `jurusan` | `varchar(100)`| YES | - | 'Umum' | Nama peminatan/jurusan (IPA, IPS, TKJ, dll). |
| `wali_kelas_id`| `varchar(25)` | YES | MUL | NULL | Relasi guru wali kelas (`user_bo.iduser_bo`). |
| `kapasitas` | `int` | NO | - | 36 | Daya tampung jumlah siswa dalam kelas. |
| `status_aktif` | `enum('Y','N')`| NO | - | 'Y' | Status keaktifan kelas. |

---

## 6. Tabel: `master_mata_pelajaran`
Katalog mata pelajaran dan Kriteria Ketuntasan Minimal (KKM).

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `int unsigned` | NO | PRI | Auto Inc | Primary key mata pelajaran. |
| `idjenjang` | `int unsigned` | NO | MUL | - | Relasi ke `master_jenjang.id`. |
| `kode_mapel` | `varchar(30)` | NO | UNI | - | Kode unik mata pelajaran (misal: 'MAT-10'). |
| `nama_mapel` | `varchar(100)`| NO | - | - | Nama mata pelajaran. |
| `kelompok` | `varchar(50)` | NO | - | 'Wajib' | Klasifikasi mapel (Wajib, Peminatan, Mulok). |
| `kkm` | `decimal(5,2)` | NO | - | 75.00 | Nilai standar batas kelulusan minimal. |
| `status_aktif` | `enum('Y','N')`| NO | - | 'Y' | Status aktif mata pelajaran. |

---

## 7. Tabel: `guru_mata_pelajaran`
Tabel relasi penugasan guru pengampu ke mata pelajaran dan kelas spesifik.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `int unsigned` | NO | PRI | Auto Inc | Primary key penugasan. |
| `iduser_bo` | `varchar(25)` | NO | MUL | - | ID Guru (`user_bo.iduser_bo`). |
| `idmapel` | `int unsigned` | NO | MUL | - | ID Mapel (`master_mata_pelajaran.id`). |
| `idkelas` | `int unsigned` | YES | MUL | NULL | ID Kelas yang diampu (`master_kelas.id`). |
| `tahun_ajaran` | `varchar(20)` | NO | - | '2026/2027' | Tahun ajaran berlaku. |

---

## 8. Tabel: `siswa_kelas`
Riwayat alokasi penempatan kelas siswa per periode tahun ajaran.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `int unsigned` | NO | PRI | Auto Inc | Primary key riwayat. |
| `iduser` | `varchar(36)` | NO | MUL | - | ID Siswa (`user.iduser`). |
| `idkelas` | `int unsigned` | NO | MUL | - | ID Kelas penempatan (`master_kelas.id`). |
| `nisn` | `varchar(30)` | YES | - | NULL | Nomor NISN siswa pada saat penempatan. |
| `tahun_ajaran` | `varchar(20)` | NO | - | '2026/2027' | Periode tahun ajaran. |
| `status` | `enum` | NO | - | 'aktif' | Status penempatan ('aktif', 'lulus', 'mutasi'). |

---

## 9. Tabel: `assessment`
Induk data paket ujian atau TryOut yang diterbitkan.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `idassessment` | `varchar(30)` | NO | PRI | - | ID unik paket ujian (primary key). |
| `nama_assessment`| `varchar(100)`| YES | - | NULL | Judul / nama paket ujian. |
| `idkategori` | `varchar(25)` | YES | MUL | NULL | ID instansi pemilik ujian (`kategori_user_bo`). |
| `deskripsi_assessment` | `text` | YES | - | NULL | Deskripsi petunjuk pengerjaan ujian. |
| `tanggal_mulai_assessment` | `datetime`| NO | - | - | Waktu pembukaan akses ujian. |
| `tanggal_batas_assessment` | `datetime`| YES | - | NULL | Batas akhir penutupan akses ujian. |
| `waktu_pengerjaan` | `varchar(5)` | YES | - | NULL | Durasi ujian dalam satuan menit (standar: 60/90). |
| `tampil_assessment_pilgan` | `int` | NO | - | 0 | Jumlah soal pilihan ganda yang ditampilkan (misal: 50). |
| `iduser_bo` | `varchar(25)` | YES | MUL | NULL | Guru/staf pembuat paket ujian (`user_bo`). |
| `idjenjang` | `int unsigned` | YES | - | NULL | Sasaran jenjang ujian (`master_jenjang.id`). |
| `idkelas` | `int unsigned` | YES | - | NULL | Sasaran kelas khusus (jika bukan untuk umum). |
| `idmapel` | `int unsigned` | YES | - | NULL | Mata pelajaran ujian (`master_mata_pelajaran.id`). |

---

## 10. Tabel: `assessment_soal_pilgan`
Menyimpan butir naskah soal pilihan ganda, pilihan jawaban A–E, dan kunci jawaban.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `idassessment_soal_pilgan` | `varchar(30)` | NO | PRI | - | ID unik butir soal (primary key). |
| `idassessment` | `varchar(30)` | YES | MUL | NULL | Relasi ke paket ujian induk (`assessment.idassessment`). |
| `idjenjang` | `int unsigned` | YES | MUL | NULL | Jenjang butir soal. |
| `idmapel` | `int unsigned` | YES | MUL | NULL | Mata pelajaran butir soal. |
| `soal_text` | `text` | YES | - | NULL | Naskah teks pertanyaan soal (mendukung LaTeX KaTeX). |
| `soal_gambar` | `tinytext` | YES | - | NULL | URL path gambar lampiran pertanyaan. |
| `pilihan_a_text` | `text` | YES | - | NULL | Teks konten pilihan jawaban A. |
| `pilihan_a_gambar`| `tinytext` | YES | - | NULL | Gambar lampiran pilihan jawaban A. |
| `pilihan_b_text` | `text` | YES | - | NULL | Teks konten pilihan jawaban B. |
| `pilihan_b_gambar`| `tinytext` | YES | - | NULL | Gambar lampiran pilihan jawaban B. |
| `pilihan_c_text` | `text` | YES | - | NULL | Teks konten pilihan jawaban C. |
| `pilihan_c_gambar`| `tinytext` | YES | - | NULL | Gambar lampiran pilihan jawaban C. |
| `pilihan_d_text` | `text` | YES | - | NULL | Teks konten pilihan jawaban D. |
| `pilihan_d_gambar`| `tinytext` | YES | - | NULL | Gambar lampiran pilihan jawaban D. |
| `pilihan_e_text` | `text` | YES | - | NULL | Teks konten pilihan jawaban E. |
| `pilihan_e_gambar`| `tinytext` | YES | - | NULL | Gambar lampiran pilihan jawaban E. |
| `jawaban` | `varchar(5)` | YES | - | NULL | Kunci jawaban benar (bernilai 'A', 'B', 'C', 'D', atau 'E'). |
| `penjelasan_jawaban` | `text` | YES | - | NULL | Pembahasan/penjelasan naskah soal. |

---

## 11. Tabel: `exam_groups`
Menyimpan pengaturan sesi pelaksanaan ujian per kelompok/kelas lengkap dengan token akses.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `bigint unsigned` | NO | PRI | Auto Inc | Primary key sesi ujian. |
| `exam_id` | `varchar(50)` | NO | MUL | - | ID paket ujian (`assessment.idassessment`). |
| `name` | `varchar(255)` | NO | - | - | Nama sesi ujian (contoh: "Sesi Pagi Kelas X-A"). |
| `start_time` | `datetime` | YES | - | NULL | Waktu mulai sesi spesifik. |
| `end_time` | `datetime` | YES | - | NULL | Waktu batas berakhir sesi. |
| `token` | `varchar(20)` | YES | - | NULL | Kode token akses rahasia yang wajib diinput siswa. |
| `max_participants`| `int` | YES | - | 100 | Kuota kapasitas peserta maksimum dalam sesi. |
| `class_ids` | `text` | YES | - | NULL | JSON array ID kelas yang diizinkan (misal: `[1, 2]`). |
| `student_ids` | `text` | YES | - | NULL | JSON array ID siswa spesifik yang diizinkan. |

---

## 12. Tabel: `transaksi`
Tabel transaksi platform Sertidemi yang wajib diisi saat siswa memulai ujian.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `idtransaksi` | `varchar(30)` | NO | PRI | - | ID transaksi pengerjaan (primary key). |
| `invoice` | `varchar(50)` | YES | - | NULL | Nomor invoice otomatis (misal: `TR-261011-8721`). |
| `nama_sertifikat`| `varchar(100)`| YES | - | NULL | Nama peserta ujian. |
| `jumlah_point` | `int` | NO | - | 0 | Jumlah poin (standar: 0 untuk ujian sekolah). |
| `jenis_transaksi`| `varchar(30)` | YES | - | NULL | Diisi string `'assessment'` untuk ujian. |
| `iduser` | `varchar(36)` | YES | MUL | NULL | Relasi ke siswa (`user.iduser`). |
| `status_transaksi`| `varchar(10)`| YES | - | NULL | Diisi `'7'` (status transaksi sah/selesai). |

---

## 13. Tabel: `assessment_jawaban_pilgan`
Rekaman sesi pengerjaan ujian siswa (*Exam Attempt Master*).

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `idassessment_jawaban_pilgan` | `varchar(30)` | NO | PRI | - | ID sesi pengerjaan siswa (primary key). |
| `idassessment` | `varchar(30)` | YES | MUL | NULL | Relasi ke paket ujian (`assessment.idassessment`). |
| `iduser` | `varchar(30)` | YES | MUL | NULL | Relasi ke siswa (`user.iduser`). |
| `idtransaksi` | `varchar(30)` | YES | MUL | NULL | Relasi ke tabel `transaksi.idtransaksi`. |
| `nilai` | `int` | YES | - | 0 | Nilai akhir skor ujian siswa (skala 0–100). |
| `komentar` | `varchar(100)` | YES | - | NULL | Status pengerjaan ('in_progress', 'submitted', 'disqualified'). |
| `lama_dikerjakan` | `char(10)` | YES | - | NULL | Durasi pengerjaan siswa dalam format waktu. |
| `tgl_input_time` | `datetime` | NO | - | CURRENT_TIMESTAMP | Waktu saat siswa pertama kali memulai ujian. |

---

## 14. Tabel: `assessment_jawaban_pilgan_detail`
Rekaman butir pilihan jawaban siswa per nomor soal (*Autosave Engine*).

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `idassessment_jawaban_pilgan_detail` | `varchar(30)` | NO | PRI | - | ID rekaman lembar jawaban (primary key). |
| `idassessment_jawaban_pilgan` | `varchar(30)` | YES | MUL | NULL | Relasi ke sesi pengerjaan (`assessment_jawaban_pilgan`). |
| `idassessment_soal_pilgan` | `varchar(30)` | YES | MUL | NULL | Relasi ke butir soal (`assessment_soal_pilgan`). |
| `jawaban` | `varchar(2)` | NO | - | - | Pilihan huruf yang dipilih siswa ('A', 'B', 'C', 'D', 'E'). |

---

## 15. Tabel: `personal_access_tokens`
Tabel token autentikasi stateless bawaan Laravel Sanctum.

| Nama Kolom | Tipe Data | Null | Kunci | Default | Keterangan & Aturan Bisnis |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `bigint unsigned` | NO | PRI | Auto Inc | Primary key token. |
| `tokenable_type` | `varchar(255)` | NO | MUL | - | Model pemilik token (`App\Models\UserBo` atau `App\Models\UserSiswa`). |
| `tokenable_id` | `varchar(64)` | NO | - | - | String primary key (`iduser_bo` atau `iduser`). |
| `name` | `varchar(255)` | NO | - | - | Nama token (`cbt_auth_token`). |
| `token` | `varchar(64)` | NO | UNI | - | Hash SHA-256 dari token otentikasi. |
| `abilities` | `text` | YES | - | NULL | Hak kemampuan token (*abilities*). |
| `last_used_at` | `timestamp` | YES | - | NULL | Waktu terakhir token dipakai untuk request API. |
| `expires_at` | `timestamp` | YES | MUL | NULL | Waktu kadaluarsa token (480 menit dari login). |
