<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\AttendanceEvent;
use App\Models\Student;
use App\Models\User;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class AttendanceSessionControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->user = User::first();
    }

    private function makeStudent(): Student {
        return Student::factory()->registeredBy($this->user)->untrashed()->create();
    }

    private function makeEvent(Student $student, string $type, string $date, bool $trashed = false): AttendanceEvent {
        $event = AttendanceEvent::forceCreate([
            'student_id' => $student->id,
            'registered_by' => $this->user->id,
            'type' => $type,
            'created_at' => Carbon::parse($date),
            'updated_at' => Carbon::parse($date),
            'deleted_at' => $trashed ? Carbon::parse($date) : null
        ]);
        return $event;
    }

    private function getSessions(array $query = []) {
        return $this->actingAs($this->user)->getJson('/api/attendance/sessions?'.http_build_query($query));
    }

    public function test_complete_session() {
        $student = $this->makeStudent();
        $in = $this->makeEvent($student, 'check-in', '2024-01-01 15:00:00');
        $out = $this->makeEvent($student, 'check-out', '2024-01-01 17:00:00');

        $response = $this->getSessions()->assertStatus(200);
        $response->assertJsonCount(1);
        $response->assertJson([[
            'student_id' => $student->id,
            'checkin_id' => $in->id,
            'checkout_id' => $out->id
        ]]);
    }

    public function test_partial_session_and_exclude_partial() {
        $student = $this->makeStudent();
        $in1 = $this->makeEvent($student, 'check-in', '2024-01-01 15:00:00');
        $out1 = $this->makeEvent($student, 'check-out', '2024-01-01 17:00:00');
        $in2 = $this->makeEvent($student, 'check-in', '2024-01-08 15:00:00');

        $this->getSessions()->assertJsonCount(2);

        $partial = collect($this->getSessions()->json())->firstWhere('checkin_id', $in2->id);
        $this->assertNotNull($partial);
        $this->assertNull($partial['checkout_id']);

        $response = $this->getSessions(['exclude_partial' => 1])->assertJsonCount(1);
        $response->assertJson([['checkin_id' => $in1->id, 'checkout_id' => $out1->id]]);
    }

    public function test_back_to_back_check_ins_leave_first_partial() {
        $student = $this->makeStudent();
        $in1 = $this->makeEvent($student, 'check-in', '2024-01-01 15:00:00');
        $in2 = $this->makeEvent($student, 'check-in', '2024-01-01 16:00:00');
        $out = $this->makeEvent($student, 'check-out', '2024-01-01 17:00:00');

        $sessions = collect($this->getSessions()->assertJsonCount(2)->json())->keyBy('checkin_id');
        $this->assertNull($sessions[$in1->id]['checkout_id']);
        $this->assertEquals($out->id, $sessions[$in2->id]['checkout_id']);
    }

    public function test_soft_deleted_events_are_ignored() {
        $student = $this->makeStudent();
        $this->makeEvent($student, 'check-in', '2024-01-01 15:00:00');
        $this->makeEvent($student, 'check-out', '2024-01-01 17:00:00', true);

        // The only check-out is deleted, so the check-in is a partial session
        $sessions = $this->getSessions()->assertJsonCount(1)->json();
        $this->assertNull($sessions[0]['checkout_id']);

        // A deleted check-in produces no session at all
        $other = $this->makeStudent();
        $this->makeEvent($other, 'check-in', '2024-01-01 15:00:00', true);
        $this->makeEvent($other, 'check-out', '2024-01-01 17:00:00');
        $this->getSessions(['student_id' => $other->id])->assertExactJson([]);
    }

    public function test_filters() {
        $a = $this->makeStudent();
        $b = $this->makeStudent();
        $aJan = $this->makeEvent($a, 'check-in', '2024-01-01 15:00:00');
        $this->makeEvent($a, 'check-out', '2024-01-01 17:00:00');
        $aFeb = $this->makeEvent($a, 'check-in', '2024-02-01 15:00:00');
        $this->makeEvent($a, 'check-out', '2024-02-01 17:00:00');
        $bJan = $this->makeEvent($b, 'check-in', '2024-01-01 15:30:00');
        $this->makeEvent($b, 'check-out', '2024-01-01 17:30:00');

        $ids = fn($response) => collect($response->json())->pluck('checkin_id')->sort()->values()->all();

        $this->assertEquals([$aJan->id, $aFeb->id, $bJan->id], $ids($this->getSessions()));
        $this->assertEquals([$aJan->id, $aFeb->id], $ids($this->getSessions(['student_id' => $a->id])));
        $this->assertEquals([$bJan->id], $ids($this->getSessions(['student_id' => $b->id])));

        $feb1 = Carbon::parse('2024-02-01 00:00:00')->timestamp;
        $this->assertEquals([$aFeb->id], $ids($this->getSessions(['since' => $feb1])));
        $this->assertEquals([$aJan->id, $bJan->id], $ids($this->getSessions(['until' => $feb1])));

        $this->getSessions(['limit' => 2])->assertJsonCount(2);
    }

    public function test_validation() {
        $this->getSessions(['student_id' => 9999])->assertStatus(422);
        $this->getSessions(['since' => '01-01-2024'])->assertStatus(422);
        $this->getSessions(['until' => 'yesterday'])->assertStatus(422);
        $this->getSessions(['limit' => 0])->assertStatus(422);
        $this->getSessions(['exclude_partial' => 'maybe'])->assertStatus(422);
    }
}
