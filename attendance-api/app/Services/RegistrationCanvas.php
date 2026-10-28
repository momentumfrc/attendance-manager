<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

use App\Models\Student;

/**
 * Publishes every student's registration status to a Slack canvas, so students can check what they
 * still need to do without logging in to the app. The app is the source of truth: each push
 * overwrites the whole canvas.
 */
class RegistrationCanvas
{
    /** The hash of the last canvas content Slack accepted. */
    public const HASH_CACHE_KEY = 'registration_canvas:last_pushed_hash';

    private const EDIT_URL = 'https://slack.com/api/canvases.edit';

    // Canvas tables are limited to 300 cells, header row included. Four columns allow 74 students.
    private const STUDENTS_PER_TABLE = 70;

    private const YES = ':white_check_mark:';
    private const NO = ':x:';

    /**
     * Push the canvas to Slack, unless it hasn't changed since the last successful push.
     *
     * @return bool whether the canvas was pushed
     * @throws RegistrationCanvasException
     */
    public function push(bool $force = false): bool {
        $token = config('services.slack_canvas.bot_token');
        $canvasId = config('services.slack_canvas.canvas_id');
        if(empty($token) || empty($canvasId)) {
            throw new RegistrationCanvasException(
                'The registration canvas is not configured. Set SLACK_BOT_TOKEN and SLACK_REGISTRATION_CANVAS_ID.'
            );
        }

        $body = $this->render();
        $hash = hash('sha256', $body);
        if(!$force && Cache::get(self::HASH_CACHE_KEY) === $hash) {
            return false;
        }

        $timezone = config('services.slack_canvas.timezone');
        $markdown = $body."\n_Last updated ".now($timezone)->format('M j, Y g:i A T')."_\n";

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->post(self::EDIT_URL, [
                    'canvas_id' => $canvasId,
                    'changes' => [[
                        // Without a section_id, replace overwrites the whole canvas
                        'operation' => 'replace',
                        'document_content' => ['type' => 'markdown', 'markdown' => $markdown]
                    ]]
                ])
                ->throw();
        } catch(ConnectionException|RequestException $e) {
            throw new RegistrationCanvasException('Could not reach Slack: '.$e->getMessage(), previous: $e);
        }

        if(!$response->json('ok')) {
            throw new RegistrationCanvasException('Slack rejected the canvas update: '.$response->json('error', 'unknown error'));
        }

        Cache::forever(self::HASH_CACHE_KEY, $hash);
        return true;
    }

    /**
     * The canvas markdown, without the "last updated" footer.
     */
    public function render(): string {
        $students = Student::all()->sortBy([
            fn($a, $b) => strcasecmp($a->name, $b->name),
            fn($a, $b) => ($a->graduation_year ?? 0) <=> ($b->graduation_year ?? 0)
        ])->values();
        Student::populateRegistrationFor($students);

        $nameCounts = $students->countBy('name');

        $lines = [
            '# Student Registration',
            '',
            'Every student must complete these steps each season:',
            '- **Student contract**: completed by the student',
            '- **Shared Science registration** (dues): completed by a parent or guardian',
            '- **FIRST consent and release form**: completed by a parent or guardian',
            '',
            'Students may **use tools** once they have completed the student contract and Shared Science registration.',
            'Students may **attend FIRST events** once they have completed the student contract and the FIRST consent and release form.',
            ''
        ];

        // Like the registration spreadsheet, students are grouped by what they're allowed to do
        $sections = [
            'Tools OK, Events OK' => [true, true],
            'Tools OK, No Events' => [true, false],
            'No Tools, Events OK' => [false, true],
            'No Tools, No Events' => [false, false]
        ];

        foreach($sections as $title => [$tools, $events]) {
            $lines[] = "## {$title}";
            $lines[] = '';

            $sectionStudents = $students->filter(
                fn($student) => $this->canUseTools($student) === $tools && $this->canAttendEvents($student) === $events
            );

            if($sectionStudents->isEmpty()) {
                $lines[] = '_No students_';
                $lines[] = '';
                continue;
            }

            foreach($sectionStudents->chunk(self::STUDENTS_PER_TABLE) as $chunk) {
                $lines[] = '| Student | Student contract (student) | Shared Science (parent) | FIRST C&R (parent) |';
                $lines[] = '| --- | --- | --- | --- |';
                foreach($chunk as $student) {
                    $lines[] = $this->renderRow($student, $nameCounts);
                }
                $lines[] = '';
            }
        }

        return implode("\n", $lines);
    }

    private function isDone(Student $student, string $step): bool {
        return $student->registration[$step] !== null;
    }

    private function canUseTools(Student $student): bool {
        return $this->isDone($student, 'student_contract') && $this->isDone($student, 'shared_science');
    }

    private function canAttendEvents(Student $student): bool {
        return $this->isDone($student, 'student_contract') && $this->isDone($student, 'first_cr');
    }

    private function renderRow(Student $student, Collection $nameCounts): string {
        // Same disambiguation as the web app's StudentList.getQualifiedName
        $name = $student->name;
        if($nameCounts[$student->name] > 1 && $student->graduation_year) {
            $name .= " ({$student->graduation_year})";
        }

        $cells = [
            $this->escape($name),
            $this->check($this->isDone($student, 'student_contract')),
            $this->check($this->isDone($student, 'shared_science')),
            $this->check($this->isDone($student, 'first_cr'))
        ];

        return '| '.implode(' | ', $cells).' |';
    }

    private function check(bool $done): string {
        return $done ? self::YES : self::NO;
    }

    /** Escape characters that would break the table or be read as formatting. */
    private function escape(string $text): string {
        return preg_replace('/([\\\\`*_~|\[\]<>#:])/', '\\\\$1', $text);
    }
}
