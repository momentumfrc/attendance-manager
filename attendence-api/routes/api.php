<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('users/all', 'StudentController@all');
Route::get('users/id/{id}', 'StudentController@getById');
Route::get('users/search', 'StudentController@search');
Route::post('users', 'StudentController@store');
Route::put('users/{id}', 'StudentController@update');

Route::get('events/date/{year}/{month}/{day}', 'EventController@getByDate')
    ->where(['year' => '[0-9]+', 'month'=>'[0-1]?[0-9]', 'day'=>'[0-3]?[0-9]']);
Route::get('events/subject/{id}', 'EventController@getBySubject');
Route::get('events/registrar/{id}', 'EventController@getByRegistrar');
Route::post('events', 'EventController@store');
Route::put('events/{id}', 'EventController@update');
