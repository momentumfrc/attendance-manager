<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

use App\Models\AttendanceSession;
use App\Models\AttendanceEvent;

use Illuminate\Support\Facades\DB;

/**
 * Runs a few sanity checks on the database of attendance events, and optionally removes bad
 * entries.
 *
 * There are currently 2 checks implemented:
 *
 * 1. Every check-out event must correspond to some check-in event. So if there are two consecutive
 *    check-out events for a given student, with no check-in event between the two, the second
 *    check-out is considered bogus.
 *
 * 2. Any attendance session (check-in and associated check-out) should not have a duration longer
 *    than some reasonable period. This period is configurable using the
 *    --max-session-length argument. If a session is determined to be longer than is reasonable,
 *    the check-out is removed.
 */
class ValidateAttendanceEvents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'validate:attendance
        {--fix : Attempt to fix invalid events}
        {--detail : Show invalid events in detail}
        {--max-session-length=12 : The maximum duration (in hours) an attendance session may last before it is considered invalid}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for invalid attendance sessions, and try to repair the invalid data';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    private function get_repeated_checkouts() {
        $query = <<<'EOF'
            SELECT e.id
            FROM attendance_events AS e
            JOIN attendance_events AS e2
            ON e2.student_id = e.student_id
            AND e2.created_at = (
                SELECT MAX(created_at)
                FROM attendance_events
                WHERE student_id = e.student_id AND created_at < e.created_at
            )
            WHERE e.type = 'check-out' AND e2.type = 'check-out'
            EOF;
        return collect(DB::select($query))->pluck('id');
    }

    private function get_checkouts_from_long_sessions(float $max_session_length) {
        return AttendanceSession::whereRaw('TIMESTAMPDIFF(SECOND, checkin_date, checkout_date) / 3600 > ?', [$max_session_length])->get()->pluck('checkout_id');
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $repeated_checkouts = $this->get_repeated_checkouts();
        $long_session_checkouts = $this->get_checkouts_from_long_sessions($this->option('max-session-length'));

        $invalid_entries = $repeated_checkouts->concat($long_session_checkouts);
        $invalid_entry_count = $invalid_entries->count();

        $this->info("There are $invalid_entry_count invalid attendance records.");

        if($invalid_entry_count == 0) {
            return;
        }

        if($this->option('detail')) {
            $models = AttendanceEvent::findMany($invalid_entries);
            $this->line("");
            $this->table(
                ['id', 'created_at', 'updated_at', 'student_id', 'registered_by', 'type'],
                $models->map(fn ($model) => [
                    $model->id,
                    $model->created_at->toDateTimeString(),
                    $model->updated_at->toDateTimeString(),
                    $model->student_id,
                    $model->registered_by,
                    $model->type
                ])
            );
            $this->line("");
        }

        if($this->option('fix')) {
            $this->warn("This will destory $invalid_entry_count attendance records. You are highly recommended to perform a backup before proceeding.");
            if($this->confirm('Do you wish to continue?')) {
                AttendanceEvent::destroy($invalid_entries);
            }
        }
    }
}
