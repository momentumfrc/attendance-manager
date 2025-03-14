<?php

namespace App\Http\Controllers;

use App\Models\AttendanceEvent;
use App\Models\Student;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

use Illuminate\Validation\Rule;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StudentController extends Controller
{
    public function __construct() {
        $this->middleware('can:list students')->only(['index', 'show']);
        $this->middleware('can:add students')->only('store');
        $this->middleware('can:modify students')->only('update');
        $this->middleware('can:remove students')->only('destroy');
    }

    private function getMostRecentAttendanceEventsForAllStudents($eventType) {
        if($eventType != "check-in" && $eventType != "check-out") {
            throw new InvalidArgumentException("Expected check-in or check-out");
        }

        $query = <<<EOD
            SELECT id, created_at, updated_at, student_id, registered_by, type, deleted_at FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY updated_at DESC) AS rn
                FROM attendance_events
                WHERE type = "$eventType" AND deleted_at IS NULL
            ) AS x WHERE x.rn = 1;
        EOD;

        return AttendanceEvent::hydrate(DB::select($query));
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $request->validate([
            'includeDeleted' => 'boolean'
        ]);

        $students = null;

        if($request->includeDeleted) {
            $students = Student::withTrashed()->get();
        } else {
            $students = Student::all();
        }

        $checkins = $this->getMostRecentAttendanceEventsForAllStudents("check-in")->keyBy('student_id');
        $checkouts = $this->getMostRecentAttendanceEventsForAllStudents("check-out")->keyBy('student_id');

        Log::debug($checkins);

        foreach($students as $student) {
            if($checkins->has($student->id)) {
                $student->last_check_in = $checkins[$student->id];
            } else {
                $student->last_check_in = null;
            }

            if($checkouts->has($student->id)) {
                $student->last_check_out = $checkouts[$student->id];
            } else {
                $student->last_check_out = null;
            }
        }

        return $students;
    }


    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $request->validate([
            'action' => 'required|in:create,restore'
        ]);

        if($request->action == 'create') {
            $request->validate([
                'name' => 'required',
                'graduation_year' => 'date_format:Y'
            ]);

            $name = $request->name;
            $graduation_year = $request->graduation_year;

            $request->validate([
                'name' => Rule::unique('students', 'name')->where(
                    fn (Builder $query) => $query->where('graduation_year', $graduation_year)
                ),
                'graduation_year' => Rule::unique('students', 'graduation_year')->where(
                    fn (Builder $query) => $query->where('name', $name)
                )
            ]);

            $student = new Student;
            $student->name = $request->name;
            $student->graduation_year = $request->graduation_year;
            $student->registered_by = Auth::id();

            $student->save();

            Log::channel('admin')->notice('student '.$student->id.' registered by user '.Auth::id());

            $student->deleted_at = null;

        } else {
            assert($request->action == 'restore');
            $request->validate([
                'id' => 'required|exists:students,id'
            ]);

            $student = Student::withTrashed()->find($request->id);
            $student->restore();

            Log::channel('admin')->notice('student '.$student->id.' restored by user '.Auth::id());
        }

        return $student;
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Student  $student
     * @return \Illuminate\Http\Response
     */
    public function show(String $id)
    {
        $student = Student::withTrashed()->findOrFail($id);

        $student->populateAttendanceEvents();

        return $student;
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\Student $student
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Student $student) {
        $request->validate([
            'name' => 'required',
            'graduation_year' => 'date_format:Y'
        ]);

        $name = $request->name;
        $graduation_year = $request->graduation_year;

        $request->validate([
            'name' => Rule::unique('students', 'name')->ignore($student)->where(
                fn (Builder $query) => $query->where('graduation_year', $graduation_year)
            ),
            'graduation_year' => Rule::unique('students', 'graduation_year')->ignore($student)->where(
                fn (Builder $query) => $query->where('name', $name)
            )
        ]);

        Log::channel('admin')->notice("student {$student->id} updated by user ".Auth::id()
            ." -- updated from (\"{$student->name}\",{$student->graduation_year}) to"
            ." (\"{$name}\",{$graduation_year})");

        $student->update([
            'name' => $request->name,
            'graduation_year' => $request->graduation_year
        ]);

        return $student;
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Student  $student
     * @return \Illuminate\Http\Response
     */
    public function destroy(Student $student)
    {
        Log::channel('admin')->notice('student '.$student->id.' deleted by user '.Auth::id());
        $student->delete();

        return $student;
    }
}
