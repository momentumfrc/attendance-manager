<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\CheckIn;
use App\Models\Student;

class CheckInController extends Controller
{

    public function store(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id'
        ]);

        $student = Student::find($request->student_id);

        $checkIn = new CheckIn;
        $student->checkIns()->save($checkIn);

        return $checkIn;
    }

    public function show(CheckIn $checkIn)
    {
        return $checkIn;
    }

}
