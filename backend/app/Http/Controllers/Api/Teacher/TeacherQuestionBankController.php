<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AssessmentSoalPilgan;
use App\Models\MasterJenjang;
use App\Models\MasterMataPelajaran;
use App\Models\MasterTahunSoal;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeacherQuestionBankController extends Controller
{
    /**
     * List questions in Bank Soal with 4-Dimensional Filter
     */
    public function index(Request $request)
    {
        $query = AssessmentSoalPilgan::with(['jenjang', 'mapel', 'tahunSoal', 'creator', 'assessment']);

        // 1. Filter Jenjang
        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        // 2. Filter Kelas (via assessment)
        if ($request->filled('idkelas')) {
            $query->whereHas('assessment', function ($q) use ($request) {
                $q->where('idkelas', $request->idkelas);
            });
        }

        // 3. Filter Mapel
        if ($request->filled('idmapel')) {
            $query->where('idmapel', $request->idmapel);
        }

        // 4. Filter Tahun Soal
        if ($request->filled('tahun_soal_id')) {
            $query->where('tahun_soal_id', $request->tahun_soal_id);
        }

        // Optional status filter (Aktif / Hidden)
        if ($request->filled('status_aktif')) {
            $query->where('status_aktif', $request->status_aktif);
        }

        if ($request->filled('search')) {
            $query->where('soal_text', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('package_id') || $request->filled('idassessment')) {
            $pkgId = $request->input('package_id') ?: $request->input('idassessment');
            $query->where('idassessment', $pkgId);
        }

        $perPage = $request->integer('per_page', 15);
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
                'status_aktif' => $q->status_aktif ?? 'Y',
                'tahun_soal_id' => $q->tahun_soal_id,
                'tahun_soal' => $q->tahunSoal?->tahun,
                'creator_id' => $q->iduser_bo,
                'creator_name' => $q->creator?->nama ?? 'Guru / Staff',
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
        $user = $request->user();
        if ($user && $user->role === 'admin') {
            return response()->json([
                'message' => 'Akses ditolak: Admin Instansi hanya memiliki hak baca (Read-Only) pada Bank Soal dan tidak dapat menambah butir soal.'
            ], 403);
        }

        $validated = $request->validate([
            'idjenjang' => 'required|integer',
            'idmapel' => 'required|integer',
            'tahun_soal_id' => 'nullable|integer',
            'soal_text' => 'required|string',
            'pilihan_a_text' => 'required|string',
            'pilihan_b_text' => 'required|string',
            'pilihan_c_text' => 'nullable|string',
            'pilihan_d_text' => 'nullable|string',
            'pilihan_e_text' => 'nullable|string',
            'jawaban' => 'required|in:A,B,C,D,E',
            'penjelasan_jawaban' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $id = (string) (time() . rand(1000000, 9999999));

        $item = AssessmentSoalPilgan::create([
            'idassessment_soal_pilgan' => $id,
            'idassessment' => $request->idassessment ?? '27733030223218733', // Default general pool
            'idjenjang' => $validated['idjenjang'],
            'idmapel' => $validated['idmapel'],
            'tahun_soal_id' => $validated['tahun_soal_id'] ?? null,
            'soal_text' => $validated['soal_text'],
            'pilihan_a_text' => $validated['pilihan_a_text'],
            'pilihan_b_text' => $validated['pilihan_b_text'],
            'pilihan_c_text' => $validated['pilihan_c_text'] ?? '',
            'pilihan_d_text' => $validated['pilihan_d_text'] ?? '',
            'pilihan_e_text' => $validated['pilihan_e_text'] ?? '',
            'jawaban' => strtoupper($validated['jawaban']),
            'penjelasan_jawaban' => $validated['penjelasan_jawaban'] ?? '',
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
            'iduser_bo' => $user?->iduser_bo,
            'tanggal_input' => now(),
        ]);

        AuditLog::record(
            'CREATE_BANK_SOAL',
            'assessment_soal_pilgan',
            $id,
            Str::limit($validated['soal_text'], 50),
            ['created_by' => $user?->name ?? 'Staff', 'role' => $user?->role ?? 'guru']
        );

        return response()->json([
            'message' => 'Soal berhasil disimpan ke Bank Soal',
            'data' => $item
        ], 201);
    }

    /**
     * Update question in Bank Soal
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'admin') {
            return response()->json([
                'message' => 'Akses ditolak: Admin Instansi hanya memiliki hak baca (Read-Only) pada Bank Soal dan tidak dapat mengubah butir soal.'
            ], 403);
        }

        $item = AssessmentSoalPilgan::with('assessment')->findOrFail($id);

        if ($user && $user->role === 'guru') {
            $ownerId = $item->iduser_bo ?: $item->assessment?->iduser_bo;
            if ((string)$ownerId !== (string)$user->iduser_bo) {
                return response()->json([
                    'message' => 'Akses ditolak: Guru hanya dapat mengubah butir soal yang dibuat oleh dirinya sendiri.'
                ], 403);
            }
        }

        $validated = $request->validate([
            'idjenjang' => 'nullable|integer',
            'idmapel' => 'nullable|integer',
            'tahun_soal_id' => 'nullable|integer',
            'soal_text' => 'required|string',
            'pilihan_a_text' => 'required|string',
            'pilihan_b_text' => 'required|string',
            'pilihan_c_text' => 'nullable|string',
            'pilihan_d_text' => 'nullable|string',
            'pilihan_e_text' => 'nullable|string',
            'jawaban' => 'required|in:A,B,C,D,E',
            'penjelasan_jawaban' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $updateData = [
            'soal_text' => $validated['soal_text'],
            'pilihan_a_text' => $validated['pilihan_a_text'],
            'pilihan_b_text' => $validated['pilihan_b_text'],
            'pilihan_c_text' => $validated['pilihan_c_text'] ?? '',
            'pilihan_d_text' => $validated['pilihan_d_text'] ?? '',
            'pilihan_e_text' => $validated['pilihan_e_text'] ?? '',
            'jawaban' => strtoupper($validated['jawaban']),
            'penjelasan_jawaban' => $validated['penjelasan_jawaban'] ?? '',
        ];

        if ($request->filled('idjenjang')) $updateData['idjenjang'] = $request->idjenjang;
        if ($request->filled('idmapel')) $updateData['idmapel'] = $request->idmapel;
        if ($request->filled('tahun_soal_id')) $updateData['tahun_soal_id'] = $request->tahun_soal_id;
        if ($request->filled('status_aktif')) $updateData['status_aktif'] = $request->status_aktif;

        $item->update($updateData);

        AuditLog::record(
            'EDIT_BANK_SOAL',
            'assessment_soal_pilgan',
            $id,
            Str::limit($item->soal_text, 50),
            ['updated_by' => $user?->name ?? 'Staff', 'role' => $user?->role ?? 'guru']
        );

        return response()->json([
            'message' => 'Soal berhasil diperbarui di Bank Soal',
            'data' => $item
        ]);
    }

    /**
     * Delete question from Bank Soal
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'admin') {
            return response()->json([
                'message' => 'Akses ditolak: Admin Instansi hanya memiliki hak baca (Read-Only) pada Bank Soal.'
            ], 403);
        }

        $item = AssessmentSoalPilgan::with('assessment')->findOrFail($id);

        if ($user && $user->role === 'guru') {
            $ownerId = $item->iduser_bo ?: $item->assessment?->iduser_bo;
            if ((string)$ownerId !== (string)$user->iduser_bo) {
                return response()->json([
                    'message' => 'Akses ditolak: Guru hanya dapat menghapus butir soal yang dibuat oleh dirinya sendiri.'
                ], 403);
            }
        }

        AuditLog::record(
            'DELETE_BANK_SOAL',
            'assessment_soal_pilgan',
            $id,
            Str::limit($item->soal_text, 50),
            ['deleted_by' => $user?->name ?? 'Staff', 'role' => $user?->role ?? 'guru']
        );

        $item->delete();

        return response()->json([
            'message' => 'Soal berhasil dihapus dari Bank Soal'
        ]);
    }

    /**
     * Toggle status question between Aktif (Y) and Hidden (N)
     */
    public function toggleStatus(Request $request, $id)
    {
        $user = $request->user();
        if ($user && $user->role === 'admin') {
            return response()->json([
                'message' => 'Akses ditolak: Admin Instansi tidak dapat mengubah status soal.'
            ], 403);
        }

        $item = AssessmentSoalPilgan::with('assessment')->findOrFail($id);

        if ($user && $user->role === 'guru') {
            $ownerId = $item->iduser_bo ?: $item->assessment?->iduser_bo;
            if ((string)$ownerId !== (string)$user->iduser_bo) {
                return response()->json([
                    'message' => 'Akses ditolak: Guru hanya dapat mengubah status butir soal miliknya sendiri.'
                ], 403);
            }
        }

        $newStatus = ($item->status_aktif === 'N') ? 'Y' : 'N';
        $item->update(['status_aktif' => $newStatus]);

        AuditLog::record(
            'EDIT_BANK_SOAL_STATUS',
            'assessment_soal_pilgan',
            $id,
            Str::limit($item->soal_text, 50),
            ['status_aktif' => $newStatus, 'updated_by' => $user?->name ?? 'Staff', 'role' => $user?->role ?? 'guru']
        );

        return response()->json([
            'message' => 'Status soal berhasil diubah menjadi ' . ($newStatus === 'Y' ? 'Aktif' : 'Hidden'),
            'status_aktif' => $newStatus
        ]);
    }

    /**
     * Download template for uploading questions (Requirement 4: 14 Kolom + 1 Baris Contoh Riil)
     */
    public function downloadTemplate(\App\Services\SimpleSpreadsheetService $spreadsheetService)
    {
        $headers = [
            'Mata Pelajaran',
            'Jenjang',
            'Bab / Topik',
            'Tingkat Kesulitan',
            'Pertanyaan',
            'Pilihan A',
            'Pilihan B',
            'Pilihan C',
            'Pilihan D',
            'Pilihan E (opsional)',
            'Kunci Jawaban',
            'Pembahasan',
            'Bobot Nilai',
            'Status Aktif'
        ];

        $sampleRows = [
            [
                'Matematika',
                'SMA',
                'Trigonometri',
                'Mudah',
                'Nilai dari sin 30 derajat adalah...',
                '0',
                '1/2',
                '1/2 akar 2',
                '1/2 akar 3',
                '1',
                'B',
                'Berdasarkan tabel sudut istimewa trigonometri, sin 30 derajat sama dengan 0.5 (1/2).',
                '1.00',
                '1'
            ]
        ];

        return $spreadsheetService->downloadCsv($headers, $sampleRows, 'template_soal_14_kolom.csv');
    }

    /**
     * Import questions from Excel (.xlsx) or CSV (.csv) with atomic per-row validation
     */
    public function import(Request $request, \App\Services\SimpleSpreadsheetService $spreadsheetService)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
            'idjenjang' => 'nullable|integer',
            'idmapel' => 'nullable|integer',
            'idassessment' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $idjenjang = $request->idjenjang ?: 1;
        $idmapel = $request->idmapel ?: 1;
        $idassessment = $request->idassessment ?? '27733030223218733';

        try {
            $rows = $spreadsheetService->parse($file->getRealPath(), $file->getClientOriginalName());
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal membaca berkas: ' . $e->getMessage()
            ], 422);
        }

        if (count($rows) <= 1) {
            return response()->json([
                'message' => 'Berkas kosong atau hanya berisi baris judul.'
            ], 422);
        }

        // Remove header row
        array_shift($rows);

        $detailedErrors = [];
        $validQuestions = [];

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // Row number in Excel (1-based, header was row 1)

            // Determine if row is 14-column format or legacy 8-column format
            $is14Col = count($row) >= 11 && (
                in_array(strtoupper(trim($row[10] ?? '')), ['A', 'B', 'C', 'D', 'E']) ||
                !empty($row[2]) || !empty($row[3])
            );

            if ($is14Col) {
                // 14 Column format:
                // 0: Mapel, 1: Jenjang, 2: Topik, 3: Kesulitan, 4: Pertanyaan,
                // 5: A, 6: B, 7: C, 8: D, 9: E, 10: Kunci, 11: Pembahasan, 12: Bobot, 13: Status
                $soalText = trim($row[4] ?? '');
                $optA = trim($row[5] ?? '');
                $optB = trim($row[6] ?? '');
                $optC = trim($row[7] ?? '');
                $optD = trim($row[8] ?? '');
                $optE = trim($row[9] ?? '');
                $jawaban = strtoupper(trim($row[10] ?? ''));
                $pembahasan = trim($row[11] ?? '');
                $status = trim($row[13] ?? '1');

                if (empty($soalText)) {
                    $detailedErrors[] = [
                        'baris' => $rowNum,
                        'kolom' => 'Pertanyaan',
                        'alasan' => 'Kolom pertanyaan butir soal wajib diisi dan tidak boleh kosong.'
                    ];
                }
                if (empty($optA)) {
                    $detailedErrors[] = [
                        'baris' => $rowNum,
                        'kolom' => 'Pilihan A',
                        'alasan' => 'Kolom pilihan A wajib diisi.'
                    ];
                }
                if (empty($optB)) {
                    $detailedErrors[] = [
                        'baris' => $rowNum,
                        'kolom' => 'Pilihan B',
                        'alasan' => 'Kolom pilihan B wajib diisi.'
                    ];
                }
                if (empty($jawaban) || !in_array($jawaban, ['A', 'B', 'C', 'D', 'E'])) {
                    $detailedErrors[] = [
                        'baris' => $rowNum,
                        'kolom' => 'Kunci Jawaban',
                        'alasan' => "Kunci jawaban harus berupa salah satu huruf kapital A, B, C, D, atau E. (Ditemukan: '{$jawaban}')"
                    ];
                }
            } else {
                // Legacy 8-column format:
                // 0: Soal, 1: A, 2: B, 3: C, 4: D, 5: E, 6: Kunci, 7: Pembahasan
                $soalText = trim($row[0] ?? '');
                $optA = trim($row[1] ?? '');
                $optB = trim($row[2] ?? '');
                $optC = trim($row[3] ?? '');
                $optD = trim($row[4] ?? '');
                $optE = trim($row[5] ?? '');
                $jawaban = strtoupper(trim($row[6] ?? ''));
                $pembahasan = trim($row[7] ?? '');
                $status = '1';

                if (empty($soalText)) {
                    $detailedErrors[] = [
                        'baris' => $rowNum,
                        'kolom' => 'Pertanyaan / Soal',
                        'alasan' => 'Kolom pertanyaan butir soal tidak boleh kosong.'
                    ];
                }
                if (empty($jawaban) || !in_array($jawaban, ['A', 'B', 'C', 'D', 'E'])) {
                    $detailedErrors[] = [
                        'baris' => $rowNum,
                        'kolom' => 'Kunci Jawaban',
                        'alasan' => "Kunci jawaban harus A, B, C, D, atau E. (Ditemukan: '{$jawaban}')"
                    ];
                }
            }

            if (empty($detailedErrors)) {
                $validQuestions[] = [
                    'soal_text' => $soalText,
                    'pilihan_a_text' => $optA ?: '-',
                    'pilihan_b_text' => $optB ?: '-',
                    'pilihan_c_text' => $optC ?: '-',
                    'pilihan_d_text' => $optD ?: '-',
                    'pilihan_e_text' => $optE ?: '-',
                    'jawaban' => in_array($jawaban, ['A', 'B', 'C', 'D', 'E']) ? $jawaban : 'A',
                    'penjelasan_jawaban' => $pembahasan,
                    'status_aktif' => in_array($status, ['0', 'N', 'Hidden']) ? 'N' : 'Y',
                ];
            }
        }

        // If there are validation errors, return detailed error response (Requirement 4)
        if (!empty($detailedErrors)) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi berkas soal gagal. Silakan periksa detail baris dan kolom berikut:',
                'errors' => $detailedErrors
            ], 422);
        }

        $imported = 0;
        DB::beginTransaction();
        try {
            foreach ($validQuestions as $q) {
                $id = (string) (time() . rand(1000000, 9999999));
                AssessmentSoalPilgan::create([
                    'idassessment_soal_pilgan' => $id,
                    'idassessment' => $idassessment,
                    'idjenjang' => $idjenjang,
                    'idmapel' => $idmapel,
                    'soal_text' => $q['soal_text'],
                    'pilihan_a_text' => $q['pilihan_a_text'],
                    'pilihan_b_text' => $q['pilihan_b_text'],
                    'pilihan_c_text' => $q['pilihan_c_text'],
                    'pilihan_d_text' => $q['pilihan_d_text'],
                    'pilihan_e_text' => $q['pilihan_e_text'],
                    'jawaban' => $q['jawaban'],
                    'penjelasan_jawaban' => $q['penjelasan_jawaban'],
                    'status_aktif' => $q['status_aktif'],
                    'tanggal_input' => now(),
                ]);
                $imported++;
            }

            AuditLog::record(
                'IMPORT_BANK_SOAL',
                'assessment_soal_pilgan',
                $idassessment,
                "Import {$imported} butir soal via Excel 14 Kolom",
                ['imported_count' => $imported]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Berhasil mengimpor {$imported} butir soal ke Bank Soal!",
                'imported_count' => $imported
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal menyimpan soal ke database: ' . $e->getMessage()
            ], 500);
        }
    }
}
