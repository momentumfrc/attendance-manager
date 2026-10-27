<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\AttendanceEvent;
use App\Models\Student;
use App\Models\User;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class ReportControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->user = User::first();
    }

    private function makeStudent(?string $deletedAt = null): Student {
        $student = Student::factory()->registeredBy($this->user)->untrashed()->create();
        if($deletedAt !== null) {
            $student->deleted_at = Carbon::parse($deletedAt);
            $student->save();
        }
        return $student;
    }

    private function makeSession(Student $student, string $in, ?string $out = null): void {
        foreach([['check-in', $in], ['check-out', $out]] as [$type, $date]) {
            if($date === null) {
                continue;
            }
            AttendanceEvent::forceCreate([
                'student_id' => $student->id,
                'registered_by' => $this->user->id,
                'type' => $type,
                'created_at' => Carbon::parse($date),
                'updated_at' => Carbon::parse($date)
            ]);
        }
    }

    private function report(string $path, array $query = [], ?User $as = null) {
        return $this->actingAs($as ?? $this->user)->getJson($path.'?'.http_build_query($query));
    }

    private function ts(string $date): int {
        return Carbon::parse($date)->timestamp;
    }

    public function test_list_meetings() {
        $a = $this->makeStudent();
        $b = $this->makeStudent();
        $this->makeSession($a, '2024-01-01 15:00:00', '2024-01-01 17:00:00');
        $this->makeSession($b, '2024-01-01 15:30:00', '2024-01-01 17:30:00');
        $this->makeSession($a, '2024-01-08 15:00:00', '2024-01-08 17:00:00');
        // Two sessions by the same student on one day count as one student
        $this->makeSession($a, '2024-01-15 15:00:00', '2024-01-15 16:00:00');
        $this->makeSession($a, '2024-01-15 18:00:00', '2024-01-15 19:00:00');

        $response = $this->report('/api/reports/list-meetings', ['timezone' => '+00:00'])->assertStatus(200);
        $rows = collect($response->json());
        $this->assertEquals(['2024-01-15', '2024-01-08', '2024-01-01'], $rows->pluck('meeting_date')->all());
        $this->assertEquals([1, 1, 2], $rows->pluck('student_count')->map(fn($c) => (int)$c)->all());

        $response = $this->report('/api/reports/list-meetings', ['timezone' => '+00:00', 'limit' => 2]);
        $this->assertEquals(['2024-01-15', '2024-01-08'], collect($response->json())->pluck('meeting_date')->all());

        $response = $this->report('/api/reports/list-meetings', ['timezone' => '+00:00', 'since' => $this->ts('2024-01-08 00:00:00')]);
        $this->assertEquals(['2024-01-15', '2024-01-08'], collect($response->json())->pluck('meeting_date')->all());

        $response = $this->report('/api/reports/list-meetings', ['timezone' => '+00:00', 'until' => $this->ts('2024-01-09 00:00:00')]);
        $this->assertEquals(['2024-01-08', '2024-01-01'], collect($response->json())->pluck('meeting_date')->all());
    }

    public function test_list_meetings_uses_exact_range() {
        $a = $this->makeStudent();
        // Dec 31 19:00 and Jan 31 19:00 in Pacific time
        $this->makeSession($a, '2024-01-01 03:00:00', '2024-01-01 04:00:00');
        $this->makeSession($a, '2024-01-15 20:00:00', '2024-01-15 22:00:00');
        $this->makeSession($a, '2024-02-01 03:00:00', '2024-02-01 04:00:00');

        // Jan 1 - Jan 31 in Pacific time
        $response = $this->report('/api/reports/list-meetings', [
            'timezone' => '-08:00',
            'since' => $this->ts('2024-01-01 08:00:00'),
            'until' => $this->ts('2024-02-01 08:00:00')
        ]);
        $this->assertEquals(['2024-01-31', '2024-01-15'], collect($response->json())->pluck('meeting_date')->all());

        $response = $this->report('/api/reports/list-meetings', [
            'timezone' => '-08:00',
            'since' => $this->ts('2024-01-01 04:00:00'),
            'until' => $this->ts('2024-02-01 02:00:00')
        ]);
        $this->assertEquals(['2024-01-15'], collect($response->json())->pluck('meeting_date')->all());
    }

    public function test_list_meetings_named_timezone_follows_dst() {
        $a = $this->makeStudent();
        // 00:30 PDT on Jul 2, but 23:30 on Jul 1 at -08:00
        $this->makeSession($a, '2024-07-02 07:30:00', '2024-07-02 08:30:00');
        // 23:30 PST on Jan 1
        $this->makeSession($a, '2024-01-02 07:30:00', '2024-01-02 08:30:00');

        $response = $this->report('/api/reports/list-meetings', ['timezone' => 'America/Los_Angeles'])->assertStatus(200);
        $this->assertEquals(['2024-07-02', '2024-01-01'], collect($response->json())->pluck('meeting_date')->all());

        // Pacific time is the default
        $response = $this->report('/api/reports/list-meetings')->assertStatus(200);
        $this->assertEquals(['2024-07-02', '2024-01-01'], collect($response->json())->pluck('meeting_date')->all());
    }

    public function test_list_meetings_timezone_shifts_date() {
        $a = $this->makeSession($this->makeStudent(), '2024-01-02 03:00:00', '2024-01-02 05:00:00');

        $utc = $this->report('/api/reports/list-meetings', ['timezone' => '+00:00'])->json();
        $this->assertEquals('2024-01-02', $utc[0]['meeting_date']);

        // 03:00 UTC is still the previous evening in UTC-08:00
        $pacific = $this->report('/api/reports/list-meetings', ['timezone' => '-08:00'])->json();
        $this->assertEquals('2024-01-01', $pacific[0]['meeting_date']);
    }

    public function test_list_meetings_validation() {
        $this->report('/api/reports/list-meetings', ['since' => '01-01-2024'])->assertStatus(422);
        $this->report('/api/reports/list-meetings', ['limit' => 0])->assertStatus(422);
        $this->report('/api/reports/list-meetings', ['timezone' => 'PST'])->assertStatus(422);
        $this->report('/api/reports/list-meetings', ['timezone' => 'Not/A_Zone'])->assertStatus(422);
    }

    public function test_meeting_attendance() {
        $a = $this->makeStudent();
        $b = $this->makeStudent();
        $this->makeSession($a, '2024-01-01 15:00:00', '2024-01-01 17:00:00');
        $this->makeSession($b, '2024-01-01 15:30:00');
        $this->makeSession($a, '2024-01-08 15:00:00', '2024-01-08 17:00:00');

        $response = $this->report('/api/reports/meeting-attendance', ['on' => '2024-01-01', 'timezone' => '+00:00'])
            ->assertStatus(200);
        $sessions = collect($response['attendance_sessions']);
        $this->assertCount(2, $sessions);
        $this->assertEquals([$a->id, $b->id], $sessions->pluck('student_id')->all());
        $this->assertNotNull($sessions[0]['checkout_id']);
        $this->assertNull($sessions[1]['checkout_id']);
        $this->assertStringStartsWith('2024-01-01', $response['meeting_date']);
    }

    public function test_meeting_attendance_defaults_to_latest_meeting() {
        $a = $this->makeStudent();
        $this->makeSession($a, '2024-01-01 15:00:00', '2024-01-01 17:00:00');
        $latest = $this->makeSession($a, '2024-01-08 15:00:00', '2024-01-08 17:00:00');

        $response = $this->report('/api/reports/meeting-attendance', ['timezone' => '+00:00'])->assertStatus(200);
        $this->assertStringStartsWith('2024-01-08', $response['meeting_date']);
        $this->assertCount(1, $response['attendance_sessions']);
    }

    public function test_meeting_attendance_named_timezone_follows_dst() {
        $a = $this->makeStudent();
        $b = $this->makeStudent();
        // 00:30 and 23:30 PDT on Jul 2
        $this->makeSession($a, '2024-07-02 07:30:00', '2024-07-02 08:30:00');
        $this->makeSession($b, '2024-07-03 06:30:00', '2024-07-03 07:00:00');
        // 00:30 PDT on Jul 3
        $this->makeSession($a, '2024-07-03 07:30:00', '2024-07-03 08:30:00');

        $response = $this->report('/api/reports/meeting-attendance', ['on' => '2024-07-02', 'timezone' => 'America/Los_Angeles'])
            ->assertStatus(200);
        $this->assertEquals([$a->id, $b->id], collect($response['attendance_sessions'])->pluck('student_id')->all());
        $this->assertEquals(Carbon::parse('2024-07-02 07:00:00'), Carbon::parse($response['meeting_date']));

        // Defaults to the latest meeting, in Pacific time
        $response = $this->report('/api/reports/meeting-attendance')->assertStatus(200);
        $this->assertEquals(Carbon::parse('2024-07-03 07:00:00'), Carbon::parse($response['meeting_date']));
        $this->assertEquals([$a->id], collect($response['attendance_sessions'])->pluck('student_id')->all());
    }

    public function test_meeting_attendance_validation() {
        $this->report('/api/reports/meeting-attendance', ['on' => '01/01/2024'])->assertStatus(422);
        $this->report('/api/reports/meeting-attendance', ['timezone' => 'PST'])->assertStatus(422);
    }

    public function test_student_stats() {
        $a = $this->makeStudent();
        $b = $this->makeStudent();
        $this->makeSession($a, '2024-01-01 15:00:00', '2024-01-01 17:00:00'); // 7200s
        $this->makeSession($a, '2024-01-08 15:00:00', '2024-01-08 16:00:00'); // 3600s
        $this->makeSession($a, '2024-01-15 15:00:00');                         // missed checkout
        $this->makeSession($b, '2024-01-01 15:30:00', '2024-01-01 17:30:00'); // 7200s

        $stats = collect($this->report('/api/reports/student-stats')->assertStatus(200)->json())->keyBy('student_id');
        $this->assertEquals(
            ['student_id' => $a->id, 'checkin_count' => 3, 'missed_checkout_count' => 1, 'meeting_time' => 10800],
            $stats[$a->id]
        );
        $this->assertEquals(
            ['student_id' => $b->id, 'checkin_count' => 1, 'missed_checkout_count' => 0, 'meeting_time' => 7200],
            $stats[$b->id]
        );
    }

    public function test_student_stats_ordering_and_zero_rows() {
        $a = $this->makeStudent();
        $b = $this->makeStudent();
        $idle = $this->makeStudent();
        $this->makeSession($a, '2024-01-01 15:00:00', '2024-01-01 16:00:00'); // 3600s
        $this->makeSession($b, '2024-01-01 15:00:00', '2024-01-01 18:00:00'); // 10800s

        $ids = collect($this->report('/api/reports/student-stats')->json())->pluck('student_id')->all();
        $this->assertEquals([$b->id, $a->id, $idle->id], $ids);

        $idleRow = collect($this->report('/api/reports/student-stats')->json())->firstWhere('student_id', $idle->id);
        $this->assertEquals(['student_id' => $idle->id, 'checkin_count' => 0, 'missed_checkout_count' => 0, 'meeting_time' => 0], $idleRow);
    }

    public function test_student_stats_date_range() {
        $a = $this->makeStudent();
        $b = $this->makeStudent();
        $this->makeSession($a, '2024-01-01 15:00:00', '2024-01-01 17:00:00');
        $this->makeSession($a, '2024-01-08 15:00:00', '2024-01-08 16:00:00');
        $this->makeSession($b, '2024-01-01 15:30:00', '2024-01-01 17:30:00');

        $since = collect($this->report('/api/reports/student-stats', ['since' => $this->ts('2024-01-08 00:00:00')])->json())->keyBy('student_id');
        $this->assertEquals(2 - 1, $since[$a->id]['checkin_count']);
        $this->assertEquals(3600, $since[$a->id]['meeting_time']);
        $this->assertEquals(0, $since[$b->id]['checkin_count']);

        $until = collect($this->report('/api/reports/student-stats', ['until' => $this->ts('2024-01-02 00:00:00')])->json())->keyBy('student_id');
        $this->assertEquals(1, $until[$a->id]['checkin_count']);
        $this->assertEquals(7200, $until[$a->id]['meeting_time']);
        $this->assertEquals(1, $until[$b->id]['checkin_count']);
    }

    public function test_student_stats_uses_exact_range() {
        $a = $this->makeStudent();
        $this->makeSession($a, '2024-01-01 03:00:00', '2024-01-01 04:00:00');
        $this->makeSession($a, '2024-01-15 20:00:00', '2024-01-15 22:00:00');
        $this->makeSession($a, '2024-02-01 03:00:00', '2024-02-01 04:00:00');

        $stats = collect($this->report('/api/reports/student-stats', [
            'since' => $this->ts('2024-01-01 08:00:00'),
            'until' => $this->ts('2024-02-01 08:00:00')
        ])->json())->keyBy('student_id');
        $this->assertEquals(2, $stats[$a->id]['checkin_count']);
        $this->assertEquals(7200 + 3600, $stats[$a->id]['meeting_time']);
    }

    public function test_student_stats_excludes_students_deleted_before_since() {
        $active = $this->makeStudent();
        $gone = $this->makeStudent('2023-12-01 00:00:00');
        $deletedLater = $this->makeStudent('2024-02-01 00:00:00');

        // Without a range, deleted students are still listed
        $all = collect($this->report('/api/reports/student-stats')->json())->pluck('student_id')->all();
        $this->assertEqualsCanonicalizing([$active->id, $gone->id, $deletedLater->id], $all);

        $since = $this->ts('2024-01-01 00:00:00');
        $ids = collect($this->report('/api/reports/student-stats', ['since' => $since])->json())->pluck('student_id')->all();
        $this->assertEqualsCanonicalizing([$active->id, $deletedLater->id], $ids);
    }

    public function test_student_stats_validation() {
        $this->report('/api/reports/student-stats', ['since' => 'yesterday'])->assertStatus(422);
        $this->report('/api/reports/student-stats', ['until' => '01-01-2024'])->assertStatus(422);
    }

    public function test_requires_view_stats_permission() {
        $noRole = User::factory()->create();
        $noRole->syncRoles([]);

        foreach(['list-meetings', 'meeting-attendance', 'student-stats'] as $report) {
            $this->report('/api/reports/'.$report, [], $noRole)->assertStatus(403);
        }

        $readOnly = User::factory()->create();
        $readOnly->syncRoles(['read-only']);
        $this->report('/api/reports/student-stats', [], $readOnly)->assertStatus(200);
    }
}
