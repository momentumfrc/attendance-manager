<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function __construct() {
        $this->middleware('can:list users')->only(['index', 'show']);
        $this->middleware('can:elevate users')->only('update');
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        return User::all();
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\User  $user
     * @return \Illuminate\Http\Response
     */
    public function show(User $user)
    {
        return $user;
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\User  $user
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, User $user)
    {
        $request->validate([
            'roles.*' => 'string|distinct|exists:roles,name'
        ]);

        if($user->id == Auth::id()) {
            return response([
                'message' => 'The given data was invalid.',
                'errors' => [
                    'user_id' => ['The user_id must not be the currently authenticated user.']
                ]
            ], 422);
        }

        Log::notice("User ".Auth::id()." set roles for user ".$user->id." to ".json_encode($request->roles));
        $user->syncRoles($request->roles);

        return $user;
    }
}
