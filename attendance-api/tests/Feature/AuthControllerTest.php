<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SlackUser;
use Mockery;
use Tests\TestCase;

use Database\Seeders\RolesSeeder;

use App\Models\User;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
    }

    private function mockSlack(string $slackId = 'U12345') {
        $slackUser = (new SlackUser())->map([
            'id' => $slackId,
            'name' => 'Test User',
            'avatar' => 'https://example.com/avatar.png',
        ]);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($slackUser);
        $provider->shouldReceive('redirect')->andReturn(redirect('https://slack.com/oauth'));
        Socialite::shouldReceive('driver')->with('slack')->andReturn($provider);
    }

    /**
     * Send a request as a separate device, carrying only the given cookies.
     */
    private function asDevice(array $cookies) {
        Auth::forgetGuards();
        $this->defaultCookies = [];

        return $this->withHeader('Referer', 'http://localhost')
            ->withCredentials()
            ->withCookies($cookies);
    }

    /**
     * Log in through the Slack callback as a new device and return its cookies.
     */
    private function loginDevice(): array {
        $response = $this->asDevice([])->get('/auth/callback');
        $response->assertRedirect();

        $guard = Auth::guard('web');
        return [
            config('session.cookie') => $response->getCookie(config('session.cookie'))->getValue(),
            $guard->getRecallerName() => $response->getCookie($guard->getRecallerName())->getValue(),
        ];
    }

    public function test_login_creates_auth_secret() {
        $this->mockSlack();

        $this->loginDevice();

        $user = User::where('slack_id', 'U12345')->first();
        $this->assertNotNull($user->auth_secret);
        $this->assertArrayNotHasKey('auth_secret', $user->toArray());
    }

    public function test_second_login_keeps_auth_secret() {
        $this->mockSlack();

        $this->loginDevice();
        $secret = User::where('slack_id', 'U12345')->first()->auth_secret;

        $this->loginDevice();
        $this->assertSame($secret, User::where('slack_id', 'U12345')->first()->auth_secret);
    }

    public function test_remember_cookie_restores_login_after_session_expires() {
        $this->mockSlack();

        $cookies = $this->loginDevice();
        $user = User::where('slack_id', 'U12345')->first();

        Session::flush();
        unset($cookies[config('session.cookie')]);

        $this->asDevice($cookies)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id);
    }

    public function test_logout_signs_out_every_device() {
        $this->mockSlack();

        $phone = $this->loginDevice();
        $tablet = $this->loginDevice();

        $this->asDevice($tablet)->getJson('/api/user')->assertOk();

        $this->asDevice($phone)->get('/auth/logout')->assertRedirect();

        $this->asDevice($tablet)->getJson('/api/user')->assertUnauthorized();

        unset($tablet[config('session.cookie')]);
        $this->asDevice($tablet)->getJson('/api/user')->assertUnauthorized();

        $this->assertNull(User::where('slack_id', 'U12345')->first()->auth_secret);
    }

    public function test_skip_auth_is_ignored_outside_local() {
        $this->mockSlack();
        config(['app.skip_auth' => true]);

        $this->get('/auth/redirect')->assertRedirect('https://slack.com/oauth');
        $this->assertGuest('web');
    }

    public function test_skip_auth_logs_in_locally() {
        $this->mockSlack();
        config(['app.skip_auth' => true]);
        $this->app['env'] = 'local';

        $this->get('/auth/redirect')->assertRedirect(config('app.subdir'));
        $this->assertAuthenticatedAs(User::first(), 'web');
    }
}
