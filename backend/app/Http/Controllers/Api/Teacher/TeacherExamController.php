<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\AssessmentJawabanPilgan;
use App\Models\MasterJenjang;
use App\Models\MasterMataPelajaran;
use App\Models\MasterKelas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeacherExamController extends Controller
{
    /**
     * List all TryOut packages
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Assessment::with(['jenjang', 'kelas', 'mapel', 'pembuat', 'kategori'])
            ->withCount(['soal', 'attempts']);

        if ($user && $user->role === 'guru') {
            $query->where(function ($q) use ($user) {
                $q->where('iduser_bo', $user->iduser_bo)
                  ->orWhere('idkategori', $user->idkategori)
                  ->orWhere('idkategori', '27830150842287772') // Master Bank Soal PGRI SLCC / Detik Detik
                  ->orWhereNull('idkategori')
                  ->orWhereNull('iduser_bo');
            });
        } elseif ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where(function ($q) use ($user) {
                $q->where('idkategori', $user->idkategori)
                  ->orWhere('idkategori', '27830150842287772') // Master Bank Soal PGRI SLCC / Detik Detik
                  ->orWhereNull('idkategori');
            });
        }

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('idmapel')) {
            $query->where('idmapel', $request->idmapel);
        }

        if ($request->filled('idkelas')) {
            $query->where('idkelas', $request->idkelas);
        }

        if ($request->filled('search')) {
            $query->where('nama_assessment', 'like', '%' . $request->search . '%');
        }

        $items = $query->orderBy('idassessment', 'desc')->get();

        // Compatibility transform
        $mapped = $items->map(function ($item) {
            $now = now();
            $start = $item->tanggal_mulai_assessment ? \Carbon\Carbon::parse($item->tanggal_mulai_assessment) : null;
            $end = $item->tanggal_batas_assessment ? \Carbon\Carbon::parse($item->tanggal_batas_assessment) : null;
            
            $status = 'published';
            if ($start && $now->lt($start)) {
                $status = 'scheduled';
            } elseif ($end && $now->gt($end)) {
                $status = 'closed';
            }

            return [
                'id' => $item->idassessment,
                'idassessment' => $item->idassessment,
                'title' => $item->nama_assessment,
                'name' => $item->nama_assessment,
                'code' => 'TO-' . substr($item->idassessment, -5),
                'description' => $item->deskripsi_assessment,
                'subject_id' => $item->idmapel,
                'subject_name' => $item->mapel?->nama_mapel ?? 'Umum',
                'subject' => [
                    'id' => $item->idmapel,
                    'name' => $item->mapel?->nama_mapel ?? 'Umum',
                    'code' => $item->mapel?->kode_mapel ?? 'UMUM',
                ],
                'jenjang_name' => $item->jenjang?->nama_jenjang ?? 'Umum',
                'class_id' => $item->idkelas,
                'class_name' => $item->kelas?->nama_kelas ?? 'Semua Kelas / Bank Soal',
                'duration_minutes' => (int) ($item->waktu_pengerjaan ?: 60),
                'total_questions' => $item->soal_count ?: $item->tampil_assessment_pilgan ?: 50,
                'questions_count' => $item->soal_count ?: $item->tampil_assessment_pilgan ?: 50,
                'tampil_assessment_pilgan' => $item->tampil_assessment_pilgan ?: 50,
                'start_time' => $item->tanggal_mulai_assessment,
                'end_time' => $item->tanggal_batas_assessment,
                'status' => $status,
                'attempts_count' => $item->attempts_count,
                'created_by' => $item->pembuat?->nama ?? 'Guru',
                'institution' => $item->kategori?->nama_kategori ?? 'Umum',
            ];
        });

        return response()->json($mapped);
    }

    /**
     * Store manual package
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_assessment' => 'required|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idjenjang' => 'nullable|integer',
            'idmapel' => 'nullable|integer',
            'idkelas' => 'nullable|integer',
            'waktu_pengerjaan' => 'nullable|integer|min:1',
            'tampil_assessment_pilgan' => 'nullable|integer|min:1',
            'tanggal_mulai_assessment' => 'nullable|date',
            'tanggal_batas_assessment' => 'nullable|date',
        ]);

        $user = $request->user();
        $idassessment = (string) (time() . rand(1000000, 9999999));

        $item = Assessment::create([
            'idassessment' => $idassessment,
            'nama_assessment' => $validated['nama_assessment'],
            'deskripsi_assessment' => $validated['deskripsi_assessment'] ?? '',
            'idjenjang' => $validated['idjenjang'] ?? 1,
            'idmapel' => $validated['idmapel'] ?? 1,
            'idkelas' => $validated['idkelas'] ?? null,
            'iduser_bo' => $user ? $user->iduser_bo : null,
            'idkategori' => $user ? $user->idkategori : null,
            'waktu_pengerjaan' => $validated['waktu_pengerjaan'] ?? 60,
            'tampil_assessment_pilgan' => $validated['tampil_assessment_pilgan'] ?? 50,
            'tampil_assessment_essay' => 0,
            'harga_assessment' => 0,
            'diskon_assessment' => 0,
            'status_diskon' => '0',
            'point_assessment' => 0,
            'point_assessment_nama' => 'JPtest',
            'url_image_panjang' => '',
            'url_image_kotak' => '',
            'url_sertifikat_depan_template' => '',
            'url_sertifikat_belakang_template' => '',
            'url_logo_sponsor' => '',
            'tanggal_mulai_assessment' => $validated['tanggal_mulai_assessment'] ?? now(),
            'tanggal_batas_assessment' => $validated['tanggal_batas_assessment'] ?? now()->addDays(7),
            'tanggal_input' => now(),
        ]);

        return response()->json([
            'message' => 'Paket TryOut berhasil dibuat',
            'data' => $item
        ], 201);
    }

    /**
     * Generate 50 Random Questions from Bank Soal
     * User Requirement: "guru bisa mengenerate 50 soal random dari bank soal, lalu akan di berikan ke murid atau juga bisa di simpan sebagai List pilihan Bank Soal yg sudah dibuat"
     */
    public function generateRandom50(Request $request)
    {
        $validated = $request->validate([
            'nama_assessment' => 'required|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idjenjang' => 'required|integer',
            'idmapel' => 'required|integer',
            'idkelas' => 'nullable|integer',
            'total_soal' => 'nullable|integer|min:5|max:100',
            'waktu_pengerjaan' => 'nullable|integer|min:10|max:300',
            'tanggal_mulai_assessment' => 'nullable|date',
            'tanggal_batas_assessment' => 'nullable|date',
        ]);

        $totalSoal = (int) ($validated['total_soal'] ?? 50);
        $durasi = (int) ($validated['waktu_pengerjaan'] ?? 60);

        // 1. Fetch random questions from Bank Soal
        $soalPool = AssessmentSoalPilgan::where(function ($q) use ($validated) {
            $q->where('idjenjang', $validated['idjenjang'])
              ->where('idmapel', $validated['idmapel']);
        })->inRandomOrder()->limit($totalSoal)->get();

        // If pool is less than requested, take any available questions from the bank
        if ($soalPool->count() < $totalSoal) {
            $needed = $totalSoal - $soalPool->count();
            $existingIds = $soalPool->pluck('idassessment_soal_pilgan')->toArray();
            
            $additional = AssessmentSoalPilgan::whereNotIn('idassessment_soal_pilgan', $existingIds)
                ->inRandomOrder()
                ->limit($needed)
                ->get();
                
            $soalPool = $soalPool->merge($additional);
        }

        if ($soalPool->isEmpty()) {
            return response()->json([
                'message' => 'Bank Soal belum memiliki pertanyaan yang tersedia untuk digenerate.'
            ], 422);
        }

        $user = $request->user();
        $newAssessmentId = (string) (time() . rand(1000000, 9999999));

        // 2. Create the Assessment package
        $assessment = Assessment::create([
            'idassessment' => $newAssessmentId,
            'nama_assessment' => $validated['nama_assessment'],
            'deskripsi_assessment' => $validated['deskripsi_assessment'] ?? "TryOut 50 Soal Acak - Generate Otomatis",
            'idjenjang' => $validated['idjenjang'],
            'idmapel' => $validated['idmapel'],
            'idkelas' => $validated['idkelas'] ?? null,
            'iduser_bo' => $user ? $user->iduser_bo : null,
            'idkategori' => $user ? $user->idkategori : null,
            'waktu_pengerjaan' => $durasi,
            'tampil_assessment_pilgan' => $soalPool->count(),
            'tampil_assessment_essay' => 0,
            'harga_assessment' => 0,
            'diskon_assessment' => 0,
            'status_diskon' => '0',
            'point_assessment' => 0,
            'point_assessment_nama' => 'JPtest',
            'url_image_panjang' => '',
            'url_image_kotak' => '',
            'url_sertifikat_depan_template' => '',
            'url_sertifikat_belakang_template' => '',
            'url_logo_sponsor' => '',
            'tanggal_mulai_assessment' => $validated['tanggal_mulai_assessment'] ?? now(),
            'tanggal_batas_assessment' => $validated['tanggal_batas_assessment'] ?? now()->addDays(7),
            'tanggal_input' => now(),
        ]);

        // 3. Clone selected questions to this assessment package
        // This guarantees all students get the EXACT SAME 50 questions!
        foreach ($soalPool as $item) {
            $newSoalId = (string) (time() . rand(1000000, 9999999));
            AssessmentSoalPilgan::create([
                'idassessment_soal_pilgan' => $newSoalId,
                'idassessment' => $newAssessmentId,
                'idjenjang' => $validated['idjenjang'],
                'idmapel' => $validated['idmapel'],
                'soal_text' => $item->soal_text,
                'soal_gambar' => $item->soal_gambar,
                'pilihan_a_text' => $item->pilihan_a_text,
                'pilihan_a_gambar' => $item->pilihan_a_gambar,
                'pilihan_b_text' => $item->pilihan_b_text,
                'pilihan_b_gambar' => $item->pilihan_b_gambar,
                'pilihan_c_text' => $item->pilihan_c_text,
                'pilihan_c_gambar' => $item->pilihan_c_gambar,
                'pilihan_d_text' => $item->pilihan_d_text,
                'pilihan_d_gambar' => $item->pilihan_d_gambar,
                'pilihan_e_text' => $item->pilihan_e_text,
                'pilihan_e_gambar' => $item->pilihan_e_gambar,
                'jawaban' => $item->jawaban,
                'penjelasan_jawaban' => $item->penjelasan_jawaban,
                'tanggal_input' => now(),
            ]);
        }

        return response()->json([
            'message' => "Berhasil mengenerate {$soalPool->count()} soal acak dari Bank Soal ke dalam paket TryOut!",
            'data' => [
                'assessment' => $assessment,
                'total_generated' => $soalPool->count(),
                'assigned_class' => $assessment->kelas?->nama_kelas ?? 'Tersimpan di Bank Soal (Belum Ditugaskan)'
            ]
        ], 201);
    }

    /**
     * Assign package to a class
     */
    public function assignToClass(Request $request, $idassessment)
    {
        $request->validate([
            'idkelas' => 'required|exists:master_kelas,id'
        ]);

        $assessment = Assessment::findOrFail($idassessment);
        $assessment->update([
            'idkelas' => $request->idkelas
        ]);

        return response()->json([
            'message' => 'Paket TryOut berhasil ditugaskan ke kelas',
            'data' => $assessment->load('kelas')
        ]);
    }

    /**
     * Show package questions
     */
    public function show($idassessment)
    {
        $assessment = Assessment::with(['jenjang', 'kelas', 'mapel', 'soal'])->findOrFail($idassessment);
        return response()->json($assessment);
    }

    /**
     * List results of students who took this exam
     */
    public function results($idassessment)
    {
        $assessment = Assessment::with(['kelas', 'mapel'])->findOrFail($idassessment);
        $attempts = AssessmentJawabanPilgan::where('idassessment', $idassessment)
            ->with(['siswa.kelas'])
            ->orderBy('nilai', 'desc')
            ->get();

        $mapped = $attempts->map(function ($att) {
            return [
                'attempt_id' => $att->idassessment_jawaban_pilgan,
                'student_id' => $att->iduser,
                'student_name' => $att->siswa?->nama ?? 'Siswa',
                'student_nisn' => $att->siswa?->nisn ?? '-',
                'class_name' => $att->siswa?->kelas?->nama_kelas ?? '-',
                'score' => (float) $att->nilai,
                'time_spent' => $att->lama_dikerjakan ?: '-',
                'submitted_at' => $att->tgl_input_time,
            ];
        });

        return response()->json([
            'assessment' => [
                'id' => $assessment->idassessment,
                'title' => $assessment->nama_assessment,
                'subject' => $assessment->mapel?->nama_mapel,
                'class' => $assessment->kelas?->nama_kelas,
                'total_attempts' => $mapped->count(),
                'average_score' => $mapped->avg('score') ? round($mapped->avg('score'), 2) : 0,
                'highest_score' => $mapped->max('score') ?: 0,
                'lowest_score' => $mapped->min('score') ?: 0,
            ],
            'results' => $mapped
        ]);
    }

    /**
     * Delete package
     */
    public function destroy($idassessment)
    {
        $assessment = Assessment::findOrFail($idassessment);
        AssessmentSoalPilgan::where('idassessment', $idassessment)->delete();
        $assessment->delete();

        return response()->json([
            'message' => 'Paket TryOut berhasil dihapus'
        ]);
    }
}
