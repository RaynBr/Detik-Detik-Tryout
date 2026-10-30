<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Major;
use Illuminate\Http\Request;

class MajorController extends Controller
{
    public function index(Request $request)
    {
        $query = Major::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('name', 'LIKE', "%{$s}%")->orWhere('code', 'LIKE', "%{$s}%");
        }

        if ($request->boolean('all') || $request->input('per_page') === 'all') {
            $items = $query->orderBy('name', 'asc')->get();
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
        $paginator = $query->orderBy('name', 'asc')->paginate($perPage);

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:majors,code',
        ]);

        $major = Major::create($validated);

        return response()->json([
            'message' => 'Jurusan berhasil dibuat.',
            'data' => $major
        ], 201);
    }

    public function show(Major $major)
    {
        return response()->json($major);
    }

    public function update(Request $request, Major $major)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:majors,code,' . $major->id,
        ]);

        $major->update($validated);

        return response()->json([
            'message' => 'Jurusan berhasil diperbarui.',
            'data' => $major
        ]);
    }

    public function destroy(Major $major)
    {
        $major->delete();

        return response()->json([
            'message' => 'Jurusan berhasil dihapus.'
        ]);
    }
}
