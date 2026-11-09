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
     * List questions in Bank Soal with Dimensional Filter & Source Type
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = AssessmentSoalPilgan::with(['jenjang', 'mapel', 'kurikulum', 'tingkat', 'tahunSoal', 'creator', 'assessment', 'academicYear', 'semester', 'kelas']);

        // Multi-tenant and source scoping (Temuan 03):
        // Guru/Admin sees:
        // - Bank Soal Nasional (source_type = 'nasional' or from default national pool)
        // - Bank Soal Guru (source_type = 'guru' belonging to this user or instansi)
        if ($request->filled('source_type')) {
            $source = $request->input('source_type');
            if ($source === 'nasional') {
                $query->where(function ($q) {
                    $q->where('source_type', 'nasional')
                      ->orWhereNull('iduser_bo')
                      ->orWhereHas('creator', fn($c) => $c->where('status_admin', '1')->orWhere('role_type', 'super_admin'));
                });
            } elseif ($source === 'guru') {
                $query->where(function ($q) use ($user) {
                    $q->where('source_type', 'guru');
                    if ($user) {
                        $q->where(function ($sub) use ($user) {
                            $sub->where('iduser_bo', $user->iduser_bo);
                            if (!empty($user->idkategori)) {
                                $sub->orWhereHas('creator', fn($c) => $c->where('idkategori', $user->idkategori));
                            }
                        });
                    }
                });
            }
        } else {
            // Default view: National questions + instansi/guru questions
            $query->where(function ($q) use ($user) {
                $q->where('source_type', 'nasional')
                  ->orWhereNull('iduser_bo')
                  ->orWhereHas('creator', fn($c) => $c->where('status_admin', '1')->orWhere('role_type', 'super_admin'));
                if ($user) {
                    $q->orWhere('iduser_bo', $user->iduser_bo);
                    if (!empty($user->idkategori)) {
                        $q->orWhereHas('creator', fn($c) => $c->where('idkategori', $user->idkategori));
                    }
                }
            });
        }

        // 1. Filter Jenjang
        if ($request->filled('idjenjang')) {
            $query->where('idjenjang', $request->idjenjang);
        }

        // 2. Filter Kurikulum
        if ($request->filled('idkurikulum')) {
            $query->where('idkurikulum', $request->idkurikulum);
        }

        // 3. Filter Tingkat
        if ($request->filled('idtingkat')) {
            $query->where('idtingkat', $request->idtingkat);
        }

        // 4. Filter Bab
        if ($request->filled('bab')) {
            $query->where('bab', 'like', '%' . $request->bab . '%');
        }

        // 5. Filter Tingkat Kesulitan
        if ($request->filled('tingkat_kesulitan')) {
            $query->where('tingkat_kesulitan', $request->tingkat_kesulitan);
        }

        // 6. Filter Kelas (via assessment)
        if ($request->filled('idkelas')) {
            $query->whereHas('assessment', function ($q) use ($request) {
                $q->where('idkelas', $request->idkelas);
            });
        }

        // 7. Filter Mapel
        if ($request->filled('idmapel')) {
            $query->where('idmapel', $request->idmapel);
        }

        // 8. Filter Tahun Soal
        if ($request->filled('tahun_soal_id')) {
            $query->where('tahun_soal_id', $request->tahun_soal_id);
        }

        // 9. Filter Tahun Ajaran & Semester
        if ($request->filled('id_tahun_ajaran')) {
            $query->where('id_tahun_ajaran', $request->id_tahun_ajaran);
        }
        if ($request->filled('semester_id')) {
            $query->where('semester_id', $request->semester_id);
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

            $sourceType = $q->source_type ?: (($q->creator?->role === 'super_admin' || is_null($q->iduser_bo)) ? 'nasional' : 'guru');

            return [
                'id' => $q->idassessment_soal_pilgan,
                'idassessment_soal_pilgan' => $q->idassessment_soal_pilgan,
                'package_id' => $q->idassessment,
                'idassessment' => $q->idassessment,
                'source_type' => $sourceType,
                'content' => $q->soal_text ?: 'Pertanyaan',
                'soal_text' => $q->soal_text ?: 'Pertanyaan',
                'media_url' => $q->soal_gambar,
                'type' => 'multiple_choice_single',
                'difficulty' => strtolower($q->tingkat_kesulitan ?: 'medium'),
                'tingkat_kesulitan' => $q->tingkat_kesulitan ?: 'Sedang',
                'bab' => $q->bab ?: 'Umum',
                'idkurikulum' => $q->idkurikulum,
                'kurikulum_name' => $q->kurikulum?->nama_kurikulum ?? '-',
                'idtingkat' => $q->idtingkat,
                'tingkat_name' => $q->tingkat?->nama_tingkat ?? '-',
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
                'status_publikasi' => $q->status_publikasi ?? ($q->status_aktif === 'N' ? 'draft' : 'published'),
                'created_by' => $q->created_by ?: ($q->creator?->nama ?? 'Guru / Staff'),
                'updated_by' => $q->updated_by ?: ($q->creator?->nama ?? 'Guru / Staff'),
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

        // Dual-payload normalization (supports both legacy flat fields and options array)
        if (!$request->filled('soal_text') && $request->filled('content')) {
            $request->merge(['soal_text' => $request->input('content')]);
        }
        if (!$request->filled('idmapel') && $request->filled('subject_id')) {
            $request->merge(['idmapel' => $request->input('subject_id')]);
        }
        if (!$request->filled('penjelasan_jawaban') && $request->filled('explanation')) {
            $request->merge(['penjelasan_jawaban' => $request->input('explanation')]);
        }
        if ($request->has('options') && is_array($request->options)) {
            $opts = $request->options;
            if (isset($opts[0]['content'])) $request->merge(['pilihan_a_text' => $opts[0]['content']]);
            if (isset($opts[1]['content'])) $request->merge(['pilihan_b_text' => $opts[1]['content']]);
            if (isset($opts[2]['content'])) $request->merge(['pilihan_c_text' => $opts[2]['content']]);
            if (isset($opts[3]['content'])) $request->merge(['pilihan_d_text' => $opts[3]['content']]);
            if (isset($opts[4]['content'])) $request->merge(['pilihan_e_text' => $opts[4]['content']]);
            foreach ($opts as $idx => $opt) {
                if (!empty($opt['is_correct']) && ($opt['is_correct'] === '1' || $opt['is_correct'] === true)) {
                    $letters = ['A', 'B', 'C', 'D', 'E'];
                    $request->merge(['jawaban' => $letters[$idx] ?? 'A']);
                    break;
                }
            }
        }
        if (!$request->filled('idjenjang')) {
            $mapelJenjang = $request->filled('idmapel') ? MasterMataPelajaran::where('id', $request->idmapel)->value('idjenjang') : null;
            $request->merge(['idjenjang' => $mapelJenjang ?: 1]);
        }
        if (!$request->filled('jawaban')) {
            $request->merge(['jawaban' => 'A']);
        }

        $validated = $request->validate([
            'idjenjang' => 'required|integer',
            'idmapel' => 'required|integer',
            'idkurikulum' => 'nullable|integer',
            'idtingkat' => 'nullable|integer',
            'bab' => 'nullable|string|max:100',
            'tingkat_kesulitan' => 'nullable|string|max:50',
            'tahun_soal_id' => 'nullable|integer',
            'soal_text' => 'required|string',
            'soal_gambar' => 'nullable|string',
            'pilihan_a_text' => 'required|string',
            'pilihan_a_gambar' => 'nullable|string',
            'pilihan_b_text' => 'required|string',
            'pilihan_b_gambar' => 'nullable|string',
            'pilihan_c_text' => 'nullable|string',
            'pilihan_c_gambar' => 'nullable|string',
            'pilihan_d_text' => 'nullable|string',
            'pilihan_d_gambar' => 'nullable|string',
            'pilihan_e_text' => 'nullable|string',
            'pilihan_e_gambar' => 'nullable|string',
            'jawaban' => 'required|in:A,B,C,D,E',
            'penjelasan_jawaban' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $soalText = trim($validated['soal_text']);

        // Validation rule: Tidak boleh duplicate soal dengan isi yang sama pada sumber yang sama
        $duplicate = AssessmentSoalPilgan::where('source_type', 'guru')
            ->where(function ($q) use ($user) {
                if ($user) {
                    $q->where('iduser_bo', $user->iduser_bo);
                    if (!empty($user->idkategori)) {
                        $q->orWhereHas('creator', fn($c) => $c->where('idkategori', $user->idkategori));
                    }
                }
            })
            ->where('soal_text', $soalText)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'Soal dengan pertanyaan/isi yang sama sudah terdaftar di Bank Soal Guru Anda.'
            ], 422);
        }

        $id = (string) (time() . rand(1000000, 9999999));

        $item = AssessmentSoalPilgan::create([
            'idassessment_soal_pilgan' => $id,
            'idassessment' => $request->idassessment ?? '27733030223218733', // Default general pool
            'idjenjang' => $validated['idjenjang'],
            'idmapel' => $validated['idmapel'],
            'idkurikulum' => $validated['idkurikulum'] ?? null,
            'idtingkat' => $validated['idtingkat'] ?? null,
            'id_tahun_ajaran' => $request->input('id_tahun_ajaran') ?? null,
            'semester_id' => $request->input('semester_id') ?? null,
            'idkelas' => $request->input('idkelas') ?? null,
            'bab' => $validated['bab'] ?? null,
            'tingkat_kesulitan' => $validated['tingkat_kesulitan'] ?? 'Sedang',
            'source_type' => 'guru',
            'tahun_soal_id' => $validated['tahun_soal_id'] ?? null,
            'soal_text' => $soalText,
            'soal_gambar' => $validated['soal_gambar'] ?? null,
            'pilihan_a_text' => $validated['pilihan_a_text'],
            'pilihan_a_gambar' => $validated['pilihan_a_gambar'] ?? null,
            'pilihan_b_text' => $validated['pilihan_b_text'],
            'pilihan_b_gambar' => $validated['pilihan_b_gambar'] ?? null,
            'pilihan_c_text' => $validated['pilihan_c_text'] ?? '',
            'pilihan_c_gambar' => $validated['pilihan_c_gambar'] ?? null,
            'pilihan_d_text' => $validated['pilihan_d_text'] ?? '',
            'pilihan_d_gambar' => $validated['pilihan_d_gambar'] ?? null,
            'pilihan_e_text' => $validated['pilihan_e_text'] ?? '',
            'pilihan_e_gambar' => $validated['pilihan_e_gambar'] ?? null,
            'jawaban' => strtoupper($validated['jawaban']),
            'penjelasan_jawaban' => $validated['penjelasan_jawaban'] ?? '',
            'status_aktif' => $validated['status_aktif'] ?? 'Y',
            'status_publikasi' => $request->input('status_publikasi') ?? (($validated['status_aktif'] ?? 'Y') === 'N' ? 'draft' : 'published'),
            'created_by' => $user?->name ?? 'Guru',
            'updated_by' => $user?->name ?? 'Guru',
            'iduser_bo' => $user?->iduser_bo,
            'tanggal_input' => now(),
        ]);

        AuditLog::record(
            'CREATE_BANK_SOAL',
            'assessment_soal_pilgan',
            $id,
            Str::limit($validated['soal_text'], 50),
            ['created_by' => $user?->name ?? 'Staff', 'role' => $user?->role ?? 'guru', 'source_type' => 'guru']
        );

        return response()->json([
            'message' => 'Soal berhasil disimpan ke Bank Soal Guru',
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

        $item = AssessmentSoalPilgan::with(['assessment', 'creator'])->findOrFail($id);

        // Validation rule: Guru tidak dapat mengubah Bank Soal Nasional
        if ($item->source_type === 'nasional' || $item->creator?->role === 'super_admin' || is_null($item->iduser_bo)) {
            return response()->json([
                'message' => 'Akses ditolak: Bank Soal Nasional dikelola penuh oleh Super Administrator dan tidak dapat diubah oleh Guru.'
            ], 403);
        }

        if ($user && $user->role === 'guru') {
            $ownerId = $item->iduser_bo ?: $item->assessment?->iduser_bo;
            if ((string)$ownerId !== (string)$user->iduser_bo) {
                return response()->json([
                    'message' => 'Akses ditolak: Guru hanya dapat mengubah butir soal yang dibuat oleh dirinya sendiri.'
                ], 403);
            }
        }

        // Dual-payload normalization
        if (!$request->filled('soal_text') && $request->filled('content')) {
            $request->merge(['soal_text' => $request->input('content')]);
        }
        if (!$request->filled('idmapel') && $request->filled('subject_id')) {
            $request->merge(['idmapel' => $request->input('subject_id')]);
        }
        if (!$request->filled('penjelasan_jawaban') && $request->filled('explanation')) {
            $request->merge(['penjelasan_jawaban' => $request->input('explanation')]);
        }
        if ($request->has('options') && is_array($request->options)) {
            $opts = $request->options;
            if (isset($opts[0]['content'])) $request->merge(['pilihan_a_text' => $opts[0]['content']]);
            if (isset($opts[1]['content'])) $request->merge(['pilihan_b_text' => $opts[1]['content']]);
            if (isset($opts[2]['content'])) $request->merge(['pilihan_c_text' => $opts[2]['content']]);
            if (isset($opts[3]['content'])) $request->merge(['pilihan_d_text' => $opts[3]['content']]);
            if (isset($opts[4]['content'])) $request->merge(['pilihan_e_text' => $opts[4]['content']]);
            foreach ($opts as $idx => $opt) {
                if (!empty($opt['is_correct']) && ($opt['is_correct'] === '1' || $opt['is_correct'] === true)) {
                    $letters = ['A', 'B', 'C', 'D', 'E'];
                    $request->merge(['jawaban' => $letters[$idx] ?? 'A']);
                    break;
                }
            }
        }
        if (!$request->filled('soal_text')) {
            $request->merge(['soal_text' => $item->soal_text]);
        }
        if (!$request->filled('pilihan_a_text')) {
            $request->merge(['pilihan_a_text' => $item->pilihan_a_text]);
        }
        if (!$request->filled('pilihan_b_text')) {
            $request->merge(['pilihan_b_text' => $item->pilihan_b_text]);
        }
        if (!$request->filled('jawaban')) {
            $request->merge(['jawaban' => $item->jawaban]);
        }

        $validated = $request->validate([
            'idjenjang' => 'nullable|integer',
            'idmapel' => 'nullable|integer',
            'idkurikulum' => 'nullable|integer',
            'idtingkat' => 'nullable|integer',
            'bab' => 'nullable|string|max:100',
            'tingkat_kesulitan' => 'nullable|string|max:50',
            'tahun_soal_id' => 'nullable|integer',
            'soal_text' => 'required|string',
            'soal_gambar' => 'nullable|string',
            'pilihan_a_text' => 'required|string',
            'pilihan_a_gambar' => 'nullable|string',
            'pilihan_b_text' => 'required|string',
            'pilihan_b_gambar' => 'nullable|string',
            'pilihan_c_text' => 'nullable|string',
            'pilihan_c_gambar' => 'nullable|string',
            'pilihan_d_text' => 'nullable|string',
            'pilihan_d_gambar' => 'nullable|string',
            'pilihan_e_text' => 'nullable|string',
            'pilihan_e_gambar' => 'nullable|string',
            'jawaban' => 'required|in:A,B,C,D,E',
            'penjelasan_jawaban' => 'nullable|string',
            'status_aktif' => 'nullable|in:Y,N',
        ]);

        $soalText = trim($validated['soal_text']);

        // Check duplicate excluding self
        $duplicate = AssessmentSoalPilgan::where('source_type', 'guru')
            ->where(function ($q) use ($user) {
                if ($user) {
                    $q->where('iduser_bo', $user->iduser_bo);
                    if (!empty($user->idkategori)) {
                        $q->orWhereHas('creator', fn($c) => $c->where('idkategori', $user->idkategori));
                    }
                }
            })
            ->where('soal_text', $soalText)
            ->where('idassessment_soal_pilgan', '!=', $item->idassessment_soal_pilgan)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'Soal dengan pertanyaan/isi yang sama sudah terdaftar di Bank Soal Guru Anda.'
            ], 422);
        }

        $updateData = [
            'soal_text' => $soalText,
            'pilihan_a_text' => $validated['pilihan_a_text'],
            'pilihan_b_text' => $validated['pilihan_b_text'],
            'pilihan_c_text' => $validated['pilihan_c_text'] ?? '',
            'pilihan_d_text' => $validated['pilihan_d_text'] ?? '',
            'pilihan_e_text' => $validated['pilihan_e_text'] ?? '',
            'jawaban' => strtoupper($validated['jawaban']),
            'penjelasan_jawaban' => $validated['penjelasan_jawaban'] ?? '',
        ];

        if (array_key_exists('soal_gambar', $validated)) $updateData['soal_gambar'] = $validated['soal_gambar'];
        if (array_key_exists('pilihan_a_gambar', $validated)) $updateData['pilihan_a_gambar'] = $validated['pilihan_a_gambar'];
        if (array_key_exists('pilihan_b_gambar', $validated)) $updateData['pilihan_b_gambar'] = $validated['pilihan_b_gambar'];
        if (array_key_exists('pilihan_c_gambar', $validated)) $updateData['pilihan_c_gambar'] = $validated['pilihan_c_gambar'];
        if (array_key_exists('pilihan_d_gambar', $validated)) $updateData['pilihan_d_gambar'] = $validated['pilihan_d_gambar'];
        if (array_key_exists('pilihan_e_gambar', $validated)) $updateData['pilihan_e_gambar'] = $validated['pilihan_e_gambar'];
        if ($request->filled('idjenjang')) $updateData['idjenjang'] = $request->idjenjang;
        if ($request->filled('idmapel')) $updateData['idmapel'] = $request->idmapel;
        if ($request->filled('idkurikulum')) $updateData['idkurikulum'] = $request->idkurikulum;
        if ($request->filled('idtingkat')) $updateData['idtingkat'] = $request->idtingkat;
        if ($request->filled('id_tahun_ajaran')) $updateData['id_tahun_ajaran'] = $request->id_tahun_ajaran;
        if ($request->filled('semester_id')) $updateData['semester_id'] = $request->semester_id;
        if ($request->filled('idkelas')) $updateData['idkelas'] = $request->idkelas;
        if ($request->filled('bab')) $updateData['bab'] = $request->bab;
        if ($request->filled('tingkat_kesulitan')) $updateData['tingkat_kesulitan'] = $request->tingkat_kesulitan;
        if ($request->filled('tahun_soal_id')) $updateData['tahun_soal_id'] = $request->tahun_soal_id;
        if ($request->filled('status_aktif')) $updateData['status_aktif'] = $request->status_aktif;
        if ($request->filled('status_publikasi')) $updateData['status_publikasi'] = $request->status_publikasi;
        $updateData['updated_by'] = $user?->name ?? 'Guru';

        $item->update($updateData);

        AuditLog::record(
            'EDIT_BANK_SOAL',
            'assessment_soal_pilgan',
            $id,
            Str::limit($item->soal_text, 50),
            ['updated_by' => $user?->name ?? 'Staff', 'role' => $user?->role ?? 'guru', 'source_type' => $item->source_type]
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

        $item = AssessmentSoalPilgan::with(['assessment', 'creator'])->findOrFail($id);

        // Validation rule: Guru tidak dapat menghapus Bank Soal Nasional
        if ($item->source_type === 'nasional' || $item->creator?->role === 'super_admin' || is_null($item->iduser_bo)) {
            return response()->json([
                'message' => 'Akses ditolak: Bank Soal Nasional dikelola penuh oleh Super Administrator dan tidak dapat dihapus oleh Guru.'
            ], 403);
        }

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
     * Get single question detail with full academic hierarchy
     */
    public function show($id)
    {
        $q = AssessmentSoalPilgan::with([
            'mapel',
            'kurikulum',
            'tingkat',
            'tahunSoal',
            'creator',
            'assessment'
        ])->findOrFail($id);

        $sourceType = $q->source_type ?: (($q->creator?->role === 'super_admin' || is_null($q->iduser_bo)) ? 'nasional' : 'guru');

        $options = [];
        foreach (['a', 'b', 'c', 'd', 'e'] as $opt) {
            $txt = $q->{"pilihan_{$opt}_text"};
            $img = $q->{"pilihan_{$opt}_gambar"};
            if (!empty($txt) || !empty($img)) {
                $options[] = [
                    'id' => strtoupper($opt),
                    'key' => strtoupper($opt),
                    'content' => $txt ?: '',
                    'media_url' => $img ?: null,
                    'is_correct' => strtoupper($q->jawaban) === strtoupper($opt),
                ];
            }
        }

        return response()->json([
            'id' => $q->idassessment_soal_pilgan,
            'idassessment_soal_pilgan' => $q->idassessment_soal_pilgan,
            'package_id' => $q->idassessment,
            'idassessment' => $q->idassessment,
            'source_type' => $sourceType,
            'content' => $q->soal_text ?: 'Pertanyaan',
            'soal_text' => $q->soal_text ?: 'Pertanyaan',
            'media_url' => $q->soal_gambar,
            'type' => 'multiple_choice_single',
            'difficulty' => strtolower($q->tingkat_kesulitan ?: 'medium'),
            'tingkat_kesulitan' => $q->tingkat_kesulitan ?: 'Sedang',
            'bab' => $q->bab ?: 'Umum',
            'id_tahun_ajaran' => $q->id_tahun_ajaran,
            'semester_id' => $q->semester_id,
            'idjenjang' => $q->idjenjang,
            'idkelas' => $q->idkelas,
            'idkurikulum' => $q->idkurikulum,
            'kurikulum_name' => $q->kurikulum?->nama_kurikulum ?? '-',
            'idtingkat' => $q->idtingkat,
            'tingkat_name' => $q->tingkat?->nama_tingkat ?? '-',
            'topic' => $q->mapel?->nama_mapel ?? 'Umum',
            'idmapel' => $q->idmapel,
            'subject' => [
                'id' => $q->idmapel,
                'name' => $q->mapel?->nama_mapel ?? 'Umum',
                'code' => $q->mapel?->kode_mapel ?? 'MAPEL',
            ],
            'options' => $options,
            'explanation' => $q->penjelasan_jawaban,
            'penjelasan_jawaban' => $q->penjelasan_jawaban,
            'jawaban' => $q->jawaban,
            'status_aktif' => $q->status_aktif ?? 'Y',
            'status_publikasi' => $q->status_publikasi ?? ($q->status_aktif === 'N' ? 'draft' : 'published'),
            'tahun_soal_id' => $q->tahun_soal_id,
            'tahun_soal' => $q->tahunSoal?->tahun,
            'created_by' => $q->created_by ?: ($q->creator?->nama ?? 'Guru / Staff'),
            'updated_by' => $q->updated_by ?: ($q->creator?->nama ?? 'Guru / Staff'),
            'creator_id' => $q->iduser_bo,
            'creator_name' => $q->creator?->nama ?? 'Guru / Staff',
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

        $item = AssessmentSoalPilgan::with(['assessment', 'creator'])->findOrFail($id);

        if ($item->source_type === 'nasional' || $item->creator?->role === 'super_admin' || is_null($item->iduser_bo)) {
            return response()->json([
                'message' => 'Akses ditolak: Guru tidak dapat mengubah status Bank Soal Nasional.'
            ], 403);
        }

        if ($user && $user->role === 'guru') {
            $ownerId = $item->iduser_bo ?: $item->assessment?->iduser_bo;
            if ((string)$ownerId !== (string)$user->iduser_bo) {
                return response()->json([
                    'message' => 'Akses ditolak: Guru hanya dapat mengubah status butir soal miliknya sendiri.'
                ], 403);
            }
        }

        $newStatus = ($item->status_aktif === 'N') ? 'Y' : 'N';
        $item->update([
            'status_aktif' => $newStatus,
            'status_publikasi' => $newStatus === 'Y' ? 'published' : 'draft',
            'updated_by' => $user?->name ?? 'Guru'
        ]);

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
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
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
