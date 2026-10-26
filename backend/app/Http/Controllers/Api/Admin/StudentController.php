<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterKelas;
use App\Models\SiswaKelas;
use App\Models\UserSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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

        $students = $query->paginate($request->per_page ?? 25);

        // Map data for frontend compatibility
        $items = collect($students->items())->map(function ($s) {
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
            'current_page' => $students->currentPage(),
            'last_page' => $students->lastPage(),
            'per_page' => $students->perPage(),
            'total' => $students->total(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email',
            'password' => 'required|string|min:4',
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
            'password' => 'nullable|string|min:4',
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
        }

        if ($request->filled('password')) {
            $updateData['login_password'] = Hash::make($request->password);
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

        $user->update(['status_aktif' => 'N']);
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
            'Nama Lengkap Siswa',
            'NISN',
            'Email Siswa',
            'Password',
            'Nama Kelas',
            'No Telepon Siswa'
        ];

        $sampleRows = [
            ['Ahmad Pratama', '0081234567', 'ahmad.pratama@siswa.sch.id', 'Siswa1234!', '10 RPL 1', '081234567891'],
            ['Bunga Citra Lestari', '0081234568', 'bunga.citra@siswa.sch.id', 'Siswa1234!', '10 RPL 1', '081234567892'],
            ['Dimas Anggara Putra', '0081234569', 'dimas.anggara@siswa.sch.id', 'Siswa1234!', '10 TKJ 2', '081234567893'],
        ];

        return $spreadsheetService->downloadCsv($headers, $sampleRows, 'template_import_siswa.csv');
    }

    /**
     * Import data siswa via Excel (.xlsx) atau CSV (.csv)
     */
    public function import(Request $request, \App\Services\SimpleSpreadsheetService $spreadsheetService)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $authUser = $request->user();
        $idkategori = ($authUser && $authUser->role === 'admin' && !empty($authUser->idkategori))
            ? $authUser->idkategori
            : ($request->idkategori ?? $authUser?->idkategori);

        if (empty($idkategori)) {
            $idkategori = '27830150842287772';
        }

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

        $imported = 0;
        $errors = [];

        // Pre-fetch classes in this instansi for fast lookup
        $classes = MasterKelas::where('idkategori', $idkategori)->get();

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $rowNum = $index + 2;

                $name = trim($row[0] ?? '');
                $nisn = trim($row[1] ?? '');
                $email = trim($row[2] ?? '');
                $password = trim($row[3] ?? 'Siswa1234!');
                $className = trim($row[4] ?? '');
                $phone = trim($row[5] ?? '');

                if (empty($name)) {
                    $errors[] = "Baris {$rowNum}: Nama Siswa tidak boleh kosong.";
                    continue;
                }

                if (empty($nisn)) {
                    $errors[] = "Baris {$rowNum}: NISN untuk '{$name}' tidak boleh kosong.";
                    continue;
                }

                if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = "Baris {$rowNum}: Format email '{$email}' tidak valid.";
                    continue;
                }

                // Check duplicate NISN or Email in user table
                $exists = UserSiswa::where('status_aktif', 'Y')
                    ->where(function ($q) use ($nisn, $email) {
                        $q->where('nisn', $nisn)
                          ->orWhere('login_email', $email);
                    })->first();

                if ($exists) {
                    $errors[] = "Baris {$rowNum}: NISN '{$nisn}' atau email '{$email}' sudah terdaftar.";
                    continue;
                }

                // Match class
                $matchedClass = null;
                if (!empty($className)) {
                    $matchedClass = $classes->first(function ($c) use ($className) {
                        return strtolower($c->nama_kelas) === strtolower($className)
                            || (string)$c->id === (string)$className;
                    });

                    if (!$matchedClass) {
                        // Create class if not found
                        $matchedClass = MasterKelas::create([
                            'nama_kelas' => $className,
                            'idjenjang' => 1,
                            'idkategori' => $idkategori,
                            'tingkat' => 10,
                            'jurusan' => 'Umum',
                            'kapasitas' => 36,
                            'status_aktif' => 'Y',
                        ]);
                        $classes->push($matchedClass);
                    }
                }

                $newId = 'US' . date('Ymd') . str_pad((string)rand(100000, 999999), 10, '0', STR_PAD_LEFT);

                $newStudent = UserSiswa::create([
                    'iduser' => $newId,
                    'nama' => $name,
                    'nisn' => $nisn,
                    'idkelas' => $matchedClass?->id ?? null,
                    'idkategori' => $idkategori,
                    'login_email' => $email,
                    'login_password' => Hash::make($password),
                    'telp' => $phone ?: null,
                    'status_aktif' => 'Y',
                    'tanggal_input' => now(),
                ]);

                if ($matchedClass) {
                    SiswaKelas::create([
                        'iduser' => $newId,
                        'idkelas' => $matchedClass->id,
                        'nisn' => $nisn,
                        'tahun_ajaran' => '2026/2027',
                        'status' => 'aktif',
                    ]);
                }

                $imported++;
            }

            if ($imported === 0 && !empty($errors)) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'message' => 'Tidak ada data siswa yang berhasil diimpor.',
                    'errors' => $errors
                ], 422);
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => "Berhasil mengimpor {$imported} data siswa.",
                'imported_count' => $imported,
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'message' => 'Terjadi kesalahan sistem saat menyimpan data siswa: ' . $e->getMessage()
            ], 500);
        }
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
        $student->update(['login_password' => Hash::make($newPassword)]);

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

