<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

use App\Models\AttendanceEvent;
use App\Models\MeetingEvent;
use App\Models\Student;
use App\Models\User;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class PollControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Carbon $since;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->user = User::first();
        $this->since = Carbon::now()->subHour()->startOfSecond();
    }

    private function oldDate(): Carbon {
        return $this->since->copy()->subMonth();
    }

    /** A student whose row has not changed since before the polling window. */
    private function makeOldStudent(): Student {
        $student = Student::factory()->registeredBy($this->user)->untrashed()->create();
        DB::table('students')->where('id', $student->id)->update([
            'created_at' => $this->oldDate(),
            'updated_at' => $this->oldDate()
        ]);
        return $student->fresh();
    }

    private function makeEvent(Student $student, string $type, Carbon $date): AttendanceEvent {
        return AttendanceEvent::forceCreate([
            'student_id' => $student->id,
            'registered_by' => $this->user->id,
            'type' => $type,
            'created_at' => $date,
            'updated_at' => $date
        ]);
    }

    private function makeMeeting(Carbon $date): MeetingEvent {
        $meeting = new MeetingEvent;
        $meeting->type = 'end-of-meeting';
        $meeting->registered_by = $this->user->id;
        $meeting->created_at = $date;
        $meeting->updated_at = $date;
        $meeting->save();
        return $meeting;
    }

    private function poll(array $query) {
        return $this->actingAs($this->user)->getJson('/api/poll?'.http_build_query($query));
    }

    public function test_since_is_required_and_validated() {
        $this->poll([])->assertStatus(422)->assertJsonValidationErrors('since');
        $this->poll(['since' => '2024-01-01'])->assertStatus(422);
        $this->poll(['since' => $this->since->timestamp, 'until' => 'tomorrow'])->assertStatus(422);
    }

    public function test_empty_poll() {
        $this->makeOldStudent();

        $this->poll(['since' => $this->since->timestamp])
            ->assertStatus(200)
            ->assertExactJson(['updated_students' => [], 'meeting_events' => []]);
    }

    public function test_returns_students_with_recent_events() {
        $quiet = $this->makeOldStudent();
        $active = $this->makeOldStudent();
        $this->makeEvent($quiet, 'check-in', $this->oldDate());
        $checkIn = $this->makeEvent($active, 'check-in', $this->since->copy()->addMinutes(10));
        $checkOut = $this->makeEvent($active, 'check-out', $this->since->copy()->addMinutes(20));

        $response = $this->poll(['since' => $this->since->timestamp])->assertStatus(200);

        $response->assertJsonCount(1, 'updated_students');
        $student = $response['updated_students'][0];
        $this->assertEquals($active->id, $student['id']);
        $this->assertEquals($checkIn->id, $student['last_check_in']['id']);
        $this->assertEquals($checkOut->id, $student['last_check_out']['id']);
    }

    public function test_returns_events_deleted_in_window() {
        $student = $this->makeOldStudent();
        $event = $this->makeEvent($student, 'check-in', $this->oldDate());
        $event->delete();

        $response = $this->poll(['since' => $this->since->timestamp])->assertStatus(200);

        $response->assertJsonCount(1, 'updated_students');
        $this->assertEquals($student->id, $response['updated_students'][0]['id']);
        // The deleted event is no longer the student's last check-in
        $this->assertNull($response['updated_students'][0]['last_check_in']);
    }

    public function test_returns_students_created_updated_or_deleted_in_window() {
        $old = $this->makeOldStudent();
        $created = Student::factory()->registeredBy($this->user)->untrashed()->create();
        $updated = $this->makeOldStudent();
        $deleted = $this->makeOldStudent();

        DB::table('students')->where('id', $updated->id)->update(['updated_at' => $this->since->copy()->addMinutes(5)]);
        DB::table('students')->where('id', $deleted->id)->update(['deleted_at' => $this->since->copy()->addMinutes(5)]);

        $response = $this->poll(['since' => $this->since->timestamp])->assertStatus(200);

        $ids = collect($response['updated_students'])->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$created->id, $updated->id, $deleted->id], $ids);
        $this->assertNotContains($old->id, $ids);

        // Soft-deleted students are reported so clients can drop them
        $deletedRow = collect($response['updated_students'])->firstWhere('id', $deleted->id);
        $this->assertNotNull($deletedRow['deleted_at']);
    }

    public function test_until_limits_the_window() {
        $early = $this->makeOldStudent();
        $late = $this->makeOldStudent();
        $this->makeEvent($early, 'check-in', $this->since->copy()->addMinutes(10));
        $this->makeEvent($late, 'check-in', $this->since->copy()->addMinutes(50));
        $this->makeMeeting($this->since->copy()->addMinutes(10));
        $this->makeMeeting($this->since->copy()->addMinutes(50));

        $response = $this->poll([
            'since' => $this->since->timestamp,
            'until' => $this->since->copy()->addMinutes(30)->timestamp
        ])->assertStatus(200);

        $this->assertEquals([$early->id], collect($response['updated_students'])->pluck('id')->all());
        $response->assertJsonCount(1, 'meeting_events');
    }

    public function test_returns_meeting_events_in_window() {
        $this->makeMeeting($this->oldDate());
        $recent = $this->makeMeeting($this->since->copy()->addMinutes(10));

        $response = $this->poll(['since' => $this->since->timestamp])->assertStatus(200);

        $response->assertJsonCount(1, 'meeting_events');
        $this->assertEquals($recent->id, $response['meeting_events'][0]['id']);
        $this->assertEquals('end-of-meeting', $response['meeting_events'][0]['type']);
    }
}
