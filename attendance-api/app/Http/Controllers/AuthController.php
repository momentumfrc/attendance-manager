<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use Laravel\Socialite\Facades\Socialite;

use App\Models\User;

class AuthController extends Controller
{
    public function redirect() {
        return Socialite::driver('slack')->redirect();
    }

    public function callback() {
        $slackuser = Socialite::driver('slack')->user();

        $dbuser = User::updateOrCreate([
            'slack_id' => $slackuser->id
        ], [
            'name' => $slackuser->name,
            'avatar' => $slackuser->avatar
        ]);

        Auth::guard('web')->login($dbuser, $remember = true);

        return redirect('/');
    }

    public function logout(Request $request) {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
