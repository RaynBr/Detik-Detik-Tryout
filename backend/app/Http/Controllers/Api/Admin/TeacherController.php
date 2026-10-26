<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruMataPelajaran;
use App\Models\UserBo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = UserBo::with(['kategori', 'mapelAjar.mataPelajaran'])
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

        $teachers = $query->get();

        $mapped = $teachers->map(function ($t) {
            return [
                'id' => $t->iduser_bo,
                'name' => $t->name,
                'email' => $t->email,
                'username' => $t->username,
                'phone' => $t->telp,
                'role' => $t->role,
                'institution' => $t->kategori?->nama_kategori,
                'is_active' => $t->status_aktif === 'Y',
                'teacher' => [
                    'id' => $t->iduser_bo,
                    'user_id' => $t->iduser_bo,
                    'nip' => $t->iduser_bo,
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

        return response()->json($mapped);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'username' => 'nullable|string',
            'password' => 'required|string|min:4',
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

        // Base64 x5 encoded password for user_bo compatibility
        $pwd = $request->password;
        for ($i = 0; $i < 5; $i++) {
            $pwd = base64_encode($pwd);
        }

        $userBo = UserBo::create([
            'iduser_bo' => $id,
            'idkategori' => $idkategori,
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
                    'tahun_ajaran' => '2026/2027',
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
        }

        if ($request->filled('password')) {
            $pwd = $request->password;
            for ($i = 0; $i < 5; $i++) {
                $pwd = base64_encode($pwd);
            }
            $updateData['login_password'] = $pwd;
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

        $userBo->update(['status_remove' => 'Y', 'status_aktif' => 'N']);

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
            'Nama Lengkap Guru',
            'Email',
            'Username',
            'Password',
            'No Telepon',
            'Mata Pelajaran Utama'
        ];

        $sampleRows = [
            ['Budi Santoso, M.Pd.', 'budi.santoso@sekolah.sch.id', 'budisantoso', 'Guru1234!', '081234567890', 'Matematika'],
            ['Siti Nurhaliza, S.Pd.', 'siti.nurhaliza@sekolah.sch.id', 'sitinurhaliza', 'Guru1234!', '081298765432', 'Bahasa Indonesia'],
            ['Ahmad Fauzi, S.Kom.', 'ahmad.fauzi@sekolah.sch.id', 'ahmadfauzi', 'Guru1234!', '081377889900', 'Informatika'],
        ];

        return $spreadsheetService->downloadCsv($headers, $sampleRows, 'template_import_guru.csv');
    }

    /**
     * Import data guru via Excel (.xlsx) atau CSV (.csv)
     */
    public function import(Request $request, SimpleSpreadsheetService $spreadsheetService)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $user = $request->user();
        $idkategori = ($user && $user->role === 'admin' && !empty($user->idkategori))
            ? $user->idkategori
            : ($request->idkategori ?? $user?->idkategori);

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

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $rowNum = $index + 2; // 1-indexed Excel row

                $name = trim($row[0] ?? '');
                $email = trim($row[1] ?? '');
                $username = trim($row[2] ?? '');
                $password = trim($row[3] ?? 'Guru1234!');
                $phone = trim($row[4] ?? '');
                $mapelName = trim($row[5] ?? '');

                if (empty($name)) {
                    $errors[] = "Baris {$rowNum}: Nama Guru tidak boleh kosong.";
                    continue;
                }

                if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $errors[] = "Baris {$rowNum}: Format email '{$email}' tidak valid.";
                    continue;
                }

                if (empty($username)) {
                    $username = strtolower(explode('@', $email)[0]);
                }

                // Check duplicate email or username
                $exists = UserBo::where('status_remove', '!=', 'Y')
                    ->where(function ($q) use ($email, $username) {
                        $q->where('login_email', $email)
                          ->orWhere('login_username', $username);
                    })->first();

                if ($exists) {
                    $errors[] = "Baris {$rowNum}: Email '{$email}' atau username '{$username}' sudah terdaftar.";
                    continue;
                }

                // 5x Base64 encoding for user_bo password
                $pwd = $password;
                for ($i = 0; $i < 5; $i++) {
                    $pwd = base64_encode($pwd);
                }

                $newId = (string) (time() . rand(1000, 9999) . $index);

                $newGuru = UserBo::create([
                    'iduser_bo' => $newId,
                    'idkategori' => $idkategori,
                    'nama' => $name,
                    'login_email' => $email,
                    'login_username' => $username,
                    'login_password' => $pwd,
                    'telp' => $phone ?: null,
                    'status_admin' => '2',
                    'role_type' => 'guru',
                    'status_aktif' => 'Y',
                    'status_remove' => 'N',
                    'tanggal_input' => now(),
                ]);

                // Mapel association if provided
                if (!empty($mapelName)) {
                    $mapel = \App\Models\MasterMataPelajaran::where('nama_mapel', 'like', "%{$mapelName}%")
                        ->orWhere('kode_mapel', 'like', "%{$mapelName}%")
                        ->first();
                    if ($mapel) {
                        GuruMataPelajaran::create([
                            'iduser_bo' => $newId,
                            'idmapel' => $mapel->id,
                            'tahun_ajaran' => '2026/2027',
                        ]);
                    }
                }

                $imported++;
            }

            if ($imported === 0 && !empty($errors)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Tidak ada data guru yang berhasil diimpor.',
                    'errors' => $errors
                ], 422);
            }

            DB::commit();

            return response()->json([
                'message' => "Berhasil mengimpor {$imported} data guru.",
                'imported_count' => $imported,
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Terjadi kesalahan sistem saat menyimpan data guru: ' . $e->getMessage()
            ], 500);
        }
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
        $pwd = $newPassword;
        for ($i = 0; $i < 5; $i++) {
            $pwd = base64_encode($pwd);
        }

        $teacher->update(['login_password' => $pwd]);

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
}

