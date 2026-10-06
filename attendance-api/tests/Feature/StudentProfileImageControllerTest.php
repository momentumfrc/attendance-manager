<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Student;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Database\Seeders\RolesSeeder;
use Illuminate\Http\UploadedFile;

class StudentProfileImageControllerTest extends TestCase {
    use RefreshDatabase;

    public function test_upload() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $student = Student::factory()
            ->registeredBy($user)
            ->untrashed()
            ->create();

        $this->assertDatabaseCount('students', 1);

        $file = UploadedFile::fake()->image("avatar.jpg");
        $response = $this->actingAs($user)->post('/api/student-profile-images', [
            'student_id' => $student->id,
            'image' => $file
        ]);
        $response->assertStatus(201);

        $path = 'public/student_profiles/'.$response->getData()->basename;

        Storage::assertExists($path);
        Storage::delete($path);
    }
}
