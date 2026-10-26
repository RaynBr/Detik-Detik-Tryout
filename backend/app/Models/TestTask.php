<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestTask extends Model
{
    use HasFactory;

    protected $table = 'test_tasks';

    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'created_by',
        'creator_name',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
