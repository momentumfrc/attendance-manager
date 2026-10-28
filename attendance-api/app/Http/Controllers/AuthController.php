<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

use Laravel\Socialite\Facades\Socialite;

use App\Models\User;

class AuthController extends Controller
{
    private function do_login(User $user) {
        // Remember cookies and sessions are only valid while the user has this secret, so
        // reuse it to keep the user's other devices signed in.
        if(is_null($user->auth_secret)) {
            $user->auth_secret = Str::random(64);
            $user->save();
        }

        Auth::guard('web')->login($user, $remember = true);

        $subdir = config('app.subdir', '/');

        return redirect($subdir);
    }

    public function redirect() {
        // Development-only login bypass. deploy.sh removes it entirely.
        if(config('app.skip_auth') && app()->isLocal()) {
            $user = User::first();
            return $this->do_login($user);
        }

        return Socialite::driver('slack')->redirect();
    }

    public function callback() {
        $slackuser = Socialite::driver('slack')->user();

        $dbuser = User::withTrashed()->updateOrCreate([
            'slack_id' => $slackuser->id
        ], [
            'name' => $slackuser->name,
            'avatar' => $slackuser->avatar,
            'deleted_at' => null
        ]);

        return $this->do_login($dbuser);
    }

    public function logout(Request $request) {
        $guard = Auth::guard('web');
        $user = $guard->user();

        $guard->logout();

        // Signing out signs the user out on every device.
        if(!is_null($user)) {
            $user->auth_secret = null;
            $user->save();
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $subdir = config('app.subdir', '/');
        return redirect($subdir);
    }
}
