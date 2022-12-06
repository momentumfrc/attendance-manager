<?php

namespace App\Http\Controllers;

use App\Models\MeetingEvent;
use Illuminate\Http\Request;

use Carbon\Carbon;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class MeetingEventController extends Controller
{
    public function __construct() {
        $this->middleware('can:list meeting events')->only(['index', 'show']);
        $this->middleware('can:add meeting events')->only('store');
        $this->middleware('can:remove meeting events')->only('destroy');
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $request->validate([
            'since' => 'date_format:U|lt:4294967295',
            'until' => 'date_format:U|lt:4294967295',
            'limit' => 'integer|min:1',
            'type' => 'string|in:'.join(',', config('enums.meeting_event_types'))
        ]);
        $response = MeetingEvent::query();

        $response->orderBy('created_at', 'desc');

        if($request->has('since')) {
            $response = $response->where('created_at', '>=', Carbon::createFromTimestamp($request->since));
        }

        if($request->has('until')) {
            $response = $response->where('created_at', '<=',  Carbon::createFromTimestamp($request->until));
        }

        if($request->has('type')) {
            $response = $response->where('type', '=', $request->type);
        }

        if($request->has('limit')) {
            $response = $response->limit($request->limit);
        }

        return $response->get();
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
            'date' => 'date_format:U|lt:4294967295',
            'type' => 'required|string|in:'.join(',', config('enums.meeting_event_types'))
        ]);

        $event = new MeetingEvent;
        $event->type = $request->type;
        $event->registered_by = Auth::id();
        if($request->has('date')) {
            $date = Carbon::createFromTimestamp($request->date);
            $event->created_at = $date;
            $event->updated_at = $date;
        }

        $event->save();

        return $event;
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\MeetingEvent  $meetingEvent
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        return $meetingEvent::find($id);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\MeetingEvent  $meetingEvent
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        $event = MeetingEvent::find($id)->delete();
    }
}
