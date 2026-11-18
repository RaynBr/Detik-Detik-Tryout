<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. ROLES TABLE
        if (!Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->string('name', 50); // slug: e.g. super_admin, admin_instansi, guru, siswa
                $table->string('label', 100);
                // Matched exact length, charset, and collation of kategori_user_bo.idkategori (latin1_swedish_ci)
                $table->string('instansi_id', 25)
                    ->charset('latin1')
                    ->collation('latin1_swedish_ci')
                    ->nullable()
                    ->index(); // NULL = Platform / Global Role

                // Deterministic stored generated column for robust multi-tenant unique indexing in MySQL
                $table->string('scope_key', 50)->storedAs("COALESCE(instansi_id, 'GLOBAL')");
                $table->boolean('is_system')->default(false);
                $table->timestamps();

                $table->unique(['name', 'scope_key'], 'uk_role_name_scope');
                
                // Foreign key with RESTRICT (required by MySQL when referenced column is part of a generated column)
                $table->foreign('instansi_id')
                    ->references('idkategori')
                    ->on('kategori_user_bo')
                    ->onDelete('restrict')
                    ->onUpdate('restrict');
            });
        }

        // 2. PERMISSIONS TABLE
        if (!Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->string('key', 100)->unique(); // format: modul.aksi (e.g. siswa.create)
                $table->string('label', 150);
                $table->string('module', 100)->index();
                $table->enum('scope', ['platform', 'instansi'])->index();
                $table->timestamps();
            });
        }

        // 3. ROLE_PERMISSIONS PIVOT TABLE
        if (!Schema::hasTable('role_permissions')) {
            Schema::create('role_permissions', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->unsignedBigInteger('role_id');
                $table->unsignedBigInteger('permission_id');

                $table->primary(['role_id', 'permission_id']);
                $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
                $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            });
        }

        // 4. USER_ROLES PIVOT TABLE (Polymorphic: supports UserBo, UserSiswa, User)
        if (!Schema::hasTable('user_roles')) {
            Schema::create('user_roles', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->string('user_type', 50); // e.g. App\Models\UserBo or App\Models\UserSiswa
                $table->string('user_id', 50);
                $table->unsignedBigInteger('role_id');
                $table->timestamps();

                $table->primary(['user_type', 'user_id', 'role_id']);
                $table->index(['user_type', 'user_id'], 'idx_user_type_id');
                $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            });
        }

        // 5. MENUS TABLE
        if (!Schema::hasTable('menus')) {
            Schema::create('menus', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->bigIncrements('id');
                $table->string('label', 100);
                $table->string('icon', 50); // Lucide icon identifier
                $table->string('path', 255);
                $table->unsignedBigInteger('parent_id')->nullable();
                $table->string('permission_key', 100)->nullable()->index();
                $table->enum('scope', ['platform', 'instansi'])->default('instansi')->index();
                $table->integer('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('parent_id')->references('id')->on('menus')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menus');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};

