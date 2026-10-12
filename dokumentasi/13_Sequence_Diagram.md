# 13. Sequence Diagram
**Sistem CBT Ujian Online (Online Examination System)**  
*Pemodelan Urutan Interaksi Objek Berdasarkan Alur Eksekusi Kode Faktual*

---

## 1. Sequence Diagram 1: Autentikasi & Single-Session Token Locking

Diagram ini memodelkan proses verifikasi kata sandi dual-entitas, pembentukan token sesi, dan pencegahan duplikasi akun.

```mermaid
sequenceDiagram
    autonumber
    actor Pengguna as Pengguna (Siswa / Staf)
    participant UI as Frontend (LoginPage.tsx)
    participant Ctrl as LoginController
    participant Model as UserBo / UserSiswa
    participant Sanctum as Laravel Sanctum
    participant DB as MySQL Database

    Pengguna->>UI: Input Kredensial & Kata Sandi
    UI->>Ctrl: POST /api/auth/login {login, password}
    
    alt Akun Staf / Guru
        Ctrl->>Model: UserBo::where(...)->first()
        Model->>DB: SELECT * FROM user_bo WHERE ...
        DB-->>Model: Data UserBo
        Ctrl->>Model: verifyPassword(password)
    else Akun Siswa
        Ctrl->>Model: UserSiswa::where(...)->first()
        Model->>DB: SELECT * FROM user WHERE ...
        DB-->>Model: Data UserSiswa
        Ctrl->>Model: verifyPassword(password)
    end

    alt Kredensial Tidak Cocok
        Ctrl-->>UI: 422 / 401 Galat Kredensial Salah
        UI-->>Pengguna: Tampilkan Pesan Galat
    else Kredensial Valid
        Ctrl->>Ctrl: Generate Str::random(40) (session_token)
        Ctrl->>Model: update(['active_session_token' => session_token])
        Model->>DB: UPDATE user/user_bo SET active_session_token = ...
        
        Ctrl->>Sanctum: tokens()->delete() (Hapus Token Lama)
        Ctrl->>Sanctum: createToken('cbt_auth_token')
        Sanctum-->>Ctrl: PlainTextToken (Bearer)

        Ctrl-->>UI: 200 OK {token, session_token, user_profile}
        UI->>UI: Simpan Token di LocalStorage & AuthContext
        UI-->>Pengguna: Redirect ke Dashboard Sesuai Role
    end
```

---

## 2. Sequence Diagram 2: Generator 50 Soal Acak (Guru)

Diagram ini memodelkan proses pengambilan 50 butir soal acak dari bank soal dan pembuatan paket ujian baru.

```mermaid
sequenceDiagram
    autonumber
    actor Guru as Guru / Pengajar
    participant UI as Frontend (ExamsPage.tsx)
    participant Ctrl as TeacherExamController
    participant ModelQ as AssessmentSoalPilgan
    participant ModelA as Assessment
    participant DB as MySQL Database

    Guru->>UI: Pilih Jenjang, Mapel & Klik "Generate 50 Soal Acak"
    UI->>Ctrl: POST /api/teacher/exams/generate-random {idjenjang, idmapel, ...}
    
    Ctrl->>ModelA: Assessment::create([...])
    ModelA->>DB: INSERT INTO assessment (idassessment, nama_assessment, ...)
    DB-->>ModelA: ID Assessment Baru Dibuat
    
    Ctrl->>ModelQ: AssessmentSoalPilgan::where('idmapel', ...)->inRandomOrder()->limit(50)->get()
    ModelQ->>DB: SELECT * FROM assessment_soal_pilgan WHERE idmapel = ... ORDER BY RAND() LIMIT 50
    DB-->>ModelQ: 50 Baris Butir Soal Acak

    loop Kloning 50 Butir Soal ke Paket Baru
        Ctrl->>ModelQ: Duplikasi Soal dengan idassessment Baru
        ModelQ->>DB: INSERT INTO assessment_soal_pilgan (...)
    end

    Ctrl-->>UI: 201 Created {message: "Paket ujian berhasil dibuat dengan 50 soal acak", exam: {...}}
    UI-->>Guru: Tampilkan Notifikasi Sukses & Paket Muncul di Tabel
```

---

## 3. Sequence Diagram 3: Inisialisasi Ujian Siswa (Start Attempt)

Diagram ini memodelkan validasi jadwal, pembuatan record transaksi pendukung, dan pembentukan sesi pengerjaan ujian.

```mermaid
sequenceDiagram
    autonumber
    actor Siswa as Siswa / Peserta
    participant UI as Frontend (StudentExamsPage.tsx)
    participant Ctrl as ExamAttemptController
    participant Group as ExamGroup
    participant Trx as Transaksi
    participant Att as AssessmentJawabanPilgan
    participant DB as MySQL Database

    Siswa->>UI: Klik "Mulai Ujian" & Masukkan Token
    UI->>Ctrl: POST /api/student/attempts/start {exam_group_id}

    Ctrl->>Group: ExamGroup::find(exam_group_id)
    Group->>DB: SELECT * FROM exam_groups WHERE id = ...
    DB-->>Group: Data Sesi Kelompok & Token

    Ctrl->>Ctrl: Validasi Window Waktu (now >= start_time && now <= end_time)
    
    Ctrl->>Att: where('idassessment', ...)->where('iduser', ...)->first()
    Att->>DB: Cek Existing Attempt
    DB-->>Att: Null (Belum Ada Attempt)

    Ctrl->>Trx: DB::table('transaksi')->insert([...])
    Trx->>DB: INSERT INTO transaksi (idtransaksi, status_transaksi='7', jenis='assessment')
    
    Ctrl->>Att: AssessmentJawabanPilgan::create([...])
    Att->>DB: INSERT INTO assessment_jawaban_pilgan (idassessment_jawaban_pilgan, status='in_progress')
    
    Ctrl-->>UI: 200 OK {attempt_id, duration_minutes, time_remaining_seconds}
    UI->>UI: Masuk Strict Fullscreen Mode
    UI-->>Siswa: Buka Lembar Ujian (ExamSessionPage.tsx)
```

---

## 4. Sequence Diagram 4: Real-Time Autosave Jawaban Siswa

Diagram ini memodelkan penyimpanan instan setiap pilihan jawaban yang diklik siswa ke tabel detail.

```mermaid
sequenceDiagram
    autonumber
    actor Siswa as Siswa / Peserta
    participant UI as Frontend (ExamSessionPage.tsx)
    participant MW as EnsureSingleSession Middleware
    participant Ctrl as AnswerController
    participant Detail as AssessmentJawabanPilganDetail
    participant DB as MySQL Database

    Siswa->>UI: Klik Pilihan Jawaban 'B' pada Soal No. 12
    UI->>UI: Update State Lokal (Indikator Warna Berubah)
    UI->>MW: PATCH /api/student/attempts/{attemptId}/answers {question_id, answer_content: {option_id: 'B'}}
    Note over UI,MW: Header X-Session-Token & Authorization Bearer Disertakan
    
    MW->>MW: Verifikasi X-Session-Token == active_session_token
    MW->>Ctrl: Lolos Middleware

    Ctrl->>Detail: where('idassessment_jawaban_pilgan', ...)->where('idassessment_soal_pilgan', ...)->first()
    Detail->>DB: SELECT * FROM assessment_jawaban_pilgan_detail WHERE ...
    
    alt Baris Jawaban Sudah Ada
        Ctrl->>Detail: update(['jawaban' => 'B'])
        Detail->>DB: UPDATE assessment_jawaban_pilgan_detail SET jawaban = 'B'
    else Baris Jawaban Belum Ada
        Ctrl->>Detail: create(['jawaban' => 'B', ...])
        Detail->>DB: INSERT INTO assessment_jawaban_pilgan_detail (...)
    end

    Ctrl-->>UI: 200 OK {message: "Jawaban berhasil disimpan", question_id, chosen_option: "B"}
    UI->>UI: Tandai Status Autosave Berhasil (Waktu Respon < 100ms)
```

---

## 5. Sequence Diagram 5: Deteksi Pelanggaran Proctoring & Auto-Diskualifikasi

Diagram ini memodelkan pencatatan insiden perpindahan tab/jendela dan pemutusan ujian otomatis saat melebihi batas.

```mermaid
sequenceDiagram
    autonumber
    actor Siswa as Siswa / Peserta
    participant Browser as Browser Window (DOM Event)
    participant UI as Frontend Proctoring Listener
    participant Ctrl as ViolationLogController
    participant Att as StudentExamAttempt / AssessmentJawabanPilgan
    participant DB as MySQL Database

    Siswa->>Browser: Menekan Alt+Tab / Buka Tab Baru / Keluar Layar Penuh
    Browser->>UI: Trigger Event: visibilitychange / blur / fullscreenchange
    
    UI->>Ctrl: POST /api/student/attempts/{attemptId}/violations {violation_type: 'tab_switch'}
    Ctrl->>DB: INSERT INTO violation_logs (attempt_id, type='tab_switch', occurred_at=NOW())
    
    Ctrl->>DB: SELECT COUNT(*) FROM violation_logs WHERE attempt_id = ...
    DB-->>Ctrl: Total Pelanggaran (misal: 5 kali)

    alt Total Pelanggaran >= 5 Kali (Ambang Batas Tercapai)
        Ctrl->>Att: update(['status' => 'disqualified', 'total_score' => 0])
        Att->>DB: UPDATE attempt SET status = 'disqualified', nilai = 0
        Ctrl-->>UI: 200 OK {is_disqualified: true, message: "Anda telah didiskualifikasi..."}
        UI->>UI: Paksa Keluar Fullscreen (document.exitFullscreen())
        UI-->>Siswa: Tampilkan Layar Diskualifikasi Permanen & Blokir Akses Ujian
    else Total Pelanggaran < 5 Kali
        Ctrl-->>UI: 200 OK {is_disqualified: false, tab_switch_count: 3, max_allowed: 5}
        UI-->>Siswa: Tampilkan Peringatan Pop-up (Sisa Kesempatan: 2 kali)
    end
```

---

## 6. Sequence Diagram 6: Penyerahan Ujian & Auto-Grading

Diagram ini memodelkan proses akhir pengumpulan ujian dan penghitungan skor otomatis.

```mermaid
sequenceDiagram
    autonumber
    actor Siswa as Siswa / Peserta
    participant UI as Frontend (ExamSessionPage.tsx)
    participant Ctrl as ExamAttemptController
    participant Detail as AssessmentJawabanPilganDetail
    participant Soal as AssessmentSoalPilgan
    participant Att as AssessmentJawabanPilgan
    participant DB as MySQL Database

    Siswa->>UI: Klik Tombol "Kumpulkan Ujian" & Konfirmasi
    UI->>Ctrl: POST /api/student/attempts/{attemptId}/submit
    
    Ctrl->>Detail: Ambil Seluruh Jawaban Siswa
    Detail->>DB: SELECT idassessment_soal_pilgan, jawaban FROM detail WHERE ...
    DB-->>Ctrl: Daftar Pilihan Jawaban Siswa

    Ctrl->>Soal: Ambil Seluruh Kunci Jawaban Soal
    Soal->>DB: SELECT idassessment_soal_pilgan, jawaban FROM assessment_soal_pilgan WHERE ...
    DB-->>Ctrl: Daftar Kunci Jawaban Benar

    Ctrl->>Ctrl: Cocokkan Jawaban Siswa dengan Kunci (Hitung Jumlah Benar)
    Ctrl->>Ctrl: Hitung Nilai = (Jumlah Benar / Total Soal) * 100

    Ctrl->>Att: update(['nilai' => skor, 'komentar' => 'submitted', 'lama_dikerjakan' => durasi])
    Att->>DB: UPDATE assessment_jawaban_pilgan SET nilai = skor, komentar = 'submitted'
    
    Ctrl-->>UI: 200 OK {total_score: skor, submitted_at: NOW()}
    UI->>UI: Keluar dari Mode Layar Penuh
    UI-->>Siswa: Buka Halaman Hasil Ujian (Result Page) Menampilkan Skor Akhir
```
