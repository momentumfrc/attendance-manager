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
}
