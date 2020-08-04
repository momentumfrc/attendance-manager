<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use App\Student;

class StudentTest extends TestCase
{
    use RefreshDatabase;

    public function testGetAllNoEntries() {
        $response = $this->get('/api/users/all');

        $response->assertStatus(200);
        $response->assertJson([
            'data' => []
        ]);
    }

    public function testGetAll() {
        $students = factory(Student::class, 3)->create();
        $response = $this->get('/api/users/all');

        $response->assertStatus(200);

        $response->assertExactJson([
            'data' => $students->map(function($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'role' => $student->role
                ];
            })
        ]);
    }

    public function testGetById() {
        $students = factory(Student::class, 10)->create();
        $student = $students->random();

        $response = $this->get('/api/users/id/'.$student->id);

        $response->assertStatus(200);

        $response->assertExactJson([
            'data' => [
                'id' => $student->id,
                'name' => $student->name,
                'role' => $student->role
            ]
        ]);
    }

    public function testSearch() {
        $students = factory(Student::class, 10)->create();
        $selected = $students->random();

        $name = $selected->name;
        $search = substr($name, 0, rand(1, strlen($name)));

        $results = $students->filter(function($student) use ($search) {
            return strtoupper($search) === strtoupper(substr($student->name, 0, strlen($search)));
        })->values();

        $response = $this->get('/api/users/search?'.\http_build_query(['name'=> $search]));

        $response->assertStatus(200);

        $response->assertExactJson([
            'data' => $results->map(function($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'role' => $student->role
                ];
            })
        ]);
    }

    public function testStore() {
        $student = factory(Student::class)->make();

        $this->assertDatabaseMissing('students',[
            'name' => $student->name,
            'role' => $student->role
        ]);
        
        $response = $this->json('POST', '/api/users', [
            'name' => $student->name,
            'role' => $student->role
        ]);

        $response->assertStatus(201);
        $responseData = $response->decodeResponseJson()['data'];
        $id = $responseData['id'];

        $this->assertDatabaseHas('students',[
            'id' => $id,
            'name' => $student->name,
            'role' => $student->role
        ]);
    }

    public function testPut() {
        $student = factory(Student::class)->create();

        $newname = 'Dr. Test User';
        $newrole = 'mentor';

        $response = $this->json('PUT', '/api/users/'.$student->id, [
            'name' => $newname,
            'role' => $newrole
        ]);

        $response->assertStatus(200);

        $student->refresh();

        $this->assertEquals($newname, $student->name);
        $this->assertEquals($newrole, $student->role);
    }
}
