<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Carbon\Carbon;
use Carbon\CarbonTimeZone;

use Illuminate\Support\Facades\DB;
use \App\Models\AttendanceSession;

class ReportController extends Controller
{
    public function __construct() {
        $this->middleware('can:view stats');
    }

    /**
     * Validation rule for a client timezone: either a UTC offset (e.g. "-08:00") or an IANA name (e.g. "America/Los_Angeles").
     * Only IANA names account for daylight saving time.
     */
    private static function timezoneRule() {
        return function(string $attribute, mixed $value, \Closure $fail) {
            $isOffset = is_string($value) && preg_match('/^[+-]\d{2}:\d{2}$/', $value);
            $isName = is_string($value) && in_array($value, \DateTimeZone::listIdentifiers(\DateTimeZone::ALL_WITH_BC), true);
            if(!$isOffset && !$isName) {
                $fail("The $attribute must be a UTC offset or an IANA timezone name.");
            }
        };
    }

    private static function clientTimezone(Request $request): CarbonTimeZone {
        return new CarbonTimeZone($request->input('timezone', config('config.default_client_timezone')));
    }

    public function listMeetings(Request $request) {
        $request->validate([
            'since' => 'date_format:U|lt:4294967295',
            'until' => 'date_format:U|lt:4294967295',
            'timezone' => self::timezoneRule(),
            'limit' => 'integer|min:1'
        ]);

        $timezone = self::clientTimezone($request);

        $query = DB::table('attendance_sessions')->select(['checkin_date', 'student_id']);

        if($request->has('since')) {
            $query = $query->where('checkin_date', '>=', Carbon::createFromTimestamp($request->since));
        }

        if($request->has('until')) {
            $query = $query->where('checkin_date', '<=',  Carbon::createFromTimestamp($request->until));
        }

        // Group by date in PHP, since the database may not have named timezones loaded for CONVERT_TZ
        $meetings = $query->get()
            ->groupBy(fn($session) => Carbon::parse($session->checkin_date, 'UTC')->setTimezone($timezone)->toDateString())
            ->map(fn($sessions, $date) => [
                'meeting_date' => $date,
                'student_count' => $sessions->pluck('student_id')->unique()->count()
            ])
            ->sortKeysDesc()
            ->values();

        if($request->has('limit')) {
            $meetings = $meetings->take((int)$request->limit);
        }

        return $meetings;
    }

    public function meetingAttendance(Request $request) {
        $request->validate([
            'on' => 'date_format:Y-m-d',
            'timezone' => self::timezoneRule()
        ]);

        $timezone = self::clientTimezone($request);

        $query = DB::table('attendance_sessions')->select(['student_id', 'checkin_id', 'checkin_date', 'checkout_id', 'checkout_date']);

        if($request->has('on')) {
            $on = Carbon::createFromFormat('Y-m-d', $request->on, $timezone);
        } else {
            $latest = DB::table('attendance_sessions')->max('checkin_date');
            $on = $latest ? Carbon::parse($latest, 'UTC')->setTimezone($timezone) : Carbon::now($timezone);
        }

        $on = $on->startOfDay();

        $query->where('checkin_date', '>=', $on->copy()->utc())
            ->where('checkin_date', '<', $on->copy()->addDay()->utc());

        $query->orderBy('checkin_date', 'ASC');

        $students = AttendanceSession::hydrate($query->get()->toArray());

        return array(
            "meeting_date" => $on,
            "attendance_sessions" => $students
        );
    }

    public function studentStats(Request $request) {
        $request->validate([
            'since' => 'date_format:U|lt:4294967295',
            'until' => 'date_format:U|lt:4294967295'
        ]);

        $query = DB::table('students')->selectRaw('students.id AS student_id, students.name AS student_name, IFNULL(checkins.count, 0) AS checkin_count, IFNULL(missed.count, 0) AS missed_checkout_count, IFNULL(times.meeting_time, 0) AS meeting_time');
        $checkinQuery = DB::table('attendance_sessions')->selectRaw('student_id, COUNT(checkin_id) AS count');
        $missedQuery = DB::table('attendance_sessions')->selectRaw('student_id, COUNT(checkin_id) AS count')->whereNull('checkout_id');
        $timesQuery = DB::table('attendance_sessions')->selectRaw('student_id, SUM(TIMESTAMPDIFF(SECOND, checkin_date, checkout_date)) as meeting_time')->whereNotNull('checkout_id');

        if($request->has('since')) {
            $since = Carbon::createFromTimestamp($request->since);
            $checkinQuery->where('checkin_date', '>=', $since);
            $missedQuery->where('checkin_date', '>=', $since);
            $timesQuery->where('checkin_date', '>=', $since);

            $query->whereNull('deleted_at')->orWhere('deleted_at', '>=', $since);
        }

        if($request->has('until')) {
            $until = Carbon::createFromTimestamp($request->until);
            $checkinQuery->where('checkin_date', '<=',  $until);
            $missedQuery->where('checkin_date', '<=',  $until);
            $timesQuery->where('checkin_date', '<=',  $until);
        }

        $checkinQuery->groupBy('student_id');
        $missedQuery->groupBy('student_id');
        $timesQuery->groupBy('student_id');

        $query->leftJoinSub($checkinQuery, 'checkins', 'students.id', '=', 'checkins.student_id');
        $query->leftJoinSub($missedQuery, 'missed', 'students.id', '=', 'missed.student_id');
        $query->leftJoinSub($timesQuery, 'times', 'students.id', '=', 'times.student_id');

        $query->orderBy('meeting_time', 'desc')->orderBy('checkin_count', 'desc')->orderBy('student_name', 'asc');

        $result = $query->get();
        foreach($result as $row) {
            $row->student_id = (int)$row->student_id;
            $row->checkin_count = (int)$row->checkin_count;
            $row->missed_checkout_count = (int)$row->missed_checkout_count;
            $row->meeting_time = (int)$row->meeting_time;
            unset($row->student_name);
        }
        return $result;
    }
}
