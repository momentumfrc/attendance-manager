<?php

namespace App\Http\Controllers;

use App\Models\RegistrationEvent;
use App\Models\Student;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Students' registration status is read from the students endpoints. This controller only records
 * new registration events, and soft-deletes them to undo them.
 */
class RegistrationEventController extends Controller
{
    public function __construct() {
        $this->middleware('can:modify student registration');
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $newSeason = config('enums.registration_event_types')['NEW_SEASON'];

        $request->validate([
            'event_type' => 'required|string|in:'.join(',', config('enums.registration_event_types')),
            'student_id' => [
                "required_unless:event_type,{$newSeason}",
                "prohibited_if:event_type,{$newSeason}",
                'integer',
                Rule::exists('students', 'id')->whereNull('deleted_at')
            ]
        ]);

        if($request->event_type != $newSeason) {
            $student = Student::findOrFail($request->student_id);
            $student->populateRegistration();
            if($student->registration[$request->event_type] !== null) {
                throw ValidationException::withMessages([
                    'event_type' => 'The student has already completed this registration step.'
                ]);
            }
        }

        $event = new RegistrationEvent;
        $event->student_id = $request->student_id;
        $event->event_type = $request->event_type;
        $event->registered_by = Auth::id();

        $event->save();

        return $event;
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        $event = RegistrationEvent::findOrFail($id);
        $event->delete();

        return $event;
    }
}
