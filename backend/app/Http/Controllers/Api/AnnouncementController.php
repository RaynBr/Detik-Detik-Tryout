<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\GuruMataPelajaran;
use App\Models\KategoriUserBo;
use App\Models\MasterKelas;
use App\Models\MasterMataPelajaran;
use App\Models\MasterTahunAjaran;
use App\Models\MasterTingkatKelas;
use App\Models\User;
use App\Models\UserBo;
use App\Models\UserSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AnnouncementController extends Controller
{
    /**
     * Resolve current user role, ID, name, and instansi.
     */
    protected function resolveUserContext(Request $request): array
    {
        $user = $request->user() ?: Auth::user();

        if (!$user) {
            return [
                'user' => null,
                'role' => 'guest',
                'user_id' => null,
                'user_name' => 'Guest',
                'idkategori' => null,
                'id_guru' => null,
                'instansi_name' => 'Sistem CBT',
            ];
        }

        $role = 'siswa';
        if (method_exists($user, 'hasRole')) {
            if ($user->hasRole('super_admin')) $role = 'super_admin';
            elseif ($user->hasRole('admin') || $user->hasRole('admin_instansi')) $role = 'admin';
            elseif ($user->hasRole('guru')) $role = 'guru';
            elseif ($user->hasRole('siswa')) $role = 'siswa';
        }

        // Fallback checks
        if ($role === 'siswa') {
            $checkRole = $user->role ?? $user->level_akses ?? null;
            if ($checkRole) {
                $role = match ($checkRole) {
                    'super_admin', 'superadmin' => 'super_admin',
                    'admin', 'admin_instansi' => 'admin',
                    'guru' => 'guru',
                    default => 'siswa',
                };
            }
        }

        $idkategori = $user->idkategori ?? null;
        $id_guru = null;

        // Look up UserBo for staff/admin/guru
        if (in_array($role, ['admin', 'guru', 'super_admin'])) {
            $userBo = UserBo::where('login_email', $user->email ?? '')
                ->orWhere('login_username', $user->username ?? '')
                ->orWhere('iduser_bo', $user->id)
                ->first();
            if ($userBo) {
                if (!$idkategori) {
                    $idkategori = $userBo->idkategori;
                }
                if ($role === 'guru') {
                    $id_guru = $userBo->iduser_bo;
                }
            }
        }

        $instansiName = 'Sistem CBT';
        if ($idkategori) {
            $instansi = KategoriUserBo::find($idkategori);
            if ($instansi) {
                $instansiName = $instansi->nama_kategori;
            }
        }

        return [
            'user' => $user,
            'role' => $role,
            'user_id' => $user->id ?? null,
            'user_name' => $user->name ?? $user->nama_lengkap ?? 'Pengguna',
            'idkategori' => $idkategori,
            'id_guru' => $id_guru,
            'instansi_name' => $instansiName,
        ];
    }

    /**
     * Unified index for Management (Super Admin, Admin Instansi, Guru)
     */
    public function index(Request $request)
    {
        $ctx = $this->resolveUserContext($request);
        $role = $ctx['role'];
        $idkategori = $ctx['idkategori'];
        $idGuru = $ctx['id_guru'];

        $query = Announcement::query();

        // 1. Role Scoping (Single Data Source Hierarchy)
        if ($role === 'super_admin') {
            // Super Admin can see EVERYTHING (Global, all schools, all teachers)
            if ($request->filled('idkategori')) {
                $query->where('idkategori', $request->idkategori);
            }
        } elseif ($role === 'admin') {
            // Admin Instansi sees:
            // a. Global announcements from Super Admin (idkategori IS NULL or target_type = 'all')
            // b. Announcements of this school (created by this admin or teachers of this school)
            $query->where(function ($q) use ($idkategori) {
                $q->whereNull('idkategori')
                  ->orWhere('idkategori', $idkategori);
            });
        } elseif ($role === 'guru') {
            // Guru sees:
            // a. Global announcements from Super Admin (idkategori IS NULL)
            // b. School announcements from Admin Instansi of their school
            // c. Announcements created by this Guru
            $query->where(function ($q) use ($idkategori, $idGuru, $ctx) {
                $q->whereNull('idkategori')
                  ->orWhere(function ($sub) use ($idkategori) {
                      $sub->where('idkategori', $idkategori)
                          ->where('role', 'admin');
                  })
                  ->orWhere(function ($sub) use ($idGuru, $ctx) {
                      if ($idGuru) {
                          $sub->where('id_guru', $idGuru);
                      } else {
                          $sub->where('created_by_user_id', $ctx['user_id']);
                      }
                  });
            });
        } elseif ($role === 'siswa') {
            return $this->studentIndex($request);
        }

        // 2. Filters
        if ($request->filled('status') && $request->status !== 'Semua') {
            $query->where('status', $request->status);
        }
        if ($request->filled('category') && $request->category !== 'Semua') {
            $query->where('category', $request->category);
        }
        if ($request->filled('priority') && $request->priority !== 'Semua') {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('content', 'like', "%{$s}%")
                  ->orWhere('created_by', 'like', "%{$s}%");
            });
        }

        $query->orderBy('id', 'desc');

        $limit = $request->input('limit', 15);
        $announcements = $query->paginate($limit);

        // Format items with display badges & metadata
        $announcements->getCollection()->transform(function ($item) {
            return $this->formatAnnouncementItem($item);
        });

        return response()->json([
            'status' => 'success',
            'data' => $announcements->items(),
            'current_page' => $announcements->currentPage(),
            'last_page' => $announcements->lastPage(),
            'total' => $announcements->total(),
            'per_page' => $announcements->perPage(),
        ]);
    }

    /**
     * Unified index for Students (Popup & History)
     * Matches EXACT structure expected by StudentAnnouncementModal & StudentExamsPage
     */
    public function studentIndex(Request $request)
    {
        $user = $request->user() ?: Auth::user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        // Resolve student profile
        $idkategori = $user->idkategori ?? null;
        $idkelas = null;

        $studentModel = UserSiswa::where('iduser', $user->id)
            ->orWhere('nisn', $user->username ?? '')
            ->orWhere('login_email', $user->email ?? '')
            ->first();

        if ($studentModel) {
            $idkelas = $studentModel->idkelas ?? null;
            if (!$idkategori) {
                $idkategori = $studentModel->idkategori;
            }
        }

        $now = now();

        $query = Announcement::where('is_active', true)
            ->whereIn('status', ['Aktif', 'active'])
            ->where(function ($q) use ($now) {
                $q->whereNull('publish_at')->orWhere('publish_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('expired_at')->orWhere('expired_at', '>=', $now);
            })
            ->where(function ($q) {
                $q->where('target_role', 'all')
                  ->orWhere('target_role', 'siswa');
            });

        // Target eligibility matching
        $query->where(function ($q) use ($idkategori, $idkelas) {
            // 1. Global announcements (Super Admin)
            $q->where(function ($sub) {
                $sub->whereNull('idkategori')
                    ->orWhere('target_type', 'all');
            });

            // 2. School-wide announcements
            if ($idkategori) {
                $q->orWhere(function ($sub) use ($idkategori) {
                    $sub->where('idkategori', $idkategori)
                        ->where('target_type', 'all');
                });
            }

            // 3. Class-specific announcements (e.g. from Admin or Guru)
            if ($idkategori && $idkelas) {
                $q->orWhere(function ($sub) use ($idkategori, $idkelas) {
                    $sub->where('idkategori', $idkategori)
                        ->where('target_type', 'class')
                        ->where('target_id', (string)$idkelas);
                });
            }
        });

        // Priority sort: Sangat Penting > Tinggi > Normal > Rendah, then newest
        $announcements = $query->orderByRaw("
            CASE priority
                WHEN 'Sangat Penting' THEN 1
                WHEN 'Tinggi' THEN 2
                WHEN 'Normal' THEN 3
                WHEN 'Rendah' THEN 4
                ELSE 5
            END ASC
        ")
        ->orderBy('id', 'desc')
        ->get();

        $formatted = $announcements->map(function ($item) {
            return $this->formatAnnouncementItem($item);
        });

        return response()->json([
            'status' => 'success',
            'data' => $formatted,
        ]);
    }

    /**
     * Provide dynamic dropdown target options according to role.
     */
    public function targetOptions(Request $request)
    {
        $ctx = $this->resolveUserContext($request);
        $role = $ctx['role'];
        $idkategori = $ctx['idkategori'];
        $idGuru = $ctx['id_guru'];

        $options = [
            'role' => $role,
            'target_types' => [],
            'instansi' => [],
            'classes' => [],
            'academic_years' => [],
            'levels' => [],
        ];

        if ($role === 'super_admin') {
            $options['target_types'] = [
                ['value' => 'all', 'label' => 'Semua Instansi (Global CBT)'],
                ['value' => 'instansi', 'label' => 'Instansi Tertentu'],
            ];
            $options['instansi'] = KategoriUserBo::select('idkategori', 'nama_kategori')
                ->where('is_active', true)
                ->orderBy('nama_kategori')
                ->get();
        } elseif ($role === 'admin') {
            $options['target_types'] = [
                ['value' => 'all', 'label' => 'Semua Siswa di Sekolah Ini'],
                ['value' => 'academic_year', 'label' => 'Berdasarkan Tahun Ajaran'],
                ['value' => 'tingkat', 'label' => 'Berdasarkan Tingkat Kelas'],
                ['value' => 'class', 'label' => 'Berdasarkan Rombel Kelas Tertentu'],
            ];
            if ($idkategori) {
                $options['classes'] = MasterKelas::where('idkategori', $idkategori)
                    ->select('id as idkelas', 'nama_kelas')
                    ->orderBy('nama_kelas')
                    ->get();
                $options['academic_years'] = MasterTahunAjaran::where('idkategori', $idkategori)
                    ->select('idtahun_ajaran', 'nama_tahun_ajaran')
                    ->orderBy('idtahun_ajaran', 'desc')
                    ->get();
                $options['levels'] = MasterTingkatKelas::where('idkategori', $idkategori)
                    ->select('idtingkat', 'nama_tingkat')
                    ->get();
            }
        } elseif ($role === 'guru') {
            $options['target_types'] = [
                ['value' => 'all_taught', 'label' => 'Semua Kelas yang Saya Ajar'],
                ['value' => 'class', 'label' => 'Salah Satu Kelas yang Saya Ajar'],
            ];

            // Only retrieve classes taught by this Guru
            $taughtClassIds = [];
            if ($idGuru) {
                $taughtClassIds = GuruMataPelajaran::where('iduser_bo', $idGuru)
                    ->whereNotNull('idkelas')
                    ->pluck('idkelas')
                    ->toArray();

                $homeroomClassIds = MasterKelas::where('wali_kelas_id', $idGuru)
                    ->pluck('id')
                    ->toArray();

                $allClassIds = array_unique(array_merge($taughtClassIds, $homeroomClassIds));

                if (!empty($allClassIds)) {
                    $options['classes'] = MasterKelas::whereIn('id', $allClassIds)
                        ->select('id as idkelas', 'nama_kelas')
                        ->orderBy('nama_kelas')
                        ->get();
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $options,
        ]);
    }

    /**
     * Store new announcement with strict validation and audit logging.
     */
    public function store(Request $request)
    {
        $ctx = $this->resolveUserContext($request);
        $role = $ctx['role'];
        $idkategori = $ctx['idkategori'];
        $idGuru = $ctx['id_guru'];

        if (!in_array($role, ['super_admin', 'admin', 'guru'])) {
            return response()->json(['message' => 'Unauthorized role to create announcement'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string',
            'priority' => 'nullable|in:Rendah,Normal,Tinggi,Sangat Penting',
            'status' => 'nullable|in:Draft,Terjadwal,Aktif,Berakhir,Arsip',
            'publish_at' => 'nullable|date',
            'expired_at' => 'nullable|date',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'target_type' => 'nullable|string',
            'target_id' => 'nullable',
            'target_role' => 'nullable|string',
            'idkategori' => 'nullable',
            'badge_text' => 'nullable|string',
            'attachment_url' => 'nullable|string',
            'attachment_name' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Target type defaults
        $targetType = $validated['target_type'] ?? 'all';
        $targetId = $validated['target_id'] ?? null;
        if (is_array($targetId)) {
            $targetId = implode(',', $targetId);
        }

        // Security check for Guru
        if ($role === 'guru') {
            $validated['idkategori'] = $idkategori;
            $validated['role'] = 'guru';
            $validated['id_guru'] = $idGuru;

            if ($targetType === 'class' && $targetId) {
                $targetIds = explode(',', (string)$targetId);
                $allowedClasses = $this->getTeacherAllowedClassIds($idGuru);

                foreach ($targetIds as $tid) {
                    $tid = trim($tid);
                    if ($tid && !in_array($tid, $allowedClasses)) {
                        return response()->json([
                            'message' => "Anda tidak memiliki wewenang untuk mengirim pengumuman ke kelas: {$tid}"
                        ], 403);
                    }
                }
            }
        } elseif ($role === 'admin') {
            $validated['idkategori'] = $idkategori;
            $validated['role'] = 'admin';
            $validated['id_guru'] = null;
        } elseif ($role === 'super_admin') {
            $validated['role'] = 'super_admin';
            $validated['id_guru'] = null;
            if ($targetType === 'all') {
                $validated['idkategori'] = null;
            }
        }

        $publishAt = $validated['publish_at'] ?? $validated['start_date'] ?? null;
        $expiredAt = $validated['expired_at'] ?? $validated['end_date'] ?? null;
        $status = $validated['status'] ?? 'Aktif';

        $announcement = Announcement::create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'category' => $validated['category'] ?? 'Pengumuman',
            'priority' => $validated['priority'] ?? 'Normal',
            'status' => $status,
            'publish_at' => $publishAt,
            'expired_at' => $expiredAt,
            'attachment_url' => $validated['attachment_url'] ?? null,
            'attachment_name' => $validated['attachment_name'] ?? null,
            'badge_text' => ($validated['badge_text'] ?? null) ?: ($validated['category'] ?? 'Pengumuman'),
            'target_role' => $validated['target_role'] ?? 'siswa',
            'target_type' => $targetType,
            'target_id' => $targetId,
            'idkategori' => $validated['idkategori'] ?? null,
            'is_active' => in_array($status, ['Aktif', 'active']),
            'created_by' => $ctx['user_name'],
            'role' => $role,
            'created_by_user_id' => $ctx['user_id'],
            'id_guru' => $validated['id_guru'] ?? null,
        ]);

        // Audit Trail
        AuditLog::record(
            'CREATE_ANNOUNCEMENT',
            'announcement',
            (string)$announcement->id,
            $announcement->title,
            [
                'category' => $announcement->category,
                'priority' => $announcement->priority,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'role' => $role,
            ],
            (string)$ctx['user_id'],
            $ctx['user_name'],
            $role,
            'Pengumuman',
            $ctx['instansi_name']
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil dibuat.',
            'data' => $this->formatAnnouncementItem($announcement),
        ], 201);
    }

    /**
     * Show single announcement detail.
     */
    public function show($id, Request $request)
    {
        $announcement = Announcement::findOrFail($id);
        $ctx = $this->resolveUserContext($request);
        $role = $ctx['role'];

        // Scoping check
        if ($role === 'admin' && $announcement->idkategori && $announcement->idkategori != $ctx['idkategori']) {
            return response()->json(['message' => 'Unauthorized view.'], 403);
        }
        if ($role === 'guru' && $announcement->idkategori && $announcement->idkategori != $ctx['idkategori']) {
            return response()->json(['message' => 'Unauthorized view.'], 403);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->formatAnnouncementItem($announcement),
        ]);
    }

    /**
     * Update announcement with ownership checks and audit trail.
     */
    public function update($id, Request $request)
    {
        $announcement = Announcement::findOrFail($id);
        $ctx = $this->resolveUserContext($request);
        $role = $ctx['role'];

        // Ownership & permission guard
        if ($role === 'guru') {
            $isOwner = ($announcement->id_guru && $announcement->id_guru == $ctx['id_guru'])
                || ($announcement->created_by_user_id == $ctx['user_id']);
            if (!$isOwner) {
                return response()->json(['message' => 'Guru hanya dapat mengedit pengumuman miliknya sendiri.'], 403);
            }
        } elseif ($role === 'admin') {
            if ($announcement->idkategori && $announcement->idkategori != $ctx['idkategori']) {
                return response()->json(['message' => 'Admin hanya dapat mengedit pengumuman sekolahnya.'], 403);
            }
            if ($announcement->role === 'super_admin') {
                return response()->json(['message' => 'Admin tidak dapat mengubah pengumuman Super Admin.'], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'category' => 'nullable|string',
            'priority' => 'nullable|in:Rendah,Normal,Tinggi,Sangat Penting',
            'status' => 'nullable|in:Draft,Terjadwal,Aktif,Berakhir,Arsip',
            'publish_at' => 'nullable|date',
            'expired_at' => 'nullable|date',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'target_type' => 'nullable|string',
            'target_id' => 'nullable',
            'attachment_url' => 'nullable|string',
            'attachment_name' => 'nullable|string',
            'badge_text' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $targetId = $validated['target_id'] ?? $announcement->target_id;
        if (is_array($targetId)) {
            $targetId = implode(',', $targetId);
        }

        // Security check for Guru
        if ($role === 'guru' && ($validated['target_type'] ?? $announcement->target_type) === 'class' && $targetId) {
            $targetIds = explode(',', (string)$targetId);
            $allowedClasses = $this->getTeacherAllowedClassIds($ctx['id_guru']);
            foreach ($targetIds as $tid) {
                $tid = trim($tid);
                if ($tid && !in_array($tid, $allowedClasses)) {
                    return response()->json([
                        'message' => "Anda tidak memiliki wewenang untuk mengirim pengumuman ke kelas: {$tid}"
                    ], 403);
                }
            }
        }

        $publishAt = $validated['publish_at'] ?? $validated['start_date'] ?? $announcement->publish_at;
        $expiredAt = $validated['expired_at'] ?? $validated['end_date'] ?? $announcement->expired_at;
        $status = $validated['status'] ?? $announcement->status;

        $beforeState = [
            'title' => $announcement->title,
            'status' => $announcement->status,
            'priority' => $announcement->priority,
        ];

        $announcement->update([
            'title' => $validated['title'] ?? $announcement->title,
            'content' => $validated['content'] ?? $announcement->content,
            'category' => $validated['category'] ?? $announcement->category,
            'priority' => $validated['priority'] ?? $announcement->priority,
            'status' => $status,
            'publish_at' => $publishAt,
            'expired_at' => $expiredAt,
            'attachment_url' => array_key_exists('attachment_url', $validated) ? $validated['attachment_url'] : $announcement->attachment_url,
            'attachment_name' => array_key_exists('attachment_name', $validated) ? $validated['attachment_name'] : $announcement->attachment_name,
            'badge_text' => $validated['badge_text'] ?? $announcement->badge_text,
            'target_type' => $validated['target_type'] ?? $announcement->target_type,
            'target_id' => $targetId,
            'is_active' => in_array($status, ['Aktif', 'active']),
        ]);

        AuditLog::record(
            'UPDATE_ANNOUNCEMENT',
            'announcement',
            (string)$announcement->id,
            $announcement->title,
            [
                'before' => $beforeState,
                'after' => [
                    'title' => $announcement->title,
                    'status' => $announcement->status,
                    'priority' => $announcement->priority,
                ],
            ],
            (string)$ctx['user_id'],
            $ctx['user_name'],
            $role,
            'Pengumuman',
            $ctx['instansi_name']
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil diperbarui.',
            'data' => $this->formatAnnouncementItem($announcement),
        ]);
    }

    /**
     * Delete announcement with authorization guard and audit trail.
     */
    public function destroy($id, Request $request)
    {
        $announcement = Announcement::findOrFail($id);
        $ctx = $this->resolveUserContext($request);
        $role = $ctx['role'];

        if ($role === 'guru') {
            $isOwner = ($announcement->id_guru && $announcement->id_guru == $ctx['id_guru'])
                || ($announcement->created_by_user_id == $ctx['user_id']);
            if (!$isOwner) {
                return response()->json(['message' => 'Guru hanya dapat menghapus pengumuman miliknya.'], 403);
            }
        } elseif ($role === 'admin') {
            if ($announcement->idkategori && $announcement->idkategori != $ctx['idkategori']) {
                return response()->json(['message' => 'Admin tidak dapat menghapus pengumuman instansi lain.'], 403);
            }
            if ($announcement->role === 'super_admin') {
                return response()->json(['message' => 'Admin tidak dapat menghapus pengumuman Super Admin.'], 403);
            }
        }

        $title = $announcement->title;
        $announcement->delete();

        AuditLog::record(
            'DELETE_ANNOUNCEMENT',
            'announcement',
            (string)$id,
            $title,
            ['deleted_by' => $ctx['user_name'], 'role' => $role],
            (string)$ctx['user_id'],
            $ctx['user_name'],
            $role,
            'Pengumuman',
            $ctx['instansi_name']
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil dihapus.',
        ]);
    }

    /**
     * Publish announcement immediately (status = Aktif).
     */
    public function publish($id, Request $request)
    {
        $announcement = Announcement::findOrFail($id);
        $ctx = $this->resolveUserContext($request);

        $announcement->update([
            'status' => 'Aktif',
            'is_active' => true,
            'publish_at' => now(),
        ]);

        AuditLog::record(
            'PUBLISH_ANNOUNCEMENT',
            'announcement',
            (string)$announcement->id,
            $announcement->title,
            ['action' => 'published', 'by' => $ctx['user_name']],
            (string)$ctx['user_id'],
            $ctx['user_name'],
            $ctx['role'],
            'Pengumuman',
            $ctx['instansi_name']
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil dipublikasikan.',
            'data' => $this->formatAnnouncementItem($announcement),
        ]);
    }

    /**
     * Archive announcement immediately (status = Arsip).
     */
    public function archive($id, Request $request)
    {
        $announcement = Announcement::findOrFail($id);
        $ctx = $this->resolveUserContext($request);

        $announcement->update([
            'status' => 'Arsip',
            'is_active' => false,
        ]);

        AuditLog::record(
            'ARCHIVE_ANNOUNCEMENT',
            'announcement',
            (string)$announcement->id,
            $announcement->title,
            ['action' => 'archived', 'by' => $ctx['user_name']],
            (string)$ctx['user_id'],
            $ctx['user_name'],
            $ctx['role'],
            'Pengumuman',
            $ctx['instansi_name']
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil diarsipkan.',
            'data' => $this->formatAnnouncementItem($announcement),
        ]);
    }

    /**
     * Format announcement item for frontends.
     */
    protected function formatAnnouncementItem(Announcement $item): array
    {
        $instansiName = 'Global (Semua Instansi)';
        if ($item->idkategori) {
            $inst = KategoriUserBo::find($item->idkategori);
            if ($inst) {
                $instansiName = $inst->nama_kategori;
            }
        }

        $targetLabel = 'Semua Siswa';
        if ($item->target_type === 'all') {
            $targetLabel = $item->idkategori ? 'Semua Siswa Sekolah' : 'Semua Instansi (Global)';
        } elseif ($item->target_type === 'class' && $item->target_id) {
            $classNames = MasterKelas::whereIn('id', explode(',', $item->target_id))->pluck('nama_kelas')->toArray();
            $targetLabel = !empty($classNames) ? 'Kelas: ' . implode(', ', $classNames) : 'Kelas: ' . $item->target_id;
        } elseif ($item->target_type === 'all_taught') {
            $targetLabel = 'Semua Kelas yang Diajar';
        }

        return [
            'id' => $item->id,
            'title' => $item->title,
            'content' => $item->content,
            'category' => $item->category,
            'category_label' => $item->category,
            'priority' => $item->priority ?: 'Normal',
            'status' => $item->status ?: 'Aktif',
            'badge_text' => $item->badge_text ?: $item->category,
            'attachment_url' => $item->attachment_url,
            'attachment_name' => $item->attachment_name,
            'target_type' => $item->target_type,
            'target_id' => $item->target_id,
            'target_label' => $targetLabel,
            'idkategori' => $item->idkategori,
            'instansi_name' => $instansiName,
            'is_global' => is_null($item->idkategori),
            'created_by' => $item->created_by,
            'sender_name' => $item->created_by,
            'sender_role' => match ($item->role) {
                'super_admin' => 'Super Admin',
                'admin' => 'Admin Instansi',
                'guru' => 'Guru',
                default => 'Admin'
            },
            'role' => $item->role,
            'id_guru' => $item->id_guru,
            'is_active' => (bool)$item->is_active,
            'publish_at' => $item->publish_at ? $item->publish_at->format('Y-m-d H:i') : null,
            'expired_at' => $item->expired_at ? $item->expired_at->format('Y-m-d H:i') : null,
            'created_at' => $item->created_at ? $item->created_at->format('Y-m-d H:i') : '',
            'created_at_human' => $item->created_at ? $item->created_at->diffForHumans() : '',
        ];
    }

    /**
     * Get array of class IDs allowed for a specific teacher.
     */
    protected function getTeacherAllowedClassIds(?int $idGuru): array
    {
        if (!$idGuru) return [];

        $taught = GuruMataPelajaran::where('iduser_bo', $idGuru)
            ->whereNotNull('idkelas')
            ->pluck('idkelas')
            ->map(fn($v) => (string)$v)
            ->toArray();

        $homeroom = MasterKelas::where('wali_kelas_id', $idGuru)
            ->pluck('id')
            ->map(fn($v) => (string)$v)
            ->toArray();

        return array_unique(array_merge($taught, $homeroom));
    }
}
