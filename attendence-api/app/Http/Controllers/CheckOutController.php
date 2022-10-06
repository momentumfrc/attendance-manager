<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\CheckOut;
use App\Models\Student;

class CheckOutController extends Controller
{

    public function store(Request $request)
    {
        $request->validate([
            'student_id' => 'required|exists:students,id'
        ]);

        $student = Student::find($request->student_id);

        $checkOut = new CheckOut;
        $student->checkOuts()->save($checkOut);

        return $checkOut;
    }

    public function show(CheckOut $checkOut)
    {
        return $checkOut;
    }

}
