<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use App\Models\User;
use App\Models\Student;

use Database\Seeders\RolesSeeder;

class StudentControllerTest extends TestCase
{

    use RefreshDatabase;

    public function test_index()
    {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()->count(5)->CREATE([
            'registered_by' => $user->id
        ]);
        $this->assertDatabaseCount('students', 5);

        $response = $this->actingAs($user)->getJson('/api/students');
        $response->assertStatus(200);
        $response->assertExactJson($students->toArray());
    }
}
