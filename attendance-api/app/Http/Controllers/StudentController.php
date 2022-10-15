<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\CheckIn;
use App\Models\CheckOut;
use Illuminate\Http\Request;

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
        return Student::all();
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
            'name' => 'required|unique:students,name'
        ]);

        $student = new Student;

        $student->name = $request->name;

        $student->save();

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
            'name'=>'required|unique:students,name'
        ]);

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
        $student->delete();
    }
}
