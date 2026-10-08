<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AssessmentSoalPilgan;
use App\Models\MasterJenjang;
use App\Models\MasterMataPelajaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeacherQuestionBankController extends Controller
{
    /**
     * List questions in Bank Soal
     */
    public function index(Request $request)
    {
        $query = AssessmentSoalPilgan::with(['jenjang', 'mapel']);

        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        if ($request->filled('idmapel')) {
            $query->where('idmapel', $request->idmapel);
        }

        if ($request->filled('search')) {
            $query->where('soal_text', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('package_id') || $request->filled('idassessment')) {
            $pkgId = $request->input('package_id') ?: $request->input('idassessment');
            $query->where('idassessment', $pkgId);
        }

        $perPage = $request->integer('per_page', 25);
        $paginator = $query->orderBy('idassessment_soal_pilgan', 'desc')->paginate($perPage);

        $transformed = $paginator->getCollection()->map(function ($q) {
            $options = [];
            if (!empty($q->pilihan_a_text) || !empty($q->pilihan_a_gambar)) {
                $options[] = ['id' => 1, 'key' => 'A', 'content' => $q->pilihan_a_text ?: 'Pilihan A', 'is_correct' => strtoupper($q->jawaban) === 'A', 'media_url' => $q->pilihan_a_gambar];
            }
            if (!empty($q->pilihan_b_text) || !empty($q->pilihan_b_gambar)) {
                $options[] = ['id' => 2, 'key' => 'B', 'content' => $q->pilihan_b_text ?: 'Pilihan B', 'is_correct' => strtoupper($q->jawaban) === 'B', 'media_url' => $q->pilihan_b_gambar];
            }
            if (!empty($q->pilihan_c_text) || !empty($q->pilihan_c_gambar)) {
                $options[] = ['id' => 3, 'key' => 'C', 'content' => $q->pilihan_c_text ?: 'Pilihan C', 'is_correct' => strtoupper($q->jawaban) === 'C', 'media_url' => $q->pilihan_c_gambar];
            }
            if (!empty($q->pilihan_d_text) || !empty($q->pilihan_d_gambar)) {
                $options[] = ['id' => 4, 'key' => 'D', 'content' => $q->pilihan_d_text ?: 'Pilihan D', 'is_correct' => strtoupper($q->jawaban) === 'D', 'media_url' => $q->pilihan_d_gambar];
            }
            if (!empty($q->pilihan_e_text) || !empty($q->pilihan_e_gambar)) {
                $options[] = ['id' => 5, 'key' => 'E', 'content' => $q->pilihan_e_text ?: 'Pilihan E', 'is_correct' => strtoupper($q->jawaban) === 'E', 'media_url' => $q->pilihan_e_gambar];
            }

            return [
                'id' => $q->idassessment_soal_pilgan,
                'idassessment_soal_pilgan' => $q->idassessment_soal_pilgan,
                'package_id' => $q->idassessment,
                'idassessment' => $q->idassessment,
                'content' => $q->soal_text ?: 'Pertanyaan',
                'soal_text' => $q->soal_text ?: 'Pertanyaan',
                'media_url' => $q->soal_gambar,
                'type' => 'multiple_choice_single',
                'difficulty' => 'medium',
                'topic' => $q->mapel?->nama_mapel ?? 'Umum',
                'subject' => [
                    'id' => $q->idmapel,
                    'name' => $q->mapel?->nama_mapel ?? 'Umum',
                    'code' => $q->mapel?->kode_mapel ?? 'MAPEL',
                ],
                'options' => $options,
                'matching_pairs' => [],
                'explanation' => $q->penjelasan_jawaban,
                'penjelasan_jawaban' => $q->penjelasan_jawaban,
                'jawaban' => $q->jawaban,
            ];
        });

        $paginator->setCollection($transformed);

        return response()->json($paginator);
    }

    /**
     * Store single question in Bank Soal
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'idjenjang' => 'required|integer',
            'idmapel' => 'required|integer',
            'soal_text' => 'required|string',
            'pilihan_a_text' => 'required|string',
            'pilihan_b_text' => 'required|string',
            'pilihan_c_text' => 'nullable|string',
            'pilihan_d_text' => 'nullable|string',
            'pilihan_e_text' => 'nullable|string',
            'jawaban' => 'required|in:A,B,C,D,E',
            'penjelasan_jawaban' => 'nullable|string',
        ]);

        $id = (string) (time() . rand(1000000, 9999999));

        $item = AssessmentSoalPilgan::create([
            'idassessment_soal_pilgan' => $id,
            'idassessment' => $request->idassessment ?? '27733030223218733', // Default general pool
            'idjenjang' => $validated['idjenjang'],
            'idmapel' => $validated['idmapel'],
            'soal_text' => $validated['soal_text'],
            'pilihan_a_text' => $validated['pilihan_a_text'],
            'pilihan_b_text' => $validated['pilihan_b_text'],
            'pilihan_c_text' => $validated['pilihan_c_text'] ?? '',
            'pilihan_d_text' => $validated['pilihan_d_text'] ?? '',
            'pilihan_e_text' => $validated['pilihan_e_text'] ?? '',
            'jawaban' => strtoupper($validated['jawaban']),
            'penjelasan_jawaban' => $validated['penjelasan_jawaban'] ?? '',
            'tanggal_input' => now(),
        ]);

        return response()->json([
            'message' => 'Soal berhasil disimpan ke Bank Soal',
            'data' => $item
        ], 201);
    }

    /**
     * Download CSV template for uploading questions
     */
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="template_upload_soal.csv"',
        ];

        $callback = function () {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'Pertanyaan / Soal',
                'Pilihan A',
                'Pilihan B',
                'Pilihan C',
                'Pilihan D',
                'Pilihan E',
                'Kunci Jawaban (A/B/C/D/E)',
                'Pembahasan Soal'
            ]);

            fputcsv($handle, [
                'Berapakah hasil dari 15 x 4 + 20?',
                '60',
                '70',
                '80',
                '90',
                '100',
                'C',
                'Langkah pengerjaan: 15 x 4 = 60, kemudian 60 + 20 = 80.'
            ]);

            fputcsv($handle, [
                'Ibukota negara Indonesia adalah...',
                'Surabaya',
                'Bandung',
                'Nusantara / Jakarta',
                'Medan',
                'Semarang',
                'C',
                'Pusat pemerintahan Indonesia berada di DKI Jakarta dan Nusantara.'
            ]);

            fclose($handle);
        };

        return new StreamedResponse($callback, 200, $headers);
    }

    /**
     * Import questions from CSV
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
            'idjenjang' => 'required|integer',
            'idmapel' => 'required|integer',
            'idassessment' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $idjenjang = $request->idjenjang;
        $idmapel = $request->idmapel;
        $idassessment = $request->idassessment ?? '27733030223218733';

        $handle = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($handle); // skip header row

        $imported = 0;
        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle)) !== false) {
                if (empty($row[0])) continue;

                $soalText = $row[0];
                $optA = $row[1] ?? '-';
                $optB = $row[2] ?? '-';
                $optC = $row[3] ?? '-';
                $optD = $row[4] ?? '-';
                $optE = $row[5] ?? '-';
                $jawaban = strtoupper(trim($row[6] ?? 'A'));
                $pembahasan = $row[7] ?? '';

                $id = (string) (time() . rand(1000000, 9999999));

                AssessmentSoalPilgan::create([
                    'idassessment_soal_pilgan' => $id,
                    'idassessment' => $idassessment,
                    'idjenjang' => $idjenjang,
                    'idmapel' => $idmapel,
                    'soal_text' => $soalText,
                    'pilihan_a_text' => $optA,
                    'pilihan_b_text' => $optB,
                    'pilihan_c_text' => $optC,
                    'pilihan_d_text' => $optD,
                    'pilihan_e_text' => $optE,
                    'jawaban' => in_array($jawaban, ['A', 'B', 'C', 'D', 'E']) ? $jawaban : 'A',
                    'penjelasan_jawaban' => $pembahasan,
                    'tanggal_input' => now(),
                ]);

                $imported++;
            }
            DB::commit();
            fclose($handle);

            return response()->json([
                'message' => "Berhasil mengimpor {$imported} butir soal ke Bank Soal!",
                'imported_count' => $imported
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            fclose($handle);
            return response()->json([
                'message' => 'Gagal mengimpor file: ' . $e->getMessage()
            ], 500);
        }
    }
}
