<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Student;
use App\Models\StudentProfileImage;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Database\Seeders\RolesSeeder;
use Illuminate\Http\UploadedFile;

class StudentProfileImageControllerTest extends TestCase {
    use RefreshDatabase;

    public function test_upload() {
        Storage::fake();
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

        $path = StudentProfileImage::findOrFail($response['id'])->path;

        // Images must not be stored on the public disk, where the webserver would serve them without authentication
        $this->assertStringStartsWith('student_profiles/', $path);
        Storage::assertExists($path);
    }

    private function makeStudent(User $user): Student {
        return Student::factory()->registeredBy($user)->untrashed()->create();
    }

    private function userWithRole(string $role): User {
        $user = User::factory()->create();
        $user->syncRoles([$role]);
        return $user;
    }

    private function upload(User $user, Student $student, ?UploadedFile $file = null) {
        return $this->actingAs($user)->postJson('/api/student-profile-images', [
            'student_id' => $student->id,
            'image' => $file ?? UploadedFile::fake()->image('avatar.jpg')
        ]);
    }

    public function test_store_response_hides_path() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = $this->makeStudent($user);

        $response = $this->upload($user, $student)->assertStatus(201);

        $response->assertJsonMissingPath('path');
        $response->assertJsonMissingPath('basename');
        $response->assertJson(['student_id' => $student->id, 'uploaded_by' => $user->id]);
        $this->assertDatabaseCount('student_profile_images', 1);
        $path = StudentProfileImage::findOrFail($response['id'])->path;
        $this->assertStringEndsWith('.png', $path);
        Storage::assertExists($path);
    }

    public function test_store_rejects_second_image_for_student() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = $this->makeStudent($user);

        $this->upload($user, $student)->assertStatus(201);
        $this->upload($user, $student)
            ->assertStatus(422)
            ->assertJsonValidationErrors('student_id');

        $this->assertDatabaseCount('student_profile_images', 1);
    }

    public function test_store_validation() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = $this->makeStudent($user);
        $deleted = Student::factory()->registeredBy($user)->create(['deleted_at' => now()]);

        // missing fields
        $this->actingAs($user)->postJson('/api/student-profile-images', [])
            ->assertStatus(422)->assertJsonValidationErrors(['student_id', 'image']);

        // unknown and soft-deleted students
        $this->actingAs($user)->postJson('/api/student-profile-images', [
            'student_id' => 9999, 'image' => UploadedFile::fake()->image('a.jpg')
        ])->assertStatus(422)->assertJsonValidationErrors('student_id');
        $this->upload($user, $deleted)->assertStatus(422)->assertJsonValidationErrors('student_id');

        // not an image
        $this->upload($user, $student, UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf'))
            ->assertStatus(422)->assertJsonValidationErrors('image');

        // unsupported image type
        $this->upload($user, $student, UploadedFile::fake()->image('anim.gif'))
            ->assertStatus(422)->assertJsonValidationErrors('image');

        // larger than 1024 KB
        $this->upload($user, $student, UploadedFile::fake()->image('big.jpg')->size(2048))
            ->assertStatus(422)->assertJsonValidationErrors('image');

        $this->assertDatabaseCount('student_profile_images', 0);
    }

    public function test_show() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = $this->makeStudent($user);
        $id = $this->upload($user, $student)->assertStatus(201)['id'];

        $response = $this->actingAs($user)->getJson('/api/student-profile-images/'.$id)->assertStatus(200);
        $response->assertJson(['id' => $id, 'student_id' => $student->id]);
        $response->assertJsonMissingPath('path');

        $this->actingAs($user)->getJson('/api/student-profile-images/9999')->assertStatus(404);
    }

    public function test_index_returns_image_data() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $first = $this->makeStudent($user);
        $second = $this->makeStudent($user);
        $firstId = $this->upload($user, $first)->assertStatus(201)['id'];
        $secondId = $this->upload($user, $second)->assertStatus(201)['id'];

        $response = $this->actingAs($user)->getJson('/api/student-profile-images')->assertStatus(200);

        $response->assertJsonCount(2);
        $response->assertJsonMissingPath('0.path');
        $response->assertJson([
            ['id' => $firstId, 'student_id' => $first->id],
            ['id' => $secondId, 'student_id' => $second->id],
        ]);
        foreach([0 => $firstId, 1 => $secondId] as $index => $id) {
            $this->assertSame(
                Storage::get(StudentProfileImage::findOrFail($id)->path),
                base64_decode($response[$index]['data'], true)
            );
        }
    }

    public function test_index_filters_by_ids() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $ids = collect(range(1, 3))
            ->map(fn () => $this->upload($user, $this->makeStudent($user))->assertStatus(201)['id']);

        $this->actingAs($user)->getJson('/api/student-profile-images?ids='.$ids[0].','.$ids[2])
            ->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $ids[0])
            ->assertJsonPath('1.id', $ids[2]);

        // unknown ids are ignored
        $this->actingAs($user)->getJson('/api/student-profile-images?ids=9999')
            ->assertStatus(200)
            ->assertJsonCount(0);

        foreach(['abc', '1,,2', '1,a', ''] as $invalid) {
            $this->actingAs($user)->getJson('/api/student-profile-images?ids='.$invalid)
                ->assertStatus(422)
                ->assertJsonValidationErrors('ids');
        }
    }

    public function test_index_skips_images_missing_from_disk() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $kept = $this->upload($user, $this->makeStudent($user))->assertStatus(201)['id'];
        $lost = $this->upload($user, $this->makeStudent($user))->assertStatus(201)['id'];
        Storage::delete(StudentProfileImage::findOrFail($lost)->path);

        $this->actingAs($user)->getJson('/api/student-profile-images')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $kept);
    }

    public function test_index_etag() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $this->upload($user, $this->makeStudent($user))->assertStatus(201);

        $first = $this->actingAs($user)->getJson('/api/student-profile-images')->assertStatus(200);
        $etag = $first->headers->get('ETag');
        $this->assertNotEmpty($etag);
        $this->assertStringContainsString('private', $first->headers->get('Cache-Control'));

        // unchanged images are not sent again
        $this->actingAs($user)
            ->getJson('/api/student-profile-images', ['If-None-Match' => $etag])
            ->assertStatus(304)
            ->assertContent('');

        // a different filter is a different resource
        $this->actingAs($user)
            ->getJson('/api/student-profile-images?ids=1', ['If-None-Match' => $etag])
            ->assertStatus(200);

        // a new upload changes the etag
        $this->upload($user, $this->makeStudent($user))->assertStatus(201);
        $changed = $this->actingAs($user)
            ->getJson('/api/student-profile-images', ['If-None-Match' => $etag])
            ->assertStatus(200)
            ->assertJsonCount(2);
        $this->assertNotEquals($etag, $changed->headers->get('ETag'));
    }

    public function test_destroy_removes_file_and_row() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = $this->makeStudent($user);
        $created = $this->upload($user, $student)->assertStatus(201);
        $path = StudentProfileImage::findOrFail($created['id'])->path;
        Storage::assertExists($path);

        $this->actingAs($user)->deleteJson('/api/student-profile-images/'.$created['id'])
            ->assertStatus(200)
            ->assertJson(['status' => 'ok']);

        Storage::assertMissing($path);
        $this->assertDatabaseCount('student_profile_images', 0);

        // The student can upload a new image afterwards
        $this->upload($user, $student)->assertStatus(201);

        $this->actingAs($user)->deleteJson('/api/student-profile-images/9999')->assertStatus(404);
    }

    public function test_permissions() {
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $admin = User::first();
        $student = $this->makeStudent($admin);
        $created = $this->upload($admin, $student)->assertStatus(201);

        // read-only users may view images, but not change them
        $readOnly = $this->userWithRole('read-only');
        $this->actingAs($readOnly)->getJson('/api/student-profile-images/'.$created['id'])->assertStatus(200);
        $this->actingAs($readOnly)->getJson('/api/student-profile-images')->assertStatus(200)->assertJsonCount(1);
        $this->upload($readOnly, $this->makeStudent($admin))->assertStatus(403);
        $this->actingAs($readOnly)->deleteJson('/api/student-profile-images/'.$created['id'])->assertStatus(403);
        $this->assertDatabaseCount('student_profile_images', 1);

        // users without any role cannot view them
        $noRole = User::factory()->create();
        $noRole->syncRoles([]);
        $this->actingAs($noRole)->getJson('/api/student-profile-images/'.$created['id'])->assertStatus(403);
        $this->actingAs($noRole)->getJson('/api/student-profile-images')->assertStatus(403);
    }

    public function test_index_requires_authentication() {
        $this->getJson('/api/student-profile-images')->assertStatus(401);
    }
}
