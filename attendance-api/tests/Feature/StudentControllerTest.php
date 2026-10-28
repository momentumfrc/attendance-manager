<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use App\Models\User;
use App\Models\Student;
use App\Models\AttendanceEvent;
use App\Models\RegistrationEvent;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

use Database\Seeders\RolesSeeder;

class StudentControllerTest extends TestCase
{

    use RefreshDatabase;

    private const NOT_REGISTERED = [
        'student_contract' => null,
        'shared_science' => null,
        'first_cr' => null
    ];

    private function makeRegistrationEvent(?Student $student, string $type, Carbon $date, User $user): RegistrationEvent {
        return RegistrationEvent::forceCreate([
            'student_id' => $student?->id,
            'registered_by' => $user->id,
            'event_type' => $type,
            'created_at' => $date,
            'updated_at' => $date
        ]);
    }

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
            $student->last_check_in = $student->attendanceEvents()->where('type', '=', config('enums.attendance_event_types')['CHECK_IN'])->orderBy('created_at', 'desc')->first();
            $student->last_check_out = $student->attendanceEvents()->where('type', '=', config('enums.attendance_event_types')['CHECK_OUT'])->orderBy('created_at', 'desc')->first();

            if($student->last_check_in !== null) {
                $student->last_check_in = $student->last_check_in->toArray();
            }

            if($student->last_check_out !== null) {
                $student->last_check_out = $student->last_check_out->toArray();
            }

            $student->registration = self::NOT_REGISTERED;
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
        $student->registration = self::NOT_REGISTERED;
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
            ->untrashed()
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
            ->untrashed()
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

    public function test_last_event_ignores_updated_at() {
        $this->seed(RolesSeeder::class);
        $user = User::first();

        $student = Student::factory()
            ->registeredBy($user)
            ->untrashed()
            ->create();

        $type = config('enums.attendance_event_types')['CHECK_IN'];

        $older = new AttendanceEvent;
        $older->student_id = $student->id;
        $older->registered_by = $user->id;
        $older->type = $type;
        $older->created_at = Carbon::now()->subHours(2);
        $older->save();

        $newer = new AttendanceEvent;
        $newer->student_id = $student->id;
        $newer->registered_by = $user->id;
        $newer->type = $type;
        $newer->created_at = Carbon::now()->subHour();
        $newer->save();

        // Deleting and restoring the older event bumps its updated_at past the newer one's
        $this->travel(1)->minutes();
        $older->delete();
        $older->restore();

        $this->actingAs($user)
            ->getJson('/api/students/'.$student->id)
            ->assertStatus(200)
            ->assertJsonPath('last_check_in.id', $newer->id);
    }

    public function test_registration_status() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $now = Carbon::now()->startOfSecond();

        [$registered, $partial, $unregistered] = Student::factory()
            ->registeredBy($user)
            ->untrashed()
            ->count(3)
            ->create();

        $contract = $this->makeRegistrationEvent($registered, 'student_contract', $now->copy()->subDays(3), $user);
        $ssci = $this->makeRegistrationEvent($registered, 'shared_science', $now->copy()->subDays(2), $user);
        $first = $this->makeRegistrationEvent($registered, 'first_cr', $now->copy()->subDays(1), $user);

        $partialContract = $this->makeRegistrationEvent($partial, 'student_contract', $now->copy()->subDays(2), $user);
        // Unchecking a box soft-deletes its event
        $this->makeRegistrationEvent($partial, 'first_cr', $now->copy()->subDays(1), $user)->delete();

        $response = $this->actingAs($user)->getJson('/api/students')->assertStatus(200);
        $byId = collect($response->json())->keyBy('id');

        $this->assertSame([
            'student_contract' => $contract->id,
            'shared_science' => $ssci->id,
            'first_cr' => $first->id
        ], $byId[$registered->id]['registration']);
        $this->assertSame([
            'student_contract' => $partialContract->id,
            'shared_science' => null,
            'first_cr' => null
        ], $byId[$partial->id]['registration']);
        $this->assertSame(self::NOT_REGISTERED, $byId[$unregistered->id]['registration']);

        $this->actingAs($user)->getJson('/api/students/'.$registered->id)
            ->assertStatus(200)
            ->assertJsonPath('registration.first_cr', $first->id);
    }

    public function test_new_season_clears_registration() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $now = Carbon::now()->startOfSecond();

        $student = Student::factory()->registeredBy($user)->untrashed()->create();

        $lastYear = $this->makeRegistrationEvent($student, 'student_contract', $now->copy()->subYear(), $user);
        $this->makeRegistrationEvent($student, 'shared_science', $now->copy()->subYear(), $user);
        $season = $this->makeRegistrationEvent(null, 'new_season', $now->copy()->subMonth(), $user);
        $thisYear = $this->makeRegistrationEvent($student, 'shared_science', $now->copy()->subWeek(), $user);

        $this->actingAs($user)->getJson('/api/students/'.$student->id)
            ->assertStatus(200)
            ->assertJsonPath('registration', [
                'student_contract' => null,
                'shared_science' => $thisYear->id,
                'first_cr' => null
            ]);

        // Undoing the reset brings back last season's status
        $season->delete();

        $this->actingAs($user)->getJson('/api/students/'.$student->id)
            ->assertStatus(200)
            ->assertJsonPath('registration', [
                'student_contract' => $lastYear->id,
                'shared_science' => $thisYear->id,
                'first_cr' => null
            ]);
    }

    public function test_new_season_uses_latest_season_and_breaks_ties_by_id() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $now = Carbon::now()->startOfSecond();

        $student = Student::factory()->registeredBy($user)->untrashed()->create();

        $this->makeRegistrationEvent(null, 'new_season', $now->copy()->subYear(), $user);
        // Created in the same second as the latest reset: the id decides which came first
        $this->makeRegistrationEvent($student, 'student_contract', $now, $user);
        $this->makeRegistrationEvent(null, 'new_season', $now, $user);
        $afterReset = $this->makeRegistrationEvent($student, 'first_cr', $now, $user);

        $this->actingAs($user)->getJson('/api/students/'.$student->id)
            ->assertStatus(200)
            ->assertJsonPath('registration', [
                'student_contract' => null,
                'shared_science' => null,
                'first_cr' => $afterReset->id
            ]);
    }

    public function test_registration_is_loaded_in_fixed_queries() {
        $this->seed(RolesSeeder::class);
        $user = User::first();

        $students = Student::factory()->registeredBy($user)->untrashed()->count(5)->create();
        foreach($students as $student) {
            $this->makeRegistrationEvent($student, 'student_contract', Carbon::now(), $user);
        }

        DB::enableQueryLog();
        $this->actingAs($user)->getJson('/api/students')->assertStatus(200);

        $registrationQueries = collect(DB::getQueryLog())->pluck('query')
            ->filter(fn($query) => str_contains($query, 'registration_events'));
        // One for the latest new season, one for every student's current events
        $this->assertCount(2, $registrationQueries);
    }
}
