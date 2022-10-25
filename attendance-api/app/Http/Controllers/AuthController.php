<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use Laravel\Socialite\Facades\Socialite;

use App\Models\User;

class AuthController extends Controller
{
    private function do_login(User $user) {
        Auth::guard('web')->login($user, $remember = true);

        $subdir = config('app.subdir', '/');

        return redirect($subdir);
    }

    public function redirect() {
        if(config('app.skip_auth')) {
            $user = User::first();
            return $this->do_login($user);

        }
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

        return $this->do_login($dbuser);
    }

    public function logout(Request $request) {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $subdir = config('app.subdir', '/');
        return redirect($subdir);
    }
}
