<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function __construct() {
        $this->middleware('can:add students')->only('store');
        $this->middleware('can:modify students')->only('update');
        $this->middleware('can:remove students')->only('destroy');
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return Student::withTrashed()->get();
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
                'name' => 'required|unique:students,name'
            ]);

            $student = new Student;
            $student->name = $request->name;
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
    public function show(Student $student)
    {
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
            'name'=> [
                'required',
                Rule::unique('students', 'name')->ignore($student)
            ]
            ]);

        Log::channel('admin')->notice('student '.$student->id.' updated by user '.Auth::id().' (renamed from "'.$student->name.'" to "'.$request->name.'")');

        $student->update(['name' => $request->name]);

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
