<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use Carbon\Carbon;

use App\Event;

class EventsTest extends TestCase
{

    use RefreshDatabase;

    public function testGetByDate() {
        $events = factory(Event::class, 10)->create();
        $date = $events->random()->date;

        $expected = $events->filter(function($event) use ($date) {
            return $event->date->toDateString() === $date->toDateString();
        })->values();

        $response = $this->get('/api/events/date/'.$date->year.'/'.$date->month.'/'.$date->day);

        $response->assertStatus(200);

        $response->assertJson([
            'data' => $expected->map(function($event) {
                return [
                    'id' => $event->id,
                    'subjectId' => $event->subjectId,
                    'type' => $event->type,
                    'registrarId' => $event->registrarId,
                    'date' => '@'.$event->date->timestamp,
                    'notes' => $event->notes
                ];
            })->toArray()
        ]);
    }

    public function testGetBySubject() {
        $events = factory(Event::class, 10)->create();
        $subject = $events->random()->subjectId;

        $expected = $events->filter(function($event) use ($subject) {
            return $event->subjectId === $subject;
        })->values();

        $response = $this->get('/api/events/subject/'.$subject);

        $response->assertStatus(200);

        $response->assertJson([
            'data' => $expected->map(function($event) {
                return [
                    'id' => $event->id,
                    'subjectId' => $event->subjectId,
                    'type' => $event->type,
                    'registrarId' => $event->registrarId,
                    'date' => '@'.$event->date->timestamp,
                    'notes' => $event->notes
                ];
            })->toArray()
        ]);
    }

    public function testGetByRegistrar() {
        $events = factory(Event::class, 10)->create();
        $registrar = $events->random()->registrarId;

        $expected = $events->filter(function($event) use ($registrar) {
            return $event->registrarId === $registrar;
        })->values();

        $response = $this->get('/api/events/registrar/'.$registrar);

        $response->assertStatus(200);

        $response->assertJson([
            'data' => $expected->map(function($event) {
                return [
                    'id' => $event->id,
                    'subjectId' => $event->subjectId,
                    'type' => $event->type,
                    'registrarId' => $event->registrarId,
                    'date' => '@'.$event->date->timestamp,
                    'notes' => $event->notes
                ];
            })->toArray()
        ]);
    }

    public function testStore() {
        $event = factory(Event::class)->make();

        $this->assertDatabaseMissing('events', [
            'subjectId' => $event->subjectId,
            'type' => $event->type,
            'notes' => $event->notes
        ]);

        $response = $this->json('POST', '/api/events', [
            'subjectId' => $event->subjectId,
            'type' => $event->type,
            'notes' => $event->notes
        ]);

        $response->assertStatus(201);

        $response->assertJson([
            'data' => [
                'subjectId' => $event->subjectId,
                'type' => $event->type,
                'notes' => $event->notes
            ]
        ]);

        $responseData = $response->decodeResponseJson()['data'];
        $id = $responseData['id'];
        $event->registrarId = $responseData['registrarId'];
        $event->date = new Carbon($responseData['date']);

        $this->assertDatabaseHas('events', [
            'id' => $id,
            'subjectId' => $event->subjectId,
            'type' => $event->type,
            'registrarId' => $event->registrarId,
            'date' => $event->date,
            'notes' => $event->notes
        ]);
    }

    public function testPut() {
        $event = factory(Event::class)->create();

        $newSubjectId = 10;
        $newType = 'in';
        $newNotes = 'Lorem ipsum dolor';

        $response = $this->json('PUT', '/api/events/'.$event->id, [
            'subjectId' => $newSubjectId,
            'type' => $newType,
            'notes' => $newNotes,
        ]);

        $response->assertStatus(200);

        $event->refresh();

        $this->assertEquals($newSubjectId, $event->subjectId);
        $this->assertEquals($newType, $event->type);
        $this->assertEquals($newNotes, $event->notes);
    }
}
