<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Carbon\Carbon;

use App\Models\AttendanceEvent;
use App\Models\Student;

use Illuminate\Validation\ValidationException;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class AttendanceEventController extends Controller
{
    public function index(Request $request) {
        $request->validate([
            'student_id' => 'exists:students,id',
            'since' => 'date_format:U|lt:4294967295',
            'until' => 'date_format:U|lt:4294967295',
            'limit' => 'integer|min:1',
            'type' => 'string|in:'.join(',', config('enums.attendance_event_types'))
        ]);

        $response = AttendanceEvent::query();

        $response->orderBy('created_at', 'desc');

        if($request->has('student_id')) {
            $response = $response->where('student_id', '=', $request->student_id);
        }

        if($request->has('since')) {
            $response = $response->where('created_at', '>=', Carbon::createFromTimestamp($request->since));
        }

        if($request->has('until')) {
            $response = $response->where('created_at', '<=',  Carbon::createFromTimestamp($request->until));
        }

        if($request->has('type')) {
            $response = $response->where('type', '=', $request->type);
        }

        if($request->has('limit')) {
            $response = $response->limit($request->limit);
        }

        return $response->get();

    }

    public function store(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id',
            'type' => 'required|string|in:'.join(',', config('enums.attendance_event_types'))
        ]);

        $permission = [
            config('enums.attendance_event_types')['CHECK_IN'] => 'student check in',
            config('enums.attendance_event_types')['CHECK_OUT'] => 'student check out'
        ][$request->type];

        Gate::authorize($permission);

        $student = Student::find($request->student_id);

        $event = new AttendanceEvent;
        $event->type = $request->type;
        $event->registered_by = Auth::id();

        $last_event = $student->attendanceEvents()->orderBy('created_at', 'desc')->first();
        if($last_event != null && Carbon::now()->diffInSeconds($last_event->created_at) < config('config.simultaneous_interval')) {
            if($request->type == $last_event->type) {
                throw ValidationException::withMessages([
                    'student_id' => ['A recent '.$request->type.' already exists for this student.']
                ]);
            } else {
                // If two events have different type, the new event is saved, but both the previous
                // and current events are soft-deleted, since the new event is likely an attempt
                // to "undo" the old event
                $last_event->delete();
                $student->attendanceEvents()->save($event)->delete();

                return $event;
            }
        }

        $student->attendanceEvents()->save($event);
        return $event;
    }

    public function show(String $id)
    {
        return AttendanceEvent::withTrashed()->find($id);
    }

    public function destroy(AttendanceEvent $event) {
        if(Carbon::now()->diffInSeconds($event->created_at) > config('config.undo_window')) {
            throw ValidationException::withMessages([
                'id' => ['The record cannot be removed as the undo window has elapsed.']
            ]);
        }

        $event->delete();
    }

}
