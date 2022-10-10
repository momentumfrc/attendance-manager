<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\User;
use Spatie\Permission\Models\Role;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class UserRoleController extends Controller
{
    public function listUsers() {
        return User::all();
    }

    public function listRoles() {
        return Role::all()->pluck('name');
    }

    public function updateRoles(Request $request) {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'roles.*' => 'string|distinct|exists:roles,name'
        ]);

        $user = User::find($request->user_id);

        Log::notice("User ".Auth::id()." set roles for user ".$user->id." to ".json_encode($request->roles));
        $user->syncRoles($request->roles);

        return $user;
    }
}
