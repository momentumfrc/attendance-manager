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
        Schema::table('students', function (Blueprint $table) {
            $table->year('graduation_year')->nullable();
            $table->string('profile_photo')->nullable();

            $table->dropUnique('students_name_unique');
            $table->unique(['name', 'graduation_year'], 'students_name_year_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique('students_name_year_unique');
            $table->unique('name');

            $table->dropColumn(['graduation_year', 'profile_photo']);
        });
    }
};
