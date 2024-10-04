<?php

namespace App\Http\Controllers;

use App\Models\StudentProfileImage;
use App\Models\Student;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class StudentProfileImageController extends Controller
{
    public function __construct() {
        $this->middleware('can:view student images')->only('show');
        $this->middleware('can:modify student images')->only(['store', 'destroy']);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Note: maximum file size of 1024kb
        $request->validate([
            'student_id' => 'required|exists:students,id,deleted_at,NULL',
            'image' => 'required|image|mimes:jpeg,png,jpg|max:1024'
        ]);

        $student = Student::find($request->student_id);

        if($student->profileImage !== null) {
            throw ValidationException::withMessages([
                'student_id' => ['A profile image already exists for this student.']
            ]);
        }

        $path = $request->file('image')->store('student_profiles');
        $photoModel = new StudentProfileImage;
        $photoModel->path = $path;
        $photoModel->student_id = $student->id;
        $photoModel->uploaded_by = Auth::id();

        $student->profileImage()->save($photoModel);

        return $photoModel;
    }

    /**
     * Display the specified resource.
     */
    public function show(String $id)
    {
        $photoModel = StudentProfileImage::findOrFail($id);
        return Storage::response($photoModel->path);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(String $id)
    {
        $photoModel = StudentProfileImage::findOrFail($id);
        Storage::delete($photoModel->path);
        $photoModel->delete();
        return ['status' => 'ok'];
    }
}
