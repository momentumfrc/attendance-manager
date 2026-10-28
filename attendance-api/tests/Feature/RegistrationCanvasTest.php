<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

use App\Models\RegistrationEvent;
use App\Models\Student;
use App\Models\User;
use App\Services\RegistrationCanvas;
use App\Services\RegistrationCanvasException;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class RegistrationCanvasTest extends TestCase
{
    use RefreshDatabase;

    private const EDIT_URL = 'https://slack.com/api/canvases.edit';

    private User $admin;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->admin = User::first();
        config([
            'services.slack_canvas.bot_token' => 'xoxb-test',
            'services.slack_canvas.canvas_id' => 'F0TEST'
        ]);
    }

    private function userWithRole(string $role): User {
        $user = User::factory()->create();
        $user->syncRoles([$role]);
        return $user;
    }

    private function makeStudent(string $name, ?int $graduationYear = null): Student {
        return Student::factory()->registeredBy($this->admin)->untrashed()->create([
            'name' => $name,
            'graduation_year' => $graduationYear
        ]);
    }

    private function makeEvent(?Student $student, string $type, ?Carbon $date = null): RegistrationEvent {
        $date ??= Carbon::now()->subMinute();
        return RegistrationEvent::forceCreate([
            'student_id' => $student?->id,
            'registered_by' => $this->admin->id,
            'event_type' => $type,
            'created_at' => $date,
            'updated_at' => $date
        ]);
    }

    private function canvas(): RegistrationCanvas {
        return app(RegistrationCanvas::class);
    }

    private function fakeSlack(array $response = ['ok' => true]): void {
        Http::fake([self::EDIT_URL => Http::response($response)]);
    }

    /** The code block tables of the rendered canvas, keyed by section title. */
    private function tables(string $markdown): array {
        $tables = [];
        $section = null;
        $inTable = false;
        foreach(explode("\n", $markdown) as $line) {
            if(str_starts_with($line, '## ')) {
                $section = substr($line, 3);
                $tables[$section] = [];
            } else if($line == '```') {
                $inTable = !$inTable;
            } else if($inTable) {
                $tables[$section][] = $line;
            }
        }
        return $tables;
    }

    /** The table rows of the rendered canvas, keyed by section title, then by the student column. */
    private function sections(string $markdown): array {
        $sections = [];
        foreach($this->tables($markdown) as $section => $lines) {
            $sections[$section] = [];
            // Skip the header and separator
            foreach(array_slice($lines, 2) as $line) {
                $this->assertMatchesRegularExpression('/^(.*?)\s+(\S)\s+(\S)\s+(\S)\s*$/u', $line);
                preg_match('/^(.*?)\s+(\S)\s+(\S)\s+(\S)\s*$/u', $line, $matches);
                $sections[$section][$matches[1]] = array_slice($matches, 2);
            }
        }
        return $sections;
    }

    /** The table rows of the rendered canvas, keyed by the student column. */
    private function rows(string $markdown): array {
        return array_merge(...array_values($this->sections($markdown)));
    }

    public function test_render_groups_students_by_what_they_may_do() {
        $full = $this->makeStudent('Alice');
        $tools = $this->makeStudent('Bob');
        $events = $this->makeStudent('Carol');
        $contractOnly = $this->makeStudent('Dave');
        $this->makeStudent('Erin');

        foreach(['student_contract', 'shared_science', 'first_cr'] as $step) {
            $this->makeEvent($full, $step);
        }
        $this->makeEvent($tools, 'student_contract');
        $this->makeEvent($tools, 'shared_science');
        $this->makeEvent($events, 'student_contract');
        $this->makeEvent($events, 'first_cr');
        $this->makeEvent($contractOnly, 'student_contract');

        $yes = '✅';
        $no = '❌';
        $this->assertSame([
            'Fully Registered (Tools OK and Events OK)' => ['Alice' => [$yes, $yes, $yes]],
            'Missing FIRST (No Events)' => ['Bob' => [$yes, $yes, $no]],
            'Missing Shared Science (No Tools)' => ['Carol' => [$yes, $no, $yes]],
            'Missing Multiple (No Tools, No Events)' => ['Dave' => [$yes, $no, $no], 'Erin' => [$no, $no, $no]]
        ], $this->sections($this->canvas()->render()));
    }

    public function test_render_needs_the_contract_for_tools_and_events() {
        $student = $this->makeStudent('Alice');
        $this->makeEvent($student, 'shared_science');
        $this->makeEvent($student, 'first_cr');

        $this->assertSame(
            ['Alice' => ['❌', '✅', '✅']],
            $this->sections($this->canvas()->render())['Missing Multiple (No Tools, No Events)']
        );
    }

    public function test_render_shows_empty_sections() {
        $this->makeStudent('Alice');

        $markdown = $this->canvas()->render();

        $this->assertSame(
            ['Fully Registered (Tools OK and Events OK)', 'Missing FIRST (No Events)', 'Missing Shared Science (No Tools)', 'Missing Multiple (No Tools, No Events)'],
            array_keys($this->sections($markdown))
        );
        $this->assertSame(3, substr_count($markdown, '_No students_'));
    }

    public function test_render_respects_new_season() {
        $student = $this->makeStudent('Alice');
        $this->makeEvent($student, 'student_contract', Carbon::now()->subYear());
        $this->makeEvent(null, 'new_season', Carbon::now()->subMonth());

        $this->assertSame(
            ['❌', '❌', '❌'],
            $this->rows($this->canvas()->render())['Alice']
        );
    }

    public function test_render_sorts_and_qualifies_duplicate_names() {
        $this->makeStudent('bob');
        $this->makeStudent('Alice Smith', 2027);
        $this->makeStudent('Alice Smith', 2026);
        $this->makeStudent('Carol', 2028);
        $this->makeStudent('Deleted Student')->delete();

        $this->assertSame(
            ['Alice Smith (2026)', 'Alice Smith (2027)', 'bob', 'Carol'],
            array_keys($this->rows($this->canvas()->render()))
        );
    }

    public function test_render_shows_names_literally() {
        $this->makeStudent('Pipe | *Star* _under_');
        // A backtick fence in a name would end the code block early
        $this->makeStudent('Tick ```Tock');

        $this->assertSame(
            ['Pipe | *Star* _under_', "Tick '''Tock"],
            array_keys($this->rows($this->canvas()->render()))
        );
    }

    public function test_render_aligns_columns() {
        $short = $this->makeStudent('Al');
        $this->makeStudent('Bartholomew José');
        $this->makeEvent($short, 'shared_science');

        $lines = $this->tables($this->canvas()->render())['Missing Multiple (No Tools, No Events)'];

        // The emoji are two columns wide, so each mark takes one less space of padding
        $this->assertSame('Student          Contract SSCI FIRST', $lines[0]);
        $this->assertSame('---------------- -------- ---- -----', $lines[1]);
        $this->assertSame('Al                  ❌     ✅   ❌  ', $lines[2]);
        $this->assertSame('Bartholomew José    ❌     ❌   ❌  ', $lines[3]);
        foreach($lines as $line) {
            $this->assertSame(36, mb_strwidth($line), $line);
        }
    }

    public function test_render_explains_the_columns() {
        $markdown = $this->canvas()->render();

        $this->assertStringContainsString('**Contract**', $markdown);
        $this->assertStringContainsString('**SSCI**', $markdown);
        $this->assertStringContainsString('**FIRST**', $markdown);
    }

    public function test_push_replaces_the_canvas() {
        $this->makeStudent('Alice');
        $this->fakeSlack();

        $this->assertTrue($this->canvas()->push());

        Http::assertSent(function(Request $request) {
            $change = $request['changes'][0];
            return $request->url() == self::EDIT_URL
                && $request->hasHeader('Authorization', 'Bearer xoxb-test')
                && $request['canvas_id'] == 'F0TEST'
                && count($request['changes']) == 1
                && $change['operation'] == 'replace'
                && !isset($change['section_id'])
                && $change['document_content']['type'] == 'markdown'
                && str_contains($change['document_content']['markdown'], "\nAlice ");
        });
    }

    public function test_push_skips_when_nothing_changed() {
        $student = $this->makeStudent('Alice');
        $this->fakeSlack();

        $this->assertTrue($this->canvas()->push());
        $this->assertFalse($this->canvas()->push());
        Http::assertSentCount(1);

        $this->makeEvent($student, 'student_contract');
        $this->assertTrue($this->canvas()->push());
        Http::assertSentCount(2);

        // Renaming a student changes the canvas too
        $student->update(['name' => 'Alicia']);
        $this->assertTrue($this->canvas()->push());
        Http::assertSentCount(3);
    }

    public function test_push_force_skips_the_check() {
        $this->makeStudent('Alice');
        $this->fakeSlack();

        $this->assertTrue($this->canvas()->push());
        $this->assertTrue($this->canvas()->push(force: true));
        Http::assertSentCount(2);
    }

    public function test_failed_push_is_retried_next_time() {
        $this->makeStudent('Alice');
        Http::fake([self::EDIT_URL => Http::sequence()
            ->push(['ok' => false, 'error' => 'canvas_editing_locked'])
            ->push(['ok' => true])]);

        try {
            $this->canvas()->push();
            $this->fail('Expected the push to fail');
        } catch(RegistrationCanvasException $e) {
            $this->assertStringContainsString('canvas_editing_locked', $e->getMessage());
        }

        $this->assertTrue($this->canvas()->push());
        Http::assertSentCount(2);
    }

    public function test_http_errors_throw() {
        $this->makeStudent('Alice');
        Http::fake([self::EDIT_URL => Http::response('', 500)]);

        $this->expectException(RegistrationCanvasException::class);
        $this->canvas()->push();
    }

    public function test_push_requires_configuration() {
        config(['services.slack_canvas.canvas_id' => null]);
        Http::fake();

        $this->expectException(RegistrationCanvasException::class);
        try {
            $this->canvas()->push();
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_push_endpoint() {
        $this->makeStudent('Alice');
        $this->fakeSlack();

        $this->actingAs($this->admin)->postJson('/api/registration/canvas')
            ->assertStatus(200)
            ->assertExactJson(['status' => 'pushed']);
        $this->actingAs($this->admin)->postJson('/api/registration/canvas')
            ->assertStatus(200)
            ->assertExactJson(['status' => 'unchanged']);
        Http::assertSentCount(1);
    }

    public function test_push_endpoint_reports_slack_errors() {
        $this->makeStudent('Alice');
        $this->fakeSlack(['ok' => false, 'error' => 'canvas_not_found']);

        $this->actingAs($this->admin)->postJson('/api/registration/canvas')
            ->assertStatus(502)
            ->assertJsonPath('message', fn($message) => str_contains($message, 'canvas_not_found'));
    }

    public function test_push_endpoint_requires_permission() {
        $this->fakeSlack();

        foreach(['student-lead', 'read-only'] as $role) {
            $this->actingAs($this->userWithRole($role))->postJson('/api/registration/canvas')
                ->assertStatus(403);
        }
        Http::assertNothingSent();
    }

    public function test_command() {
        $this->makeStudent('Alice');
        $this->fakeSlack();

        $this->artisan('registration:push-canvas')
            ->expectsOutputToContain('Updated')
            ->assertSuccessful();
        $this->artisan('registration:push-canvas')
            ->expectsOutputToContain('No changes')
            ->assertSuccessful();
        $this->artisan('registration:push-canvas --force')
            ->expectsOutputToContain('Updated')
            ->assertSuccessful();
        Http::assertSentCount(2);
    }

    public function test_command_fails_on_slack_errors() {
        $this->makeStudent('Alice');
        $this->fakeSlack(['ok' => false, 'error' => 'invalid_auth']);

        $this->artisan('registration:push-canvas')
            ->expectsOutputToContain('invalid_auth')
            ->assertFailed();
    }

    public function test_cache_key_is_only_set_by_successful_pushes() {
        $this->makeStudent('Alice');
        $this->fakeSlack(['ok' => false, 'error' => 'invalid_auth']);

        try {
            $this->canvas()->push();
        } catch(RegistrationCanvasException) {
        }

        $this->assertNull(Cache::get(RegistrationCanvas::HASH_CACHE_KEY));
    }
}
