<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchStudentRequest;
use App\Http\Requests\StudentDataRequest;

use App\Http\Resources\Student as StudentResource;

use App\Student;


class StudentController extends Controller
{
    public function all() {
        return StudentResource::collection(Student::all());
    }

    public function getById($id) {
        return new StudentResource(Student::findOrFail($id));
    }

    public function search(SearchStudentRequest $request) {
        $validatedData = $request->validated();

        $students = Student::whereRaw("UPPER(`name`) LIKE ?", \strtoupper($validatedData['name']).'%')->get();

        return StudentResource::collection($students);
    }

    public function store(StudentDataRequest $request) {
        $validatedData = $request->validated();

        $student = new Student($validatedData);
        $student->save();

        return (new StudentResource($student))
            ->response()
            ->setStatusCode(201);
    }

    public function update(StudentDataRequest $request, $id) {
        $validatedData = $request->validated();
        $student = Student::findOrFail($id);

        $student->update($validatedData);

        return new StudentResource($student);
    }
}
