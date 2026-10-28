<?php

namespace App\Http\Controllers;

use App\Models\RegistrationEvent;
use App\Models\Student;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Students' registration status is read from the students endpoints. This controller only records
 * new registration events, and soft-deletes them to undo them.
 */
class RegistrationEventController extends Controller
{
    private const PERMISSIONS = ['modify student registration', 'modify student contract'];

    /**
     * The permission needed to add or remove an event of the given type. Student leads may record
     * that a student signed the contract, but only mentors may change anything else.
     */
    private function requiredPermission(string $eventType): string {
        if($eventType == config('enums.registration_event_types')['STUDENT_CONTRACT']) {
            return 'modify student contract';
        }
        return 'modify student registration';
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        // Reject users who can't modify anything before validating
        if(Gate::none(self::PERMISSIONS)) {
            abort(403);
        }

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

        Gate::authorize($this->requiredPermission($request->event_type));

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
        if(Gate::none(self::PERMISSIONS)) {
            abort(403);
        }

        $event = RegistrationEvent::findOrFail($id);
        Gate::authorize($this->requiredPermission($event->event_type));
        $event->delete();

        return $event;
    }
}
