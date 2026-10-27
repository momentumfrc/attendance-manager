<?php

namespace App\Http\Controllers;

use App\Models\StudentProfileImage;
use App\Models\Student;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

use Illuminate\Support\Str;

use Spatie\Image\Image;
use Spatie\Image\Enums\Fit;

class StudentProfileImageController extends Controller
{
    public function __construct() {
        $this->middleware('can:view student images')->only(['index', 'show']);
        $this->middleware('can:modify student images')->only(['store', 'destroy']);
    }

    /**
     * Send the image data for many images in a single response.
     *
     * Serving each image with its own request would boot laravel once per image, which makes pages
     * showing every student's image very slow. Images can be limited to a comma-separated list of ids.
     */
    public function index(Request $request)
    {
        $request->validate([
            'ids' => ['sometimes', 'string', 'regex:/^\d+(,\d+)*$/']
        ]);

        $query = StudentProfileImage::query()->orderBy('id');
        if($request->has('ids')) {
            $query->whereIn('id', explode(',', $request->ids));
        }
        $images = $query->get(['id', 'student_id', 'path']);

        // Paths are unique and never rewritten in place, so they identify the content of each image.
        // This lets us answer revalidation requests without reading any files.
        $response = new JsonResponse();
        $response->setEtag(md5($images->map(fn($image) => $image->id.':'.$image->path)->join(',')));
        $response->setPrivate();
        $response->headers->addCacheControlDirective('no-cache');

        if($response->isNotModified($request)) {
            return $response;
        }

        return $response->setData($images->map(function ($image) {
            $data = Storage::get($image->path);
            if($data === null) {
                Log::warning("Profile image {$image->id} is missing from disk", ['path' => $image->path]);
                return null;
            }

            return [
                'id' => $image->id,
                'student_id' => $image->student_id,
                'data' => base64_encode($data)
            ];
        })->filter()->values());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Note: maximum file size of 1024kb
        $request->validate([
            'student_id' => ['required', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'image' => 'required|image|mimes:jpeg,png,jpg|max:1024'
        ]);

        $student = Student::find($request->student_id);

        if($student->profileImage !== null) {
            throw ValidationException::withMessages([
                'student_id' => ['A profile image already exists for this student.']
            ]);
        }

        if(Storage::missing('student_profiles')) {
            Storage::makeDirectory('student_profiles');
        }

        $path = 'student_profiles/'.Str::uuid().'.png';
        $fullpath = Storage::path($path);

        if(Storage::exists($path)) {
            throw new \Exception("Conflicting UUIDs (you should buy a lottery ticket!)");
        }

        $resize_size = config('config.profile_image_resolution');

        Image::useImageDriver('gd')
            ->load($request->file('image')->path())
            ->fit(Fit::Contain, $resize_size, $resize_size)
            ->save($fullpath);

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
        return StudentProfileImage::findOrFail($id);
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
