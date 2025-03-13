<?php

namespace App\Http\Controllers;

use App\Models\AttendanceSession;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceSessionController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $request->validate([
            'student_id' => 'exists:students,id',
            'since' => 'date_format:U|lt:4294967295',
            'until' => 'date_format:U|lt:4294967295',
            'limit' => 'integer|min:1',
            'exclude_partial' => 'boolean'
        ]);

        $response = AttendanceSession::query();

        if($request->has('student_id')) {
            $response = $response->where('student_id', '=', $request->student_id);
        }

        if($request->has('exclude_partial') && $request->exclude_partial) {
            $response = $response->whereNotNull('checkout_id');
        }

        if($request->has('since')) {
            $response = $response->where('checkin_date', '>=', Carbon::createFromTimestamp($request->since));
        }

        if($request->has('until')) {
            $response = $response->where('checkin_date', '<=',  Carbon::createFromTimestamp($request->until));
        }

        if($request->has('limit')) {
            $response = $response->limit($request->limit);
        }

        return $response->get();
    }

}
