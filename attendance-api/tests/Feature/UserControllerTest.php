<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

use Database\Seeders\RolesSeeder;

use App\Models\User;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
    }

    public function test_index() {
        $user = User::first();
        $this->assertDatabaseCount('users', 1);

        $faker = $this->faker();

        $users = collect([
            $user,
            User::create([
                'name' => $faker->name(),
                'slack_id' => $faker->uuid(),
                'avatar' => ''
            ]),
            User::create([
                'name' => $faker->name(),
                'slack_id' => $faker->uuid(),
                'avatar' => ''
            ]),
            User::create([
                'name' => $faker->name(),
                'slack_id' => $faker->uuid(),
                'avatar' => ''
            ]),
            User::create([
                'name' => $faker->name(),
                'slack_id' => $faker->uuid(),
                'avatar' => ''
            ])
        ]);

        $expected = $users->toArray();
        unset($expected[0]['permissions']);

        $this->assertDatabaseCount('users', 5);

        $response = $this->actingAs($user)->getJson('/api/users');
        $response->assertStatus(200);

        $response->assertExactJson($expected);
    }

    public function test_show() {
        $user = User::first();
        $this->assertDatabaseCount('users', 1);

        $faker = $this->faker();
        $user2 = User::create([
            'name' => $faker->name(),
            'slack_id' => $faker->uuid(),
            'avatar' => ''
        ]);

        $this->assertDatabaseCount('users', 2);

        $response = $this->actingAs($user)->getJson('/api/users/'.$user2->id);

        $response->assertStatus(200);
        $response->assertExactJson($user2->toArray());
    }

    public function test_update() {
        $user = User::first();
        $this->assertDatabaseCount('users', 1);

        $faker = $this->faker();
        $user2 = User::create([
            'name' => $faker->name(),
            'slack_id' => $faker->uuid(),
            'avatar' => ''
        ]);
        $this->assertDatabaseCount('users', 2);

        $expected = $user2->toArray();

        $response = $this->actingAs($user)->putJson('/api/users/'.$user2->id, [
            'roles' => [ 'some_bad_role' ]
        ]);
        $response->assertStatus(422);

        $response = $this->actingAs($user)->putJson('/api/users/'.$user2->id, [
            'roles' => [ 'mentor', 'some_bad_role' ]
        ]);
        $response->assertStatus(422);

        $expected['role_names'] = ['mentor'];
        $response = $this->actingAs($user)->putJson('/api/users/'.$user2->id, [
            'roles' => $expected['role_names']
        ]);
        $response->assertStatus(200);
        $this->assertSame(User::find($user2->id)->getRoleNames()->toArray(), $expected['role_names']);
        $response->assertExactJson($expected);

        $expected['role_names'] = [];
        $response = $this->actingAs($user)->putJson('/api/users/'.$user2->id, [
            'roles' => $expected['role_names']
        ]);
        $response->assertStatus(200);
        $this->assertSame(User::find($user2->id)->getRoleNames()->toArray(), $expected['role_names']);
        $response->assertExactJson($expected);

        $expected['role_names'] = ['mentor', 'student-lead'];
        $response = $this->actingAs($user)->putJson('/api/users/'.$user2->id, [
            'roles' => $expected['role_names']
        ]);
        $response->assertStatus(200);
        $this->assertSame(User::find($user2->id)->getRoleNames()->toArray(), $expected['role_names']);
        $response->assertExactJson($expected);
    }

    public function test_update_self() {
        $user = User::first();
        $this->assertDatabaseCount('users', 1);

        $response = $this->actingAs($user)->putJson('/api/users/'.$user->id, [
            'roles' => [ ]
        ]);

        $response->assertStatus(422);
    }
}
