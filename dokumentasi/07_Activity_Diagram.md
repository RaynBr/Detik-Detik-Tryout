# 07. Activity Diagram
**Sistem CBT Ujian Online (Online Examination System)**  
*Pemodelan Alur Aktivitas Bisnis Sistem Berdasarkan Alur Faktual Kode Program*

---

## 1. Activity Diagram: Autentikasi Pengguna & Single-Session Lock

Diagram ini memodelkan proses verifikasi identitas, penerbitan token sesi, dan pemutusan sesi di perangkat lain (*session kick*).

```mermaid
flowchart TD
    start([Mulai: Pengguna Membuka Halaman Login]) --> input[Input Kredensial & Kata Sandi]
    input --> submit[Klik Tombol Masuk]
    submit --> check_type{Tipe Pengguna?}

    check_type -->|Staf / Guru / Admin| query_bo[Cari di tabel 'user_bo']
    check_type -->|Siswa / Peserta| query_user[Cari di tabel 'user']

    query_bo --> verify_bo{Verifikasi Sandi & Status Aktif?}
    verify_bo -->|Gagal / Nonaktif| err_bo[Tampilkan Pesan Galat 401/403] --> end_err([Selesai: Akses Ditolak])
    verify_bo -->|Valid| gen_token[Generate active_session_token Baru]

    query_user --> verify_user{Verifikasi Sandi & Status Aktif?}
    verify_user -->|Gagal / Nonaktif| err_user[Tampilkan Pesan Galat 401/403] --> end_err
    verify_user -->|Valid| gen_token

    gen_token --> update_db[Simpan active_session_token & last_login_at ke DB]
    update_db --> revoke_old[Hapus Token Sanctum Lama]
    revoke_old --> issue_new[Terbitkan Bearer Token Sanctum Baru]
    issue_new --> ret_client[Kirim Token & Profil ke Frontend]
    ret_client --> save_storage[Frontend Simpan Token ke Local Storage]
    save_storage --> redirect[Arahkan ke Dashboard Berdasarkan Peran]
    redirect --> finish([Selesai: Masuk ke Sistem])
```

---

## 2. Activity Diagram: Impor Naskah Soal Word (.docx)

Diagram ini memodelkan alur kerja guru dalam mengunggah berkas soal Word dan proses parsing internal oleh `DocxQuestionService`.

```mermaid
flowchart TD
    start([Mulai: Guru Membuka Menu Bank Soal]) --> open_modal[Klik Tombol Import Soal]
    open_modal --> select_file[Pilih Berkas Naskah .docx dari Komputer]
    select_file --> upload[Kirim Berkas via POST /teacher/questions/import]
    
    upload --> service[Backend Teruskan ke DocxQuestionService]
    service --> unzip[Buka Struktur Arsip ZIP / XML Dokumen Word]
    unzip --> read_xml[Ekstraksi Konten Elemen Paragraf & Gambar Inline]
    
    read_xml --> parse_loop{Iterasi Setiap Paragraf}
    parse_loop --> detect_q{Apakah Teks Pertanyaan?}
    detect_q -->|Ya| add_q[Tampung Butir Soal]
    detect_q -->|Tidak: Opsi A-E| add_opt[Tampung Pilihan Jawaban A, B, C, D, E]
    detect_q -->|Tanda Kunci / Jawaban| set_key[Tentukan Kunci Jawaban Benar]

    add_q --> check_next{Masih Ada Paragraf?}
    add_opt --> check_next
    set_key --> check_next
    
    check_next -->|Ya| parse_loop
    check_next -->|Selesai| insert_db[Simpan Seluruh Soal ke 'assessment_soal_pilgan']
    
    insert_db --> response[Kirim Laporan Sukses ke Frontend]
    response --> update_ui[Tabel Bank Soal Otomatis Diperbarui]
    update_ui --> finish([Selesai: Soal Siap Digunakan])
```

---

## 3. Activity Diagram: Pengerjaan Ujian, Autosave, & Pengawasan Anti-Cheat

Diagram ini memodelkan interaksi siswa di ruang ujian, mekanisme penyimpanan jawaban per detik, serta penanganan pelanggaran proctoring.

```mermaid
flowchart TD
    start([Mulai: Siswa Klik Mulai Ujian]) --> check_window{Waktu Sesi Masih Berlaku?}
    check_window -->|Tidak| show_blocked[Tampilkan Pesan Sesi Berakhir/Belum Mulai] --> stop_exam([Ujian Batal])
    check_window -->|Ya| init_attempt[POST /attempts/start: Buat Attempt di DB]
    
    init_attempt --> enter_fs[Wajib Masuk Mode Layar Penuh / Fullscreen]
    enter_fs --> load_q[Muat Naskah Soal dari Server]
    load_q --> start_timer[Mulai Countdown Timer Sisa Waktu]
    
    start_timer --> exam_loop{Aktivitas Siswa Saat Ujian}

    %% Cabang Menjawab Soal
    exam_loop -->|Klik Pilihan Jawaban A-E| patch_ans[Kirim PATCH /attempts/answers]
    patch_ans --> upsert_db[Upsert ke 'assessment_jawaban_pilgan_detail']
    upsert_db --> mark_answered[Indikator Nomor Soal Berubah Jadi Indigo]
    mark_answered --> exam_loop

    %% Cabang Pelanggaran Proctoring
    exam_loop -->|Ganti Tab / Keluar Layar Penuh| detect_violation[Frontend Deteksi Pelanggaran]
    detect_violation --> post_violation[Kirim POST /attempts/violations]
    post_violation --> count_violation[Akumulasi Jumlah Pelanggaran di DB]
    count_violation --> check_limit{Pelanggaran >= 5 Kali?}
    check_limit -->|Belum| warn_user[Tampilkan Modal Peringatan Keras] --> exam_loop
    check_limit -->|Ya| auto_dq[Ubah Status: 'disqualified' & Nilai: 0]
    auto_dq --> exit_fs_dq[Paksa Keluar Layar Penuh]
    exit_fs_dq --> show_dq[Tampilkan Layar Diskualifikasi Permanen]
    show_dq --> finish_dq([Selesai: Siswa Didiskualifikasi])

    %% Cabang Pengumpulan Ujian
    exam_loop -->|Klik Submit / Timer Habis| confirm_submit{Konfirmasi Pengumpulan?}
    confirm_submit -->|Batal| exam_loop
    confirm_submit -->|Ya| post_submit[Kirim POST /attempts/submit]
    post_submit --> auto_grade[Cocokkan Jawaban dengan Kunci Soal]
    auto_grade --> calc_score[Hitung Skor: Benar / Total * 100]
    calc_score --> update_attempt[Update Status: 'submitted' & Nilai di DB]
    update_attempt --> exit_fs[Otomatis Keluar dari Layar Penuh]
    exit_fs --> show_result[Tampilkan Halaman Skor Akhir]
    show_result --> finish([Selesai: Ujian Berhasil Dikumpulkan])
```

---

## 4. Activity Diagram: Penjadwalan Ujian & Pembagian Token (Guru)

Diagram ini memodelkan alur guru dalam mengalokasikan paket ujian ke rombongan belajar kelas tertentu dan membagikan token akses.

```mermaid
flowchart TD
    start([Mulai: Guru Memilih Paket Ujian]) --> click_assign[Klik Tombol 'Tugaskan ke Kelas']
    click_assign --> form[Buka Form Penjadwalan Ujian]
    form --> select_class[Pilih Satu atau Beberapa Kelas Sasaran]
    form --> set_time[Tentukan Tanggal & Jam Mulai serta Waktu Selesai]
    form --> input_token[Input Kode Token Rahasia]
    form --> submit_schedule[Klik Simpan Jadwal Ujian]
    
    submit_schedule --> insert_group[Simpan ke Tabel 'exam_groups']
    insert_group --> update_assessment[Perbarui Batas Tanggal di 'assessment']
    update_assessment --> broadcast[Token & Jadwal Siap Diumumkan ke Siswa]
    broadcast --> finish([Selesai: Ujian Terjadwal Aktif])
```
