# 08. Entity Relationship Diagram (ERD) Documentation
**Sistem CBT Ujian Online (Online Examination System)**  
*Dokumentasi Relasi Basis Data Berdasarkan Skema Aktual MySQL `sertidemi`*

---

## 1. Visualisasi Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    kategori_user_bo ||--o{ user_bo : "memiliki staf/guru"
    kategori_user_bo ||--o{ master_kelas : "memiliki ruang kelas"
    kategori_user_bo ||--o{ user : "memiliki siswa"
    kategori_user_bo ||--o{ assessment : "memiliki paket ujian"

    master_jenjang ||--o{ master_kelas : "klasifikasi jenjang"
    master_jenjang ||--o{ master_mata_pelajaran : "kurikulum jenjang"
    master_jenjang ||--o{ assessment : "sasaran jenjang ujian"

    user_bo ||--o{ master_kelas : "menjadi wali kelas"
    user_bo ||--o{ guru_mata_pelajaran : "mengampu mata pelajaran"
    user_bo ||--o{ assessment : "membuat paket ujian"

    master_mata_pelajaran ||--o{ guru_mata_pelajaran : "diampu oleh guru"
    master_mata_pelajaran ||--o{ assessment : "mata pelajaran ujian"
    master_mata_pelajaran ||--o{ assessment_soal_pilgan : "kategori soal"

    master_kelas ||--o{ siswa_kelas : "ditempati siswa"
    master_kelas ||--o{ user : "kelas aktif siswa"
    master_kelas ||--o{ assessment : "target kelas ujian"

    user ||--o{ siswa_kelas : "riwayat penempatan kelas"
    user ||--o{ assessment_jawaban_pilgan : "melakukan ujian (attempt)"
    user ||--o{ transaksi : "memiliki transaksi pengerjaan"

    assessment ||--o{ assessment_soal_pilgan : "berisi butir soal"
    assessment ||--o{ exam_groups : "memiliki sesi jadwal/token"
    assessment ||--o{ assessment_jawaban_pilgan : "memiliki rekaman pengerjaan"

    transaksi ||--o{ assessment_jawaban_pilgan : "referensi transaksi"

    assessment_jawaban_pilgan ||--o{ assessment_jawaban_pilgan_detail : "memiliki lembar jawaban"
    assessment_soal_pilgan ||--o{ assessment_jawaban_pilgan_detail : "dijawab pada detail"

    kategori_user_bo {
        varchar idkategori PK
        text nama_kategori
        datetime tgl_input
        varchar status_remove
    }

    user_bo {
        varchar iduser_bo PK
        varchar idkategori FK
        text nama
        varchar telp
        text login_email
        text login_username
        text login_password
        varchar status_admin
        varchar role_type
        varchar status_aktif
        varchar active_session_token
        datetime last_login_at
    }

    user {
        varchar iduser PK
        varchar nama
        varchar nisn
        int idkelas FK
        varchar idkategori FK
        varchar telp
        varchar login_email
        varchar login_password
        varchar status_aktif
        varchar active_session_token
        datetime last_login_at
    }

    master_jenjang {
        int id PK
        varchar kode_jenjang UK
        varchar nama_jenjang
        int urutan
        enum status_aktif
    }

    master_kelas {
        int id PK
        int idjenjang FK
        varchar idkategori FK
        varchar nama_kelas
        int tingkat
        varchar jurusan
        varchar wali_kelas_id FK
        int kapasitas
        enum status_aktif
    }

    master_mata_pelajaran {
        int id PK
        int idjenjang FK
        varchar kode_mapel UK
        varchar nama_mapel
        varchar kelompok
        decimal kkm
        enum status_aktif
    }

    guru_mata_pelajaran {
        int id PK
        varchar iduser_bo FK
        int idmapel FK
        int idkelas FK
        varchar tahun_ajaran
    }

    siswa_kelas {
        int id PK
        varchar iduser FK
        int idkelas FK
        varchar nisn
        varchar tahun_ajaran
        enum status
    }

    assessment {
        varchar idassessment PK
        varchar nama_assessment
        varchar idassessment_kategori
        varchar idkategori FK
        text deskripsi_assessment
        datetime tanggal_mulai_assessment
        datetime tanggal_batas_assessment
        varchar waktu_pengerjaan
        int tampil_assessment_pilgan
        varchar iduser_bo FK
        int idjenjang FK
        int idkelas FK
        int idmapel FK
    }

    assessment_soal_pilgan {
        varchar idassessment_soal_pilgan PK
        varchar idassessment FK
        int idjenjang FK
        int idmapel FK
        text soal_text
        tinytext soal_gambar
        text pilihan_a_text
        tinytext pilihan_a_gambar
        text pilihan_b_text
        tinytext pilihan_b_gambar
        text pilihan_c_text
        tinytext pilihan_c_gambar
        text pilihan_d_text
        tinytext pilihan_d_gambar
        text pilihan_e_text
        tinytext pilihan_e_gambar
        varchar jawaban
        text penjelasan_jawaban
    }

    exam_groups {
        bigint id PK
        varchar exam_id FK
        varchar name
        datetime start_time
        datetime end_time
        varchar token
        int max_participants
        text class_ids
        text student_ids
    }

    transaksi {
        varchar idtransaksi PK
        varchar invoice
        varchar nama_sertifikat
        int jumlah_point
        varchar jenis_transaksi
        varchar iduser FK
        varchar status_transaksi
    }

    assessment_jawaban_pilgan {
        varchar idassessment_jawaban_pilgan PK
        varchar idassessment FK
        varchar iduser FK
        varchar idtransaksi FK
        int nilai
        varchar komentar
        char lama_dikerjakan
        datetime tgl_input_time
    }

    assessment_jawaban_pilgan_detail {
        varchar idassessment_jawaban_pilgan_detail PK
        varchar idassessment_jawaban_pilgan FK
        varchar idassessment_soal_pilgan FK
        varchar jawaban
    }
```

---

## 2. Penjelasan Relasi & Kardinalitas Utama

### 2.1. Hirarki Multi-Tenant (`kategori_user_bo`)
- **1 Instansi memiliki Banyak Staf/Guru:** `kategori_user_bo (1) ── (N) user_bo` melalui kunci asing `user_bo.idkategori`.
- **1 Instansi memiliki Banyak Ruang Kelas:** `kategori_user_bo (1) ── (N) master_kelas` melalui `master_kelas.idkategori`.
- **1 Instansi memiliki Banyak Siswa:** `kategori_user_bo (1) ── (N) user` melalui `user.idkategori`.
- **1 Instansi memiliki Banyak Paket Ujian:** `kategori_user_bo (1) ── (N) assessment` melalui `assessment.idkategori`.

### 2.2. Struktur Akademik & Kelas
- **Jenjang ke Kelas & Mapel:** `master_jenjang (1) ── (N) master_kelas` dan `master_jenjang (1) ── (N) master_mata_pelajaran`.
- **Wali Kelas:** `user_bo (1) ── (N) master_kelas` melalui `master_kelas.wali_kelas_id` (*nullable*).
- **Penugasan Guru Mapel:** `guru_mata_pelajaran` berperan sebagai tabel relasi banyak-ke-banyak antara `user_bo`, `master_mata_pelajaran`, dan `master_kelas`.
- **Alokasi Siswa Kelas:** `siswa_kelas` mencatat riwayat penempatan `user` di dalam `master_kelas` per tahun ajaran.

### 2.3. Siklus Ujian & Autosave Jawaban
- **Paket Ujian ke Butir Soal:** `assessment (1) ── (N) assessment_soal_pilgan` melalui `idassessment`.
- **Sesi Penjadwalan Ujian:** `assessment (1) ── (N) exam_groups` melalui `exam_groups.exam_id`.
- **Sesi Pengerjaan Siswa (Attempt):** `assessment (1) ── (N) assessment_jawaban_pilgan` dan `user (1) ── (N) assessment_jawaban_pilgan`.
- **Keterikatan Transaksi:** `transaksi (1) ── (N) assessment_jawaban_pilgan` melalui `idtransaksi` (status transaksi bernilai '7' untuk akses ujian aktif).
- **Detail Lembar Jawaban Siswa:** `assessment_jawaban_pilgan (1) ── (N) assessment_jawaban_pilgan_detail` melalui `idassessment_jawaban_pilgan`. Setiap pilihan jawaban terhubung ke `assessment_soal_pilgan` melalui `idassessment_soal_pilgan`.
