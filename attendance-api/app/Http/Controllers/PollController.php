<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Carbon\Carbon;

use App\Models\AttendanceEvent;
use App\Models\MeetingEvent;
use App\Models\Student;

class PollController extends Controller
{
    public function poll(Request $request) {
        $request->validate([
            'since' => 'date_format:U|lt:4294967295|required',
            'until' => 'date_format:U|lt:4294967295'
        ]);

        $since_dt = Carbon::createFromTimestamp($request->since);
        $until_dt = null;
        if($request->has('until')) {
            $until_dt = Carbon::createFromTimestamp($request->until);
        }

        $whereGenerator = function($colname) use ($since_dt, $until_dt) {
            return function($query) use ($colname, $since_dt, $until_dt) {
                $query->where($colname, '>=', $since_dt);
                if($until_dt != null) {
                    $query->where($colname, '<=', $until_dt);
                }
            };
        };

        $updated_events = AttendanceEvent::withTrashed()
            ->where($whereGenerator('created_at'))
            ->orWhere($whereGenerator('updated_at'))
            ->orWhere($whereGenerator('deleted_at'))
            ->get();

        $updated_students = Student::withTrashed()
            ->whereIn('id', $updated_events->pluck('student_id')->unique())
            ->orWhere($whereGenerator('created_at'))
            ->orWhere($whereGenerator('updated_at'))
            ->orWhere($whereGenerator('deleted_at'))
            ->get();

        foreach($updated_students as $student) {
            $student->populateAttendanceEvents();
        }

        $meeting_events = MeetingEvent::where($whereGenerator('created_at'))
            ->orWhere($whereGenerator('updated_at'))
            ->get();

        return [
            'updated_students' => $updated_students,
            'meeting_events' => $meeting_events
        ];
    }
}
