<?php

namespace Tests\Feature\Migrations;

use App\Models\User;
use App\Models\Student;
use App\Models\StudentProfileImage;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Database\Seeders\RolesSeeder;

class MoveStudentProfileImagesToPrivateStorageTest extends TestCase {
    use RefreshDatabase;

    private function migration() {
        return require database_path('migrations/2026_10_26_000000_move_student_profile_images_to_private_storage.php');
    }

    private function makeImage(string $path): StudentProfileImage {
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();

        $image = new StudentProfileImage;
        $image->path = $path;
        $image->student_id = $student->id;
        $image->uploaded_by = $user->id;
        $image->save();

        return $image;
    }

    public function test_moves_images_out_of_public_storage_and_back() {
        Storage::fake();
        $this->seed(RolesSeeder::class);

        $image = $this->makeImage('public/student_profiles/abc.png');
        Storage::put('public/student_profiles/abc.png', 'image-bytes');

        $this->migration()->up();

        $this->assertSame('student_profiles/abc.png', $image->fresh()->path);
        Storage::assertMissing('public/student_profiles/abc.png');
        $this->assertSame('image-bytes', Storage::get('student_profiles/abc.png'));

        $this->migration()->down();

        $this->assertSame('public/student_profiles/abc.png', $image->fresh()->path);
        Storage::assertMissing('student_profiles/abc.png');
        $this->assertSame('image-bytes', Storage::get('public/student_profiles/abc.png'));
    }

    public function test_moves_dangling_files_and_rows() {
        Storage::fake();
        $this->seed(RolesSeeder::class);

        // a row whose file is missing, and a file with no row
        $image = $this->makeImage('public/student_profiles/missing.png');
        Storage::put('public/student_profiles/orphan.png', 'orphan-bytes');

        $this->migration()->up();

        $this->assertSame('student_profiles/missing.png', $image->fresh()->path);
        $this->assertSame('orphan-bytes', Storage::get('student_profiles/orphan.png'));
        $this->assertSame([], Storage::files('public/student_profiles'));
    }
}
