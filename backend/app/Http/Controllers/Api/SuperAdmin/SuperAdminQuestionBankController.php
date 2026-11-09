<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentSoalPilgan;
use App\Models\MasterJenjang;
use App\Models\MasterKelas;
use App\Models\MasterMataPelajaran;
use App\Models\AcademicYear;
use App\Models\MasterTahunSoal;
use App\Models\AuditLog;
use App\Services\SimpleSpreadsheetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SuperAdminQuestionBankController extends Controller
{
    /**
     * Helper to log audit activities for Bank Soal
     */
    private function logBankSoalActivity(string $action, Assessment $assessment, ?string $detailNotes = null): void
    {
        $jenjangName = $assessment->jenjang?->nama_jenjang ?? '-';
        $tingkatName = $assessment->tingkat ? "Tingkat {$assessment->tingkat}" : ($assessment->kelas?->nama_kelas ?? '-');
        $mapelName = $assessment->mapel?->nama_mapel ?? '-';
        $taName = $assessment->academicYear?->name ?? '-';
        $tahunSoalName = $assessment->tahunSoal?->tahun ?? '-';

        AuditLog::record(
            action: $action,
            targetType: 'assessment',
            targetId: (string) $assessment->idassessment,
            targetLabel: $assessment->nama_assessment,
            metadata: [
                'nama_paket' => $assessment->nama_assessment,
                'jenjang' => $jenjangName,
                'tingkat' => $tingkatName,
                'kelas' => $tingkatName,
                'mata_pelajaran' => $mapelName,
                'tahun_ajaran' => $taName,
                'tahun_soal' => $tahunSoalName,
                'aktivitas' => $action,
                'notes' => $detailNotes,
                'ip_address' => request()->ip(),
                'waktu' => now()->toDateTimeString(),
            ],
            module: 'Kelola Bank Soal'
        );
    }

    /**
     * Get cascading filter parameters:
     * - Jenjang
     * - Tingkat (filtered by Jenjang: SD: 1-6, SMP: 7-9, SMA/SMK: 10-12)
     * - Mata Pelajaran (filtered by Jenjang)
     * - Tahun Ajaran
     * - Tahun Soal
     */
    public function cascadingParams(Request $request)
    {
        $idjenjang = $request->input('idjenjang');

        // 1. Jenjang list
        $jenjangList = MasterJenjang::where('status_aktif', 'Y')
            ->orderBy('urutan', 'asc')
            ->get(['id', 'nama_jenjang', 'kode_jenjang']);

        // 2. Tingkat list (Filtered by Jenjang: SD 1-6, SMP 7-9, SMA/SMK 10-12)
        $tingkatList = $this->getTingkatOptions($idjenjang ? (int)$idjenjang : null);

        // 2b. Backward compatibility: Kelas list (filtered by Jenjang if selected)
        $kelasQuery = MasterKelas::query();
        if ($idjenjang) {
            $kelasQuery->where('idjenjang', $idjenjang);
        }
        $kelasList = $kelasQuery->orderBy('tingkat', 'asc')
            ->orderBy('nama_kelas', 'asc')
            ->get(['id', 'idjenjang', 'nama_kelas', 'tingkat', 'jurusan']);

        // 3. Mata Pelajaran list (filtered by Jenjang if selected)
        $mapelQuery = MasterMataPelajaran::where('status_aktif', 'Y');
        if ($idjenjang) {
            $mapelQuery->where('idjenjang', $idjenjang);
        }
        $mapelList = $mapelQuery->orderBy('nama_mapel', 'asc')
            ->get(['id', 'idjenjang', 'nama_mapel', 'kode_mapel', 'kkm', 'kelompok']);

        // 4. Tahun Ajaran list
        $tahunAjaranList = AcademicYear::orderBy('is_active', 'desc')
            ->orderBy('id', 'desc')
            ->get(['id', 'name', 'semester', 'is_active']);

        // 5. Tahun Soal list
        $tahunSoalList = MasterTahunSoal::where('is_active', 1)
            ->orderBy('tahun', 'desc')
            ->get(['id', 'tahun', 'keterangan', 'is_active']);

        return response()->json([
            'jenjang' => $jenjangList,
            'tingkat' => $tingkatList,
            'kelas' => $kelasList, // Backward compatibility
            'mata_pelajaran' => $mapelList,
            'tahun_ajaran' => $tahunAjaranList,
            'tahun_soal' => $tahunSoalList,
        ]);
    }

    /**
     * Helper to get Tingkat options based on Jenjang
     */
    private function getTingkatOptions(?int $idjenjang = null): array
    {
        $allowedTingkat = [];
        if ($idjenjang) {
            $jenjang = MasterJenjang::find($idjenjang);
            $kode = strtoupper($jenjang?->kode_jenjang ?? '');
            $nama = strtoupper($jenjang?->nama_jenjang ?? '');

            if (str_contains($kode, 'SD') || str_contains($nama, 'SD') || str_contains($nama, 'DASAR') || str_contains($nama, 'MI')) {
                $allowedTingkat = [1, 2, 3, 4, 5, 6];
            } elseif (str_contains($kode, 'SMP') || str_contains($nama, 'SMP') || str_contains($nama, 'MENENGAH PERTAMA') || str_contains($kode, 'MTS') || str_contains($nama, 'MTS')) {
                $allowedTingkat = [7, 8, 9];
            } elseif (str_contains($kode, 'SMA') || str_contains($kode, 'SMK') || str_contains($nama, 'SMA') || str_contains($nama, 'SMK') || str_contains($nama, 'MENENGAH ATAS') || str_contains($nama, 'KEJURUAN') || str_contains($kode, 'MA') || str_contains($nama, 'MA')) {
                $allowedTingkat = [10, 11, 12];
            }
        }

        // Query database master_tingkat_kelas if available
        $dbTingkats = DB::table('master_tingkat_kelas')
            ->where('status_aktif', 'Y')
            ->when($idjenjang, fn($q) => $q->where('idjenjang', $idjenjang))
            ->orderBy('tingkat', 'asc')
            ->get();

        $options = [];
        if ($dbTingkats->isNotEmpty()) {
            foreach ($dbTingkats as $t) {
                $options[] = [
                    'id' => (int) $t->tingkat,
                    'idtingkat' => (int) $t->id,
                    'tingkat' => (int) $t->tingkat,
                    'nama_tingkat' => "Tingkat {$t->tingkat}",
                    'label' => "Tingkat {$t->tingkat}",
                    'idjenjang' => $t->idjenjang,
                ];
            }
        } elseif (!empty($allowedTingkat)) {
            foreach ($allowedTingkat as $tNum) {
                $options[] = [
                    'id' => $tNum,
                    'idtingkat' => null,
                    'tingkat' => $tNum,
                    'nama_tingkat' => "Tingkat {$tNum}",
                    'label' => "Tingkat {$tNum}",
                    'idjenjang' => $idjenjang,
                ];
            }
        } else {
            // Default 1 to 12
            for ($i = 1; $i <= 12; $i++) {
                $options[] = [
                    'id' => $i,
                    'idtingkat' => null,
                    'tingkat' => $i,
                    'nama_tingkat' => "Tingkat {$i}",
                    'label' => "Tingkat {$i}",
                    'idjenjang' => null,
                ];
            }
        }

        return $options;
    }

    /**
     * List Question Packages (Bank Soal) based on Cascading Parameter Filter:
     * Server-side pagination, search, sorting.
     */
    public function index(Request $request)
    {
        $query = Assessment::with(['jenjang', 'kelas', 'mapel', 'academicYear', 'tahunSoal'])
            ->withCount('soal');

        // Parameter Filter 1: Jenjang
        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        // Parameter Filter 2: Tingkat (Fallback to idkelas if requested by legacy params)
        if ($request->filled('tingkat')) {
            $query->where('tingkat', (int) $request->tingkat);
        } elseif ($request->filled('idkelas')) {
            $query->where(function ($q) use ($request) {
                $q->where('idkelas', $request->idkelas)
                  ->orWhere('tingkat', $request->idkelas);
            });
        }

        // Parameter Filter 3: Mata Pelajaran
        if ($request->filled('idmapel')) {
            $query->where('idmapel', $request->idmapel);
        }

        // Parameter Filter 4: Tahun Ajaran
        if ($request->filled('id_tahun_ajaran')) {
            $query->where('id_tahun_ajaran', $request->id_tahun_ajaran);
        }

        // Parameter Filter 5: Tahun Soal
        if ($request->filled('tahun_soal_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('tahun_soal_id', $request->tahun_soal_id)
                  ->orWhereHas('soal', function ($sub) use ($request) {
                      $sub->where('tahun_soal_id', $request->tahun_soal_id);
                  });
            });
        }

        // Search by Package Title or Description
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('nama_assessment', 'like', "%{$search}%")
                  ->orWhere('deskripsi_assessment', 'like', "%{$search}%");
            });
        }

        // Status Filter: Aktif / Nonaktif
        if ($request->filled('status')) {
            $status = strtolower($request->status);
            if (in_array($status, ['aktif', 'y'])) {
                $query->where('status_aktif', 'Y');
            } elseif (in_array($status, ['nonaktif', 'non_aktif', 'n'])) {
                $query->where('status_aktif', 'N');
            }
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'tanggal_input');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['nama_assessment', 'tanggal_input', 'soal_count'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('tanggal_input', 'desc');
        }

        $perPage = $request->integer('per_page', 10);
        $paginator = $query->paginate($perPage);

        $paginator->getCollection()->transform(function ($item) {
            $isAktif = ($item->status_aktif ?? 'Y') === 'Y';
            $tingkatVal = $item->tingkat ?? ($item->kelas?->tingkat);
            $tingkatLabel = $tingkatVal ? "Tingkat {$tingkatVal}" : ($item->kelas?->nama_kelas ?? '-');

            return [
                'id' => (string) $item->idassessment,
                'idassessment' => (string) $item->idassessment,
                'judul_soal' => $item->nama_assessment,
                'deskripsi' => $item->deskripsi_assessment,
                'idjenjang' => $item->idjenjang,
                'jenjang' => $item->jenjang?->nama_jenjang ?? 'Semua Jenjang',
                'tingkat' => $tingkatVal,
                'idtingkat' => $item->idtingkat,
                'tingkat_label' => $tingkatLabel,
                'idkelas' => $item->idkelas,
                'kelas' => $tingkatLabel, // Backward compatible display
                'idmapel' => $item->idmapel,
                'mata_pelajaran' => $item->mapel?->nama_mapel ?? 'Semua Mapel',
                'id_tahun_ajaran' => $item->id_tahun_ajaran,
                'tahun_ajaran' => $item->academicYear?->name ?? '2026/2027',
                'tahun_soal_id' => $item->tahun_soal_id,
                'tahun_soal' => $item->tahunSoal?->tahun ?? '2026',
                'jumlah_soal' => (int) ($item->soal_count ?? 0),
                'status' => $isAktif ? 'Aktif' : 'Nonaktif',
                'status_aktif' => $isAktif ? 'Y' : 'N',
                'terakhir_diubah' => $item->tanggal_input ?: now()->toDateTimeString(),
            ];
        });

        return response()->json($paginator);
    }

    /**
     * Detail Soal:
     * Header: Nama Paket, Jenjang, Tingkat, Mata Pelajaran, Tahun Soal
     * Daftar Soal: Nomor, Pertanyaan, Pilihan, Jawaban Benar, Pembahasan, Tingkat Kesulitan
     */
    public function show(Request $request, $id)
    {
        $assessment = Assessment::with(['jenjang', 'kelas', 'mapel', 'academicYear', 'tahunSoal'])
            ->findOrFail($id);

        $questions = AssessmentSoalPilgan::where('idassessment', $id)
            ->with(['tahunSoal'])
            ->orderBy('idassessment_soal_pilgan', 'asc')
            ->get();

        $formattedQuestions = $questions->values()->map(function ($q, $index) {
            $options = [];
            $choices = [
                'A' => ['text' => $q->pilihan_a_text, 'image' => $q->pilihan_a_gambar],
                'B' => ['text' => $q->pilihan_b_text, 'image' => $q->pilihan_b_gambar],
                'C' => ['text' => $q->pilihan_c_text, 'image' => $q->pilihan_c_gambar],
                'D' => ['text' => $q->pilihan_d_text, 'image' => $q->pilihan_d_gambar],
                'E' => ['text' => $q->pilihan_e_text, 'image' => $q->pilihan_e_gambar],
            ];

            foreach ($choices as $letter => $val) {
                if (!empty($val['text']) || !empty($val['image'])) {
                    $options[] = [
                        'key' => $letter,
                        'content' => $val['text'] ?: '',
                        'image' => $val['image'],
                        'is_correct' => strtoupper($q->jawaban) === $letter,
                    ];
                }
            }

            return [
                'nomor' => $index + 1,
                'id' => (string) $q->idassessment_soal_pilgan,
                'pertanyaan' => $q->soal_text ?: '(Isi soal belum diatur)',
                'soal_gambar' => $q->soal_gambar,
                'pilihan' => $options,
                'jawaban_benar' => strtoupper($q->jawaban ?: 'A'),
                'pembahasan' => $q->penjelasan_jawaban ?: 'Tidak ada pembahasan.',
                'tingkat_kesulitan' => 'Sedang',
                'status_aktif' => ($q->status_aktif ?? 'Y') === 'Y' ? 'Aktif' : 'Nonaktif',
            ];
        });

        $isAktif = ($assessment->status_aktif ?? 'Y') === 'Y';
        $tingkatVal = $assessment->tingkat ?? ($assessment->kelas?->tingkat);
        $tingkatLabel = $tingkatVal ? "Tingkat {$tingkatVal}" : ($assessment->kelas?->nama_kelas ?? '-');

        // Record Audit Trail
        $this->logBankSoalActivity('Lihat Detail', $assessment, "Melihat detail paket soal dengan {$questions->count()} butir pertanyaan");

        return response()->json([
            'header' => [
                'id' => (string) $assessment->idassessment,
                'nama_paket' => $assessment->nama_assessment,
                'deskripsi' => $assessment->deskripsi_assessment,
                'idjenjang' => $assessment->idjenjang,
                'jenjang' => $assessment->jenjang?->nama_jenjang ?? '-',
                'tingkat' => $tingkatVal,
                'idtingkat' => $assessment->idtingkat,
                'tingkat_label' => $tingkatLabel,
                'idkelas' => $assessment->idkelas,
                'kelas' => $tingkatLabel, // Backward compatible display
                'idmapel' => $assessment->idmapel,
                'mata_pelajaran' => $assessment->mapel?->nama_mapel ?? '-',
                'id_tahun_ajaran' => $assessment->id_tahun_ajaran,
                'tahun_ajaran' => $assessment->academicYear?->name ?? '2026/2027',
                'tahun_soal_id' => $assessment->tahun_soal_id,
                'tahun_soal' => $assessment->tahunSoal?->tahun ?? '2026',
                'status' => $isAktif ? 'Aktif' : 'Nonaktif',
                'status_aktif' => $isAktif ? 'Y' : 'N',
                'jumlah_soal' => $questions->count(),
                'terakhir_diubah' => $assessment->tanggal_input ?: now()->toDateTimeString(),
            ],
            'questions' => $formattedQuestions,
        ]);
    }

    /**
     * Create a new Question Bank package
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_assessment' => 'required|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idjenjang' => 'required|integer',
            'tingkat' => 'required_without:idkelas|nullable|integer|min:1|max:12',
            'idkelas' => 'nullable|integer',
            'idmapel' => 'required|integer',
            'id_tahun_ajaran' => 'nullable|integer',
            'tahun_soal_id' => 'nullable|integer',
            'status_aktif' => 'nullable|string|in:Y,N,Aktif,Nonaktif',
        ]);

        $idassessment = (string) (time() . rand(1000000, 9999999));
        $statusAktif = in_array(strtolower($validated['status_aktif'] ?? 'y'), ['n', 'nonaktif']) ? 'N' : 'Y';

        $activeTa = $validated['id_tahun_ajaran'] ?? (AcademicYear::where('is_active', 1)->value('id') ?? 1);
        $activeTahunSoal = $validated['tahun_soal_id'] ?? (MasterTahunSoal::where('is_active', 1)->value('id') ?? 1);

        // Resolve Tingkat
        $tingkat = $request->filled('tingkat') ? (int) $request->tingkat : null;
        if (!$tingkat && $request->filled('idkelas')) {
            $tingkat = MasterKelas::where('id', $request->idkelas)->value('tingkat');
        }

        $idtingkat = null;
        if ($tingkat) {
            $idtingkat = DB::table('master_tingkat_kelas')
                ->where('tingkat', $tingkat)
                ->where(function ($q) use ($validated) {
                    $q->where('idjenjang', $validated['idjenjang'])
                      ->orWhereNull('idjenjang');
                })
                ->value('id');
        }

        $assessment = Assessment::create([
            'idassessment' => $idassessment,
            'nama_assessment' => trim($validated['nama_assessment']),
            'deskripsi_assessment' => $validated['deskripsi_assessment'] ?? '',
            'idjenjang' => $validated['idjenjang'],
            'tingkat' => $tingkat,
            'idtingkat' => $idtingkat,
            'idkelas' => null, // Super Admin Bank Soal Global does not bind to specific school class
            'idmapel' => $validated['idmapel'],
            'id_tahun_ajaran' => $activeTa,
            'tahun_soal_id' => $activeTahunSoal,
            'status_aktif' => $statusAktif,
            'tanggal_input' => now()->toDateTimeString(),
        ]);

        $this->logBankSoalActivity('Tambah', $assessment, "Membuat paket bank soal baru: {$assessment->nama_assessment}");

        return response()->json([
            'message' => 'Paket bank soal berhasil ditambahkan.',
            'data' => $assessment,
        ], 201);
    }

    /**
     * Edit Soal / Update Bank Soal Package:
     * Super Admin dapat mengubah Header Soal, Deskripsi, Jenjang, Tingkat, Mapel, Tahun Soal, Status.
     * Data langsung diperbarui tanpa refresh halaman.
     */
    public function update(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);

        $validated = $request->validate([
            'nama_assessment' => 'sometimes|required|string|max:255',
            'deskripsi_assessment' => 'nullable|string',
            'idjenjang' => 'sometimes|required|integer',
            'tingkat' => 'nullable|integer|min:1|max:12',
            'idkelas' => 'nullable|integer',
            'idmapel' => 'sometimes|required|integer',
            'id_tahun_ajaran' => 'nullable|integer',
            'tahun_soal_id' => 'nullable|integer',
            'status_aktif' => 'nullable|string',
            'status' => 'nullable|string',
            'questions' => 'nullable|array',
        ]);

        $updateData = [];
        if ($request->has('nama_assessment')) {
            $updateData['nama_assessment'] = trim($request->nama_assessment);
        }
        if ($request->has('deskripsi_assessment')) {
            $updateData['deskripsi_assessment'] = $request->deskripsi_assessment;
        }
        if ($request->has('idjenjang')) {
            $updateData['idjenjang'] = $request->idjenjang;
        }

        if ($request->has('tingkat') || $request->has('idkelas')) {
            $tingkat = $request->filled('tingkat') ? (int) $request->tingkat : null;
            if (!$tingkat && $request->filled('idkelas')) {
                $tingkat = MasterKelas::where('id', $request->idkelas)->value('tingkat');
            }

            $targetJenjang = $request->input('idjenjang', $assessment->idjenjang);
            $idtingkat = null;
            if ($tingkat) {
                $idtingkat = DB::table('master_tingkat_kelas')
                    ->where('tingkat', $tingkat)
                    ->where(function ($q) use ($targetJenjang) {
                        $q->where('idjenjang', $targetJenjang)
                          ->orWhereNull('idjenjang');
                    })
                    ->value('id');
            }

            $updateData['tingkat'] = $tingkat;
            $updateData['idtingkat'] = $idtingkat;
            $updateData['idkelas'] = null; // Clear school-specific class
        }

        if ($request->has('idmapel')) {
            $updateData['idmapel'] = $request->idmapel;
        }
        if ($request->has('id_tahun_ajaran')) {
            $updateData['id_tahun_ajaran'] = $request->id_tahun_ajaran;
        }
        if ($request->has('tahun_soal_id')) {
            $updateData['tahun_soal_id'] = $request->tahun_soal_id;
        }

        // Status handling (handles 'Aktif', 'Nonaktif', 'Y', 'N')
        $statusInput = $request->input('status_aktif') ?? $request->input('status');
        if ($statusInput !== null) {
            $isNonaktif = in_array(strtolower($statusInput), ['nonaktif', 'non_aktif', 'n']);
            $updateData['status_aktif'] = $isNonaktif ? 'N' : 'Y';
        }

        $assessment->update($updateData);

        // If questions payload is provided for editing individual question fields:
        if ($request->has('questions') && is_array($request->questions)) {
            foreach ($request->questions as $qItem) {
                if (!empty($qItem['id'])) {
                    $qRecord = AssessmentSoalPilgan::where('idassessment_soal_pilgan', $qItem['id'])
                        ->where('idassessment', $id)
                        ->first();
                    if ($qRecord) {
                        $qRecord->update([
                            'soal_text' => $qItem['pertanyaan'] ?? $qRecord->soal_text,
                            'jawaban' => strtoupper($qItem['jawaban_benar'] ?? $qRecord->jawaban),
                            'penjelasan_jawaban' => $qItem['pembahasan'] ?? $qRecord->penjelasan_jawaban,
                            'status_aktif' => isset($qItem['status_aktif']) && in_array(strtolower($qItem['status_aktif']), ['nonaktif', 'n']) ? 'N' : 'Y',
                        ]);
                    }
                }
            }
        }

        $assessment->load(['jenjang', 'kelas', 'mapel', 'academicYear', 'tahunSoal']);
        $assessment->loadCount('soal');

        $this->logBankSoalActivity('Edit', $assessment, "Memperbarui paket bank soal: {$assessment->nama_assessment}");

        $isAktif = ($assessment->status_aktif ?? 'Y') === 'Y';
        $tingkatVal = $assessment->tingkat ?? ($assessment->kelas?->tingkat);
        $tingkatLabel = $tingkatVal ? "Tingkat {$tingkatVal}" : ($assessment->kelas?->nama_kelas ?? '-');

        return response()->json([
            'message' => 'Paket soal berhasil diperbarui.',
            'data' => [
                'id' => (string) $assessment->idassessment,
                'idassessment' => (string) $assessment->idassessment,
                'judul_soal' => $assessment->nama_assessment,
                'deskripsi' => $assessment->deskripsi_assessment,
                'idjenjang' => $assessment->idjenjang,
                'jenjang' => $assessment->jenjang?->nama_jenjang ?? '-',
                'tingkat' => $tingkatVal,
                'idtingkat' => $assessment->idtingkat,
                'tingkat_label' => $tingkatLabel,
                'idkelas' => $assessment->idkelas,
                'kelas' => $tingkatLabel,
                'idmapel' => $assessment->idmapel,
                'mata_pelajaran' => $assessment->mapel?->nama_mapel ?? '-',
                'id_tahun_ajaran' => $assessment->id_tahun_ajaran,
                'tahun_ajaran' => $assessment->academicYear?->name ?? '2026/2027',
                'tahun_soal_id' => $assessment->tahun_soal_id,
                'tahun_soal' => $assessment->tahunSoal?->tahun ?? '2026',
                'jumlah_soal' => (int) ($assessment->soal_count ?? 0),
                'status' => $isAktif ? 'Aktif' : 'Nonaktif',
                'status_aktif' => $isAktif ? 'Y' : 'N',
                'terakhir_diubah' => now()->toDateTimeString(),
            ]
        ]);
    }

    /**
     * Delete Soal (Soft Delete):
     * Dialog konfirmasi, refresh tabel otomatis.
     */
    public function destroy(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);

        $this->logBankSoalActivity('Hapus', $assessment, "Menghapus paket bank soal: {$assessment->nama_assessment}");

        $assessment->delete(); // Soft delete via SoftDeletes trait

        return response()->json([
            'message' => "Paket soal {$assessment->nama_assessment} berhasil dihapus.",
            'id' => (string) $id,
        ]);
    }

    /**
     * Toggle Aktif / Nonaktif:
     * Backend updates, badge updates instantly without reload.
     */
    public function toggleStatus(Request $request, $id)
    {
        $assessment = Assessment::findOrFail($id);
        $isCurrentlyActive = ($assessment->status_aktif ?? 'Y') === 'Y';
        $newStatusAktif = $isCurrentlyActive ? 'N' : 'Y';
        $newStatusLabel = $isCurrentlyActive ? 'Nonaktif' : 'Aktif';

        $assessment->update([
            'status_aktif' => $newStatusAktif,
        ]);

        $action = $newStatusAktif === 'Y' ? 'Aktifkan' : 'Nonaktifkan';
        $this->logBankSoalActivity($action, $assessment, "Mengubah status paket soal menjadi {$newStatusLabel}");

        return response()->json([
            'message' => "Status paket soal berhasil diubah menjadi {$newStatusLabel}.",
            'id' => (string) $assessment->idassessment,
            'status' => $newStatusLabel,
            'status_aktif' => $newStatusAktif,
        ]);
    }

    /**
     * Download Excel/CSV Template for Bank Soal Upload
     */
    public function downloadTemplate(Request $request = null, ?SimpleSpreadsheetService $spreadsheetService = null)
    {
        $spreadsheetService = $spreadsheetService ?? app(SimpleSpreadsheetService::class);
        $headers = [
            'Jenjang',
            'Tingkat',
            'Mata Pelajaran',
            'Tahun Ajaran',
            'Tahun Soal',
            'Judul Paket Soal',
            'Nomor Soal',
            'Pertanyaan',
            'Pilihan A',
            'Pilihan B',
            'Pilihan C',
            'Pilihan D',
            'Pilihan E',
            'Jawaban Benar',
            'Pembahasan',
            'Tingkat Kesulitan',
            'Status',
        ];

        // Fetch realistic sample references from DB
        $sampleJenjang = MasterJenjang::where('status_aktif', 'Y')->orderBy('urutan')->value('nama_jenjang') ?? 'SMA';
        $sampleTingkat = '10';
        $sampleMapel = MasterMataPelajaran::where('status_aktif', 'Y')->orderBy('nama_mapel')->value('nama_mapel') ?? 'Matematika';
        $sampleTa = AcademicYear::where('is_active', 1)->value('name') ?? '2026/2027';
        $sampleTahunSoal = (string) (MasterTahunSoal::where('is_active', 1)->value('tahun') ?? '2026');

        $sampleRows = [
            [
                $sampleJenjang,
                $sampleTingkat,
                $sampleMapel,
                $sampleTa,
                $sampleTahunSoal,
                'Paket Latihan Ujian Nasional',
                '1',
                'Hasil dari 25 x 4 + 50 adalah ...',
                '100',
                '125',
                '150',
                '175',
                '200',
                'C',
                'Perhitungan: 25 x 4 = 100, lalu 100 + 50 = 150.',
                'Sedang',
                'Aktif',
            ],
            [
                $sampleJenjang,
                $sampleTingkat,
                $sampleMapel,
                $sampleTa,
                $sampleTahunSoal,
                'Paket Latihan Ujian Nasional',
                '2',
                'Ibu Kota Negara Indonesia adalah ...',
                'Surabaya',
                'Bandung',
                'Nusantara',
                'Medan',
                'Semarang',
                'C',
                'Berdasarkan UU IKN, ibu kota negara adalah Nusantara.',
                'Mudah',
                'Aktif',
            ]
        ];

        $instructions = [
            [
                'no' => 1,
                'kolom' => 'Jenjang',
                'status' => 'Wajib',
                'keterangan' => 'Nama jenjang pendidikan yang terdaftar di Master Jenjang (misal: SD, SMP, SMA, SMK).',
                'contoh' => $sampleJenjang,
            ],
            [
                'no' => 2,
                'kolom' => 'Tingkat',
                'status' => 'Wajib',
                'keterangan' => 'Tingkat pendidikan berupa angka 1-12 (SD: 1-6, SMP: 7-9, SMA/SMK: 10-12).',
                'contoh' => '10',
            ],
            [
                'no' => 3,
                'kolom' => 'Mata Pelajaran',
                'status' => 'Wajib',
                'keterangan' => 'Nama mata pelajaran yang terdaftar pada Master Mata Pelajaran.',
                'contoh' => $sampleMapel,
            ],
            [
                'no' => 4,
                'kolom' => 'Tahun Ajaran',
                'status' => 'Wajib',
                'keterangan' => 'Format tahun ajaran yang terdaftar di Master Tahun Ajaran (contoh: 2026/2027).',
                'contoh' => $sampleTa,
            ],
            [
                'no' => 5,
                'kolom' => 'Tahun Soal',
                'status' => 'Wajib',
                'keterangan' => 'Tahun rilis atau tahun arsip soal yang terdaftar di Master Tahun Soal.',
                'contoh' => $sampleTahunSoal,
            ],
            [
                'no' => 6,
                'kolom' => 'Judul Paket Soal',
                'status' => 'Wajib',
                'keterangan' => 'Nama paket soal. Butir soal dengan judul paket yang sama akan digabungkan dalam 1 paket bank soal.',
                'contoh' => 'Paket Latihan Ujian Nasional',
            ],
            [
                'no' => 7,
                'kolom' => 'Nomor Soal',
                'status' => 'Wajib',
                'keterangan' => 'Nomor urut pertanyaan di dalam paket soal (angka bulat 1, 2, 3, dst).',
                'contoh' => '1',
            ],
            [
                'no' => 8,
                'kolom' => 'Pertanyaan',
                'status' => 'Wajib',
                'keterangan' => 'Teks butir soal atau pertanyaan yang akan dikerjakan siswa.',
                'contoh' => 'Hasil dari 25 x 4 + 50 adalah ...',
            ],
            [
                'no' => 9,
                'kolom' => 'Pilihan A',
                'status' => 'Wajib',
                'keterangan' => 'Teks pilihan jawaban untuk opsi A.',
                'contoh' => '100',
            ],
            [
                'no' => 10,
                'kolom' => 'Pilihan B',
                'status' => 'Wajib',
                'keterangan' => 'Teks pilihan jawaban untuk opsi B.',
                'contoh' => '125',
            ],
            [
                'no' => 11,
                'kolom' => 'Pilihan C',
                'status' => 'Wajib',
                'keterangan' => 'Teks pilihan jawaban untuk opsi C.',
                'contoh' => '150',
            ],
            [
                'no' => 12,
                'kolom' => 'Pilihan D',
                'status' => 'Wajib',
                'keterangan' => 'Teks pilihan jawaban untuk opsi D.',
                'contoh' => '175',
            ],
            [
                'no' => 13,
                'kolom' => 'Pilihan E',
                'status' => 'Wajib',
                'keterangan' => 'Teks pilihan jawaban untuk opsi E.',
                'contoh' => '200',
            ],
            [
                'no' => 14,
                'kolom' => 'Jawaban Benar',
                'status' => 'Wajib',
                'keterangan' => 'Kunci jawaban benar, isi dengan huruf kapital A, B, C, D, atau E.',
                'contoh' => 'C',
            ],
            [
                'no' => 15,
                'kolom' => 'Pembahasan',
                'status' => 'Opsional',
                'keterangan' => 'Penjelasan rinci atau langkah kerja penyelesaian butir soal.',
                'contoh' => '25 x 4 = 100, lalu ditambah 50 = 150.',
            ],
            [
                'no' => 16,
                'kolom' => 'Tingkat Kesulitan',
                'status' => 'Opsional',
                'keterangan' => 'Kategori bobot soal: Mudah, Sedang, atau Sulit.',
                'contoh' => 'Sedang',
            ],
            [
                'no' => 17,
                'kolom' => 'Status',
                'status' => 'Wajib',
                'keterangan' => 'Status butir soal di sistem CBT: Aktif atau Nonaktif.',
                'contoh' => 'Aktif',
            ],
        ];

        return $spreadsheetService->downloadBankSoalTemplateXlsx($headers, $sampleRows, $instructions, 'template_upload_bank_soal.xlsx');
    }

    /**
     * Preview Excel/CSV File before Batch Import
     */
    public function preview(Request $request, ?SimpleSpreadsheetService $spreadsheetService = null)
    {
        $spreadsheetService = $spreadsheetService ?? app(SimpleSpreadsheetService::class);
        $request->validate([
            'file' => 'required|file|max:10240', // max 10MB
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['csv', 'xlsx', 'txt'])) {
            return response()->json([
                'message' => 'Format berkas tidak didukung. Harap unggah berkas dengan format .xlsx atau .csv.'
            ], 422);
        }

        try {
            $rows = $spreadsheetService->parse($file->getRealPath(), $file->getClientOriginalName());
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal membaca berkas: ' . $e->getMessage()
            ], 422);
        }

        if (empty($rows) || count($rows) < 2) {
            return response()->json([
                'message' => 'Berkas kosong atau tidak memiliki baris data.'
            ], 422);
        }

        // Header mapping
        $headerRow = array_map(fn($h) => strtolower(trim((string)$h)), $rows[0]);
        $colMap = $this->resolveTemplateColumnIndexes($headerRow);

        if ($colMap['pertanyaan'] === -1 || $colMap['jawaban'] === -1) {
            return response()->json([
                'message' => 'Format berkas tidak sesuai. Kolom Pertanyaan dan Jawaban Benar wajib tersedia.'
            ], 422);
        }

        // Preload Master Data for fast validation
        $jenjangs = MasterJenjang::all(['id', 'nama_jenjang', 'kode_jenjang']);
        $kelases = MasterKelas::all(['id', 'idjenjang', 'nama_kelas']);
        $mapels = MasterMataPelajaran::all(['id', 'idjenjang', 'nama_mapel', 'kode_mapel']);
        $academicYears = AcademicYear::all(['id', 'name', 'is_active']);
        $tahunSoals = MasterTahunSoal::all(['id', 'tahun', 'is_active']);

        $previewData = [];
        $validCount = 0;
        $invalidCount = 0;

        for ($i = 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            if (empty(array_filter($row, fn($v) => trim((string)$v) !== ''))) {
                continue; // skip totally empty rows
            }

            $validation = $this->validateRowData($row, $colMap, $jenjangs, $kelases, $mapels, $academicYears, $tahunSoals, $i + 1);

            if ($validation['is_valid']) {
                $validCount++;
            } else {
                $invalidCount++;
            }

            $previewData[] = $validation;
        }

        return response()->json([
            'total_rows' => count($previewData),
            'valid_count' => $validCount,
            'invalid_count' => $invalidCount,
            'preview' => $previewData,
        ]);
    }

    /**
     * Import Batch Bank Soal from Excel/CSV (Non-blocking: skips invalid rows and reports errors)
     */
    public function import(Request $request, ?SimpleSpreadsheetService $spreadsheetService = null)
    {
        $spreadsheetService = $spreadsheetService ?? app(SimpleSpreadsheetService::class);
        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['csv', 'xlsx', 'txt'])) {
            return response()->json([
                'message' => 'Format berkas tidak didukung. Harap unggah berkas dengan format .xlsx atau .csv.'
            ], 422);
        }

        try {
            $rows = $spreadsheetService->parse($file->getRealPath(), $file->getClientOriginalName());
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal membaca berkas: ' . $e->getMessage()
            ], 422);
        }

        if (empty($rows) || count($rows) < 2) {
            return response()->json([
                'message' => 'Berkas kosong atau tidak memiliki data.'
            ], 422);
        }

        $headerRow = array_map(fn($h) => strtolower(trim((string)$h)), $rows[0]);
        $colMap = $this->resolveTemplateColumnIndexes($headerRow);

        if ($colMap['pertanyaan'] === -1 || $colMap['jawaban'] === -1) {
            return response()->json([
                'message' => 'Format berkas tidak valid. Kolom Pertanyaan dan Jawaban Benar harus ada.'
            ], 422);
        }

        $jenjangs = MasterJenjang::all(['id', 'nama_jenjang', 'kode_jenjang']);
        $kelases = MasterKelas::all(['id', 'idjenjang', 'nama_kelas']);
        $mapels = MasterMataPelajaran::all(['id', 'idjenjang', 'nama_mapel', 'kode_mapel']);
        $academicYears = AcademicYear::all(['id', 'name', 'is_active']);
        $tahunSoals = MasterTahunSoal::all(['id', 'tahun', 'is_active']);

        $successCount = 0;
        $failedCount = 0;
        $failedRows = [];

        // Cache created/found assessment packages to group questions
        $assessmentCache = [];

        DB::beginTransaction();
        try {
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                if (empty(array_filter($row, fn($v) => trim((string)$v) !== ''))) {
                    continue;
                }

                $rowNumber = $i + 1;
                $val = $this->validateRowData($row, $colMap, $jenjangs, $kelases, $mapels, $academicYears, $tahunSoals, $rowNumber);

                if (!$val['is_valid']) {
                    $failedCount++;
                    $failedRows[] = [
                        'row' => $rowNumber,
                        'judul_paket' => $val['data']['judul_paket'] ?: '-',
                        'nomor_soal' => $val['data']['nomor_soal'] ?: '-',
                        'pertanyaan' => Str::limit($val['data']['pertanyaan'], 60),
                        'error' => implode('; ', $val['errors']),
                    ];
                    continue;
                }

                $d = $val['data'];

                // Key to group questions into Assessment packages
                $cacheKey = "{$d['judul_paket']}_{$d['idjenjang']}_{$d['tingkat']}_{$d['idmapel']}_{$d['id_tahun_ajaran']}_{$d['tahun_soal_id']}";

                if (!isset($assessmentCache[$cacheKey])) {
                    $existingAssessment = Assessment::where('nama_assessment', $d['judul_paket'])
                        ->where('idjenjang', $d['idjenjang'])
                        ->where('tingkat', $d['tingkat'])
                        ->where('idmapel', $d['idmapel'])
                        ->first();

                    if ($existingAssessment) {
                        $assessmentCache[$cacheKey] = $existingAssessment;
                    } else {
                        $newId = (string) (time() . rand(1000000, 9999999));
                        $newAssessment = Assessment::create([
                            'idassessment' => $newId,
                            'nama_assessment' => $d['judul_paket'],
                            'deskripsi_assessment' => 'Diimpor via Excel Bank Soal',
                            'idjenjang' => $d['idjenjang'],
                            'tingkat' => $d['tingkat'],
                            'idtingkat' => $d['idtingkat'],
                            'idkelas' => null, // Super Admin Bank Soal Global does not bind to specific school class
                            'idmapel' => $d['idmapel'],
                            'id_tahun_ajaran' => $d['id_tahun_ajaran'],
                            'tahun_soal_id' => $d['tahun_soal_id'],
                            'status_aktif' => $d['status_aktif'],
                            'tanggal_input' => now()->toDateTimeString(),
                        ]);
                        $assessmentCache[$cacheKey] = $newAssessment;
                    }
                }

                $assessment = $assessmentCache[$cacheKey];

                // Create question item
                $idSoal = (string) (time() . rand(1000000, 9999999));
                AssessmentSoalPilgan::create([
                    'idassessment_soal_pilgan' => $idSoal,
                    'idassessment' => $assessment->idassessment,
                    'idjenjang' => $d['idjenjang'],
                    'idmapel' => $d['idmapel'],
                    'tahun_soal_id' => $d['tahun_soal_id'],
                    'soal_text' => $d['pertanyaan'],
                    'pilihan_a_text' => $d['pilihan_a'],
                    'pilihan_b_text' => $d['pilihan_b'],
                    'pilihan_c_text' => $d['pilihan_c'],
                    'pilihan_d_text' => $d['pilihan_d'],
                    'pilihan_e_text' => $d['pilihan_e'],
                    'jawaban' => $d['jawaban'],
                    'penjelasan_jawaban' => $d['pembahasan'],
                    'status_aktif' => $d['status_aktif'],
                    'tanggal_input' => now()->toDateTimeString(),
                ]);

                $successCount++;
            }

            AuditLog::record(
                action: 'Import',
                targetType: 'assessment',
                targetId: 'BATCH_IMPORT',
                targetLabel: "Import Bank Soal: {$successCount} sukses, {$failedCount} gagal",
                metadata: [
                    'sukses' => $successCount,
                    'gagal' => $failedCount,
                    'total' => $successCount + $failedCount,
                    'berkas' => $file->getClientOriginalName(),
                ],
                module: 'Kelola Bank Soal'
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Proses import selesai. {$successCount} butir soal berhasil diimpor, {$failedCount} baris gagal.",
                'total_rows' => $successCount + $failedCount,
                'success_count' => $successCount,
                'failed_count' => $failedCount,
                'failed_rows' => $failedRows,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Terjadi kesalahan saat menyimpan data import: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper to map template column header strings to 0-based indexes
     */
    private function resolveTemplateColumnIndexes(array $headers): array
    {
        $map = [
            'jenjang' => -1,
            'tingkat' => -1,
            'kelas' => -1,
            'mapel' => -1,
            'tahun_ajaran' => -1,
            'tahun_soal' => -1,
            'judul_paket' => -1,
            'kode_paket' => -1,
            'nomor_soal' => -1,
            'pertanyaan' => -1,
            'pilihan_a' => -1,
            'pilihan_b' => -1,
            'pilihan_c' => -1,
            'pilihan_d' => -1,
            'pilihan_e' => -1,
            'jawaban' => -1,
            'pembahasan' => -1,
            'tingkat_kesulitan' => -1,
            'status' => -1,
        ];

        foreach ($headers as $idx => $header) {
            $h = strtolower(trim($header));
            if (str_contains($h, 'jenjang')) $map['jenjang'] = $idx;
            elseif (str_contains($h, 'tingkat') && !str_contains($h, 'kesulitan')) $map['tingkat'] = $idx;
            elseif (str_contains($h, 'kelas')) $map['kelas'] = $idx;
            elseif (str_contains($h, 'mata pelajaran') || str_contains($h, 'mapel')) $map['mapel'] = $idx;
            elseif (str_contains($h, 'tahun ajaran')) $map['tahun_ajaran'] = $idx;
            elseif (str_contains($h, 'tahun soal')) $map['tahun_soal'] = $idx;
            elseif (str_contains($h, 'judul paket') || str_contains($h, 'paket soal')) $map['judul_paket'] = $idx;
            elseif (str_contains($h, 'kode paket')) $map['kode_paket'] = $idx;
            elseif (str_contains($h, 'nomor soal') || str_contains($h, 'no soal')) $map['nomor_soal'] = $idx;
            elseif (str_contains($h, 'pertanyaan') || str_contains($h, 'soal')) $map['pertanyaan'] = $idx;
            elseif ($h === 'pilihan a' || $h === 'a') $map['pilihan_a'] = $idx;
            elseif ($h === 'pilihan b' || $h === 'b') $map['pilihan_b'] = $idx;
            elseif ($h === 'pilihan c' || $h === 'c') $map['pilihan_c'] = $idx;
            elseif ($h === 'pilihan d' || $h === 'd') $map['pilihan_d'] = $idx;
            elseif ($h === 'pilihan e' || $h === 'e') $map['pilihan_e'] = $idx;
            elseif (str_contains($h, 'jawaban') || str_contains($h, 'kunci')) $map['jawaban'] = $idx;
            elseif (str_contains($h, 'pembahasan')) $map['pembahasan'] = $idx;
            elseif (str_contains($h, 'kesulitan')) $map['tingkat_kesulitan'] = $idx;
            elseif (str_contains($h, 'status')) $map['status'] = $idx;
        }

        return $map;
    }

    /**
     * Helper to validate a single row data against Master Akademik
     */
    private function validateRowData(
        array $row,
        array $colMap,
        $jenjangs,
        $kelases,
        $mapels,
        $academicYears,
        $tahunSoals,
        int $rowNumber
    ): array {
        $errors = [];

        $getVal = fn($key) => isset($colMap[$key]) && $colMap[$key] >= 0 ? trim((string)($row[$colMap[$key]] ?? '')) : '';

        $jenjangRaw = $getVal('jenjang');
        $tingkatRaw = $getVal('tingkat');
        $kelasRaw = $getVal('kelas');
        $mapelRaw = $getVal('mapel');
        $taRaw = $getVal('tahun_ajaran');
        $tahunSoalRaw = $getVal('tahun_soal');
        $judulPaketRaw = $getVal('judul_paket');
        $kodePaketRaw = $getVal('kode_paket');
        $nomorSoalRaw = $getVal('nomor_soal');
        $pertanyaanRaw = $getVal('pertanyaan');
        $pilARaw = $getVal('pilihan_a');
        $pilBRaw = $getVal('pilihan_b');
        $pilCRaw = $getVal('pilihan_c');
        $pilDRaw = $getVal('pilihan_d');
        $pilERaw = $getVal('pilihan_e');
        $jawabanRaw = strtoupper($getVal('jawaban'));
        $pembahasanRaw = $getVal('pembahasan');
        $kesulitanRaw = $getVal('tingkat_kesulitan');
        $statusRaw = $getVal('status');

        // 1. Jenjang
        $resolvedJenjang = null;
        if (!empty($jenjangRaw)) {
            $resolvedJenjang = $jenjangs->first(function ($j) use ($jenjangRaw) {
                return (string)$j->id === $jenjangRaw ||
                    strcasecmp($j->nama_jenjang, $jenjangRaw) === 0 ||
                    strcasecmp($j->kode_jenjang ?? '', $jenjangRaw) === 0;
            });
        }
        if (!$resolvedJenjang) {
            $resolvedJenjang = $jenjangs->first(); // fallback to first if empty or not matched
            if (!empty($jenjangRaw)) {
                $errors[] = "Jenjang '{$jenjangRaw}' tidak ditemukan di Master Jenjang";
            }
        }

        // 2. Tingkat (SD: 1-6, SMP: 7-9, SMA/SMK: 10-12)
        $resolvedTingkat = null;
        if (!empty($tingkatRaw)) {
            if (preg_match('/\d+/', $tingkatRaw, $matches)) {
                $resolvedTingkat = (int) $matches[0];
            }
        }
        if (!$resolvedTingkat && !empty($kelasRaw)) {
            if (preg_match('/\d+/', $kelasRaw, $matches)) {
                $resolvedTingkat = (int) $matches[0];
            } else {
                $kMatch = $kelases->first(fn($k) => (string)$k->id === $kelasRaw || strcasecmp($k->nama_kelas, $kelasRaw) === 0);
                if ($kMatch && $kMatch->tingkat) {
                    $resolvedTingkat = (int) $kMatch->tingkat;
                }
            }
        }

        if (!$resolvedTingkat) {
            $resolvedTingkat = 10; // Default fallback Tingkat 10
        }

        // Resolve ID Tingkat from database if matching jenjang
        $idtingkat = null;
        if ($resolvedTingkat) {
            $idtingkat = DB::table('master_tingkat_kelas')
                ->where('tingkat', $resolvedTingkat)
                ->where(function ($q) use ($resolvedJenjang) {
                    if ($resolvedJenjang) {
                        $q->where('idjenjang', $resolvedJenjang->id)
                          ->orWhereNull('idjenjang');
                    }
                })
                ->value('id');
        }

        // 3. Mapel
        $resolvedMapel = null;
        if (!empty($mapelRaw)) {
            $resolvedMapel = $mapels->first(function ($m) use ($mapelRaw) {
                return (string)$m->id === $mapelRaw ||
                    strcasecmp($m->nama_mapel, $mapelRaw) === 0 ||
                    strcasecmp($m->kode_mapel ?? '', $mapelRaw) === 0;
            });
        }
        if (!$resolvedMapel) {
            $resolvedMapel = $mapels->first();
            if (!empty($mapelRaw)) {
                $errors[] = "Mata Pelajaran '{$mapelRaw}' tidak ditemukan di Master Mapel";
            }
        }

        // 4. Tahun Ajaran
        $resolvedTa = null;
        if (!empty($taRaw)) {
            $resolvedTa = $academicYears->first(fn($ta) => (string)$ta->id === $taRaw || strcasecmp($ta->name, $taRaw) === 0);
        }
        if (!$resolvedTa) {
            $resolvedTa = $academicYears->firstWhere('is_active', 1) ?? $academicYears->first();
        }

        // 5. Tahun Soal
        $resolvedTahunSoal = null;
        if (!empty($tahunSoalRaw)) {
            $resolvedTahunSoal = $tahunSoals->first(fn($ts) => (string)$ts->id === $tahunSoalRaw || (string)$ts->tahun === $tahunSoalRaw);
        }
        if (!$resolvedTahunSoal) {
            $resolvedTahunSoal = $tahunSoals->firstWhere('is_active', 1) ?? $tahunSoals->first();
        }

        // 6. Judul Paket Soal
        if (empty($judulPaketRaw)) {
            $judulPaketRaw = 'Paket Soal Impor ' . ($resolvedMapel?->nama_mapel ?? 'Umum');
        }

        // 7. Pertanyaan & Pilihan
        if (empty($pertanyaanRaw)) {
            $errors[] = 'Kolom Pertanyaan wajib diisi';
        }
        if (empty($pilARaw) || empty($pilBRaw)) {
            $errors[] = 'Pilihan A dan Pilihan B wajib diisi';
        }

        // 8. Kunci Jawaban
        if (empty($jawabanRaw) || !in_array($jawabanRaw, ['A', 'B', 'C', 'D', 'E'], true)) {
            $errors[] = "Jawaban Benar harus berupa salah satu huruf: A, B, C, D, atau E (nilai: '{$jawabanRaw}')";
        }

        // 9. Status
        $isNonaktif = in_array(strtolower($statusRaw), ['nonaktif', 'non_aktif', 'n', '0']);
        $statusAktif = $isNonaktif ? 'N' : 'Y';

        return [
            'row' => $rowNumber,
            'is_valid' => empty($errors),
            'errors' => $errors,
            'data' => [
                'idjenjang' => $resolvedJenjang?->id ?? 1,
                'jenjang_name' => $resolvedJenjang?->nama_jenjang ?? '-',
                'tingkat' => $resolvedTingkat,
                'idtingkat' => $idtingkat,
                'tingkat_label' => "Tingkat {$resolvedTingkat}",
                'idkelas' => null,
                'kelas_name' => "Tingkat {$resolvedTingkat}",
                'idmapel' => $resolvedMapel?->id ?? 1,
                'mapel_name' => $resolvedMapel?->nama_mapel ?? '-',
                'id_tahun_ajaran' => $resolvedTa?->id ?? 1,
                'tahun_ajaran_name' => $resolvedTa?->name ?? '2026/2027',
                'tahun_soal_id' => $resolvedTahunSoal?->id ?? 1,
                'tahun_soal_name' => (string)($resolvedTahunSoal?->tahun ?? '2026'),
                'judul_paket' => $judulPaketRaw,
                'kode_paket' => $kodePaketRaw,
                'nomor_soal' => $nomorSoalRaw ?: (string)$rowNumber,
                'pertanyaan' => $pertanyaanRaw,
                'pilihan_a' => $pilARaw,
                'pilihan_b' => $pilBRaw,
                'pilihan_c' => $pilCRaw,
                'pilihan_d' => $pilDRaw,
                'pilihan_e' => $pilERaw,
                'jawaban' => $jawabanRaw,
                'pembahasan' => $pembahasanRaw,
                'tingkat_kesulitan' => $kesulitanRaw ?: 'Sedang',
                'status' => $statusAktif === 'Y' ? 'Aktif' : 'Nonaktif',
                'status_aktif' => $statusAktif,
            ],
        ];
    }
}

