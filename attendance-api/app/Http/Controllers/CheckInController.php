<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\CheckIn;
use App\Models\Student;

class CheckInController extends Controller
{

    public function index(Request $request) {
        $request->validate([
            'student_id' => 'exists:students,id',
            'since' => 'date'
        ]);

        $response = CheckIn::query();
        if($request->has('student_id')) {
            $response = $response->where('student_id', '=', $request->student_id);
        }

        if($request->has('since')) {
            $response = $response->where('created_at', '>=', $request->date('since'));
        }

        return $response->get();

    }

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
