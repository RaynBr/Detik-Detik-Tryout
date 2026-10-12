# 10. API Documentation (RESTful API Endpoint Reference)
**Sistem CBT Ujian Online (Online Examination System)**  
*Dokumentasi Lengkap Seluruh Endpoint RESTful API Backend Laravel 12*

---

## 1. Konvensi & Standar API

- **Base URL:** `http://127.0.0.1:8000/api`
- **Format Pertukaran Data:** `application/json`
- **Mekanisme Autentikasi:** Bearer Token via Header `Authorization: Bearer <token>`
- **Mekanisme Single-Session:** Wajib menyertakan Header `X-Session-Token: <session_token>` pada seluruh rute privat.
- **Middleware Global Privat:** `auth:sanctum`, `single_session`.

---

## 2. Modul Autentikasi (Authentication Endpoints)

### 2.1. Login Pengguna
- **Method & URL:** `POST /api/auth/login`
- **Throttle:** 30 request / menit
- **Request Body:**
```json
{
  "login": "20261001",
  "password": "password123"
}
```
*Catatan: Input `login` dapat berupa username, email, NISN, atau no telepon.*
- **Response Sukses (200 OK):**
```json
{
  "token": "1|qW8eR9tY0uI...",
  "session_token": "a1b2c3d4e5f6g7h8...",
  "user": {
    "id": "US202207220000000001",
    "name": "Ahmad Siswa",
    "email": "ahmad@sekolah.sch.id",
    "username": "20261001",
    "role": "siswa",
    "profile": {
      "id": "US202207220000000001",
      "nisn": "20261001",
      "class_id": 1,
      "class_room": {
        "id": 1,
        "name": "X-RPL 1",
        "level": 10,
        "jenjang": "SMK"
      }
    }
  }
}
```

### 2.2. Get User Profil Aktif
- **Method & URL:** `GET /api/auth/me`
- **Headers:** `Authorization`, `X-Session-Token`
- **Response Sukses (200 OK):**
```json
{
  "user": {
    "id": "US202207220000000001",
    "name": "Ahmad Siswa",
    "role": "siswa"
  }
}
```

### 2.3. Logout
- **Method & URL:** `POST /api/auth/logout`
- **Headers:** `Authorization`, `X-Session-Token`
- **Response Sukses (200 OK):**
```json
{
  "message": "Berhasil keluar."
}
```

---

## 3. Modul Administrator (`/api/admin`)
*Middleware: `auth:sanctum`, `single_session`, `role:super_admin|admin`*

### 3.1. Diagnostik Server & Live Monitoring
| Method | Endpoint | Fungsi & Controller |
| :--- | :--- | :--- |
| `GET` | `/admin/dashboard/stats` | Statistik agregat instansi, kelas, mapel, guru, siswa, dan attempt (`DashboardController::stats`). |
| `GET` | `/admin/dashboard/live-monitoring` | Metrik proctoring real-time (ujian aktif, total selesai, riwayat attempt terbaru). |
| `GET` | `/admin/dashboard/pre-flight-check` | Pengujian kesiapan sistem, latensi MySQL (ms), dan status cache. |

### 3.2. Manajemen Multi-Tenant Instansi
| Method | Endpoint | Fungsi |
| :--- | :--- | :--- |
| `GET` | `/admin/instansi` | Daftar seluruh instansi / lembaga sekolah. |
| `POST` | `/admin/instansi` | Tambah instansi baru. |
| `POST` | `/admin/instansi/{id}/admins` | Buat akun Admin Sekolah pada instansi terkait. |
| `POST` | `/admin/instansi/{id}/gurus` | Daftarkan akun Guru pada instansi terkait. |
| `POST` | `/admin/instansi/{id}/siswas` | Daftarkan akun Siswa pada instansi terkait. |

### 3.3. Master Data Akademik
| Method | Endpoint | Fungsi |
| :--- | :--- | :--- |
| `GET/POST` | `/admin/jenjang` | CRUD Master Jenjang Pendidikan (SD, SMP, SMA, SMK). |
| `GET/POST` | `/admin/classes` | CRUD Master Kelas. |
| `POST` | `/admin/classes/{id}/students` | Masukkan siswa ke dalam kelas (`MasterKelasController::addStudent`). |
| `DELETE` | `/admin/classes/{id}/students/{iduser}` | Keluarkan siswa dari kelas. |
| `GET/POST` | `/admin/subjects` | CRUD Master Mata Pelajaran & KKM. |
| `POST` | `/admin/subjects/{id}/teachers` | Tugaskan guru mengampu mata pelajaran (`MasterMataPelajaranController::assignTeacher`). |
| `POST` | `/admin/students/import` | Impor data siswa masal dari file Excel (`StudentController::import`). |

---

## 4. Modul Guru / Pengajar (`/api/teacher`)
*Middleware: `auth:sanctum`, `single_session`, `role:guru|super_admin|admin`*

### 4.1. Manajemen Bank Soal
- **Daftar Soal:** `GET /api/teacher/questions?idmapel={id}&idjenjang={id}&search={keyword}&page=1`
- **Tambah Soal Manual:** `POST /api/teacher/questions`
  - Body: `idjenjang`, `idmapel`, `soal_text`, `pilihan_a_text` s/d `pilihan_e_text`, `jawaban` ('A'–'E'), `penjelasan_jawaban`.
- **Unduh Template Impor:** `GET /api/teacher/questions/template`
- **Impor Soal Word / CSV:** `POST /api/teacher/questions/import`
  - Body (form-data): `file` (berkas `.docx` atau `.csv`), `idmapel`, `idjenjang`.

### 4.2. Manajemen Paket Ujian & Penjadwalan
- **Daftar Paket Ujian:** `GET /api/teacher/exams`
- **Buat Paket Manual:** `POST /api/teacher/exams`
- **Generator 50 Soal Acak:** `POST /api/teacher/exams/generate-random`
  - Body:
```json
{
  "nama_assessment": "TryOut Asesmen Matematika Acak",
  "idjenjang": 1,
  "idmapel": 1,
  "total_soal": 50,
  "waktu_pengerjaan": 60
}
```
- **Jadwalkan ke Kelas (Exam Group):** `POST /api/teacher/exams/{idassessment}/assign-class`
  - Body:
```json
{
  "name": "Sesi Pagi Kelas X-A",
  "start_time": "2026-10-12 08:00:00",
  "end_time": "2026-10-12 10:00:00",
  "token": "CBT789",
  "class_ids": [1]
}
```
- **Laporan & Rekap Nilai:**
  - `GET /api/teacher/exams/{idassessment}/results`: Daftar peserta dan perolehan skor.
  - `GET /api/teacher/exams/{idassessment}/report`: Analisis statistik butir soal.
  - `GET /api/teacher/exams/{idassessment}/report/export`: Ekspor berkas rekap nilai.

---

## 5. Modul Siswa (`/api/student`)
*Middleware: `auth:sanctum`, `single_session`, `role:siswa`*

### 5.1. Daftar Ujian Siswa
- **Method & URL:** `GET /api/student/exams`
- **Response Sukses (200 OK):**
```json
[
  {
    "exam_group_id": "1",
    "exam_id": "27830150842287772",
    "title": "TryOut Asesmen Nasional 2026",
    "group_name": "Kelas X-RPL 1",
    "token": "CBT789",
    "subject_name": "Matematika",
    "duration_minutes": 60,
    "effective_duration_minutes": 60,
    "start_time": "2026-10-12 08:00:00",
    "end_time": "2026-10-12 12:00:00",
    "attempt": null
  }
]
```

### 5.2. Mulai / Lanjutkan Ujian (Start Attempt)
- **Method & URL:** `POST /api/student/attempts/start`
- **Throttle:** 30 request / menit
- **Request Body:**
```json
{
  "exam_group_id": "1"
}
```
- **Response Sukses (200 OK):**
```json
{
  "attempt_id": "17286481239999",
  "exam_id": "27830150842287772",
  "duration_minutes": 60,
  "time_remaining_seconds": 3600,
  "status": "in_progress"
}
```

### 5.3. Autosave Jawaban Siswa
- **Method & URL:** `PATCH /api/student/attempts/{attemptId}/answers`
- **Throttle:** 180 request / menit (*High-Throughput Burst Limiter*)
- **Request Body:**
```json
{
  "question_id": "SOAL987654321",
  "answer_content": {
    "option_id": "B"
  }
}
```
- **Response Sukses (200 OK):**
```json
{
  "message": "Jawaban berhasil disimpan.",
  "data": {
    "question_id": "SOAL987654321",
    "chosen_option": "B"
  }
}
```

### 5.4. Pencatatan Pelanggaran Pengawasan
- **Method & URL:** `POST /api/student/attempts/{attemptId}/violations`
- **Throttle:** 60 request / menit
- **Request Body:**
```json
{
  "violation_type": "tab_switch",
  "metadata": {
    "reason": "Siswa berpindah jendela browser"
  }
}
```
- **Response (Jika Belum Melebihi Batas):**
```json
{
  "message": "Pelanggaran tercatat.",
  "is_disqualified": false,
  "tab_switch_count": 2,
  "max_allowed": 5
}
```
- **Response (Jika Melebihi Batas 5 Kali - Auto-Disqualification):**
```json
{
  "message": "Anda telah didiskualifikasi karena melebihi batas perpindahan tab/jendela yang diizinkan.",
  "is_disqualified": true,
  "tab_switch_count": 5,
  "max_allowed": 5
}
```

### 5.5. Pengumpulan Ujian (Submit)
- **Method & URL:** `POST /api/student/attempts/{attemptId}/submit`
- **Throttle:** 20 request / menit
- **Response Sukses (200 OK):**
```json
{
  "message": "Ujian berhasil dikumpulkan.",
  "attempt_id": "17286481239999",
  "total_score": 86.5,
  "submitted_at": "2026-10-12 09:25:10"
}
```

### 5.6. Lihat Hasil Ujian
- **Method & URL:** `GET /api/student/results/{attemptId}`
- **Response Sukses (200 OK):**
```json
{
  "attempt_id": "17286481239999",
  "exam_title": "TryOut Asesmen Nasional 2026",
  "score": 86.5,
  "is_passed": true,
  "kkm": 75.0,
  "total_questions": 50,
  "correct_count": 43,
  "incorrect_count": 7
}
```
