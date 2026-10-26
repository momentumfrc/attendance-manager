<?php

namespace Tests\Feature\Commands;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\AttendanceEvent;
use App\Models\MeetingEvent;
use App\Models\Student;
use App\Models\User;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class EndMeetingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->admin = User::first();
    }

    private function makeEvent(Student $student, string $type, Carbon $date): void {
        AttendanceEvent::forceCreate([
            'student_id' => $student->id,
            'registered_by' => $this->admin->id,
            'type' => $type,
            'created_at' => $date,
            'updated_at' => $date
        ]);
    }

    private function makeMeeting(Carbon $date): void {
        $meeting = new MeetingEvent;
        $meeting->type = 'end-of-meeting';
        $meeting->registered_by = $this->admin->id;
        $meeting->created_at = $date;
        $meeting->updated_at = $date;
        $meeting->save();
    }

    private function makeStudent(): Student {
        return Student::factory()->registeredBy($this->admin)->untrashed()->create();
    }

    public function test_skips_when_nobody_is_checked_in() {
        $student = $this->makeStudent();
        $this->makeEvent($student, 'check-in', Carbon::now()->subHours(2));
        $this->makeEvent($student, 'check-out', Carbon::now()->subHour());
        $this->makeMeeting(Carbon::now()->subHours(3));

        $this->artisan('meetings:end')->assertSuccessful();

        $this->assertDatabaseCount('meeting_events', 1);
    }

    public function test_creates_event_when_student_checked_in_after_last_meeting() {
        $this->makeMeeting(Carbon::now()->subHours(3));
        $this->makeEvent($this->makeStudent(), 'check-in', Carbon::now()->subHour());

        $this->artisan('meetings:end')->assertSuccessful();

        $this->assertDatabaseCount('meeting_events', 2);
        $event = MeetingEvent::orderByDesc('id')->first();
        $this->assertEquals('end-of-meeting', $event->type);
        $this->assertEquals(User::where('slack_id', config('auth.system_slack_id'))->first()->id, $event->registered_by);
    }

    public function test_creates_event_when_no_meeting_has_ever_ended() {
        $this->makeEvent($this->makeStudent(), 'check-in', Carbon::now()->subHour());

        $this->artisan('meetings:end')->assertSuccessful();

        $this->assertDatabaseCount('meeting_events', 1);
    }

    public function test_skips_when_check_in_predates_last_meeting() {
        $this->makeEvent($this->makeStudent(), 'check-in', Carbon::now()->subHours(3));
        $this->makeMeeting(Carbon::now()->subHour());

        $this->artisan('meetings:end')->assertSuccessful();

        $this->assertDatabaseCount('meeting_events', 1);
    }

    public function test_ignores_soft_deleted_events() {
        $student = $this->makeStudent();
        $this->makeMeeting(Carbon::now()->subHours(3));
        $this->makeEvent($student, 'check-in', Carbon::now()->subHour());
        AttendanceEvent::where('student_id', $student->id)->delete();

        $this->artisan('meetings:end')->assertSuccessful();

        $this->assertDatabaseCount('meeting_events', 1);
    }

    public function test_force_creates_event_regardless() {
        $this->artisan('meetings:end', ['--force' => true])->assertSuccessful();

        $this->assertDatabaseCount('meeting_events', 1);
    }
}
