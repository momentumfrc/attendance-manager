<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
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

    // Markdown tables stretch to the canvas width, which is too wide on phones, so each section is a
    // monospaced table in a code block instead.
    private const STEP_COLUMNS = [
        'student_contract' => 'Contract',
        'shared_science' => 'SSCI',
        'first_cr' => 'FIRST'
    ];

    // Shortcodes don't render in code blocks, so these are the emoji themselves
    private const YES = '✅';
    private const NO = '❌';

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

        // Same disambiguation as the web app's StudentList.getQualifiedName
        $nameCounts = $students->countBy('name');
        $names = $students->mapWithKeys(function($student) use ($nameCounts) {
            $name = $student->name;
            if($nameCounts[$student->name] > 1 && $student->graduation_year) {
                $name .= " ({$student->graduation_year})";
            }
            // A backtick fence in a name would end the code block early
            return [$student->id => str_replace('`', "'", $name)];
        });
        $nameWidth = max(mb_strwidth('Student'), $names->map(fn($name) => mb_strwidth($name))->max() ?? 0);

        $lines = [
            '# Steps',
            '',
            'Every student must complete these steps each season. '. self::YES.' means the step is done, and '.self::NO.' means it still needs to be done.',
            '1. **Contract**: the student contract, completed by the student',
            '2. **SSCI**: Shared Science registration (dues), completed by a parent or guardian',
            '3. **FIRST**: the FIRST consent and release form, completed by a parent or guardian',
            '',
            '# Restrictions',
            '- Students must sign the student contract at their **first meeting** and may not attend further meetings until it is signed',
            '- Students may **use tools** once they have completed the student contract and Shared Science registration',
            '- Students may **attend FIRST events** once they have completed the student contract and the FIRST consent and release form',
            '- Students must be **fully registered** (all '.self::YES.') to attend meetings after Halloween',
            ''
        ];

        // Like the registration spreadsheet, students are grouped by what they're allowed to do
        $sections = [
            'Fully Registered (Tools OK and Events OK)' => [true, true],
            'Missing FIRST (No Events)' => [true, false],
            'Missing Shared Science (No Tools)' => [false, true],
            'Missing Multiple (No Tools, No Events)' => [false, false]
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

            $lines[] = '```';
            $lines[] = $this->renderRow($this->pad('Student', $nameWidth), self::STEP_COLUMNS);
            $lines[] = $this->renderRow(
                str_repeat('-', $nameWidth),
                array_map(fn($header) => str_repeat('-', mb_strwidth($header)), self::STEP_COLUMNS)
            );
            foreach($sectionStudents as $student) {
                $marks = [];
                foreach(self::STEP_COLUMNS as $step => $header) {
                    $marks[$step] = $this->pad(
                        $this->isDone($student, $step) ? self::YES : self::NO,
                        mb_strwidth($header), STR_PAD_BOTH
                    );
                }
                $lines[] = $this->renderRow($this->pad($names[$student->id], $nameWidth), $marks);
            }
            $lines[] = '```';
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    /**
     * Pad text with spaces to a display width. Emoji and some other characters take up two columns
     * in a monospaced font, so padding by character count would misalign them.
     */
    private function pad(string $text, int $width, int $type = STR_PAD_RIGHT): string {
        return str_pad($text, strlen($text) + max(0, $width - mb_strwidth($text)), ' ', $type);
    }

    private function renderRow(string $name, array $cells): string {
        return $name.' '.implode(' ', $cells);
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
}
