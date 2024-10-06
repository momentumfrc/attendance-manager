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
        Schema::create('student_profile_images', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->string('path')->unique();
            $table->foreignId('student_id')->constrained('students')->onDelete('restrict');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('restrict');
        });

        Schema::table('students', function (Blueprint $table) {
            // I added a 'profile_photo' as part of the more_student_details migration
            // last year, in anticipation of this student images feature. However, upon further
            // reflection, a plain string column is not the best approach here (instead I'll use
            // a foreign key into a dedicated 'student_profile_images' table).
            $table->dropColumn(['profile_photo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('profile_photo')->nullable();
        });

        Schema::dropIfExists('student_profile_images');
    }
};
