<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Get active announcements for student.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $idkategori = $user ? $user->idkategori : null;

        $announcements = Announcement::where('is_active', true)
            ->where(function ($q) {
                $q->where('target_role', 'all')
                  ->orWhere('target_role', 'siswa');
            })
            ->where(function ($q) use ($idkategori) {
                $q->whereNull('idkategori');
                if ($idkategori) {
                    $q->orWhere('idkategori', $idkategori);
                }
            })
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $announcements,
        ]);
    }
}

