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

    public function listMeetings(Request $request) {
        $request->validate([
            'since' => 'date_format:U|lt:4294967295',
            'until' => 'date_format:U|lt:4294967295',
            'timezone' => 'date_format:P',
            'limit' => 'integer|min:1'
        ]);

        $query = DB::table('attendance_sessions')
            ->selectRaw(
                'CAST(CONVERT_TZ(checkin_date, "+0:00", ?) AS DATE) as meeting_date, COUNT(DISTINCT student_id) AS student_count',
                [$request->input('timezone', config('config.default_client_timezone'))]
            );

        if($request->has('since')) {
            $query = $query->where('checkin_date', '>=', Carbon::createFromTimestamp($request->since)->setTime(0, 0, 0));
        }

        if($request->has('until')) {
            $query = $query->where('checkin_date', '<=',  Carbon::createFromTimestamp($request->until)->setTime(23, 59, 59));
        }

        if($request->has('limit')) {
            $query = $query->limit($request->limit);
        }

        $query->groupBy('meeting_date');
        $query->orderBy('meeting_date', 'desc');

        return $query->get();
    }

    public function meetingAttendance(Request $request) {
        $request->validate([
            'on' => 'date_format:Y-m-d',
            'timezone' => 'date_format:P'
        ]);

        $timezone = $request->input('timezone', config('config.default_client_timezone'));

        $query = DB::table('attendance_sessions')->select(['student_id', 'checkin_id', 'checkin_date', 'checkout_id', 'checkout_date']);

        if($request->has('on')) {
            $on = $request->on;
        } else {
            $on = DB::table('attendance_sessions')
                ->selectRaw('CAST(MAX(CONVERT_TZ(checkin_date, "+0:00", ?)) AS DATE) AS max_meeting_date',
                [$timezone]
            )->value('max_meeting_date');
        }

        $on = Carbon::createFromFormat('Y-m-d', $on, $timezone)->setTime(0, 0, 0);

        $query->whereRaw('CAST(CONVERT_TZ(checkin_date, "+0:00", ?) AS DATE) = ?', [$request->input('timezone', config('config.default_client_timezone')), $on->toDateString()]);

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

        $query = DB::table('students')->selectRaw('students.id AS student_id, IFNULL(checkins.count, 0) AS checkin_count, IFNULL(missed.count, 0) AS missed_checkout_count, IFNULL(times.meeting_time, 0) AS meeting_time');
        $checkinQuery = DB::table('attendance_sessions')->selectRaw('student_id, COUNT(checkin_id) AS count');
        $missedQuery = DB::table('attendance_sessions')->selectRaw('student_id, COUNT(checkin_id) AS count')->whereNull('checkout_id');
        $timesQuery = DB::table('attendance_sessions')->selectRaw('student_id, SUM(TIMESTAMPDIFF(SECOND, checkin_date, checkout_date)) as meeting_time')->whereNotNull('checkout_id');

        if($request->has('since')) {
            $since = Carbon::createFromTimestamp($request->since)->setTime(0, 0, 0);
            $checkinQuery->where('checkin_date', '>=', $since);
            $missedQuery->where('checkin_date', '>=', $since);
            $timesQuery->where('checkin_date', '>=', $since);

            $query->whereNull('deleted_at')->orWhere('deleted_at', '>=', $since);
        }

        if($request->has('until')) {
            $until = Carbon::createFromTimestamp($request->until)->setTime(23, 59, 59);
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

        $query->orderBy('meeting_time', 'desc');

        $result = $query->get();
        foreach($result as $row) {
            $row->student_id = (int)$row->student_id;
            $row->checkin_count = (int)$row->checkin_count;
            $row->missed_checkout_count = (int)$row->missed_checkout_count;
            $row->meeting_time = (int)$row->meeting_time;
        }
        return $result;
    }
}
