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

        $user = UserSiswa::create([
            'iduser' => $id,
            'nama' => $request->name,
            'nisn' => $nisn,
            'idkelas' => $request->class_id ?? null,
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
        $user->update(['status_aktif' => 'N']);
        SiswaKelas::where('iduser', $id)->delete();

        return response()->json([
            'message' => 'Siswa berhasil dinonaktifkan/dihapus.'
        ]);
    }
}
