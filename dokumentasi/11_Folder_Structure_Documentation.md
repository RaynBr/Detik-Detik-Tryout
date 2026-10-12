# 11. Folder Structure Documentation
**Sistem CBT Ujian Online (Online Examination System)**  
*Dokumentasi Struktur Direktori Proyek, Arsitektur Berkas, dan Tanggung Jawab Modul*

---

## 1. Ikhtisar Struktur Direktori Root

Proyek ini dibangun menggunakan pola arsitektur terpisah (*Decoupled Architecture*) dengan dua repositori utama: `backend` (Laravel 12 REST API) dan `frontend` (React 19 Vite SPA).

```
Sistem-Ujian-Online/
├── .git/                      # Direktori version control Git
├── .gitignore                 # Konfigurasi pengabaian berkas Git
├── README.md                  # Dokumentasi ringkas proyek
├── backend/                   # Backend Application Engine (Laravel 12)
├── frontend/                  # Frontend Client Single Page App (React 19)
└── dokumentasi/               # 17 Seri Dokumen Rekayasa Perangkat Lunak
```

---

## 2. Struktur Direktori Backend (`backend/`)

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/
│   │   │       ├── Admin/               # Pengelolaan Master Data & Super Admin
│   │   │       │   ├── AcademicYearController.php
│   │   │       │   ├── ClassController.php
│   │   │       │   ├── DashboardController.php      # Stats, Live Monitoring, Pre-Flight Check
│   │   │       │   ├── InstansiController.php       # Multi-tenant scoping & admin instansi
│   │   │       │   ├── MajorController.php
│   │   │       │   ├── MasterJenjangController.php  # SD, SMP, SMA, SMK
│   │   │       │   ├── MasterKelasController.php    # Kelas bebas & alokasi siswa
│   │   │       │   ├── MasterMataPelajaranController.php # Mapel, KKM, & guru mapel
│   │   │       │   ├── StudentController.php        # Siswa & bulk Excel import
│   │   │       │   ├── SubjectController.php
│   │   │       │   └── TeacherController.php        # Manajemen akun guru
│   │   │       ├── Auth/
│   │   │       │   ├── LoginController.php          # Login dual-pintu & session generation
│   │   │       │   └── SessionController.php        # Endpoint /auth/me
│   │   │       ├── Proctoring/
│   │   │       │   └── ViolationLogController.php   # Log tab switch & auto-disqualification
│   │   │       ├── Student/
│   │   │       │   ├── AnswerController.php         # Real-time autosave jawaban
│   │   │       │   ├── ExamAttemptController.php    # Available exams, start, submit
│   │   │       │   └── ResultController.php         # Skor akhir pengerjaan
│   │   │       └── Teacher/
│   │   │           ├── ExamController.php
│   │   │           ├── ExamGroupController.php      # Jadwal sesi & token per kelas
│   │   │           ├── ExamReportController.php     # Rekapitulasi & ekspor nilai
│   │   │           ├── GradingController.php        # Penilaian manual esai
│   │   │           ├── QuestionBankController.php
│   │   │           ├── QuestionImportController.php # Impor Word .docx & CSV
│   │   │           ├── QuestionPackageController.php
│   │   │           ├── TeacherExamController.php    # Paket ujian & generator 50 acak
│   │   │           └── TeacherQuestionBankController.php # CRUD bank soal & template
│   │   └── Middleware/
│   │       ├── CheckRole.php            # Verifikasi role (super_admin, admin, guru, siswa)
│   │       └── EnsureSingleSession.php  # Pencegahan login ganda (X-Session-Token)
│   ├── Jobs/
│   │   └── GradeStudentExamAttemptJob.php # Antrean evaluasi nilai asynchronous
│   ├── Models/                          # 28 Model Eloquent ORM
│   │   ├── Assessment.php               # Induk paket ujian / TryOut
│   │   ├── AssessmentJawabanPilgan.php  # Sesi pengerjaan siswa (attempt)
│   │   ├── AssessmentJawabanPilganDetail.php # Lembar detail jawaban per butir (autosave)
│   │   ├── AssessmentSoalPilgan.php     # Butir naskah soal pilihan ganda
│   │   ├── ExamGroup.php                # Sesi jadwal, token, kuota kelas
│   │   ├── GuruMataPelajaran.php        # Pemetaan guru pengampu mapel
│   │   ├── KategoriUserBo.php           # Entitas instansi / sekolah multi-tenant
│   │   ├── MasterJenjang.php            # Klasifikasi jenjang studi
│   │   ├── MasterKelas.php              # Ruang kelas
│   │   ├── MasterMataPelajaran.php      # Mata pelajaran & KKM
│   │   ├── SiswaKelas.php               # Alokasi siswa di kelas
│   │   ├── User.php                     # Model autentikasi umum
│   │   ├── UserBo.php                   # Model autentikasi Staf/Admin/Guru
│   │   ├── UserSiswa.php                # Model autentikasi Siswa
│   │   └── ViolationLog.php             # Catatan pelanggaran proctoring
│   └── Services/
│       ├── AutoGradingService.php       # Engine kalkulasi nilai otomatis
│       └── DocxQuestionService.php      # Engine ekstraksi naskah soal Word .docx
├── bootstrap/
│   └── app.php                          # Konfigurasi middleware & exception handler
├── config/                              # Konfigurasi app, database, sanctum, dll
├── database/
│   ├── migrations/                      # 28 berkas migrasi database
│   └── seeders/                         # DatabaseSeeder
├── routes/
│   ├── api.php                          # Seluruh rute RESTful API (terproteksi & publik)
│   ├── console.php                      # Artisan command routes
│   └── web.php                          # Web fallback
├── .env                                 # Konfigurasi lokal (DB_DATABASE=sertidemi)
├── composer.json                        # Dependensi PHP (Laravel 12, Sanctum, dll)
└── test_save_answer.php                 # Skrip pengujian internal
```

---

## 3. Struktur Direktori Frontend (`frontend/`)

```
frontend/
├── public/                    # Aset statis publik
├── src/
│   ├── assets/                # Gambar, logo, ikon lokal
│   ├── features/              # Modularisasi Fitur Berdasarkan Domain
│   │   ├── admin/             # Portal Administrasi Sekolah & Super Admin
│   │   │   ├── AcademicYearsPage.tsx
│   │   │   ├── AdminDashboard.tsx      # Metrik sistem & shortcut
│   │   │   ├── AdminLayout.tsx         # Sidebar navigasi admin
│   │   │   ├── ClassesPage.tsx         # Manajemen kelas & modal alokasi siswa
│   │   │   ├── InstansiPage.tsx        # Manajemen multi-instansi & tenant
│   │   │   ├── JenjangPage.tsx         # Manajemen jenjang (SD/SMP/SMA/SMK)
│   │   │   ├── LiveMonitoringPage.tsx  # Pemantauan ujian real-time
│   │   │   ├── MajorsPage.tsx
│   │   │   ├── StudentsPage.tsx        # Manajemen siswa & impor Excel
│   │   │   ├── SubjectsPage.tsx        # Manajemen mapel & assign guru
│   │   │   └── TeachersPage.tsx        # Manajemen data guru
│   │   ├── auth/              # Portal Masuk & Autentikasi
│   │   │   └── components/
│   │   │       ├── LoginPage.tsx       # Halaman login utama tab siswa/staf
│   │   │       ├── StaffLogin.tsx      # Komponen form login staf/guru
│   │   │       └── StudentLogin.tsx    # Komponen form login siswa (NISN)
│   │   ├── student/           # Portal Peserta Didik
│   │   │   ├── ExamSessionPage.tsx     # Ruang ujian aman (Fullscreen, Autosave, Timer)
│   │   │   ├── StudentDashboard.tsx
│   │   │   └── StudentExamsPage.tsx    # Daftar ujian aktif & input token
│   │   └── teacher/           # Portal Guru / Pendidik
│   │       ├── ExamReportPage.tsx      # Rekap nilai & analisis butir soal
│   │       ├── ExamsPage.tsx           # Paket ujian & generator 50 acak
│   │       ├── GradingPage.tsx         # Koreksi essay manual
│   │       ├── QuestionBankPage.tsx    # Bank soal & modal impor Word/CSV
│   │       ├── TeacherDashboard.tsx    # Metrik & aktivitas terkini
│   │       └── TeacherLayout.tsx       # Sidebar navigasi guru
│   ├── routes/
│   │   └── guards.tsx         # Route Guards (GuestRoute, ProtectedRoute per role)
│   ├── shared/                # Komponen & Konteks Reusable
│   │   ├── components/        # Komponen UI bersama (Modal, Button, Unauthorized)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # Manajemen state token & user login
│   │   │   ├── ThemeContext.tsx        # Dark/Light mode theme provider
│   │   │   └── ToastContext.tsx        # Notifikasi toast interaktif
│   │   └── services/          # Konfigurasi HTTP Client Axios & Interceptor
│   ├── App.tsx                # Master Routing & Lazy Loading Komponen
│   ├── index.css              # Konfigurasi Tailwind CSS v4 & custom animasi
│   └── main.tsx               # Entry point React 19 DOM
├── package.json               # Dependensi NPM (React 19, Vite, Tailwind v4, KaTeX)
├── tsconfig.json              # Konfigurasi kompilasi TypeScript
└── vite.config.ts             # Konfigurasi Vite bundler
```

---

## 4. Pola Arsitektur & Tanggung Jawab Modul

1. **Feature-Driven Architecture (Frontend):** Berkas frontend dikelompokkan berdasarkan peran bisnis (`features/admin`, `features/teacher`, `features/student`, `features/auth`), memudahkan isolasi kode dan penerapan *code splitting* via `React.lazy`.
2. **Domain-Driven Controller Hierarchy (Backend):** Controller dikelompokkan ke dalam subdirektori fungsional di `app/Http/Controllers/Api/` (`Admin/`, `Teacher/`, `Student/`, `Auth/`, `Proctoring/`), membatasi cakupan tanggung jawab logika bisnis agar tidak menumpuk dalam satu berkas besar.
3. **Decoupled Business Services (Backend):** Logika pemrosesan dokumen yang kompleks didelegasikan ke service khusus (`DocxQuestionService` untuk manipulasi file Word dan `AutoGradingService` untuk evaluasi jawaban), menjaga controller tetap ramping (*skinny controller*).
