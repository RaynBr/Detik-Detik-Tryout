# 📊 Overall System Flow CBT — Meeting Update Documentation

**File Diagram:** [`Overall_System_Flow_CBT_Meeting_Update.drawio.xml`](file:///d:/MAGANG/exam/Sistem-Ujian-Online/dokumentasi/Overall_System_Flow_CBT_Meeting_Update.drawio.xml)  
**File Referensi Asal:** `Copy of Overall System Flow.drawio.xml`  
**Tanggal Update:** 2026-10-22  
**Prinsip Desain:** 
1. **Tampilan & Layout Asli Terjaga:** Mempertahankan 100% style referensi (`fontFamily=Recursive`, warna border `#28253D`, shadow solid, layout grid asli 1900+ baris).
2. **Tidak Membuat dari Awal:** Diagram dikembangkan langsung dari file referensi asli dengan memodifikasi node terkait dan menambahkan node/edge pelengkap secara presisi.
3. **Alur Rapi & Terstruktur:** Setiap perubahan diposisikan pada koordinat yang tepat dan terhubung dengan edge ortogonal ber-label jelas.

---

## 🔑 Rangkuman 16 Perubahan Meeting & Mapping Node

### 1. 🔐 LOGIN SYSTEM
| No | Perubahan Meeting | Node ID | Keterangan Alur |
|---|---|---|---|
| 1 | **Super Admin: Login pakai Username** | `jXDs9eMhGlA39kO6X-Dz-38` | Form Login Admin diperbarui: Super Admin verifikasi Username, Admin Instansi pakai Nomor Induk. |
| 2 | **Admin Instansi, Guru, & Siswa: Login pakai Nomor Induk** | `jXDs9eMhGlA39kO6X-Dz-44`, `45` | Guru memakai Nomor Induk / NUPTK. Siswa memakai NISN unik. |
| 3 | **Email HANYA isian profil** | `jXDs9eMhGlA39kO6X-Dz-38`, `44`, `45` | Ditegaskan pada ketiga form bahwa email bukan kredensial autentikasi. |
| 4 | **Validasi Backend** | `jXDs9eMhGlA39kO6X-Dz-4` | Validasi kredensial dipisah: Username untuk Super Admin vs Nomor Induk untuk Guru/Siswa. |

---

### 2. 👑 SUPER ADMIN
| No | Perubahan Meeting | Node ID | Keterangan Alur |
|---|---|---|---|
| 5 | **Masa Berlaku Instansi & Encrypt ID** | `l1CPpWX7XCTXfb2HIBHk-148`, `151` | Ditambahkan field Masa Berlaku Instansi (mulai s/d kadaluarsa) dan Encrypted ID pada URL/API instansi. |
| 6 | **Ganti nama/data langsung tanpa approve** | `l1CPpWX7XCTXfb2HIBHk-154` | Operasi edit data instansi langsung tersimpan ke DB tanpa alur approval. |
| 7 | **Kelola Pengguna (User BO) Lengkap** | `l1CPpWX7XCTXfb2HIBHk-160`, `165` | Form memuat: Username, Kode Instansi, Password, Alamat, Telp, Jenis Kelamin, Status Aktif, dan **History Login Terakhir**. |
| 8 | **Bank Soal: Head Detail Dulu → Detail Soal (+Pembahasan) → DB → Chart** | `l1CPpWX7XCTXfb2HIBHk-184`, `187`, `185`, `SA_BANK_SOAL_CHART` | Flow pembuatan Bank Soal dimulai dari Head Detail, lalu input butir soal dengan Pembahasan di detail soal, simpan DB, baru tampil di Chart/Grafik statistik. |
| 9 | **Edit Bank Soal langsung simpan tanpa approve** | `l1CPpWX7XCTXfb2HIBHk-189` | Update butir soal, kunci, dan pembahasan tersimpan langsung tanpa approval. |

---

### 3. 🏫 ADMIN INSTANSI
| No | Perubahan Meeting | Node ID | Keterangan Alur |
|---|---|---|---|
| 10 | **Setup Awal: Buat Guru & Admin Sekolah** | `jXDs9eMhGlA39kO6X-Dz-600` | Setup pengguna instansi untuk membuat akun Guru dan staf Admin Sekolah setara. |
| 11 | **Guru tanpa Nomor Induk → Admin Set Password** | `jXDs9eMhGlA39kO6X-Dz-600` | Jika guru belum memiliki nomor induk, password akun di-set langsung oleh Admin Instansi. |
| 12 | **Fitur Reset Password** | `jXDs9eMhGlA39kO6X-Dz-600`, `603` | Admin Instansi dapat melakukan reset password untuk Guru dan Siswa. |
| 13 | **Aturan Akses Khusus** | `jXDs9eMhGlA39kO6X-Dz-601` | Admin Instansi bisa mengelola seluruh data sekolah **KECUALI soal yang dibuat Guru** (konten ujian guru terisolasi). |
| 14 | **Rekapan Nilai Read-Only** | `jXDs9eMhGlA39kO6X-Dz-608` | Admin Instansi & Guru **Cuma Bisa Melihat (Read-Only)** rekapan nilai tanpa dapat memanipulasi nilai. |

---

### 4. 👨‍🏫 GURU
| No | Perubahan Meeting | Node ID | Keterangan Alur |
|---|---|---|---|
| 15 | **Generate Acak 50 → 10 Soal Identik + Tambah Soal Sendiri** | `jXDs9eMhGlA39kO6X-Dz-641`, `642` | Sistem memilih acak 50 soal dari bank soal, lalu mengambil 10 soal acak yang **sama persis untuk seluruh siswa**, dan guru dapat menambahkan butir soal sendiri secara manual. |
| 16 | **Kondisi Edit Soal vs Tanggal** | `GURU_DEC_LOCK`, `GURU_LOCK_SOAL`, `GURU_UNLOCK_ALL` | Jika sudah ada siswa mulai mengerjakan ujian: **Soal DIKUNCI (ga bisa diedit)**, namun **Tanggal MASIH BISA diedit**. Jika belum ada yang mulai, soal dan tanggal bebas diedit. |
| 17 | **Rekapan Nilai Guru** | `jXDs9eMhGlA39kO6X-Dz-649` | Guru hanya bisa melihat (Read-Only) rekapitulasi nilai dan analisis butir soal. |

---

### 5. 👨‍🎓 SISWA
| No | Perubahan Meeting | Node ID | Keterangan Alur |
|---|---|---|---|
| 18 | **Profil Siswa Lengkap** | `SISWA_PROFILE_INFO` | Menampilkan info kelas yang terdaftar, guru pengampu/wali kelas, NUPTK, dan NISN. |
| 19 | **Dashboard Jadwal Test (3 Status)** | `jXDs9eMhGlA39kO6X-Dz-712` | Kartu jadwal menampilkan 3 status: **🔵 Belum Dimulai**, **🟢 Sedang Berlangsung**, dan **🔴 Selesai**. |
| 20 | **Skor & Pembahasan TIDAK Langsung Keluar (Delay Sesi END)** | `jXDs9eMhGlA39kO6X-Dz-725`, `SISWA_DEC_SESI_END` | Setelah submit, nilai tidak langsung keluar melainkan ditahan sampai sesi ujian resmi berakhir. |
| 21 | **Siswa Belum Selesai / Sesi Masih Berjalan** | `SISWA_RESULT_WAIT` | Siswa hanya dapat melihat **Detail Ringkasan Saja** (bukan butir soal). |
| 22 | **Sesi Sudah Berakhir (END) & Pembahasan** | `SISWA_DEC_SUDAH_KERJAKAN`, `SISWA_SCORE_FULL`, `SISWA_NO_EXAM_VIEW` | Bagi siswa yang **sudah mengerjakan**: dapat melihat Skor Lengkap, Detail Soal, Kunci, dan Pembahasan. Bagi siswa yang **belum mengerjakan**: hanya melihat info detail sesi (tanpa soal). |

---

## 🎨 Konsistensi Desain dengan Referensi Asli

- **Font Family:** `Recursive` (Google Fonts), ukuran teks 12–14pt.
- **Warna Border & Teks:** `#28253D` dengan ketebalan stroke `2px`.
- **Efek Shadow:** Solid drop shadow (`shadowColor=#000000; shadowOffsetX=4; shadowOffsetY=4`).
- **Garis & Panah (Edges):** Orthogonal dengan `jumpStyle=arc` untuk menghindari tabrakan garis yang bersilangan.
- **Struktur File:** Mempertahankan seluruh node dan swimlane yang sudah ada pada file referensi tanpa merusak layout global.
