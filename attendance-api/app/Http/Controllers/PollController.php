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

        $query = AttendanceEvent::withTrashed()->where('created_at', '>=', $since_dt);
        if($until_dt != null) {
            $query->where('created_at', '<=',  $until_dt);
        }

        $query->orWhere(function($query) use ($since_dt, $until_dt) {
            $query->where('deleted_at', '>=', $since_dt);
            if($until_dt != null) {
                $query->where('deleted_at', '<=',  $until_dt);
            }
        });

        $updated_events = $query->get();
        $updated_students = Student::findMany($updated_events->pluck('student_id')->unique());

        $query = MeetingEvent::where('created_at', '>=', $since_dt);
        if($until_dt != null) {
            $query = $query->where('created_at', '<=', $until_dt);
        }
        $meeting_events = $query->get();

        return [
            'updated_students' => $updated_students,
            'meeting_events' => $meeting_events
        ];
    }
}
