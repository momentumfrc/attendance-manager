<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Console\Services\CommandService;

use App\Models\MeetingEvent;

use Illuminate\Support\Facades\DB;

class EndMeeting extends Command
{
    protected $signature = 'meetings:end {--force : Register an event even if all students are checked-out}';
    protected $description = 'Register an end-of-meeting event if any stduent is checked-in.';

    private CommandService $commandService;

    public function __construct(CommandService $commandService) {
        parent::__construct();
        $this->commandService = $commandService;
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $countQuery = <<<'EOD'
            SELECT COUNT(student_id) as student_count
            FROM students
            JOIN
            (
                SELECT attendance_events.student_id, attendance_events.type
                FROM attendance_events
                INNER JOIN
                (
                    SELECT MAX(created_at) as latest_date, student_id
                    FROM attendance_events
                    WHERE deleted_at IS NULL
                    GROUP BY student_id
                    HAVING latest_date > (
                        SELECT MAX(created_at) as latest_eom
                        FROM meeting_events
                        WHERE `type` = 'end-of-meeting'
                    )
                ) AS latest_table
                ON attendance_events.student_id = latest_table.student_id
                AND attendance_events.created_at = latest_table.latest_date
                WHERE attendance_events.deleted_at IS NULL
            ) AS events
            ON students.id = events.student_id
            WHERE `type` = 'check-in';
            EOD;

        $studentCount = DB::select($countQuery)[0]->student_count;

        if($studentCount == 0 && !$this->option('force')) {
            $this->info('No students are checked out, and \'--force\' was not specified. Skipping event creation.');
            return;
        }

        $systemUser = $this->commandService->getSystemUser();

        $event = new MeetingEvent;
        $event->type = config('enums.meeting_event_types')['END_OF_MEETING'];
        $event->registered_by = $systemUser->id;

        $event->save();

        $this->info('Registered event m-' . $event->id);
    }
}
