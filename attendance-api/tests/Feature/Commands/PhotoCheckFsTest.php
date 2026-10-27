<?php

namespace Tests\Feature\Commands;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

use App\Models\Student;
use App\Models\StudentProfileImage;
use App\Models\User;

use Database\Seeders\RolesSeeder;

class PhotoCheckFsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void {
        parent::setUp();
        Storage::fake();
        $this->seed(RolesSeeder::class);
        $this->admin = User::first();
    }

    private function makeImage(string $path): StudentProfileImage {
        $student = Student::factory()->registeredBy($this->admin)->untrashed()->create();

        $image = new StudentProfileImage;
        $image->path = $path;
        $image->student_id = $student->id;
        $image->uploaded_by = $this->admin->id;
        $image->save();

        return $image;
    }

    private function putImage(string $path, string $name, int $size): void {
        Storage::put($path, UploadedFile::fake()->image($name, $size, $size)->getContent());
    }

    public function test_reformats_oversized_images() {
        $resolution = config('config.profile_image_resolution');
        $image = $this->makeImage('student_profiles/big.jpg');
        $this->putImage('student_profiles/big.jpg', 'big.jpg', $resolution * 2);

        $this->artisan('app:photo-check-fs', ['--no-confirm' => true])->assertSuccessful();

        $newPath = $image->fresh()->path;
        $this->assertNotEquals('student_profiles/big.jpg', $newPath);
        $this->assertStringStartsWith('student_profiles/', $newPath);
        Storage::assertExists($newPath);
        [$width, $height] = getimagesize(Storage::path($newPath));
        $this->assertSame([$resolution, $resolution], [$width, $height]);
        $this->assertSame('image/png', Storage::mimeType($newPath));

        // a single run leaves nothing behind for the next run to clean up
        Storage::assertMissing('student_profiles/big.jpg');
        $this->assertSame([$newPath], Storage::files('student_profiles'));
    }

    public function test_leaves_valid_images_alone() {
        $resolution = config('config.profile_image_resolution');
        $image = $this->makeImage('student_profiles/ok.png');
        $this->putImage('student_profiles/ok.png', 'ok.png', $resolution);

        $this->artisan('app:photo-check-fs', ['--no-confirm' => true])->assertSuccessful();

        $this->assertSame('student_profiles/ok.png', $image->fresh()->path);
    }

    public function test_dry_run_changes_nothing() {
        $resolution = config('config.profile_image_resolution');
        $image = $this->makeImage('student_profiles/big.jpg');
        $this->putImage('student_profiles/big.jpg', 'big.jpg', $resolution * 2);
        $this->makeImage('student_profiles/missing.png');
        $this->putImage('student_profiles/orphan.png', 'orphan.png', $resolution);

        $this->artisan('app:photo-check-fs', ['--dry-run' => true])->assertSuccessful();

        $this->assertSame('student_profiles/big.jpg', $image->fresh()->path);
        $this->assertDatabaseCount('student_profile_images', 2);
        Storage::assertExists('student_profiles/orphan.png');
    }

    public function test_cleans_up_dangling_files_and_models() {
        $resolution = config('config.profile_image_resolution');
        $kept = $this->makeImage('student_profiles/ok.png');
        $this->putImage('student_profiles/ok.png', 'ok.png', $resolution);
        $missing = $this->makeImage('student_profiles/missing.png');
        $this->putImage('student_profiles/orphan.png', 'orphan.png', $resolution);

        $this->artisan('app:photo-check-fs', ['--no-confirm' => true])->assertSuccessful();

        $this->assertNotNull($kept->fresh());
        $this->assertNull($missing->fresh());
        Storage::assertMissing('student_profiles/orphan.png');
        Storage::assertExists('student_profiles/ok.png');
    }
}
