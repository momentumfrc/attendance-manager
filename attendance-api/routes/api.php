<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\StudentController;
use App\Http\Controllers\AttendanceEventController;
use App\Http\Controllers\AttendanceSessionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\MeetingEventController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\PollController;
use App\Http\Controllers\StudentProfileImageController;
use Spatie\Permission\Models\Role;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('students', StudentController::class);
    Route::apiResource('attendance/events', AttendanceEventController::class);

    Route::apiResource('attendance/sessions', AttendanceSessionController::class)->only([
        'index'
    ]);

    Route::apiResource('student-profile-images', StudentProfileImageController::class)->only([
        'show', 'store', 'destroy'
    ]);

    Route::apiResource('meetings', MeetingEventController::class)->only([
        'index', 'show', 'store', 'destroy'
    ]);

    Route::get('user', function (Request $request) {
        return $request->user();
    });

    Route::apiResource('users', UserController::class)->only([
        'index', 'show', 'update'
    ]);

    Route::middleware('can:list roles')->get('roles', function() {
        return Role::all()->pluck('name');
    });

    Route::get('reports/list-meetings', [ReportController::class, 'listMeetings']);
    Route::get('reports/meeting-attendance', [ReportController::class, 'meetingAttendance']);
    Route::get('poll', [PollController::class, 'poll']);

});

Route::get('info', fn () => ['git_hash' => config('app.git_hash')]);

