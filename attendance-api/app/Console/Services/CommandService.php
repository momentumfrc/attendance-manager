<?php

namespace App\Console\Services;

use App\Models\User;

use Illuminate\Support\Facades\Auth;

class CommandService {

    public function getSystemUser(): User {
        $systemUser = User::updateOrCreate([
            'slack_id' => config('auth.system_slack_id')
        ], [
            'name' => "System",
            'avatar' => ""
        ]);

        $systemUser->syncRoles(['mentor']);

        return $systemUser;
    }

    public function authenticateAsSystemUser() {
        $user = $this->getSystemUser();
        Auth::login($user);
    }
}
