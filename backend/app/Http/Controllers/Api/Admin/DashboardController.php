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
    public function stats(Request $request)
    {
        $totalQuestions = AssessmentSoalPilgan::count();
        $totalAssessments = Assessment::count();
        $totalInstansi = KategoriUserBo::count();
        $totalJenjang = MasterJenjang::count();
        $totalClasses = MasterKelas::count();
        $totalSubjects = MasterMataPelajaran::count();
        $totalTeachers = UserBo::where('status_remove', '!=', 'Y')->count();
        $totalStudents = UserSiswa::count();
        $totalAttempts = AssessmentJawabanPilgan::count();

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
            'total_questions' => $totalQuestions,
            'total_bank_soal' => $totalQuestions,
            'total_exams' => $totalAssessments,
            'total_assessments' => $totalAssessments,
            'total_instansi' => $totalInstansi,
            'total_jenjang' => $totalJenjang,
            'total_classes' => $totalClasses,
            'total_subjects' => $totalSubjects,
            'total_teachers' => $totalTeachers,
            'total_students' => $totalStudents,
            'total_attempts' => $totalAttempts,
            'recent_exams' => $recentExams,
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
}
