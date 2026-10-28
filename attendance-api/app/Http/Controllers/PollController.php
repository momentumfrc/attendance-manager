<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Carbon\Carbon;

use App\Models\AttendanceEvent;
use App\Models\MeetingEvent;
use App\Models\RegistrationEvent;
use App\Models\Student;
use App\Support\PollChangeMarker;

class PollController extends Controller
{
    public function poll(Request $request) {
        $request->validate([
            'since' => 'date_format:U|lt:4294967295|required',
            'until' => 'date_format:U|lt:4294967295'
        ]);

        // Almost every poll finds nothing new, so skip the database entirely when we know nothing changed
        $last_change = PollChangeMarker::lastChange();
        if($last_change !== null && $last_change < $request->since) {
            return [
                'updated_students' => [],
                'meeting_events' => []
            ];
        }

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

        $updated_registrations = RegistrationEvent::withTrashed()
            ->where($whereGenerator('created_at'))
            ->orWhere($whereGenerator('updated_at'))
            ->orWhere($whereGenerator('deleted_at'))
            ->get(['student_id', 'event_type']);

        // A new season (or undoing one) changes every student's registration
        $season_changed = $updated_registrations->contains(
            'event_type', config('enums.registration_event_types')['NEW_SEASON']
        );

        $updated_students = Student::withTrashed()
            ->whereIn('id', $updated_events->pluck('student_id')->unique())
            ->orWhereIn('id', $updated_registrations->pluck('student_id')->filter()->unique())
            ->orWhere($whereGenerator('created_at'))
            ->orWhere($whereGenerator('updated_at'))
            ->orWhere($whereGenerator('deleted_at'))
            ->when($season_changed, fn($query) => $query->orWhereNull('deleted_at'))
            ->get();

        Student::populateAttendanceEventsFor($updated_students);
        Student::populateRegistrationFor($updated_students);

        $meeting_events = MeetingEvent::where($whereGenerator('created_at'))
            ->orWhere($whereGenerator('updated_at'))
            ->get();

        return [
            'updated_students' => $updated_students,
            'meeting_events' => $meeting_events
        ];
    }
}
