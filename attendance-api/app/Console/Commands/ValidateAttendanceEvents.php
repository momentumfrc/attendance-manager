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
        {--max-session-length=12 : The maximum duration (in hours) an attendance session may last before it is considered invalid}
        {--simultaneous-interval= : The maximum time interval between two attendance events that are considered to have occured simultaneously}';

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
                WHERE student_id = e.student_id
                    AND created_at < e.created_at
                    AND deleted_at IS NULL
            )
            WHERE e.deleted_at IS NULL AND e.type = 'check-out' AND e2.type = 'check-out'
            EOF;
        return collect(DB::select($query))->pluck('id');
    }

    private function get_checkouts_from_long_sessions(float $max_session_length) {
        return AttendanceSession::whereRaw('TIMESTAMPDIFF(SECOND, checkin_date, checkout_date) / 3600 > ?', [$max_session_length])->get()->pluck('checkout_id');
    }

    private function get_simultaneous_events(float $simultaneous_interval) {
        $query = <<<'EOF'
            SELECT e.id AS curr_id,
                e.created_at AS curr_date,
                e.type AS curr_type,
                e2.id AS prev_id,
                e2.created_at AS prev_date,
                e2.type AS prev_type
            FROM attendance_events AS e
            JOIN attendance_events AS e2
            ON e2.student_id = e.student_id
            AND e2.created_at = (
                SELECT MAX(created_at)
                FROM attendance_events
                WHERE deleted_at IS NULL AND student_id = e.student_id AND created_at < e.created_at
            )
            WHERE e.deleted_at IS NULL AND e2.deleted_at IS NULL AND TIMESTAMPDIFF(SECOND, e2.created_at, e.created_at) <= ?;
            EOF;

        $events = collect(DB::select($query, [$simultaneous_interval]));

        [$sametype, $difftype] = $events->partition(fn($val) => $val->curr_type == $val->prev_type);

        // If the two events have the same type, the newer event is removed as it is likely a
        // duplicate of the other event
        $sametype_ids = $sametype->pluck('curr_id');

        // If the two events have different type, the both events are removed as the new event is
        // likely an attempt to "undo" the old event
        $difftype_ids = $difftype->flatMap(fn($val) => [$val->curr_id, $val->prev_id]);

        return $sametype_ids->concat($difftype_ids);
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $reasons = [
            'repeated_checkouts' => $this->get_repeated_checkouts(),
            'long_sessions' => $this->get_checkouts_from_long_sessions($this->option('max-session-length')),
            'simultaneous_events' => $this->get_simultaneous_events($this->option('simultaneous-interval') ?: config('config.simultaneous_interval'))
        ];

        $invalid_entries = null;
        foreach($reasons as $reason => $items) {
            if($invalid_entries == null) {
                $invalid_entries = $items;
            } else {
                $invalid_entries = $invalid_entries->concat($items);
            }
        }

        $invalid_entries = $invalid_entries->unique()->values();
        $invalid_entry_count = $invalid_entries->count();

        $this->info("There are $invalid_entry_count invalid attendance records.");

        if($invalid_entry_count == 0) {
            return;
        }

        if($this->option('detail')) {
            $get_reasons = function($model) use ($reasons) {
                $applicable_reasons = [];
                foreach($reasons as $reason => $items) {
                    if($items->contains($model->id)) {
                        $applicable_reasons[] = $reason;
                    }
                }
                return join(", ", $applicable_reasons);
            };

            $models = AttendanceEvent::findMany($invalid_entries);
            $this->line("");
            $this->table(
                ['id', 'created_at', 'updated_at', 'student_id', 'registered_by', 'type', 'reason'],
                $models->map(fn ($model) => [
                    $model->id,
                    $model->created_at->toDateTimeString(),
                    $model->updated_at->toDateTimeString(),
                    $model->student_id,
                    $model->registered_by,
                    $model->type,
                    $get_reasons($model)
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
