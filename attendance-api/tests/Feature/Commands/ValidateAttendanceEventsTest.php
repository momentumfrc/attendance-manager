<?php

namespace Tests\Feature\Commands;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\AttendanceEvent;
use App\Models\Student;
use App\Models\User;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class ValidateAttendanceEventsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->admin = User::first();
    }

    private function makeStudent(): Student {
        return Student::factory()->registeredBy($this->admin)->untrashed()->create();
    }

    private function makeEvent(Student $student, string $type, string $date): AttendanceEvent {
        return AttendanceEvent::forceCreate([
            'student_id' => $student->id,
            'registered_by' => $this->admin->id,
            'type' => $type,
            'created_at' => Carbon::parse($date),
            'updated_at' => Carbon::parse($date)
        ]);
    }

    /**
     * Creates one valid student plus one student for each of the three kinds of invalid data.
     *
     * @return array{valid: AttendanceEvent[], invalid: AttendanceEvent[]}
     */
    private function seedEvents(): array {
        $valid = $this->makeStudent();
        $repeated = $this->makeStudent();
        $long = $this->makeStudent();
        $simultaneous = $this->makeStudent();

        $validEvents = [
            $this->makeEvent($valid, 'check-in', '2024-01-01 15:00:00'),
            $this->makeEvent($valid, 'check-out', '2024-01-01 17:00:00'),
            // Repeated check-in/out cycles are fine
            $this->makeEvent($valid, 'check-in', '2024-01-08 15:00:00'),
            $this->makeEvent($valid, 'check-out', '2024-01-08 17:00:00'),
        ];

        // A second check-out with no check-in in between
        $this->makeEvent($repeated, 'check-in', '2024-01-01 15:00:00');
        $this->makeEvent($repeated, 'check-out', '2024-01-01 17:00:00');
        $repeatedCheckout = $this->makeEvent($repeated, 'check-out', '2024-01-01 19:00:00');

        // A session lasting 14 hours (the default limit is 12), so the check-out is removed
        $this->makeEvent($long, 'check-in', '2024-01-01 08:00:00');
        $longCheckout = $this->makeEvent($long, 'check-out', '2024-01-01 22:00:00');

        // A check-in followed by a check-out 2 minutes later (the default interval is 5 minutes),
        // so both events are removed
        $simultaneousIn = $this->makeEvent($simultaneous, 'check-in', '2024-01-01 15:00:00');
        $simultaneousOut = $this->makeEvent($simultaneous, 'check-out', '2024-01-01 15:02:00');

        return [
            'valid' => $validEvents,
            'invalid' => [$repeatedCheckout, $longCheckout, $simultaneousIn, $simultaneousOut]
        ];
    }

    public function test_reports_nothing_for_valid_data() {
        $student = $this->makeStudent();
        $this->makeEvent($student, 'check-in', '2024-01-01 15:00:00');
        $this->makeEvent($student, 'check-out', '2024-01-01 17:00:00');

        $this->artisan('validate:attendance')
            ->expectsOutputToContain('There are 0 invalid attendance records.')
            ->assertSuccessful();
    }

    public function test_counts_all_kinds_of_invalid_events() {
        $this->seedEvents();

        $this->artisan('validate:attendance')
            ->expectsOutputToContain('There are 4 invalid attendance records.')
            ->assertSuccessful();

        $this->assertEquals(0, AttendanceEvent::onlyTrashed()->count());
    }

    public function test_detail_lists_reasons() {
        $this->seedEvents();

        $this->artisan('validate:attendance', ['--detail' => true])
            ->expectsOutputToContain('repeated_checkouts')
            ->expectsOutputToContain('long_sessions')
            ->expectsOutputToContain('simultaneous_events')
            ->assertSuccessful();
    }

    public function test_fix_removes_only_invalid_events() {
        $events = $this->seedEvents();

        $this->artisan('validate:attendance', ['--fix' => true])
            ->expectsConfirmation('Do you wish to continue?', 'yes')
            ->assertSuccessful();

        foreach($events['invalid'] as $event) {
            $this->assertSoftDeleted($event);
        }
        foreach($events['valid'] as $event) {
            $this->assertNotSoftDeleted($event);
        }
        $this->assertEquals(4, AttendanceEvent::onlyTrashed()->count());
    }

    public function test_fix_can_be_declined() {
        $this->seedEvents();

        $this->artisan('validate:attendance', ['--fix' => true])
            ->expectsConfirmation('Do you wish to continue?', 'no')
            ->assertSuccessful();

        $this->assertEquals(0, AttendanceEvent::onlyTrashed()->count());
    }

    public function test_options_change_thresholds() {
        $student = $this->makeStudent();
        $this->makeEvent($student, 'check-in', '2024-01-01 15:00:00');
        $this->makeEvent($student, 'check-out', '2024-01-01 18:00:00');

        $this->artisan('validate:attendance')
            ->expectsOutputToContain('There are 0 invalid attendance records.');

        $this->artisan('validate:attendance', ['--max-session-length' => 2])
            ->expectsOutputToContain('There are 1 invalid attendance records.');

        $other = $this->makeStudent();
        $this->makeEvent($other, 'check-in', '2024-01-02 15:00:00');
        $this->makeEvent($other, 'check-out', '2024-01-02 15:20:00');

        // The 20 minute session is beyond the default 5 minute interval, but not a 30 minute one
        $this->artisan('validate:attendance')
            ->expectsOutputToContain('There are 0 invalid attendance records.');
        $this->artisan('validate:attendance', ['--simultaneous-interval' => 1800])
            ->expectsOutputToContain('There are 2 invalid attendance records.');
    }
}
