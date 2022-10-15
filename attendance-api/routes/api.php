<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\StudentController;
use App\Http\Controllers\CheckInController;
use App\Http\Controllers\CheckOutController;
use App\Http\Controllers\UserRoleController;

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
    Route::apiResource('attendance/check-in', CheckInController::class)->only([
        'index', 'show', 'store'
    ]);
    Route::apiResource('attendance/check-out', CheckOutController::class)->only([
        'index', 'show', 'store'
    ]);


    Route::get('user', function (Request $request) {
        return $request->user();
    });

    Route::middleware('can:list users')->get('users', [UserRoleController::class, 'listUsers']);
    Route::middleware('can:list roles')->get('roles', [UserRoleController::class, 'listRoles']);
    Route::middleware('can:elevate users')->put('users/roles', [UserRoleController::class, 'updateRoles']);
});


