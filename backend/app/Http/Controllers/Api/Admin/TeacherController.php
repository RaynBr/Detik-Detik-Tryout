<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruMataPelajaran;
use App\Models\UserBo;
use App\Services\SimpleSpreadsheetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = UserBo::with(['kategori', 'mapelAjar.mataPelajaran', 'kelasWali', 'academicYear'])
            ->where('status_remove', '!=', 'Y')
            ->where(function ($q) {
                $q->where('role_type', 'guru')
                  ->orWhere('role_type', 'admin_sekolah')
                  ->orWhere('status_admin', '2')
                  ->orWhereNull('role_type');
            });

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $classIds = \App\Models\MasterKelas::where('idkategori', $user->idkategori)->pluck('id');
            $relatedTeacherIds = \App\Models\GuruMataPelajaran::whereIn('idkelas', $classIds)
                ->pluck('iduser_bo')
                ->merge(\App\Models\MasterKelas::where('idkategori', $user->idkategori)->pluck('wali_kelas_id'))
                ->filter()
                ->unique()
                ->toArray();

            $hasOwnTeachers = UserBo::where('idkategori', $user->idkategori)
                ->where('status_remove', '!=', 'Y')
                ->where(function ($q) {
                    $q->where('role_type', 'guru')
                      ->orWhere('status_admin', '2');
                })
                ->exists();

            if ($hasOwnTeachers || !empty($relatedTeacherIds)) {
                $query->where(function ($q) use ($user, $relatedTeacherIds) {
                    $q->where('idkategori', $user->idkategori);
                    if (!empty($relatedTeacherIds)) {
                        $q->orWhereIn('iduser_bo', $relatedTeacherIds);
                    }
                });
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('login_email', 'like', "%{$search}%")
                  ->orWhere('login_username', 'like', "%{$search}%")
                  ->orWhere('telp', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $teachers = $query->orderBy('nama', 'asc')->get();
            $mapped = $teachers->map(function ($t) {
                return [
                    'id' => (string) $t->iduser_bo,
                    'name' => (string) ($t->nama ?: $t->name),
                    'email' => (string) ($t->login_email ?: $t->email ?: '-'),
                    'username' => $t->username,
                    'phone' => $t->telp,
                    'role' => $t->role,
                    'institution' => $t->kategori?->nama_kategori,
                    'is_active' => $t->status_aktif === 'Y',
                    'is_wali_kelas' => $t->kelasWali->isNotEmpty(),
                    'wali_kelas' => $t->kelasWali->map(fn($k) => ['id' => $k->id, 'name' => $k->nama_kelas]),
                    'wali_kelas_names' => $t->kelasWali->pluck('nama_kelas')->join(', '),
                    'id_tahun_ajaran' => $t->id_tahun_ajaran,
                    'academic_year' => $t->academicYear ? ['id' => $t->academicYear->id, 'name' => $t->academicYear->name] : null,
                    'teacher' => [
                        'id' => (string) $t->iduser_bo,
                        'user_id' => (string) $t->iduser_bo,
                        'nip' => (string) ($t->nip ?? $t->iduser_bo),
                        'subjects' => $t->mapelAjar->map(function ($m) {
                            return [
                                'id' => $m->mataPelajaran?->id,
                                'name' => $m->mataPelajaran?->nama_mapel,
                                'code' => $m->mataPelajaran?->kode_mapel,
                            ];
                        })->filter(fn($s) => !empty($s['id']))->values()
                    ]
                ];
            });

            return response()->json([
                'data' => $mapped,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $mapped->count(),
                'total' => $mapped->count(),
                'from' => $mapped->count() > 0 ? 1 : null,
                'to' => $mapped->count() > 0 ? $mapped->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('nama', 'asc')->paginate($perPage);

        $paginator->through(function ($t) {
            return [
                'id' => (string) $t->iduser_bo,
                'name' => (string) ($t->nama ?: $t->name),
                'email' => (string) ($t->login_email ?: $t->email ?: '-'),
                'username' => $t->username,
                'phone' => $t->telp,
                'role' => $t->role,
                'institution' => $t->kategori?->nama_kategori,
                'is_active' => $t->status_aktif === 'Y',
                'is_wali_kelas' => $t->kelasWali->isNotEmpty(),
                'wali_kelas' => $t->kelasWali->map(fn($k) => ['id' => $k->id, 'name' => $k->nama_kelas]),
                'wali_kelas_names' => $t->kelasWali->pluck('nama_kelas')->join(', '),
                'id_tahun_ajaran' => $t->id_tahun_ajaran,
                'academic_year' => $t->academicYear ? ['id' => $t->academicYear->id, 'name' => $t->academicYear->name] : null,
                'teacher' => [
                    'id' => (string) $t->iduser_bo,
                    'user_id' => (string) $t->iduser_bo,
                    'nip' => (string) ($t->nip ?? $t->iduser_bo),
                    'subjects' => $t->mapelAjar->map(function ($m) {
                        return [
                            'id' => $m->mataPelajaran?->id,
                            'name' => $m->mataPelajaran?->nama_mapel,
                            'code' => $m->mataPelajaran?->kode_mapel,
                        ];
                    })->filter(fn($s) => !empty($s['id']))->values()
                ]
            ];
        });

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'username' => 'nullable|string',
            'password' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'phone' => 'nullable|string',
            'subject_ids' => 'nullable|array',
            'role_type' => 'nullable|in:guru,admin_sekolah',
        ]);

        $user = $request->user();
        $idkategori = ($user && $user->role === 'admin' && !empty($user->idkategori)) 
            ? $user->idkategori 
            : ($request->idkategori ?? $user?->idkategori);

        $id = (string) (time() . rand(1000, 9999));
        $username = $request->username ?: strtolower(explode('@', $request->email)[0]);

        $pwd = Hash::make($request->password);

        $activeYear = \App\Models\AcademicYear::where(function ($q) use ($idkategori) {
            if ($idkategori) {
                $q->where('idkategori', $idkategori)
                  ->orWhere('idkategori', '27830150842287772')
                  ->orWhereNull('idkategori');
            }
        })->where('is_active', 1)->first() ?? \App\Models\AcademicYear::orderBy('id', 'desc')->first();

        $tahunAjaranName = $request->input('tahun_ajaran') ?: ($activeYear?->name ?? '2026/2027');
        $idTahunAjaran = $request->input('id_tahun_ajaran') ?: ($activeYear?->id ?? null);

        $userBo = UserBo::create([
            'iduser_bo' => $id,
            'idkategori' => $idkategori,
            'id_tahun_ajaran' => $idTahunAjaran,
            'nama' => $request->name,
            'login_email' => $request->email,
            'login_username' => $username,
            'login_password' => $pwd,
            'telp' => $request->phone ?? null,
            'status_admin' => '2',
            'role_type' => $request->role_type ?? 'guru',
            'status_aktif' => 'Y',
            'status_remove' => 'N',
            'tanggal_input' => now(),
        ]);

        if ($request->filled('subject_ids')) {
            foreach ($request->subject_ids as $mapelId) {
                GuruMataPelajaran::create([
                    'iduser_bo' => $userBo->iduser_bo,
                    'idmapel' => $mapelId,
                    'tahun_ajaran' => $tahunAjaranName,
                ]);
            }
        }

        return response()->json([
            'message' => 'Guru berhasil ditambahkan.',
            'data' => $userBo
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $userBo = UserBo::where('iduser_bo', $id)->firstOrFail();

        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$userBo->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah guru instansi lain.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'password' => 'nullable|string|min:4',
            'subject_ids' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $updateData = [
            'nama' => $request->name,
            'login_email' => $request->email,
            'telp' => $request->phone ?? $userBo->telp,
            'tanggal_update' => now(),
        ];

        if ($request->has('is_active')) {
            $updateData['status_aktif'] = $request->is_active ? 'Y' : 'N';
            if (!$request->is_active) {
                // Revoke tokens on account deactivation (Requirement 5)
                $userBo->tokens()->delete();
                $updateData['active_session_token'] = null;
            }
        }

        if ($request->filled('password')) {
            $request->validate([
                'password' => ['string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            ]);
            $updateData['login_password'] = Hash::make($request->password);
            // Revoke tokens on password change (Requirement 5)
            $userBo->tokens()->delete();
            $updateData['active_session_token'] = null;
        }

        $userBo->update($updateData);

        if ($request->has('subject_ids')) {
            GuruMataPelajaran::where('iduser_bo', $userBo->iduser_bo)->delete();
            foreach ($request->subject_ids as $mapelId) {
                GuruMataPelajaran::create([
                    'iduser_bo' => $userBo->iduser_bo,
                    'idmapel' => $mapelId,
                    'tahun_ajaran' => '2026/2027',
                ]);
            }
        }

        return response()->json([
            'message' => 'Data guru berhasil diperbarui.',
            'data' => $userBo
        ]);
    }

    public function destroy($id)
    {
        $user = request()->user();
        $userBo = UserBo::where('iduser_bo', $id)->firstOrFail();

        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$userBo->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus guru instansi lain.'], 403);
        }

        // Revoke all tokens and sessions on teacher deactivation/removal (Requirement 5)
        $userBo->tokens()->delete();
        $userBo->update(['status_remove' => 'Y', 'status_aktif' => 'N', 'active_session_token' => null]);

        return response()->json([
            'message' => 'Guru berhasil dinonaktifkan/dihapus.'
        ]);
    }

    /**
     * Download template spreadsheet untuk import guru
     */
    public function downloadTemplate(SimpleSpreadsheetService $spreadsheetService)
    {
        $headers = [
            'Nama Guru',
            'NIP',
            'NUPTK',
            'Email',
            'Username',
            'Password',
            'Jenis Kelamin',
            'No HP',
            'Alamat',
            'Status',
            'Instansi',
            'Jenjang',
            'Mata Pelajaran',
            'Role'
        ];

        $sampleRows = [
            ['Budi Santoso, M.Pd.', '198501012010011001', '1234567890123456', 'budi.santoso@sekolah.sch.id', 'budisantoso', 'Guru1234!', 'L', '081234567890', 'Jl. Merdeka No. 10', 'Aktif', 'SMA Negeri 1', 'SMA', 'Matematika', 'guru'],
            ['Siti Nurhaliza, S.Pd.', '199002022015022002', '2345678901234567', 'siti.nurhaliza@sekolah.sch.id', 'sitinurhaliza', 'Guru1234!', 'P', '081298765432', 'Jl. Sudirman No. 25', 'Aktif', 'SMA Negeri 1', 'SMA', 'Bahasa Indonesia', 'guru'],
            ['Ahmad Fauzi, S.Kom.', '', '', 'ahmad.fauzi@sekolah.sch.id', 'ahmadfauzi', 'Guru1234!', 'L', '081377889900', 'Jl. Thamrin No. 5', 'Aktif', 'SMA Negeri 1', 'SMA', 'Informatika', 'guru'],
        ];

        return $spreadsheetService->downloadCsv($headers, $sampleRows, 'template_import_guru.csv');
    }

    /**
     * Import data guru via Excel (.xlsx) atau CSV (.csv) with Preview & Exact Match
     */
    public function import(Request $request, SimpleSpreadsheetService $spreadsheetService)
    {
        $authUser = $request->user();
        $isAdminInstansi = $authUser && $authUser->role === 'admin' && !empty($authUser->idkategori);
        $defaultIdKategori = $isAdminInstansi ? $authUser->idkategori : ($request->idkategori ?? $authUser?->idkategori ?? '27830150842287772');

        // Mode 1: Batch JSON Commit (for chunked uploading with progress)
        if ($request->has('rows') && is_array($request->rows)) {
            $rowsToSave = $request->input('rows');
            $savedCount = 0;
            $failedRows = [];

            DB::beginTransaction();
            try {
                foreach ($rowsToSave as $item) {
                    $rowNum = $item['row_number'] ?? 0;
                    $data = $item['data'] ?? $item;

                    $name = trim($data['nama'] ?? $data['name'] ?? '');
                    $email = trim($data['email'] ?? '');
                    $username = trim($data['username'] ?? '');
                    $password = trim($data['password'] ?? 'Guru1234!');
                    $nip = trim($data['nip'] ?? '');
                    $nuptk = trim($data['nuptk'] ?? '');
                    $phone = trim($data['phone'] ?? $data['telp'] ?? '');
                    $alamat = trim($data['alamat'] ?? '');
                    $jk = strtoupper(trim($data['jenis_kelamin'] ?? 'L'));
                    $status = (strtolower(trim($data['status'] ?? 'aktif')) === 'nonaktif' || strtolower(trim($data['status'] ?? '')) === 'n') ? 'N' : 'Y';
                    $roleType = trim($data['role'] ?? 'guru') ?: 'guru';
                    $targetKategori = $isAdminInstansi ? $authUser->idkategori : ($data['idkategori'] ?? $defaultIdKategori);
                    $targetJenjang = $data['idjenjang'] ?? null;
                    $targetMapelId = $data['idmapel'] ?? null;

                    if (empty($name) || empty($email)) {
                        $failedRows[] = ['row_number' => $rowNum, 'name' => $name, 'message' => 'Nama atau Email tidak boleh kosong'];
                        continue;
                    }

                    $pwd = Hash::make($password);

                    $newId = (string) (time() . rand(1000, 9999) . rand(10, 99));

                    $userBo = UserBo::create([
                        'iduser_bo' => $newId,
                        'idkategori' => $targetKategori,
                        'idjenjang' => $targetJenjang,
                        'nama' => $name,
                        'nip' => $nip ?: null,
                        'nuptk' => $nuptk ?: null,
                        'login_email' => $email,
                        'login_username' => $username,
                        'login_password' => $pwd,
                        'force_change_password' => true,
                        'jenis_kelamin' => $jk === 'P' ? 'P' : 'L',
                        'telp' => $phone ?: null,
                        'alamat' => $alamat ?: null,
                        'status_admin' => '2',
                        'role_type' => $roleType,
                        'status_aktif' => $status,
                        'status_remove' => 'N',
                        'tanggal_input' => now(),
                    ]);

                    if ($targetMapelId) {
                        GuruMataPelajaran::create([
                            'iduser_bo' => $newId,
                            'idmapel' => $targetMapelId,
                            'tahun_ajaran' => '2026/2027',
                            'status' => 'aktif',
                        ]);
                    }

                    $savedCount++;
                }

                DB::commit();

                return response()->json([
                    'message' => "Berhasil mengimpor {$savedCount} data guru.",
                    'saved_count' => $savedCount,
                    'failed_rows' => $failedRows,
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Terjadi kesalahan sistem saat menyimpan data guru: ' . $e->getMessage()
                ], 500);
            }
        }

        // Mode 2: File Upload (Preview Mode or Direct Import - Temuan 06)
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        $file = $request->file('file');

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

        $previewRows = [];
        $validCount = 0;
        $invalidCount = 0;

        $seenEmails = [];
        $seenUsernames = [];

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;

            $name = trim($row[0] ?? '');
            $nip = trim($row[1] ?? '');
            $nuptk = trim($row[2] ?? '');
            $email = trim($row[3] ?? '');
            $username = trim($row[4] ?? '');
            $password = trim($row[5] ?? 'Guru1234!');
            $jk = strtoupper(trim($row[6] ?? 'L'));
            $phone = trim($row[7] ?? '');
            $alamat = trim($row[8] ?? '');
            $statusRaw = trim($row[9] ?? 'Aktif');
            $instansiName = trim($row[10] ?? '');
            $jenjangName = trim($row[11] ?? '');
            $mapelName = trim($row[12] ?? '');
            $roleType = trim($row[13] ?? 'guru') ?: 'guru';

            if (empty($username) && !empty($email)) {
                $username = strtolower(explode('@', $email)[0]);
            }

            $isValid = true;
            $errorReasons = [];

            if (empty($name)) {
                $isValid = false;
                $errorReasons[] = 'Nama Guru tidak boleh kosong';
            }

            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $isValid = false;
                $errorReasons[] = "Format email '{$email}' tidak valid";
            } elseif (in_array(strtolower($email), $seenEmails)) {
                $isValid = false;
                $errorReasons[] = "Email '{$email}' duplikat dalam berkas";
            } else {
                $seenEmails[] = strtolower($email);
            }

            if (!empty($username)) {
                if (in_array(strtolower($username), $seenUsernames)) {
                    $isValid = false;
                    $errorReasons[] = "Username '{$username}' duplikat dalam berkas";
                } else {
                    $seenUsernames[] = strtolower($username);
                }
            }

            // Check database duplicate for email or username
            if ($isValid) {
                $exists = UserBo::where('status_remove', '!=', 'Y')
                    ->where(function ($q) use ($email, $username) {
                        $q->where('login_email', $email);
                        if (!empty($username)) {
                            $q->orWhere('login_username', $username);
                        }
                    })->first();

                if ($exists) {
                    $isValid = false;
                    if (strtolower($exists->login_email) === strtolower($email)) {
                        $errorReasons[] = "Email sudah digunakan";
                    } else {
                        $errorReasons[] = "Username sudah digunakan";
                    }
                }
            }

            // Instansi validation
            $resolvedKategoriId = $defaultIdKategori;
            if (!$isAdminInstansi && !empty($instansiName)) {
                $instansi = \App\Models\KategoriUserBo::where('nama_kategori', $instansiName)->first();
                if (!$instansi) {
                    $isValid = false;
                    $errorReasons[] = "Instansi '{$instansiName}' tidak ditemukan";
                } else {
                    $resolvedKategoriId = $instansi->idkategori;
                }
            }

            // Jenjang validation (EXACT MATCH)
            $resolvedJenjangId = null;
            if (!empty($jenjangName)) {
                $jenjang = \App\Models\MasterJenjang::where('nama_jenjang', $jenjangName)
                    ->orWhere('kode_jenjang', $jenjangName)
                    ->first();
                if (!$jenjang) {
                    $isValid = false;
                    $errorReasons[] = "Jenjang '{$jenjangName}' tidak ditemukan";
                } else {
                    $resolvedJenjangId = $jenjang->id;
                }
            }

            // Mata Pelajaran validation (EXACT MATCH)
            $resolvedMapelId = null;
            if (!empty($mapelName)) {
                $mapel = \App\Models\MasterMataPelajaran::where('nama_mapel', $mapelName)
                    ->orWhere('kode_mapel', $mapelName)
                    ->first();
                if (!$mapel) {
                    $isValid = false;
                    $errorReasons[] = "Mata Pelajaran '{$mapelName}' tidak ditemukan";
                } else {
                    $resolvedMapelId = $mapel->id;
                }
            }

            if ($isValid) {
                $validCount++;
            } else {
                $invalidCount++;
            }

            $previewRows[] = [
                'row_number' => $rowNum,
                'name' => $name ?: "Baris {$rowNum}",
                'status' => $isValid ? 'VALID' : 'INVALID',
                'message' => $isValid ? '-' : implode(', ', $errorReasons),
                'data' => [
                    'nama' => $name,
                    'nip' => $nip,
                    'nuptk' => $nuptk,
                    'email' => $email,
                    'username' => $username,
                    'password' => $password,
                    'jenis_kelamin' => $jk,
                    'phone' => $phone,
                    'alamat' => $alamat,
                    'status' => $statusRaw,
                    'idkategori' => $resolvedKategoriId,
                    'idjenjang' => $resolvedJenjangId,
                    'idmapel' => $resolvedMapelId,
                    'role' => $roleType,
                ]
            ];
        }

        // Return preview data
        return response()->json([
            'total_data' => count($rows),
            'valid_count' => $validCount,
            'invalid_count' => $invalidCount,
            'rows' => $previewRows,
        ]);
    }

    /**
     * Reset password akun Guru oleh Admin / Super Admin (Requirement 11)
     */
    public function resetPassword(Request $request, $iduser_bo)
    {
        $admin = $request->user();
        $teacher = UserBo::findOrFail($iduser_bo);

        if ($admin && $admin->role === 'admin' && !empty($admin->idkategori)) {
            if ((string)$teacher->idkategori !== (string)$admin->idkategori) {
                return response()->json([
                    'message' => 'Akses ditolak: Anda hanya dapat mereset akun guru di instansi Anda.'
                ], 403);
            }
        }

        $newPassword = $request->input('new_password') ?: ('Guru' . rand(1000, 9999) . '!');
        $pwd = Hash::make($newPassword);

        $teacher->update([
            'login_password' => $pwd,
            'force_change_password' => true,
            'active_session_token' => null,
        ]);

        // Revoke all tokens on reset password (Requirement 5)
        $teacher->tokens()->delete();

        \App\Models\AuditLog::record(
            'RESET_PASSWORD_GURU',
            'user_bo',
            $teacher->iduser_bo,
            $teacher->nama,
            [
                'reset_by' => $admin->name ?? 'Admin',
                'role' => $admin->role ?? 'admin',
                'username' => $teacher->login_username,
            ]
        );

        return response()->json([
            'message' => "Password guru {$teacher->nama} berhasil direset.",
            'new_password' => $newPassword
        ]);
    }

    /**
     * Requirement 15: Export Excel / CSV for Teachers
     */
    public function export(Request $request)
    {
        $user = $request->user();
        $query = UserBo::with(['kategori', 'mapelAjar.mataPelajaran', 'kelasWali', 'academicYear'])
            ->where('status_remove', '!=', 'Y')
            ->where(function ($q) {
                $q->where('role_type', 'guru')
                  ->orWhere('role_type', 'admin_sekolah')
                  ->orWhere('status_admin', '2')
                  ->orWhereNull('role_type');
            });

        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('login_email', 'like', "%{$search}%")
                  ->orWhere('login_username', 'like', "%{$search}%");
            });
        }

        if ($request->filled('id_tahun_ajaran')) {
            $query->where('id_tahun_ajaran', $request->id_tahun_ajaran);
        }

        if ($request->filled('status')) {
            $status = in_array(strtolower($request->status), ['aktif', 'y', '1']) ? 'Y' : 'N';
            $query->where('status_aktif', $status);
        }

        $teachers = $query->orderBy('nama', 'asc')->limit(2000)->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="data_guru_' . date('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($teachers) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($file, ['No', 'NIP / NUPTK', 'Nama Guru', 'Wali Kelas', 'Mata Pelajaran Diampu', 'Tahun Ajaran', 'Email', 'Username', 'Telepon', 'Status']);

            foreach ($teachers as $idx => $t) {
                $subjects = $t->mapelAjar->map(fn($m) => $m->mataPelajaran?->nama_mapel)->filter()->unique()->join(', ');
                $waliKelas = $t->kelasWali->pluck('nama_kelas')->join(', ');

                fputcsv($file, [
                    $idx + 1,
                    $t->nip ?: ($t->nuptk ?: '-'),
                    $t->nama ?: $t->name,
                    $waliKelas ? "Wali Kelas ({$waliKelas})" : 'Bukan Wali Kelas',
                    $subjects ?: '-',
                    $t->academicYear?->name ?: '-',
                    $t->login_email ?: '-',
                    $t->login_username ?: '-',
                    $t->telp ?: '-',
                    $t->status_aktif === 'Y' ? 'Aktif' : 'Nonaktif',
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Toggle status aktif / nonaktif akun Guru
     */
    public function toggleStatus(Request $request, $id)
    {
        $teacher = UserBo::findOrFail($id);
        $user = $request->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori) && (string)$teacher->idkategori !== (string)$user->idkategori) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $newStatus = ($teacher->status_aktif === 'Y') ? 'N' : 'Y';
        $teacher->update([
            'status_aktif' => $newStatus,
            'active_session_token' => ($newStatus === 'N') ? null : $teacher->active_session_token
        ]);
        if ($newStatus === 'N') {
            $teacher->tokens()->delete();
        }

        AuditLog::record(
            'TOGGLE_STATUS_GURU',
            'user_bo',
            (string)$teacher->iduser_bo,
            "Mengubah status akun guru {$teacher->nama} menjadi " . ($newStatus === 'Y' ? 'Aktif' : 'Nonaktif'),
            ['id' => $teacher->iduser_bo, 'nama' => $teacher->nama, 'status_aktif' => $newStatus]
        );

        return response()->json([
            'message' => 'Status guru berhasil diubah menjadi ' . ($newStatus === 'Y' ? 'Aktif' : 'Nonaktif'),
            'status_aktif' => $newStatus,
            'is_active' => $newStatus === 'Y'
        ]);
    }
}

