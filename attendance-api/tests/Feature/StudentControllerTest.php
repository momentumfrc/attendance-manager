<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use App\Models\User;
use App\Models\Student;
use App\Models\AttendanceEvent;

use Database\Seeders\RolesSeeder;

class StudentControllerTest extends TestCase
{

    use RefreshDatabase;

    public function test_index() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()->count(5)->CREATE([
            'registered_by' => $user->id
        ]);
        $this->assertDatabaseCount('students', 5);

        $event1 = new AttendanceEvent;
        $event1->student_id = $students[0]->id;
        $event1->registered_by = $user->id;
        $event1->type = config('enums.attendance_event_types')['CHECK_IN'];
        $event1->save();
        $this->assertDatabaseCount('attendance_events', 1);

        $response = $this->actingAs($user)->getJson('/api/students');
        $response->assertStatus(200);

        $response->assertExactJson($students->toArray());
    }

    public function test_store() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $this->assertDatabaseCount('students', 0);

        $response = $this->actingAs($user)->postJson('/api/students', []);
        $response->assertStatus(422);
        $this->assertDatabaseCount('students', 0);

        $response = $this->actingAs($user)->postJson('/api/students', [
            'name' => ''
        ]);
        $response->assertStatus(422);
        $this->assertDatabaseCount('students', 0);

        $response = $this->actingAs($user)->postJson('/api/students', [
            'name' => 'Foo Bar'
        ]);
        $response->assertStatus(422);
        $this->assertDatabaseCount('students', 0);

        $response = $this->actingAs($user)->postJson('/api/students', [
            'action' => 'create',
            'name' => 'Foo Bar'
        ]);
        $response->assertStatus(201);

        $this->assertDatabaseCount('students', 1);
        $createdStudent = Student::first();
        $this->assertSame($createdStudent->name, 'Foo Bar');
        $response->assertExactJson($createdStudent->toArray());

        $response = $this->actingAs($user)->postJson('/api/students', [
            'action' => 'create',
            'name' => 'Foo Bar'
        ]);
        $response->assertStatus(422);
        $this->assertDatabaseCount('students', 1);
    }

    public function test_show() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()->count(5)->CREATE([
            'registered_by' => $user->id
        ]);
        $this->assertDatabaseCount('students', 5);

        $student = $students[2];
        $response = $this->actingAs($user)->getJson('/api/students/'.$student->id);

        $response->assertStatus(200);
        $response->assertExactJson($student->toArray());
    }

    public function test_update() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()->count(5)->CREATE([
            'registered_by' => $user->id
        ]);
        $this->assertDatabaseCount('students', 5);

        $student = $students[2];

        // Missing required name
        $response = $this->actingAs($user)->putJson('/api/students/'.$student->id, []);
        $response->assertStatus(422);
        $this->assertSame(Student::find($student->id)->name, $student->name);
        $this->assertDatabaseCount('students', 5);

        $response = $this->actingAs($user)->putJson('/api/students/'.$student->id, [
            'name' => ''
        ]);
        $response->assertStatus(422);
        $this->assertSame(Student::find($student->id)->name, $student->name);
        $this->assertDatabaseCount('students', 5);

        // NOOP: Update with same name as before
        $response = $this->actingAs($user)->putJson('/api/students/'.$student->id, [
            'name' => $student->name
        ]);
        $response->assertStatus(200);
        $this->assertSame(Student::find($student->id)->name, $student->name);
        $this->assertDatabaseCount('students', 5);

        // Update name to new value
        $response = $this->actingAs($user)->putJson('/api/students/'.$student->id, [
            'name' => 'Foo Bar'
        ]);
        $response->assertStatus(200);
        $this->assertNotSame(Student::find($student->id)->name, $student->name);
        $this->assertSame(Student::find($student->id)->name, 'Foo Bar');
        $this->assertDatabaseCount('students', 5);

        // Update name to same as other student
        $response = $this->actingAs($user)->putJson('/api/students/'.$student->id, [
            'name' => $students[0]->name
        ]);
        $response->assertStatus(422);
        $this->assertSame(Student::find($student->id)->name, 'Foo Bar');
        $this->assertDatabaseCount('students', 5);
    }

    public function test_destroy() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()->count(5)->CREATE([
            'registered_by' => $user->id
        ]);
        $this->assertDatabaseCount('students', 5);

        $student = $students[3];

        $response = $this->actingAs($user)->delete('/api/students/'.$student->id);
        $response->assertStatus(200);
        $this->assertDatabaseCount('students', 5);
        $this->assertSoftDeleted($student);
    }
}
