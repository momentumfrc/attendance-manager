<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Resources\Event as EventResource;

use App\Event;

class EventController extends Controller
{
    public function getByDate($year, $month, $day) {
        $date = Carbon::createFromDate($year, $month, $day);
        $events = Event::whereDate('date', $date)->get();
        return EventResource::collection($events);
    }

    public function getBySubject($id) {
        $events = Event::where('subjectId', '=', $id)->get();
        return EventResource::collection($events);
    }

    public function getByRegistrar($id) {
        $events = Event::where('registrarId', '=', $id)->get();
        return EventResource::collection($events);
    }

    public function store(EventDataRequest $request) {
        $vaildatedData = $request->validated();

        $event = new Event($validatedData);
        $event->save();

        return (new EventResource($event))
            ->response()
            ->setStatusCode(201);
    }

    public function update(EventDataRequest $request, $id) {
        $validatedData = $request->validated();
        $event = Event::findOrFail($id);

        $event->update($validatedData);

        return new EventResource($event);
    }
}
