<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'name',
        'start_time',
        'end_time',
        'token',
        'max_participants',
        'class_ids',
        'student_ids',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'class_ids' => 'array',
        'student_ids' => 'array',
    ];

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class, 'exam_id', 'idassessment');
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Assessment::class, 'exam_id', 'idassessment');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'exam_group_students', 'exam_group_id', 'student_id')
            ->withTimestamps();
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(AssessmentJawabanPilgan::class, 'idassessment', 'exam_id');
    }
}
