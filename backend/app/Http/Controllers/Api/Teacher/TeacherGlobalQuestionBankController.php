<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\BankSoalGlobal;
use App\Models\BankSoalGlobalDetail;
use App\Models\MasterJenjang;
use App\Models\MasterKelas;
use App\Models\MasterMataPelajaran;
use App\Models\MasterTahunSoal;
use App\Models\AcademicYear;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherGlobalQuestionBankController extends Controller
{
    /**
     * Get cascading filter options for Katalog Bank Soal Global
     */
    public function cascadingParams(Request $request)
    {
        $idjenjang = $request->input('idjenjang');

        $jenjangList = MasterJenjang::where('status_aktif', 'Y')
            ->orderBy('urutan', 'asc')
            ->get(['id', 'nama_jenjang', 'kode_jenjang']);

        // Tingkat list based on Jenjang
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

        $dbTingkats = DB::table('master_tingkat_kelas')
            ->where('status_aktif', 'Y')
            ->when($idjenjang, fn($q) => $q->where('idjenjang', $idjenjang))
            ->orderBy('tingkat', 'asc')
            ->get();

        $tingkatList = [];
        if ($dbTingkats->isNotEmpty()) {
            foreach ($dbTingkats as $t) {
                $tingkatList[] = [
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
                $tingkatList[] = [
                    'id' => $tNum,
                    'idtingkat' => null,
                    'tingkat' => $tNum,
                    'nama_tingkat' => "Tingkat {$tNum}",
                    'label' => "Tingkat {$tNum}",
                    'idjenjang' => $idjenjang,
                ];
            }
        } else {
            for ($i = 1; $i <= 12; $i++) {
                $tingkatList[] = [
                    'id' => $i,
                    'idtingkat' => null,
                    'tingkat' => $i,
                    'nama_tingkat' => "Tingkat {$i}",
                    'label' => "Tingkat {$i}",
                    'idjenjang' => null,
                ];
            }
        }

        $mapelQuery = MasterMataPelajaran::where('status_aktif', 'Y');
        if ($idjenjang) {
            $mapelQuery->where('idjenjang', $idjenjang);
        }
        $mapelList = $mapelQuery->orderBy('nama_mapel', 'asc')
            ->get(['id', 'idjenjang', 'nama_mapel', 'kode_mapel']);

        $tahunSoalList = MasterTahunSoal::where('is_active', 1)
            ->orderBy('tahun', 'desc')
            ->get(['id', 'tahun', 'keterangan']);

        $tahunAjaranList = AcademicYear::orderBy('is_active', 'desc')
            ->orderBy('id', 'desc')
            ->get(['id', 'name', 'semester', 'is_active']);

        return response()->json([
            'jenjang' => $jenjangList,
            'tingkat' => $tingkatList,
            'mata_pelajaran' => $mapelList,
            'tahun_soal' => $tahunSoalList,
            'tahun_ajaran' => $tahunAjaranList,
        ]);
    }

    /**
     * List Bank Soal Global packages (Read-Only Katalog)
     */
    public function index(Request $request)
    {
        $query = BankSoalGlobal::with(['jenjang', 'kelas', 'mapel', 'academicYear', 'tahunSoal'])
            ->withCount('soal');

        // Filter Jenjang
        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        // Filter Tingkat
        if ($request->filled('tingkat')) {
            $query->where('tingkat', (int) $request->tingkat);
        } elseif ($request->filled('idtingkat')) {
            $query->where('idtingkat', $request->idtingkat);
        }

        // Filter Mapel
        if ($request->filled('idmapel') || $request->filled('subject_id')) {
            $mapelId = $request->idmapel ?: $request->subject_id;
            $query->where('idmapel', $mapelId);
        }

        // Filter Tahun Soal
        if ($request->filled('tahun_soal_id')) {
            $query->where('tahun_soal_id', $request->tahun_soal_id);
        }

        // Search by package title or description
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('nama_paket', 'like', "%{$search}%")
                  ->orWhere('deskripsi', 'like', "%{$search}%")
                  ->orWhere('kode_paket', 'like', "%{$search}%");
            });
        }

        // Status aktif
        $query->where('status_aktif', 'Y');

        // Sorting
        $query->orderBy('id', 'desc');

        if ($request->boolean('all')) {
            $items = $query->get()->map(fn($item) => $this->transformPackage($item));
            return response()->json($items);
        }

        $perPage = $request->integer('per_page', 12);
        $paginator = $query->paginate($perPage);

        $paginator->getCollection()->transform(fn($item) => $this->transformPackage($item));

        return response()->json($paginator);
    }

    /**
     * Show single package with all its questions, options, correct answers, and explanations
     */
    public function show(Request $request, $id)
    {
        $package = BankSoalGlobal::with([
            'jenjang', 'kelas', 'mapel', 'academicYear', 'tahunSoal',
            'soal' => function ($q) {
                $q->with(['mapel', 'kurikulum', 'tingkat', 'tahunSoal'])
                  ->where('status_aktif', 'Y')
                  ->orderBy('urutan', 'asc');
            }
        ])->findOrFail($id);

        $soalList = $package->soal->map(function ($q, $index) {
            $options = [];
            foreach (['a', 'b', 'c', 'd', 'e'] as $letter) {
                $txt = $q->{"pilihan_{$letter}_text"};
                $img = $q->{"pilihan_{$letter}_gambar"};
                if (!empty($txt) || !empty($img)) {
                    $options[] = [
                        'key' => strtoupper($letter),
                        'content' => $txt ?: "Pilihan " . strtoupper($letter),
                        'media_url' => $img,
                        'is_correct' => strtoupper($q->jawaban) === strtoupper($letter),
                    ];
                }
            }

            return [
                'id' => (string) $q->id,
                'nomor_soal' => $index + 1,
                'urutan' => $q->urutan ?: ($index + 1),
                'soal_text' => $q->soal_text ?: 'Pertanyaan',
                'soal_gambar' => $q->soal_gambar,
                'options' => $options,
                'jawaban' => strtoupper($q->jawaban ?: 'A'),
                'jawaban_benar' => strtoupper($q->jawaban ?: 'A'),
                'penjelasan_jawaban' => $q->penjelasan_jawaban ?: 'Belum ada pembahasan khusus.',
                'pembahasan' => $q->penjelasan_jawaban ?: 'Belum ada pembahasan khusus.',
                'tingkat_kesulitan' => $q->tingkat_kesulitan ?: 'Sedang',
                'difficulty' => strtolower($q->tingkat_kesulitan ?: 'medium'),
                'bab' => $q->bab ?: 'Umum',
                'mata_pelajaran' => $q->mapel?->nama_mapel ?? '-',
                'jenjang' => $q->jenjang?->nama_jenjang ?? '-',
                'tingkat' => $q->idtingkat ? "Tingkat {$q->idtingkat}" : '-',
                'tahun_soal' => $q->tahunSoal?->tahun ?? '-',
            ];
        });

        $transformed = $this->transformPackage($package);
        $transformed['soal'] = $soalList;
        $transformed['questions'] = $soalList;

        return response()->json([
            'package' => $transformed,
            'questions' => $soalList,
            'total_soal' => $soalList->count(),
        ]);
    }

    /**
     * Deny write operations on Bank Soal Global by Teachers
     */
    public function store(Request $request)
    {
        return response()->json([
            'message' => 'Akses ditolak: Bank Soal Global dikelola oleh Super Administrator dan bersifat Read-Only untuk Guru.'
        ], 403);
    }

    public function update(Request $request, $id)
    {
        return response()->json([
            'message' => 'Akses ditolak: Bank Soal Global bersifat Read-Only untuk Guru.'
        ], 403);
    }

    public function destroy(Request $request, $id)
    {
        return response()->json([
            'message' => 'Akses ditolak: Bank Soal Global bersifat Read-Only untuk Guru.'
        ], 403);
    }

    private function transformPackage(BankSoalGlobal $item): array
    {
        $tingkatVal = $item->tingkat ?? ($item->kelas?->tingkat);
        $tingkatLabel = $tingkatVal ? "Tingkat {$tingkatVal}" : ($item->kelas?->nama_kelas ?? '-');

        return [
            'id' => (string) $item->id,
            'kode_paket' => $item->kode_paket,
            'code' => $item->kode_paket,
            'nama_paket' => $item->nama_paket,
            'title' => $item->nama_paket,
            'deskripsi' => $item->deskripsi,
            'description' => $item->deskripsi,
            'idjenjang' => $item->idjenjang,
            'jenjang' => $item->jenjang?->nama_jenjang ?? 'Semua Jenjang',
            'tingkat' => $tingkatVal,
            'idtingkat' => $item->idtingkat,
            'tingkat_label' => $tingkatLabel,
            'idkelas' => $item->idkelas,
            'idmapel' => $item->idmapel,
            'subject_id' => $item->idmapel,
            'mata_pelajaran' => $item->mapel?->nama_mapel ?? 'Semua Mapel',
            'mapel' => $item->mapel?->nama_mapel ?? 'Semua Mapel',
            'subject' => [
                'id' => $item->idmapel,
                'name' => $item->mapel?->nama_mapel ?? 'Umum',
                'code' => $item->mapel?->kode_mapel ?? 'MAPEL',
            ],
            'tahun_soal_id' => $item->tahun_soal_id,
            'tahun_soal' => $item->tahunSoal?->tahun ?? '-',
            'total_soal' => $item->soal_count ?? $item->total_soal ?? 0,
            'questions_count' => $item->soal_count ?? $item->total_soal ?? 0,
            'status_aktif' => $item->status_aktif ?? 'Y',
            'created_at' => $item->created_at?->toIso8601String(),
        ];
    }
}

