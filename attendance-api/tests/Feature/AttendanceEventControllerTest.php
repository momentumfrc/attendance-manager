<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

use App\Models\User;
use App\Models\Student;
use App\Models\AttendanceEvent;
use App\Models\RegistrationEvent;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class AttendanceEventControllerTest extends TestCase
{
    use DatabaseMigrations;

    public function test_index_validation() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();
        $students = Student::factory()
            ->registeredBy($user)
            ->count(2)
            ->has(AttendanceEvent::factory()->count(4))
            ->create();
        $this->assertDatabaseCount('students', 2);
        $this->assertDatabaseCount('attendance_events', 8);

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['student_id' => 4])->assertStatus(422);
        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['since' => '01-01-2023'])->assertStatus(422);
        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['limit' => '0'])->assertStatus(422);
        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['type' => 'invalid-type'])->assertStatus(422);
    }

    public function test_index_response() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();
        $students = Student::factory()
            ->registeredBy($user)
            ->count(2)
            ->has(AttendanceEvent::factory()->count(4))
            ->create();
        $this->assertDatabaseCount('students', 2);
        $this->assertDatabaseCount('attendance_events', 8);

        $events = $students->pluck('attendanceEvents')->flatten()->sortByDesc('created_at')->values();
        $this->assertCount(8, $events);

        $response = $this->actingAs($user)->getJson('/api/attendance/events');
        $response->assertSimilarJson($events->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['student_id' => $students[0]->id]);
        $response->assertSimilarJson($events->filter(fn($event) => $event->student_id == $students[0]->id)->values()->toArray());

        $since = $events->pluck('created_at')->random();
        $until = $events->pluck('created_at')->random();

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['since' => $since->timestamp]);
        $response->assertSimilarJson($events->filter(fn($event) => $event->created_at->greaterThanOrEqualTo($since))->values()->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['until' => $since->timestamp]);
        $response->assertSimilarJson($events->filter(fn($event) => $event->created_at->lessThanOrEqualTo($since))->values()->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['type' => 'check-in']);
        $response->assertSimilarJson($events->filter(fn($event) => $event->type == 'check-in')->values()->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['limit' => '2']);
        $response->assertSimilarJson($events->take(2)->values()->toArray());
    }

    public function test_simultaneous_events() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $student = Student::factory()
            ->registeredBy($user)
            ->untrashed()
            ->count(1)
            ->CREATE()[0];

        Config::set('config.simultaneous_interval', 60);
        $this->signContract($student);

        $event = new AttendanceEvent();
        $event->type = 'check-out';
        $event->created_at = Carbon::now()->subSeconds(120);
        $event->student_id = $student->id;
        $event->registered_by = $user->id;
        $event->save();

        $this->assertDatabaseCount('attendance_events', 1);

        // check-in works when no other recent check-in
        $response = $this->actingAs($user)->postJson('/api/attendance/events', [
            'type' => 'check-in',
            'student_id' => $student->id
        ]);
        $response->assertStatus(201)->assertJson([
            'type' => 'check-in',
            'student_id' => $student->id
        ])->assertJsonMissingPath('deleted_at');
        $checkin_id = $response['id'];

        $this->assertDatabaseCount('attendance_events', 2);
        $this->assertNull(AttendanceEvent::findOrFail($checkin_id)->deleted_at);

        // check-in rejected when recent check-in exists
        $this->actingAs($user)
            ->json('POST', '/api/attendance/events', [
                'type' => 'check-in',
                'student_id' => $student->id
            ])
            ->assertStatus(422)
            ->assertJson([
                'message'=> 'A recent check-in already exists for this student.'
            ])->assertJsonMissingPath('deleted_at');

        // check-out cancels recent check-in
        $response = $this->actingAs($user)
            ->json('POST', '/api/attendance/events', [
                'type' => 'check-out',
                'student_id' => $student->id
            ]);
        $response->assertStatus(201)
            ->assertJson([
                'type' => 'check-out',
                'student_id' => $student->id
            ]);
        $this->assertLessThan(5, Carbon::now()->diffInSeconds(Carbon::parse($response['deleted_at']), true));
        $checkout_id = $response['id'];

        $this->assertDatabaseCount('attendance_events', 3);
        $this->assertTrue(AttendanceEvent::withTrashed()->findOrFail($checkin_id)->trashed());
        $this->assertTrue(AttendanceEvent::withTrashed()->findOrFail($checkout_id)->trashed());
    }

    public function test_store_rejects_soft_deleted_student() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();

        $student = Student::factory()
            ->registeredBy($user)
            ->count(1)
            ->create(['deleted_at' => Carbon::now()])[0];
        $this->assertSoftDeleted($student);

        $this->actingAs($user)
            ->json('POST', '/api/attendance/events', [
                'type' => 'check-in',
                'student_id' => $student->id
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('student_id');

        $this->assertDatabaseCount('attendance_events', 0);
    }

    private function userWithRole(string $role): User {
        $user = User::factory()->create();
        $user->syncRoles([$role]);
        return $user;
    }

    /** Students can only be checked in once they've signed the contract. */
    private function signContract(Student $student, ?Carbon $date = null): RegistrationEvent {
        return $this->makeRegistrationEvent($student, 'student_contract', $date);
    }

    private function makeRegistrationEvent(?Student $student, string $type, ?Carbon $date = null): RegistrationEvent {
        $date ??= Carbon::now()->subDay();
        return RegistrationEvent::forceCreate([
            'student_id' => $student?->id,
            'registered_by' => User::first()->id,
            'event_type' => $type,
            'created_at' => $date,
            'updated_at' => $date
        ]);
    }

    public function test_registration_requirement_blocks_partially_registered_check_in() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $checkIn = ['type' => 'check-in', 'student_id' => $student->id];
        $this->signContract($student);
        $this->makeRegistrationEvent(null, 'require_registration');

        $this->actingAs($user)->postJson('/api/attendance/events', $checkIn)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['student_id' => 'The student has not completed registration.']);

        $this->makeRegistrationEvent($student, 'shared_science');
        $this->actingAs($user)->postJson('/api/attendance/events', $checkIn)->assertStatus(422);
        $this->assertDatabaseCount('attendance_events', 0);

        $this->makeRegistrationEvent($student, 'first_cr');
        $this->actingAs($user)->postJson('/api/attendance/events', $checkIn)->assertStatus(201);
        $this->assertDatabaseCount('attendance_events', 1);
    }

    public function test_registration_requirement_still_reports_missing_contract() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $this->makeRegistrationEvent(null, 'require_registration');

        $this->actingAs($user)->postJson('/api/attendance/events', ['type' => 'check-in', 'student_id' => $student->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['student_id' => 'The student has not signed the student contract.']);
    }

    public function test_inactive_registration_requirement_allows_partially_registered_check_in() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $checkIn = ['type' => 'check-in', 'student_id' => $student->id];

        // Turned off
        $this->makeRegistrationEvent(null, 'require_registration', Carbon::now()->subWeek())->delete();
        // Reset by a new season
        $this->makeRegistrationEvent(null, 'require_registration', Carbon::now()->subYear());
        $this->makeRegistrationEvent(null, 'new_season', Carbon::now()->subMonth());

        $this->signContract($student);
        $this->actingAs($user)->postJson('/api/attendance/events', $checkIn)->assertStatus(201);
    }

    public function test_check_out_does_not_require_registration() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $this->signContract($student);
        $this->makeRegistrationEvent(null, 'require_registration');
        $this->makeEvent($student, $user, 'check-in', Carbon::now()->subHours(2));

        $this->actingAs($user)->postJson('/api/attendance/events', [
            'type' => 'check-out',
            'student_id' => $student->id
        ])->assertStatus(201);
    }

    public function test_check_in_requires_signed_contract() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $checkIn = ['type' => 'check-in', 'student_id' => $student->id];

        $this->actingAs($user)->postJson('/api/attendance/events', $checkIn)
            ->assertStatus(422)
            ->assertJsonValidationErrors('student_id');

        // Last season's contract doesn't count
        $this->signContract($student, Carbon::now()->subYear());
        RegistrationEvent::forceCreate([
            'registered_by' => $user->id,
            'event_type' => 'new_season',
            'created_at' => Carbon::now()->subMonth(),
            'updated_at' => Carbon::now()->subMonth()
        ]);
        $this->actingAs($user)->postJson('/api/attendance/events', $checkIn)->assertStatus(422);
        $this->assertDatabaseCount('attendance_events', 0);

        $this->signContract($student);
        $this->actingAs($user)->postJson('/api/attendance/events', $checkIn)->assertStatus(201);
        $this->assertDatabaseCount('attendance_events', 1);
    }

    public function test_check_out_does_not_require_signed_contract() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        // Checked in last season, before a new season cleared their contract
        $this->makeEvent($student, $user, 'check-in', Carbon::now()->subHours(2));

        $this->actingAs($user)->postJson('/api/attendance/events', [
            'type' => 'check-out',
            'student_id' => $student->id
        ])->assertStatus(201);
    }

    private function makeEvent(Student $student, User $user, string $type, Carbon $date): AttendanceEvent {
        return AttendanceEvent::forceCreate([
            'student_id' => $student->id,
            'registered_by' => $user->id,
            'type' => $type,
            'created_at' => $date,
            'updated_at' => $date
        ]);
    }

    public function test_show() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $event = $this->makeEvent($student, $user, 'check-in', Carbon::now()->subHour());
        $trashed = $this->makeEvent($student, $user, 'check-out', Carbon::now()->subMinutes(30));
        $trashed->delete();

        $this->actingAs($user)->getJson('/api/attendance/events/'.$event->id)
            ->assertStatus(200)
            ->assertJson(['id' => $event->id, 'type' => 'check-in']);

        // show includes soft-deleted events
        $response = $this->actingAs($user)->getJson('/api/attendance/events/'.$trashed->id)
            ->assertStatus(200)
            ->assertJson(['id' => $trashed->id, 'type' => 'check-out']);
        $this->assertNotNull($response['deleted_at']);

        $this->actingAs($user)->getJson('/api/attendance/events/9999')->assertStatus(404);
    }

    public function test_index_with_trashed() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $kept = $this->makeEvent($student, $user, 'check-in', Carbon::now()->subHour());
        $trashed = $this->makeEvent($student, $user, 'check-out', Carbon::now()->subMinutes(30));
        $trashed->delete();

        $ids = fn($response) => collect($response->json())->pluck('id')->all();

        $this->assertEquals([$kept->id], $ids($this->actingAs($user)->getJson('/api/attendance/events')));
        $this->assertEqualsCanonicalizing(
            [$kept->id, $trashed->id],
            $ids($this->actingAs($user)->getJson('/api/attendance/events?with_trashed=1'))
        );
    }

    public function test_destroy_within_undo_window() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $event = $this->makeEvent($student, $user, 'check-in', Carbon::now()->subSeconds(5));

        $this->actingAs($user)->deleteJson('/api/attendance/events/'.$event->id)
            ->assertStatus(200)
            ->assertJson(['id' => $event->id]);

        $this->assertSoftDeleted($event);
    }

    public function test_destroy_outside_undo_window() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $event = $this->makeEvent($student, $user, 'check-in', Carbon::now()->subSeconds(config('config.undo_window') + 60));

        $this->actingAs($user)->deleteJson('/api/attendance/events/'.$event->id)
            ->assertStatus(422)
            ->assertJsonValidationErrors('id');

        $this->assertNotSoftDeleted($event);
    }

    public function test_destroy_force() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $event = $this->makeEvent($student, $user, 'check-in', Carbon::now()->subDay());

        // student-leads may undo, but may not force-delete
        $lead = $this->userWithRole('student-lead');
        $this->actingAs($lead)->deleteJson('/api/attendance/events/'.$event->id.'?force=1')->assertStatus(403);
        $this->assertNotSoftDeleted($event);

        $this->actingAs($user)->deleteJson('/api/attendance/events/'.$event->id.'?force=1')->assertStatus(200);
        $this->assertSoftDeleted($event);
    }

    public function test_destroy_missing() {
        $this->seed(RolesSeeder::class);
        $this->actingAs(User::first())->deleteJson('/api/attendance/events/9999')->assertStatus(404);
    }

    public function test_update_restores_event() {
        $this->seed(RolesSeeder::class);
        $user = User::first();
        $student = Student::factory()->registeredBy($user)->untrashed()->create();
        $event = $this->makeEvent($student, $user, 'check-in', Carbon::now()->subHour());
        $event->delete();
        $this->assertSoftDeleted($event);

        $lead = $this->userWithRole('student-lead');
        $this->actingAs($lead)->putJson('/api/attendance/events/'.$event->id)->assertStatus(403);
        $this->assertSoftDeleted($event);

        $this->actingAs($user)->putJson('/api/attendance/events/'.$event->id)
            ->assertStatus(200)
            ->assertJson(['id' => $event->id]);
        $this->assertNotSoftDeleted($event);

        $this->actingAs($user)->putJson('/api/attendance/events/9999')->assertStatus(404);
    }

    public function test_store_permissions() {
        $this->seed(RolesSeeder::class);
        $student = Student::factory()->registeredBy(User::first())->untrashed()->create();
        $this->signContract($student);
        $checkIn = ['type' => 'check-in', 'student_id' => $student->id];
        $checkOut = ['type' => 'check-out', 'student_id' => $student->id];

        $readOnly = $this->userWithRole('read-only');
        $this->actingAs($readOnly)->postJson('/api/attendance/events', $checkIn)->assertStatus(403);
        $this->actingAs($readOnly)->postJson('/api/attendance/events', $checkOut)->assertStatus(403);
        $this->assertDatabaseCount('attendance_events', 0);

        // student-leads can check students in, but not out
        $lead = $this->userWithRole('student-lead');
        $this->actingAs($lead)->postJson('/api/attendance/events', $checkOut)->assertStatus(403);
        $this->assertDatabaseCount('attendance_events', 0);
        $this->actingAs($lead)->postJson('/api/attendance/events', $checkIn)->assertStatus(201);
        $this->assertDatabaseCount('attendance_events', 1);
    }

    public function test_index_requires_permission() {
        $this->seed(RolesSeeder::class);
        $noRole = User::factory()->create();
        $noRole->syncRoles([]);

        $this->actingAs($noRole)->getJson('/api/attendance/events')->assertStatus(403);
        $this->actingAs($noRole)->getJson('/api/attendance/events/1')->assertStatus(403);
    }
}
