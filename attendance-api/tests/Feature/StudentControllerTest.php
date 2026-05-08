<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use App\Models\User;
use App\Models\Student;
use App\Models\AttendanceEvent;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class StudentControllerTest extends TestCase
{

    use RefreshDatabase;

    public function test_index() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()
            ->registeredBy($user)
            ->count(5)
            ->create();

        $this->assertDatabaseCount('students', 5);

        $event1 = new AttendanceEvent;
        $event1->student_id = $students[0]->id;
        $event1->registered_by = $user->id;
        $event1->type = config('enums.attendance_event_types')['CHECK_IN'];
        $event1->save();
        $this->assertDatabaseCount('attendance_events', 1);

        foreach($students as $student) {
            $student->profile_image = null;
            $student->last_check_in = $student->attendanceEvents()->where('type', '=', config('enums.attendance_event_types')['CHECK_IN'])->orderBy('updated_at', 'desc')->first();
            $student->last_check_out = $student->attendanceEvents()->where('type', '=', config('enums.attendance_event_types')['CHECK_OUT'])->orderBy('updated_at', 'desc')->first();

            if($student->last_check_in !== null) {
                $student->last_check_in = $student->last_check_in->toArray();
            }

            if($student->last_check_out !== null) {
                $student->last_check_out = $student->last_check_out->toArray();
            }
        }

        $nonDeletedStudents = $students->where('deleted_at', null)->values();

        $response = $this->actingAs($user)->getJson('/api/students');
        $response->assertStatus(200);
        $response->assertSimilarJson($nonDeletedStudents->toArray());

        $response = $this->actingAs($user)->getJson('/api/students?includeDeleted=1');
        $response->assertStatus(200);
        $response->assertSimilarJson($students->toArray());
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
        $createdStudent = Student::without("profileImage")->first();
        $this->assertSame($createdStudent->name, 'Foo Bar');
        $response->assertSimilarJson($createdStudent->toArray());

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

        $students = Student::factory()
            ->registeredBy($user)
            ->count(5)
            ->create();
        $this->assertDatabaseCount('students', 5);

        $student = $students[2];
        $student->profile_image = null;
        $student->last_check_in = null;
        $student->last_check_out = null;
        $response = $this->actingAs($user)->getJson('/api/students/'.$student->id);

        $response->assertStatus(200);
        $response->assertSimilarJson($student->toArray());
    }

    public function test_update() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()
            ->registeredBy($user)
            ->count(5)
            ->create();
        $this->assertDatabaseCount('students', 5);

        $student = $students[2];

        if($student->trashed()) {
            $student->restore();
        }

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

        // Update name/year to same as other student
        $response = $this->actingAs($user)->putJson('/api/students/'.$student->id, [
            'name' => $students[0]->name,
            'graduation_year' => $students[0]->graduation_year
        ]);
        $response->assertStatus(422);
        $this->assertSame(Student::find($student->id)->name, 'Foo Bar');
        $this->assertDatabaseCount('students', 5);
    }

    public function test_destroy() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()
            ->registeredBy($user)
            ->count(5)
            ->create();
        $this->assertDatabaseCount('students', 5);

        $student = $students[3];
        $this->assertNotSoftDeleted($student);

        $response = $this->actingAs($user)->delete('/api/students/'.$student->id);
        $response->assertStatus(200);
        $this->assertDatabaseCount('students', 5);
        $this->assertSoftDeleted($student);

        $response = $this->actingAs($user)->delete('/api/students/'.$student->id);
        $response->assertStatus(404);
        $this->assertDatabaseCount('students', 5);
        $this->assertSoftDeleted($student);
    }

    public function test_last_event() {
        // GIVEN
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $students = Student::factory()
            ->registeredBy($user)
            ->count(5)
            ->create();
        $this->assertDatabaseCount('students', 5);
        $this->assertDatabaseCount('attendance_events', 0);

        $student = $students[0];

        $checkin_ids = array();

        foreach($students as $student) {
            $this->actingAs($user)
                ->getJson('/api/students/'.$student->id)
                ->assertStatus(200)
                ->assertJson([
                    'last_check_in' => null,
                    'last_check_out' => null
                ]);

            // WHEN
            $response = $this->actingAs($user)->json('POST', '/api/attendance/events', [
                'type' => 'check-in',
                'student_id' => $student->id
            ]);

            $now = Carbon::now();

            // THEN
            $response->assertStatus(201)->assertJson([
                'type' => 'check-in',
                'student_id' => $student->id,
            ])->assertJsonMissingPath('deleted_at');
            $checkin_id = $response['id'];

            $response = $this->actingAs($user)
                ->getJson('/api/attendance/events/' . $checkin_id)
                ->assertStatus(200)
                ->assertJson([
                    'id' => $checkin_id,
                    'type' => 'check-in',
                    'registered_by' => $user->id,
                    'student_id' => $student->id,
                    'deleted_at' => null
                ]);

            $this->assertLessThan(5, $now->diffInSeconds(Carbon::parse($response['created_at']), true));
            $this->assertLessThan(5, $now->diffInSeconds(Carbon::parse($response['updated_at']), true));

            $this->actingAs($user)
                ->getJson('/api/students/'.$student->id)
                ->assertStatus(200)
                ->assertJson([
                    'last_check_in' => [
                        'id' => $checkin_id,
                        'type' => 'check-in',
                        'registered_by' => $user->id,
                        'student_id' => $student->id,
                        'deleted_at' => null
                    ]
                ]);

            $checkin_ids[$student->id] = $checkin_id;
        }

        $this->assertDatabaseCount('attendance_events', $students->count());

        foreach($students as $student) {
            $checkin_id = $checkin_ids[$student->id];

            $this->actingAs($user)
                ->getJson('/api/attendance/events/' . $checkin_id)
                ->assertStatus(200)
                ->assertJson([
                    'id' => $checkin_id,
                    'type' => 'check-in',
                    'registered_by' => $user->id,
                    'student_id' => $student->id,
                    'deleted_at' => null
                ]);

            $this->actingAs($user)
                ->getJson('/api/students/'.$student->id)
                ->assertStatus(200)
                ->assertJson([
                    'last_check_in' => [
                        'id' => $checkin_id,
                        'type' => 'check-in',
                        'registered_by' => $user->id,
                        'student_id' => $student->id,
                        'deleted_at' => null
                    ]
                ]);
        }
    }
}
