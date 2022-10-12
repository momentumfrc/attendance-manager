<?php

namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SlackExtendSocialite
{
    /**
     * Handle the event.
     *
     * @param  object  $event
     * @return void
     */
    public function handle(\SocialiteProviders\Manager\SocialiteWasCalled $socialiteWasCalled)
    {
        $socialiteWasCalled->extendSocialite('slack', \App\Providers\SlackSocialiteProvider::class);
    }
}
