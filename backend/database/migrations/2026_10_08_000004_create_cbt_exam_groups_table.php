<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('exam_groups')) {
            Schema::create('exam_groups', function (Blueprint $table) {
                $table->id();
                $table->string('exam_id', 50)->index(); // idassessment
                $table->string('name');
                $table->dateTime('start_time')->nullable();
                $table->dateTime('end_time')->nullable();
                $table->string('token', 20)->nullable();
                $table->integer('max_participants')->nullable()->default(100);
                $table->text('class_ids')->nullable(); // JSON array
                $table->text('student_ids')->nullable(); // JSON array
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_groups');
    }
};
