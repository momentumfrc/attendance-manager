<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

use App\Models\User;
use App\Models\Student;
use App\Models\AttendanceEvent;

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
            ->count(1)
            ->CREATE()[0];

        Config::set('config.simultaneous_interval', 60);

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
}
