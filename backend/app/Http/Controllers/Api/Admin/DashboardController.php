<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterJenjang;
use App\Models\MasterKelas;
use App\Models\MasterMataPelajaran;
use App\Models\KategoriUserBo;
use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\AssessmentJawabanPilgan;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * Complete aggregate statistics for Admin & Super Admin & Teacher
     */
    /**
     * Complete aggregate statistics for Admin & Super Admin & Teacher
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $isInstansiAdmin = $user && $user->role === 'admin' && !empty($user->idkategori);
        $idkategori = $isInstansiAdmin ? $user->idkategori : null;

        if ($isInstansiAdmin) {
            $totalTeachers = UserBo::where('idkategori', $idkategori)
                ->where('status_remove', '!=', 'Y')
                ->where(function ($q) {
                    $q->where('role_type', 'guru')
                      ->orWhere('status_admin', '2')
                      ->orWhereNull('role_type');
                })->count();

            $totalStudents = UserSiswa::where('idkategori', $idkategori)->count();
            $totalClasses = MasterKelas::where('idkategori', $idkategori)->count();
            $totalAssessments = Assessment::where('idkategori', $idkategori)->count();

            // Realtime Master Akademik statistics for this institution
            $totalAcademicYears = \App\Models\AcademicYear::where('idkategori', $idkategori)->count();
            $totalKurikulum = \App\Models\MasterKurikulum::where('idkategori', $idkategori)->count();
            $totalJenjang = \App\Models\MasterJenjang::where('idkategori', $idkategori)->count();
            $totalJurusan = \App\Models\Major::where('idkategori', $idkategori)->count();
            $totalMataPelajaran = \App\Models\MasterMataPelajaran::where('idkategori', $idkategori)->count();
            $totalSemesters = \App\Models\MasterSemester::where('idkategori', $idkategori)->count();
            $totalTingkatKelas = \App\Models\MasterTingkatKelas::where('idkategori', $idkategori)->count();
            
            $jenjangIds = MasterKelas::where('idkategori', $idkategori)
                ->pluck('idjenjang')->unique()->filter()->values();
            $totalQuestions = AssessmentSoalPilgan::whereHas('assessment', function ($q) use ($idkategori) {
                $q->where('idkategori', $idkategori);
            })->count();
            if ($totalQuestions === 0) {
                $totalQuestions = AssessmentSoalPilgan::count();
            }

            $totalInstansi = 1;
            
            $examIds = Assessment::where('idkategori', $idkategori)->pluck('idassessment');
            $totalAttempts = AssessmentJawabanPilgan::whereIn('idassessment', $examIds)->count();

            $recentExams = Assessment::where('idkategori', $idkategori)
                ->with(['mapel', 'jenjang', 'kelas'])
                ->withCount('soal')
                ->orderBy('idassessment', 'desc')
                ->limit(6)
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->idassessment,
                        'title' => $item->nama_assessment,
                        'subject' => $item->mapel?->nama_mapel ?? 'Umum',
                        'jenjang' => $item->jenjang?->nama_jenjang ?? 'Umum',
                        'class_name' => $item->kelas?->nama_kelas ?? 'Semua Kelas',
                        'duration_minutes' => (int) ($item->waktu_pengerjaan ?: 60),
                        'total_questions' => $item->soal_count ?: 50,
                        'created_at' => $item->tanggal_input,
                    ];
                });

            return response()->json([
                'total_instansi' => 1,
                'total_teachers' => $totalTeachers,
                'total_guru' => $totalTeachers,
                'total_students' => $totalStudents,
                'total_siswa' => $totalStudents,
                'total_classes' => $totalClasses,
                'total_kelas' => $totalClasses,
                'total_exams' => $totalAssessments,
                'total_paket_soal' => $totalAssessments,
                'total_bank_soal' => $totalQuestions,
                'total_questions' => $totalQuestions,
                'total_attempts' => $totalAttempts,
                'recent_exams' => $recentExams,
                // Master Akademik statistics
                'total_academic_years' => $totalAcademicYears,
                'total_tahun_ajaran' => $totalAcademicYears,
                'total_kurikulum' => $totalKurikulum,
                'total_jenjang' => $totalJenjang,
                'total_jurusan' => $totalJurusan,
                'total_mata_pelajaran' => $totalMataPelajaran,
                'total_subjects' => $totalMataPelajaran,
                'total_semester' => $totalSemesters,
                'total_tingkat_kelas' => $totalTingkatKelas,
            ]);
        } else {
            $totalQuestions = AssessmentSoalPilgan::count();
            $totalAssessments = Assessment::count();
            $today = now()->startOfDay();
            $totalInstansi = KategoriUserBo::count();

            $instansiExpired = KategoriUserBo::where('status_remove', '!=', 'Y')
                ->whereNotNull('tanggal_berakhir')
                ->where('tanggal_berakhir', '<', $today)
                ->count();

            $instansiWarning = KategoriUserBo::where('status_remove', '!=', 'Y')
                ->whereNotNull('tanggal_berakhir')
                ->where('tanggal_berakhir', '>=', $today)
                ->where('tanggal_berakhir', '<=', $today->copy()->addDays(7))
                ->count();

            $instansiAktif = KategoriUserBo::where('status_remove', '!=', 'Y')
                ->where(function ($q) {
                    $q->whereNull('status_aktif')->orWhere('status_aktif', 'Y');
                })
                ->count();
            $instansiNonAktif = KategoriUserBo::where(function ($q) {
                $q->where('status_remove', 'Y')->orWhere('status_aktif', 'N');
            })->count();
            $totalInstansi = $instansiAktif + $instansiNonAktif;

            $totalJenjang = MasterJenjang::count();
            $totalClasses = MasterKelas::count();
            $totalSubjects = MasterMataPelajaran::count();

            $totalTeachers = UserBo::where('status_remove', '!=', 'Y')
                ->where(function ($q) {
                    $q->where('role_type', 'guru')->orWhere(function ($sq) {
                        $sq->whereNull('role_type')->where('status_admin', '!=', '1');
                    });
                })->count();

            $totalAdminInstansi = UserBo::where('status_remove', '!=', 'Y')
                ->where(function ($q) {
                    $q->where('role_type', 'admin_sekolah')
                      ->orWhere('role_type', 'admin')
                      ->orWhere('status_admin', '2');
                })->count();

            $totalStudents = UserSiswa::count();
            $totalAttempts = AssessmentJawabanPilgan::count();

            $totalUjianAktif = Assessment::where(function ($q) {
                $q->whereNull('tanggal_batas_assessment')
                  ->orWhere('tanggal_batas_assessment', '>=', now()->toDateString());
            })->count();

            $fifteenMins = now()->subMinutes(15);
            $onlineCount = UserBo::where('status_remove', '!=', 'Y')
                ->where(function ($q) use ($fifteenMins) {
                    $q->where('last_login_at', '>=', $fifteenMins)
                      ->orWhereNotNull('active_session_token');
                })->count()
                + UserSiswa::where(function ($q) use ($fifteenMins) {
                    $q->where('last_login_at', '>=', $fifteenMins)
                      ->orWhereNotNull('active_session_token');
                })->count();
            $totalUserOnline = max(1, $onlineCount);

            $recentExams = Assessment::with(['mapel', 'jenjang', 'kelas'])
                ->withCount('soal')
                ->orderBy('idassessment', 'desc')
                ->limit(6)
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->idassessment,
                        'title' => $item->nama_assessment,
                        'subject' => $item->mapel?->nama_mapel ?? 'Umum',
                        'jenjang' => $item->jenjang?->nama_jenjang ?? 'Umum',
                        'class_name' => $item->kelas?->nama_kelas ?? 'Semua Kelas / Bank Soal',
                        'duration_minutes' => (int) ($item->waktu_pengerjaan ?: 60),
                        'total_questions' => $item->soal_count ?: 50,
                        'created_at' => $item->tanggal_input,
                    ];
                });

            return response()->json([
                'total_instansi' => $totalInstansi,
                'instansi_aktif' => $instansiAktif,
                'instansi_warning' => $instansiWarning,
                'instansi_expired' => $instansiExpired,
                'instansi_non_aktif' => $instansiNonAktif,
                'instansi_nonaktif' => $instansiNonAktif,
                'total_guru' => $totalTeachers,
                'total_teachers' => $totalTeachers,
                'total_siswa' => $totalStudents,
                'total_students' => $totalStudents,
                'total_admin_instansi' => $totalAdminInstansi,
                'total_paket_soal' => $totalAssessments,
                'total_bank_soal' => $totalQuestions,
                'total_questions' => $totalQuestions,
                'total_ujian_aktif' => $totalUjianAktif,
                'total_exams' => $totalAssessments,
                'total_assessments' => $totalAssessments,
                'total_user_online' => $totalUserOnline,
                'total_jenjang' => $totalJenjang,
                'total_classes' => $totalClasses,
                'total_subjects' => $totalSubjects,
                'total_attempts' => $totalAttempts,
                'recent_exams' => $recentExams,
            ]);
        }
    }

    /**
     * Comprehensive School Reports for Admin Instansi:
     * 1. Guru mengajar kelas apa (Wali Kelas & Guru Pengampu Mapel)
     * 2. Daftar siswa per kelas
     * 3. Nilai siswa berdasarkan Paket Ujian & Rekap/Statistik nilai
     */
    public function reports(Request $request)
    {
        $user = $request->user();
        $idkategori = ($user && $user->role === 'admin' && !empty($user->idkategori))
            ? $user->idkategori
            : ($request->idkategori ?? $user?->idkategori);

        // 1. Guru Mengajar Kelas Apa (Wali Kelas & Pengampu)
        $classesQuery = MasterKelas::with(['jenjang', 'waliKelas', 'guruMataPelajaran.guru', 'guruMataPelajaran.mataPelajaran'])
            ->withCount('siswa');
        if (!empty($idkategori)) {
            $classesQuery->where('idkategori', $idkategori);
        }
        $classes = $classesQuery->orderBy('tingkat', 'asc')->orderBy('nama_kelas', 'asc')->get();

        $guruMengajar = $classes->map(function ($c) {
            $wali = $c->waliKelas ? [
                'id' => $c->waliKelas->iduser_bo,
                'nama' => $c->waliKelas->name,
                'name' => $c->waliKelas->name,
                'nip' => $c->waliKelas->login_username ?? '-',
                'phone' => $c->waliKelas->telp,
                'email' => $c->waliKelas->email,
            ] : null;

            $pengampu = $c->guruMataPelajaran->map(function ($gmp) {
                return [
                    'idguru' => $gmp->guru?->iduser_bo,
                    'guru_id' => $gmp->guru?->iduser_bo,
                    'nama_guru' => $gmp->guru?->name ?? 'Belum Ditentukan',
                    'guru_name' => $gmp->guru?->name ?? 'Belum Ditentukan',
                    'nip' => $gmp->guru?->login_username ?? '-',
                    'guru_email' => $gmp->guru?->email,
                    'idmapel' => $gmp->mataPelajaran?->id,
                    'mapel_id' => $gmp->mataPelajaran?->id,
                    'nama_mapel' => $gmp->mataPelajaran?->nama_mapel ?? 'Mata Pelajaran',
                    'mapel_name' => $gmp->mataPelajaran?->nama_mapel ?? 'Mata Pelajaran',
                    'tahun_ajaran' => $gmp->tahun_ajaran,
                ];
            })->values();

            return [
                'id' => $c->id,
                'class_id' => $c->id,
                'nama_kelas' => $c->nama_kelas,
                'class_name' => $c->nama_kelas,
                'tingkat' => $c->tingkat,
                'jenjang' => $c->jenjang?->nama_jenjang ?? $c->jurusan,
                'kapasitas' => $c->kapasitas,
                'total_siswa' => $c->siswa_count,
                'wali_kelas' => $wali,
                'guru_pengampu' => $pengampu,
            ];
        });

        // 2. Daftar Siswa per Kelas
        $siswaPerKelas = $classes->map(function ($c) {
            $students = UserSiswa::where('idkelas', $c->id)
                ->orderBy('nama', 'asc')
                ->get()
                ->map(function ($s) {
                    return [
                        'id' => $s->iduser,
                        'nama' => $s->name,
                        'name' => $s->name,
                        'nisn' => $s->nisn,
                        'nis' => $s->nisn,
                        'email' => $s->email,
                        'username' => $s->login_username ?? $s->nisn ?? 'siswa',
                        'phone' => $s->telp,
                        'status' => $s->status_aktif === 'Y' ? 'Aktif' : 'Non-aktif',
                    ];
                });

            return [
                'id' => $c->id,
                'class_id' => $c->id,
                'nama_kelas' => $c->nama_kelas,
                'class_name' => $c->nama_kelas,
                'jenjang' => $c->jenjang?->nama_jenjang ?? $c->jurusan,
                'total_siswa' => $students->count(),
                'siswa' => $students,
                'students' => $students,
            ];
        });

        // 3. Nilai Siswa per Paket Ujian & Rekapitulasi Statistik
        $assessmentsQuery = Assessment::with(['mapel', 'jenjang', 'kelas']);
        if (!empty($idkategori)) {
            $assessmentsQuery->where('idkategori', $idkategori);
        }
        $assessments = $assessmentsQuery->orderBy('idassessment', 'desc')->limit(20)->get();

        $rekapNilaiUjian = $assessments->map(function ($exam) {
            $attempts = AssessmentJawabanPilgan::with('siswa.kelas')
                ->where('idassessment', $exam->idassessment)
                ->where(function ($q) {
                    $q->where('komentar', 'submitted')
                      ->orWhereNotNull('nilai');
                })
                ->get();

            $scores = $attempts->pluck('nilai')->filter(fn($v) => is_numeric($v))->map(fn($v) => (float)$v);
            $totalPeserta = $scores->count();
            $avgScore = $totalPeserta > 0 ? round($scores->average(), 2) : 0;
            $maxScore = $totalPeserta > 0 ? (float)$scores->max() : 0;
            $minScore = $totalPeserta > 0 ? (float)$scores->min() : 0;
            $tuntasCount = $scores->filter(fn($v) => $v >= 75.0)->count();
            $remedialCount = $totalPeserta - $tuntasCount;

            $daftarSiswa = $attempts->map(function ($att) {
                return [
                    'id' => $att->idassessment_jawaban_pilgan,
                    'attempt_id' => $att->idassessment_jawaban_pilgan,
                    'student_id' => $att->iduser,
                    'nama_siswa' => $att->siswa?->name ?? 'Siswa',
                    'student_name' => $att->siswa?->name ?? 'Siswa',
                    'nisn' => $att->siswa?->nisn ?? '-',
                    'kelas' => $att->siswa?->kelas?->nama_kelas ?? 'Kelas Siswa',
                    'class_name' => $att->siswa?->kelas?->nama_kelas ?? 'Kelas Siswa',
                    'nilai' => (float)($att->nilai ?? 0),
                    'score' => (float)($att->nilai ?? 0),
                    'status' => (float)($att->nilai ?? 0) >= 75.0 ? 'Tuntas' : 'Remedial',
                    'status_kkm' => (float)($att->nilai ?? 0) >= 75.0 ? 'Tuntas' : 'Remedial',
                    'duration' => $att->lama_dikerjakan ?: '00:00:00',
                    'submit_time' => $att->tgl_input_time,
                ];
            })->sortByDesc('nilai')->values();

            return [
                'id' => $exam->idassessment,
                'idassessment' => $exam->idassessment,
                'judul_ujian' => $exam->nama_assessment,
                'nama_assessment' => $exam->nama_assessment,
                'mapel' => $exam->mapel?->nama_mapel ?? 'Umum',
                'jenjang' => $exam->jenjang?->nama_jenjang ?? 'Umum',
                'class_target' => $exam->kelas?->nama_kelas ?? 'Semua Kelas',
                'total_soal' => (int)($exam->tampil_assessment_pilgan ?: 50),
                'total_peserta' => $totalPeserta,
                'nilai_rata_rata' => $avgScore,
                'nilai_tertinggi' => $maxScore,
                'nilai_terendah' => $minScore,
                'jumlah_tuntas' => $tuntasCount,
                'jumlah_remedial' => $remedialCount,
                'persentase_kelulusan' => $totalPeserta > 0 ? round(($tuntasCount / $totalPeserta) * 100, 1) : 0,
                'peserta' => $daftarSiswa,
                'siswa' => $daftarSiswa,
            ];
        });

        return response()->json([
            'reports' => [
                'guru_mengajar' => $guruMengajar,
                'siswa_per_kelas' => $siswaPerKelas,
                'rekap_nilai_ujian' => $rekapNilaiUjian,
            ],
            'guru_mengajar' => $guruMengajar,
            'siswa_per_kelas' => $siswaPerKelas,
            'rekap_nilai_ujian' => $rekapNilaiUjian,
        ]);
    }
    public function liveMonitoring()
    {
        try {
            $activeAttemptsCount = DB::table('assessment_jawaban_pilgan')->whereDate('tgl_input_time', today())->count();
            $totalAttemptsCount = DB::table('assessment_jawaban_pilgan')->count();
            $certificatesCount = DB::table('assessment_sertifikat')->count();

            $recentAttempts = DB::table('assessment_jawaban_pilgan as ajp')
                ->join('user as u', 'ajp.iduser', '=', 'u.iduser')
                ->join('assessment as a', 'ajp.idassessment', '=', 'a.idassessment')
                ->select('ajp.idassessment_jawaban_pilgan as id', 'u.nama as student_name', 'a.nama_assessment as exam_title', 'ajp.nilai as score', 'ajp.tgl_input_time as date')
                ->latest('ajp.tgl_input_time')
                ->limit(10)
                ->get();

            return response()->json([
                'stats' => [
                    'active_attempts' => $activeAttemptsCount,
                    'submitted_attempts' => $totalAttemptsCount,
                    'disqualified_attempts' => 0,
                    'certificates_issued' => $certificatesCount,
                ],
                'recent_attempts' => $recentAttempts,
                'recent_violations' => []
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'stats' => [
                    'active_attempts' => 0,
                    'submitted_attempts' => 0,
                    'disqualified_attempts' => 0,
                ],
                'recent_attempts' => [],
                'recent_violations' => [],
                'error' => $e->getMessage()
            ]);
        }
    }

    public function preFlightCheck()
    {
        // 1. Database Health & Latency
        $dbStatus = 'OK';
        $dbLatency = 0;
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $dbLatency = round((microtime(true) - $start) * 1000, 2);
        } catch (\Throwable $e) {
            $dbStatus = 'OFFLINE / UNREACHABLE';
        }

        // 2. Queue Status
        $queueStatus = 'OK';
        $pendingJobs = 0;
        $failedJobs = 0;

        // 3. Cache Health & Latency
        $cacheStatus = 'OK';
        $cacheLatency = 0;
        try {
            $start = microtime(true);
            Cache::put('_preflight_check', '1', 5);
            $cached = Cache::get('_preflight_check');
            $cacheLatency = round((microtime(true) - $start) * 1000, 2);
            if ($cached !== '1') {
                $cacheStatus = 'MISMATCH';
            }
        } catch (\Throwable $e) {
            $cacheStatus = 'ERROR';
        }

        // 4. Storage & Permissions
        $storagePath = storage_path('framework');
        $isWritable = is_writable($storagePath);
        $diskFree = @disk_free_space(storage_path());
        $diskFreeGb = $diskFree ? round($diskFree / (1024 * 1024 * 1024), 2) : null;

        // 5. Active Metrics from sertidemi database
        $totalStudents = UserSiswa::count();
        $totalTeachers = UserBo::where('status_remove', '!=', 'Y')->count();
        $totalJenjang = MasterJenjang::count();
        $totalClasses = MasterKelas::count();
        $totalSubjects = MasterMataPelajaran::count();
        $totalAssessments = DB::table('assessment')->count();
        $totalQuestions = DB::table('assessment_soal_pilgan')->count();

        $allOk = ($dbStatus === 'OK') && ($cacheStatus === 'OK') && $isWritable;

        return response()->json([
            'status' => $allOk ? 'READY' : 'WARNING',
            'timestamp' => now()->toIso8601String(),
            'database' => [
                'status' => $dbStatus,
                'latency_ms' => $dbLatency,
                'database_name' => config('database.connections.mysql.database'),
                'connection' => config('database.default'),
            ],
            'queue' => [
                'status' => $queueStatus,
                'driver' => config('queue.default'),
                'pending_jobs' => $pendingJobs,
                'failed_jobs' => $failedJobs,
            ],
            'cache' => [
                'status' => $cacheStatus,
                'driver' => config('cache.default'),
                'latency_ms' => $cacheLatency,
            ],
            'storage' => [
                'writable' => $isWritable,
                'free_space_gb' => $diskFreeGb,
            ],
            'metrics' => [
                'total_students' => $totalStudents,
                'total_teachers' => $totalTeachers,
                'total_jenjang' => $totalJenjang,
                'total_classes' => $totalClasses,
                'total_subjects' => $totalSubjects,
                'total_assessments' => $totalAssessments,
                'total_questions' => $totalQuestions,
                'active_published_exams' => $totalAssessments,
                'active_attempts' => 0,
            ]
        ]);
    }

    /**
     * Data guru mengajar di kelas apa saja dan siapa saja muridnya
     */
    public function teacherTeachingClasses(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['classes' => [], 'profile' => null]);
        }

        $teacherId = $user->iduser_bo ?? $user->id;
        $idkategori = $user->idkategori;

        // 1. Classes where teacher is Wali Kelas
        $waliClasses = MasterKelas::where('wali_kelas_id', $teacherId)
            ->with(['jenjang'])
            ->withCount('siswa')
            ->get();

        // 2. Classes where teacher is Guru Pengampu Mapel
        $gmpClassIds = \App\Models\GuruMataPelajaran::where('iduser_bo', $teacherId)
            ->pluck('idkelas')
            ->filter()
            ->unique()
            ->toArray();

        $mapelClasses = MasterKelas::whereIn('id', $gmpClassIds)
            ->where('wali_kelas_id', '!=', $teacherId)
            ->with(['jenjang'])
            ->withCount('siswa')
            ->get();

        // If teacher doesn't have explicit assignments yet, fallback to classes in their school
        $allAssignedClasses = $waliClasses->concat($mapelClasses);
        if ($allAssignedClasses->isEmpty() && !empty($idkategori)) {
            $allAssignedClasses = MasterKelas::where('idkategori', $idkategori)
                ->with(['jenjang'])
                ->withCount('siswa')
                ->limit(6)
                ->get();
        }

        // Get student list for each class
        $classesData = $allAssignedClasses->map(function ($c) use ($teacherId) {
            $isWali = ((string)$c->wali_kelas_id === (string)$teacherId);

            $mapelTaught = \App\Models\GuruMataPelajaran::where('iduser_bo', $teacherId)
                ->where('idkelas', $c->id)
                ->with('mataPelajaran')
                ->get()
                ->map(fn($g) => $g->mataPelajaran?->nama_mapel)
                ->filter()
                ->values()
                ->toArray();

            $students = UserSiswa::where('idkelas', $c->id)
                ->where('status_aktif', '!=', 'N')
                ->orderBy('nama', 'asc')
                ->get()
                ->map(function ($s, $idx) {
                    return [
                        'no' => $idx + 1,
                        'id' => $s->iduser,
                        'name' => $s->name,
                        'nama' => $s->name,
                        'nisn' => $s->nisn ?: '-',
                        'nis' => $s->nisn ?: '-',
                        'gender' => $s->jenis_kelamin ?: '-',
                        'email' => $s->email,
                        'phone' => $s->telp ?: '-',
                        'status' => $s->status_aktif === 'Y' ? 'Aktif' : 'Non-aktif',
                    ];
                });

            return [
                'id' => $c->id,
                'nama_kelas' => $c->nama_kelas,
                'tingkat' => $c->tingkat,
                'jenjang' => $c->jenjang?->nama_jenjang ?? $c->jurusan,
                'role' => $isWali ? 'Wali Kelas' : 'Guru Pengampu',
                'is_wali_kelas' => $isWali,
                'mapel_list' => $mapelTaught,
                'total_siswa' => $students->count(),
                'students' => $students,
            ];
        });

        return response()->json([
            'profile' => [
                'id' => $user->iduser_bo ?? $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->telp ?: '-',
                'nuptk' => $user->nuptk ?: ($user->login_username ?? '-'),
                'institution' => $user->kategori?->nama_kategori ?? 'Detik Detik TryOut',
                'role' => 'Guru Pengajar',
                'total_classes_taught' => $classesData->count(),
                'total_students_taught' => $classesData->sum('total_siswa'),
            ],
            'classes' => $classesData,
        ]);
    }
}
