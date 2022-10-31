<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Carbon\Carbon;

use App\Models\AttendanceEvent;
use App\Models\Student;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class AttendanceEventController extends Controller
{
    public function __construct() {
        $this->middleware('can:take attendance')->only('store');
    }

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

        $student = Student::find($request->student_id);

        $event = new AttendanceEvent;
        $event->type = $request->type;
        $event->registered_by = Auth::id();

        $student->attendanceEvents()->save($event);

        return $event;
    }

    public function show(AttendanceEvent $event)
    {
        return $event;
    }

}
