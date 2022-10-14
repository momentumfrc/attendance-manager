<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Carbon\Carbon;

use App\Models\CheckIn;
use App\Models\Student;

use Illuminate\Support\Facades\Log;

class CheckInController extends Controller
{

    public function index(Request $request) {
        $request->validate([
            'student_id' => 'exists:students,id',
            'since' => 'date_format:U|lt:4294967295'
        ]);

        $response = CheckIn::query();
        if($request->has('student_id')) {
            $response = $response->where('student_id', '=', $request->student_id);
        }

        if($request->has('since')) {
            Log::debug('Get all checkins since '.Carbon::createFromTimestamp($request->since)->toDateTimeString());
            $response = $response->where('created_at', '>=', Carbon::createFromTimestamp($request->since));
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
