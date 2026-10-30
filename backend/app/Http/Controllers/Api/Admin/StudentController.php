<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterKelas;
use App\Models\SiswaKelas;
use App\Models\UserSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = UserSiswa::with(['kelas.jenjang']);

        $user = $request->user();
        if ($user && $user->role === 'admin' && !empty($user->idkategori)) {
            $query->where('idkategori', $user->idkategori);
        }

        if ($request->filled('class_id')) {
            $query->where('idkelas', $request->class_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('login_email', 'like', "%{$search}%")
                  ->orWhere('nisn', 'like', "%{$search}%")
                  ->orWhere('iduser', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('nama', 'asc')->get()->map(function ($s) {
                return [
                    'id' => $s->iduser,
                    'name' => $s->name,
                    'email' => $s->email,
                    'username' => $s->username,
                    'phone' => $s->telp,
                    'is_active' => $s->status_aktif === 'Y',
                    'student' => [
                        'id' => $s->iduser,
                        'user_id' => $s->iduser,
                        'nisn' => $s->nisn,
                        'nis' => $s->nisn,
                        'class_id' => $s->idkelas,
                        'class_room' => $s->kelas ? [
                            'id' => $s->kelas->id,
                            'name' => $s->kelas->nama_kelas,
                            'level' => $s->kelas->tingkat,
                            'jenjang' => $s->kelas->jenjang?->nama_jenjang,
                        ] : null,
                    ]
                ];
            });

            return response()->json([
                'data' => $items,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $items->count(),
                'total' => $items->count(),
                'from' => $items->count() > 0 ? 1 : null,
                'to' => $items->count() > 0 ? $items->count() : null,
                'links' => []
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $students = $query->orderBy('nama', 'asc')->paginate($perPage);

        $students->through(function ($s) {
            return [
                'id' => $s->iduser,
                'name' => $s->name,
                'email' => $s->email,
                'username' => $s->username,
                'phone' => $s->telp,
                'is_active' => $s->status_aktif === 'Y',
                'student' => [
                    'id' => $s->iduser,
                    'user_id' => $s->iduser,
                    'nisn' => $s->nisn,
                    'nis' => $s->nisn,
                    'class_id' => $s->idkelas,
                    'class_room' => $s->kelas ? [
                        'id' => $s->kelas->id,
                        'name' => $s->kelas->nama_kelas,
                        'level' => $s->kelas->tingkat,
                        'jenjang' => $s->kelas->jenjang?->nama_jenjang,
                    ] : null,
                ]
            ];
        });

        return response()->json($students);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email',
            'password' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'nisn' => 'nullable|string|max:30',
            'class_id' => 'nullable|exists:master_kelas,id',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        $id = 'US' . date('Ymd') . str_pad((string)rand(100000, 999999), 10, '0', STR_PAD_LEFT);
        $nisn = $request->nisn ?: ('00' . rand(20000000, 29999999));

        $authUser = $request->user();
        $idkategori = ($authUser && $authUser->role === 'admin' && !empty($authUser->idkategori))
            ? $authUser->idkategori
            : ($request->idkategori ?? $authUser?->idkategori);

        $user = UserSiswa::create([
            'iduser' => $id,
            'nama' => $request->name,
            'nisn' => $nisn,
            'idkelas' => $request->class_id ?? null,
            'idkategori' => $idkategori,
            'login_email' => $request->email,
            'login_password' => Hash::make($request->password),
            'telp' => $request->phone ?? null,
            'alamat' => $request->address ?? null,
            'status_aktif' => 'Y',
            'url_image' => 'default.png',
            'tanggal_input' => now(),
        ]);

        if ($request->filled('class_id')) {
            SiswaKelas::create([
                'iduser' => $user->iduser,
                'idkelas' => $request->class_id,
                'nisn' => $nisn,
                'tahun_ajaran' => '2026/2027',
                'status' => 'aktif',
            ]);
        }

        return response()->json([
            'message' => 'Siswa berhasil ditambahkan.',
            'data' => $user
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = UserSiswa::where('iduser', $id)->firstOrFail();
        $authUser = $request->user();

        if ($authUser && $authUser->role === 'admin' && !empty($authUser->idkategori) && (string)$user->idkategori !== (string)$authUser->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses mengubah siswa instansi lain.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email',
            'nisn' => 'nullable|string|max:30',
            'class_id' => 'nullable|exists:master_kelas,id',
            'phone' => 'nullable|string',
            'password' => ['nullable', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'is_active' => 'nullable|boolean',
        ]);

        $updateData = [
            'nama' => $request->name,
            'login_email' => $request->email,
            'nisn' => $request->nisn ?? $user->nisn,
            'idkelas' => $request->class_id ?? $user->idkelas,
            'telp' => $request->phone ?? $user->telp,
        ];

        if ($request->has('is_active')) {
            $updateData['status_aktif'] = $request->is_active ? 'Y' : 'N';
            if (!$request->is_active) {
                // Revoke tokens on account deactivation (Requirement 5)
                $user->tokens()->delete();
                $updateData['active_session_token'] = null;
            }
        }

        if ($request->filled('password')) {
            $updateData['login_password'] = Hash::make($request->password);
            // Revoke tokens on password change (Requirement 5)
            $user->tokens()->delete();
            $updateData['active_session_token'] = null;
        }

        $user->update($updateData);

        if ($request->filled('class_id')) {
            SiswaKelas::updateOrInsert(
                ['iduser' => $user->iduser],
                [
                    'idkelas' => $request->class_id,
                    'nisn' => $user->nisn,
                    'tahun_ajaran' => '2026/2027',
                    'status' => 'aktif',
                    'updated_at' => now(),
                ]
            );
        }

        return response()->json([
            'message' => 'Data siswa berhasil diperbarui.',
            'data' => $user
        ]);
    }

    public function destroy($id)
    {
        $user = UserSiswa::where('iduser', $id)->firstOrFail();
        $authUser = request()->user();

        if ($authUser && $authUser->role === 'admin' && !empty($authUser->idkategori) && (string)$user->idkategori !== (string)$authUser->idkategori) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki hak akses menghapus siswa instansi lain.'], 403);
        }

        // Revoke tokens and invalidate session on student deactivation (Requirement 5)
        $user->tokens()->delete();
        $user->update(['status_aktif' => 'N', 'active_session_token' => null]);
        SiswaKelas::where('iduser', $id)->delete();

        return response()->json([
            'message' => 'Siswa berhasil dinonaktifkan/dihapus.'
        ]);
    }

    /**
     * Download template spreadsheet untuk import siswa
     */
    public function downloadTemplate(\App\Services\SimpleSpreadsheetService $spreadsheetService)
    {
        $headers = [
            'Nama',
            'NIS',
            'NISN',
            'Username',
            'Password',
            'Jenis Kelamin',
            'Nomor Absen',
            'Kelas',
            'Jenjang',
            'Tempat Lahir',
            'Tanggal Lahir',
            'Agama',
            'No HP',
            'Alamat',
            'Status'
        ];

        $sampleRows = [
            ['Ahmad Pratama', '20261001', '0081234567', 'ahmad.pratama', 'Siswa1234!', 'L', '1', '10 RPL 1', 'SMA', 'Jakarta', '2008-05-12', 'Islam', '081234567891', 'Jl. Melati No. 12', 'Aktif'],
            ['Bunga Citra Lestari', '20261002', '0081234568', 'bunga.citra', 'Siswa1234!', 'P', '2', '10 RPL 1', 'SMA', 'Bandung', '2008-08-20', 'Islam', '081234567892', 'Jl. Mawar No. 45', 'Aktif'],
            ['Dimas Anggara Putra', '20261003', '0081234569', 'dimas.anggara', 'Siswa1234!', 'L', '3', '10 TKJ 2', 'SMA', 'Surabaya', '2008-02-14', 'Kristen', '081234567893', 'Jl. Kenanga No. 8', 'Aktif'],
        ];

        return $spreadsheetService->downloadCsv($headers, $sampleRows, 'template_import_siswa.csv');
    }

    /**
     * Import data siswa via Excel (.xlsx) atau CSV (.csv) with Preview & Exact Match
     */
    public function import(Request $request, \App\Services\SimpleSpreadsheetService $spreadsheetService)
    {
        $authUser = $request->user();
        $isAdminInstansi = $authUser && $authUser->role === 'admin' && !empty($authUser->idkategori);
        $idkategori = $isAdminInstansi ? $authUser->idkategori : ($request->idkategori ?? $authUser?->idkategori ?? '27830150842287772');

        // Mode 1: Batch JSON Commit (for progressive chunked upload with progress bar)
        if ($request->has('rows') && is_array($request->rows)) {
            $rowsToSave = $request->input('rows');
            $savedCount = 0;
            $failedRows = [];

            \Illuminate\Support\Facades\DB::beginTransaction();
            try {
                foreach ($rowsToSave as $item) {
                    $rowNum = $item['row_number'] ?? 0;
                    $data = $item['data'] ?? $item;

                    $name = trim($data['nama'] ?? $data['name'] ?? '');
                    $nis = trim($data['nis'] ?? '');
                    $nisn = trim($data['nisn'] ?? '');
                    $username = trim($data['username'] ?? '');
                    $password = trim($data['password'] ?? 'Siswa1234!');
                    $jk = strtoupper(trim($data['jenis_kelamin'] ?? 'L'));
                    $nomorAbsen = !empty($data['nomor_absen']) ? (int)$data['nomor_absen'] : null;
                    $idkelas = $data['idkelas'] ?? null;
                    $idjenjang = $data['idjenjang'] ?? null;
                    $tempatLahir = trim($data['tempat_lahir'] ?? '');
                    $tanggalLahir = !empty($data['tanggal_lahir']) ? date('Y-m-d', strtotime($data['tanggal_lahir'])) : null;
                    $agama = trim($data['agama'] ?? '');
                    $phone = trim($data['phone'] ?? $data['telp'] ?? '');
                    $alamat = trim($data['alamat'] ?? '');
                    $status = (strtolower(trim($data['status'] ?? 'aktif')) === 'nonaktif' || strtolower(trim($data['status'] ?? '')) === 'n') ? 'N' : 'Y';

                    if (empty($name) || empty($nisn)) {
                        $failedRows[] = ['row_number' => $rowNum, 'name' => $name, 'message' => 'Nama atau NISN tidak boleh kosong'];
                        continue;
                    }

                    $newId = 'US' . date('Ymd') . str_pad((string)rand(100000, 999999), 10, '0', STR_PAD_LEFT);

                    $newStudent = UserSiswa::create([
                        'iduser' => $newId,
                        'nama' => $name,
                        'nis' => $nis ?: null,
                        'nisn' => $nisn,
                        'jenis_kelamin' => $jk === 'P' ? 'P' : 'L',
                        'nomor_absen' => $nomorAbsen,
                        'idkelas' => $idkelas,
                        'idjenjang' => $idjenjang,
                        'idkategori' => $idkategori,
                        'tempat_lahir' => $tempatLahir ?: null,
                        'tanggal_lahir' => $tanggalLahir,
                        'agama' => $agama ?: null,
                        'login_email' => $username ?: $nisn,
                        'login_password' => Hash::make($password),
                        'force_change_password' => true,
                        'telp' => $phone ?: null,
                        'alamat' => $alamat ?: null,
                        'status_aktif' => $status,
                        'tanggal_input' => now(),
                    ]);

                    if ($idkelas) {
                        SiswaKelas::create([
                            'iduser' => $newId,
                            'idkelas' => $idkelas,
                            'nisn' => $nisn,
                            'tahun_ajaran' => '2026/2027',
                            'status' => 'aktif',
                        ]);
                    }

                    $savedCount++;
                }

                \Illuminate\Support\Facades\DB::commit();

                return response()->json([
                    'message' => "Berhasil mengimpor {$savedCount} data siswa.",
                    'saved_count' => $savedCount,
                    'failed_rows' => $failedRows,
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'message' => 'Terjadi kesalahan sistem saat menyimpan data siswa: ' . $e->getMessage()
                ], 500);
            }
        }

        // Mode 2: File Upload (Preview Mode or Direct Import)
        $request->validate([
            'file' => 'required|file|max:10240',
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

        $seenNis = [];
        $seenNisn = [];
        $seenUsernames = [];

        // Pre-fetch all classes in this scope
        $classQuery = MasterKelas::query();
        if ($isAdminInstansi) {
            $classQuery->where('idkategori', $idkategori);
        }
        $classes = $classQuery->get();

        $allJenjang = \App\Models\MasterJenjang::all();

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;

            $name = trim($row[0] ?? '');
            $nis = trim($row[1] ?? '');
            $nisn = trim($row[2] ?? '');
            $username = trim($row[3] ?? '');
            $password = trim($row[4] ?? 'Siswa1234!');
            $jk = strtoupper(trim($row[5] ?? 'L'));
            $nomorAbsen = trim($row[6] ?? '');
            $className = trim($row[7] ?? '');
            $jenjangName = trim($row[8] ?? '');
            $tempatLahir = trim($row[9] ?? '');
            $tanggalLahir = trim($row[10] ?? '');
            $agama = trim($row[11] ?? '');
            $phone = trim($row[12] ?? '');
            $alamat = trim($row[13] ?? '');
            $statusRaw = trim($row[14] ?? 'Aktif');

            if (empty($username) && !empty($nisn)) {
                $username = $nisn;
            }

            $isValid = true;
            $errorReasons = [];

            if (empty($name)) {
                $isValid = false;
                $errorReasons[] = 'Nama Siswa tidak boleh kosong';
            }

            if (empty($nisn)) {
                $isValid = false;
                $errorReasons[] = 'NISN tidak boleh kosong';
            } elseif (in_array($nisn, $seenNisn)) {
                $isValid = false;
                $errorReasons[] = "NISN '{$nisn}' duplikat dalam berkas";
            } else {
                $seenNisn[] = $nisn;
            }

            if (!empty($nis)) {
                if (in_array($nis, $seenNis)) {
                    $isValid = false;
                    $errorReasons[] = "NIS '{$nis}' duplikat dalam berkas";
                } else {
                    $seenNis[] = $nis;
                }
            }

            if (!empty($username)) {
                if (in_array(strtolower($username), $seenUsernames)) {
                    $isValid = false;
                    $errorReasons[] = "Username '{$username}' duplikat dalam berkas";
                } else {
                    $seenUsernames[] = strtolower($username);
                }
            }

            // Database duplicate check for NISN, NIS, Username
            if ($isValid) {
                if (UserSiswa::where('status_aktif', '!=', 'N')->where('nisn', $nisn)->exists()) {
                    $isValid = false;
                    $errorReasons[] = "NISN sudah digunakan";
                }

                if ($isValid && !empty($nis)) {
                    if (UserSiswa::where('status_aktif', '!=', 'N')->where('nis', $nis)->exists()) {
                        $isValid = false;
                        $errorReasons[] = "NIS sudah digunakan";
                    }
                }

                if ($isValid && !empty($username)) {
                    if (UserSiswa::where('status_aktif', '!=', 'N')->where('login_email', $username)->exists()) {
                        $isValid = false;
                        $errorReasons[] = "Username sudah digunakan";
                    }
                }
            }

            // Kelas validation (EXACT MATCH)
            $matchedClass = null;
            if (empty($className)) {
                $isValid = false;
                $errorReasons[] = "Kelas wajib diisi";
            } else {
                $matchedClass = $classes->first(function ($c) use ($className) {
                    return $c->nama_kelas === $className;
                });
                if (!$matchedClass) {
                    $isValid = false;
                    $errorReasons[] = "Kelas '{$className}' tidak ditemukan";
                }
            }

            // Jenjang validation (EXACT MATCH)
            $matchedJenjang = null;
            if (empty($jenjangName)) {
                $isValid = false;
                $errorReasons[] = "Jenjang wajib diisi";
            } else {
                $matchedJenjang = $allJenjang->first(function ($j) use ($jenjangName) {
                    return $j->nama_jenjang === $jenjangName || $j->kode_jenjang === $jenjangName;
                });
                if (!$matchedJenjang) {
                    $isValid = false;
                    $errorReasons[] = "Jenjang '{$jenjangName}' tidak ditemukan";
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
                    'nis' => $nis,
                    'nisn' => $nisn,
                    'username' => $username,
                    'password' => $password,
                    'jenis_kelamin' => $jk,
                    'nomor_absen' => $nomorAbsen,
                    'idkelas' => $matchedClass?->id,
                    'idjenjang' => $matchedJenjang?->id,
                    'kelas_name' => $className,
                    'jenjang_name' => $jenjangName,
                    'tempat_lahir' => $tempatLahir,
                    'tanggal_lahir' => $tanggalLahir,
                    'agama' => $agama,
                    'phone' => $phone,
                    'alamat' => $alamat,
                    'status' => $statusRaw,
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
     * Reset password akun Siswa oleh Admin / Super Admin (Requirement 11)
     */
    public function resetPassword(Request $request, $id)
    {
        $admin = $request->user();
        $student = UserSiswa::where('iduser', $id)->firstOrFail();

        if ($admin && $admin->role === 'admin' && !empty($admin->idkategori)) {
            if ((string)$student->idkategori !== (string)$admin->idkategori) {
                return response()->json([
                    'message' => 'Akses ditolak: Anda hanya dapat mereset akun siswa di instansi Anda.'
                ], 403);
            }
        }

        $newPassword = $request->input('new_password') ?: ('Siswa' . rand(1000, 9999) . '!');
        $student->update([
            'login_password' => Hash::make($newPassword),
            'force_change_password' => true,
            'active_session_token' => null,
        ]);

        // Revoke all tokens on reset password (Requirement 5)
        $student->tokens()->delete();

        \App\Models\AuditLog::record(
            'RESET_PASSWORD_SISWA',
            'user',
            $student->iduser,
            $student->nama,
            [
                'reset_by' => $admin->name ?? 'Admin',
                'role' => $admin->role ?? 'admin',
                'nisn' => $student->nisn,
            ]
        );

        return response()->json([
            'message' => "Password siswa {$student->nama} berhasil direset.",
            'new_password' => $newPassword
        ]);
    }
}

