<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use App\Models\User;
use App\Models\Student;
use App\Models\AttendanceEvent;

use Database\Seeders\RolesSeeder;

class AttendanceEventControllerTest extends TestCase
{
    use DatabaseMigrations;

    public function test_index_validation() {
        $this->seed(RolesSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $user = User::first();
        $students = Student::factory()
            ->count(2)
            ->has(AttendanceEvent::factory()->count(4))
            ->CREATE([
                'registered_by' => $user->id
        ]);
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
            ->count(2)
            ->has(AttendanceEvent::factory()->count(4))
            ->CREATE([
                'registered_by' => $user->id
        ]);
        $this->assertDatabaseCount('students', 2);
        $this->assertDatabaseCount('attendance_events', 8);

        $events = $students->pluck('attendanceEvents')->flatten()->sortByDesc('created_at')->values();
        $this->assertCount(8, $events);

        $response = $this->actingAs($user)->getJson('/api/attendance/events');
        $response->assertExactJson($events->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['student_id' => $students[0]->id]);
        $response->assertExactJson($events->filter(fn($event) => $event->student_id == $students[0]->id)->values()->toArray());

        $since = $events->pluck('created_at')->random();
        $until = $events->pluck('created_at')->random();

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['since' => $since->timestamp]);
        $response->assertExactJson($events->filter(fn($event) => $event->created_at->greaterThanOrEqualTo($since))->values()->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['until' => $since->timestamp]);
        $response->assertExactJson($events->filter(fn($event) => $event->created_at->lessThanOrEqualTo($since))->values()->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['type' => 'check-in']);
        $response->assertExactJson($events->filter(fn($event) => $event->type == 'check-in')->values()->toArray());

        $response = $this->actingAs($user)->json('GET', '/api/attendance/events', ['limit' => '2']);
        $response->assertExactJson($events->take(2)->values()->toArray());
    }
}
