<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Carbon\Carbon;

use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function __construct() {
        $this->middleware('can:view stats');
    }

    public function meetings(Request $request) {
        $request->validate([
            'since' => 'date_format:U|lt:4294967295',
            'until' => 'date_format:U|lt:4294967295',
            'limit' => 'integer|min:1'
        ]);

        $query = DB::table('attendance_sessions')
            ->selectRaw('DATE(checkin_date) as meeting_date, COUNT(DISTINCT student_id) AS student_count');

        if($request->has('since')) {
            $query = $query->where('checkin_date', '>=', Carbon::createFromTimestamp($request->since)->setTime(0, 0, 0));
        }

        if($request->has('until')) {
            $query = $query->where('checkin_date', '<=',  Carbon::createFromTimestamp($request->until)->setTime(23, 59, 59));
        }

        if($request->has('limit')) {
            $query = $query->limit($request->limit);
        }

        $query->groupBy('meeting_date');
        $query->orderBy('meeting_date', 'desc');

        return $query->get();
    }
}
