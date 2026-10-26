```mermaid
graph TD
    %% Main
    Start([Mulai]) --> Dashboard[Super Admin Masuk Dashboard<br/>/admin/dashboard]
    Dashboard --> Nav[Navigasi Menu Admin]
    Nav --> ProfilSendiri[Mengedit Profil Sendiri<br/>Super Admin]

    %% Top Menu
    Nav --> M1[1. Menu Kelola<br/>Instansi]
    Nav --> M2[2. Menu Kelola<br/>Pengguna]
    Nav --> M3[3. Menu Master<br/>Data Akademik]
    Nav --> M4[4. Menu Bank<br/>Soal]
    Nav --> M5[5. Menu Audit<br/>Trail]
    Nav --> M6[6. Menu Profil &<br/>Keamanan]

    %% M3 - Akademik
    M3 --> MJ[Master Jenjang]
    MJ --> CRUD_J[CRUD<br/>master_jenjang<br/>SD, SMP, SMA, SMK]
    CRUD_J -- "1: Jenjang memiliki Kelas" --> MK[Master Kelas]
    MK -- "2: Mapel memiliki Jenjang" --> MMP[Master Mata<br/>Pelajaran]
    MK -- "3: Mapel memiliki Kelas" --> MMP
    CRUD_J --> MMP
    CRUD_J --> CRUD_K[CRUD<br/>master_kelas<br/>Tingkat,<br/>Rombel]
    CRUD_K --> MK
    MMP --> CRUD_MP[CRUD<br/>master_mata_pelajaran<br/>Kode, Nama, KKM]

    %% M4 - Bank Soal
    M4 --> KBS[Katalog Bank Soal<br/>/admin/questions]
    KBS --> MTS[Master Tahun<br/>Soal]
    MTS --> CMTS[CRUD Master<br/>Tahun Soal<br/>2024, 2025,<br/>2026/2027]

    %% Filter Logic
    ParameterFilter[Parameter Filter]
    CRUD_J -.-> ParameterFilter
    CRUD_K -.-> ParameterFilter
    MMP -.-> ParameterFilter
    MTS -.-> ParameterFilter
    ParameterFilter --> F4[Filter 4 Dimensi:<br/>Jenjang, Kelas,<br/>Mapel, Tahun]
    F4 --> LSS[List Soal +<br/>Server-side<br/>Pagination]
    LSS --> BtnDetail[Tombol List Detail]
    BtnDetail --> BtnEditSatuan[Tombol Edit Satuan]
    BtnEditSatuan --> AS{Aksi Soal}

    %% M2 - Pengguna
    M2 --> PKA{Pilih Kategori<br/>Akun}
    PKA --> KSA[Kelola Super Admin]
    PKA --> KAI[Kelola Admin Instansi]
    PKA --> MGS[Monitoring Guru<br/>& Siswa Nasional<br/>Read-Only]

    KSA --> MSA[Manajemen<br/>Super Admin]
    KAI --> MAI[Manajemen<br/>Admin Instansi]
    MSA --> ASA[Aksi Super Admin]
    MAI --> AAI[Aksi Admin Instansi]

    ASA --> BSA[Buat Super Admin Setara<br/>(Role Sama)]
    AAI --> BAIA[Super Admin Buat Admin Instansi]

    %% M1 - Instansi
    M1 --> POI[Pilih Operasi<br/>Instansi]
    POI --> TI[Tambah Instansi]
    POI --> EI[Edit Instansi]
    POI --> DMI[Detail & Monitoring Instansi]
    POI --> KPI[Kelola Penggunaan<br/>Instansi]

    TI --> FI[Form Input<br/>Instansi:<br/>- Kode Instansi<br/>(Penentu Instansi)<br/>- Nama, No HP,<br/>Email, Alamat,<br/>Status<br/>- Buat Akun<br/>Admin Instansi<br/>Pertama]
    FI --> SKDB1[Simpan ke DB<br/>kategori_user_bo<br/>& user_bo]
    SKDB1 --> AT1[Audit Trail:<br/>CREATE_INSTANSI<br/>& ADMIN<br/>+ Histori Jam/Tanggal]

    EI --> UDI[Update Data<br/>Instansi &<br/>Status<br/>Aktif/Nonaktif]
    UDI --> UDB[Update DB<br/>kategori_user_bo]
    UDB --> AT2[Audit Trail:<br/>EDIT_INSTANSI<br/>+ Histori Jam/Tanggal]

    KPI --> KPINST[Tampilkan<br/>Penggunaan:<br/>- Kuota / Jumlah<br/>Guru, Siswa,<br/>Bank Soal,<br/>Paket Soal<br/>- Status Aktif<br/>Instansi]

    DMI --> HD[Halaman Detail<br/>/admin/instansi/id]
    HD --> TS[Tampilkan<br/>Statistik:<br/>Total Guru,<br/>Siswa, Bank Soal,<br/>Paket Soal]
    HD --> PDA[Pantau Daftar<br/>Anggota<br/>Instansi:<br/>- Daftar Admin<br/>Instansi (siapa<br/>pembuatnya)<br/>- Daftar Guru<br/>(siapa<br/>pembuatnya)<br/>- Daftar Siswa &<br/>Rombel (siapa<br/>pembuatnya)]

    %% Flows
    BSA --> BSU[Buat Super Admin<br/>(role_type:<br/>super_admin,<br/>idkategori: null)]
    BSU --> SU[Simpan ke<br/>user_bo]
    SU --> AT3[Audit Trail:<br/>CREATE_SUPER_ADMIN<br/>(Created By: Super<br/>Admin)<br/>+ Histori Jam/Tanggal]

    BAIA --> SAIA[Super Admin<br/>Mendaftarkan<br/>Admin Instansi<br/>Baru]
    SAIA --> SIA[Simpan ke<br/>user_bo<br/>(role_type:<br/>admin_sekolah)]
    SIA --> AT4[Audit Trail:<br/>CREATE_ADMIN_INSTANSI<br/>(Created By: Super<br/>Admin)<br/>+ Histori Jam/Tanggal]

    MGS --> TGS[Tampilkan Data<br/>Guru & Siswa per<br/>Sekolah:<br/>- Dipantau oleh<br/>Super Admin<br/>- Dibuat oleh<br/>Admin Instansi<br/>masing-masing<br/>- Menampilkan<br/>Info Created By<br/>Admin Sekolah]
    AAI -- "Delegasi ke Tingkat Sekolah" --> ADMIN_INST_B[Admin Instansi<br/>JUGA BISA<br/>membuat Admin<br/>Sekolah setara<br/>di instansinya.<br/>NAMUN DILARANG<br/>membuat Super<br/>Admin.]
    ADMIN_INST_B -- "Terekam ke" --> AT5[Audit Trail:<br/>CREATE_ADMIN_INSTANSI<br/>(Created By: Admin<br/>Sekolah A)<br/>+ Histori Jam/Tanggal]

    %% Aksi Soal Logic
    AS --> PS[Preview Soal,<br/>Opsi A-E, Kunci,<br/>KaTeX, & Tahun<br/>Soal]
    AS --> ES[Edit Soal]
    AS --> TIS[Tambah / Impor Soal]
    AS --> US[Ubah Status:<br/>Aktif / Nonaktif<br/>(Hidden)]
    US --> HS[Hidden dari User<br/>tapi Tetap<br/>Tersimpan di DB]

    ES --> OASA{Otorisasi:<br/>Apakah Super<br/>Admin?}
    OASA -- "Ya (Super Admin)" --> ES_EDIT[Edit Soal, Opsi,<br/>Kunci,<br/>Pembahasan &<br/>Tahun Soal]
    OASA -- "Bukan Super Admin" --> AD[Akses Ditolak<br/>(Read Only)]

    ES_EDIT --> UDB_P[Update DB<br/>assessment_soal_pilgan]
    UDB_P --> AT6[Audit Trail:<br/>EDIT_BANK_SOAL<br/>(Created By:<br/>Super Admin)<br/>+ Histori Jam/Tanggal]

    TIS --> IB[Input Butir Soal<br/>Baru / Impor<br/>Template:<br/>- Teks Soal, Opsi<br/>A-E, Kunci, KaTeX<br/>- Pilih Jenjang,<br/>Kelas, Mapel<br/>- PILIH TAHUN<br/>SOAL (dari<br/>Master Tahun<br/>Soal)]
    IB --> SKDB2[Simpan ke DB<br/>assessment_soal_pilgan<br/>(termasuk kolom tahun)]
    SKDB2 --> AT7[Audit Trail:<br/>CREATE_BANK_SOAL<br/>(Created By,<br/>Mapel, & Tahun<br/>Soal)<br/>+ Histori Jam/Tanggal]

    %% M6 - Profil
    M6 --> OP[Operasi Profil]
    OP --> EP[Edit Profil]
    OP --> GP[Ganti Password]
    EP --> UN[Ubah Nama,<br/>Email, Telp,<br/>Alamat]
    GP --> VP[Verifikasi<br/>Password Lama &<br/>Update Baru]
    UN --> ST[Selesai /<br/>Terisolasi Aman]
    VP --> ST

    %% Profil Sendiri
    ProfilSendiri --> EP

    %% Audit Footer
    AT1 & AT2 & AT3 & AT4 & AT5 & AT6 & AT7 -. "Terekam Otomatis ke DB" .-> HAT[Halaman Audit<br/>Trail<br/>(/admin/audit-<br/>logs)]

    HAT --> INFO[Pantau Seluruh<br/>Riwayat:<br/>- Super Admin<br/>membuat Super<br/>Admin Lain<br/>- Super Admin<br/>membuat Admin<br/>Instansi<br/>- Admin Instansi<br/>membuat Admin<br/>Instansi setara<br/>- Admin Instansi<br/>membuat Guru /<br/>Siswa (Created<br/>By)<br/>- Create/Edit<br/>Instansi & Bank<br/>Soal (dengan<br/>Tahun)<br/>- Create Super<br/>Admin oleh Super<br/>Admin (Role Sama)<br/>- Histori Jam &<br/>Tanggal Setiap<br/>Aksi]

    ST --> Selesai([Selesai])
```
