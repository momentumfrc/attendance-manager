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

        $users = User::factory()->count(4)->create();

        $users[1]->delete();
        $users[3]->delete();

        $users = collect([$user, $users[0], $users[2]]);

        $expected = $users->toArray();

        $this->assertDatabaseCount('users', 5);

        $response = $this->actingAs($user)->getJson('/api/users');
        $response->assertStatus(200);

        $response->assertSimilarJson($expected);
    }

    public function test_show() {
        $user = User::first();
        $this->assertDatabaseCount('users', 1);

        $user2 = User::factory()->create();

        $this->assertDatabaseCount('users', 2);

        $response = $this->actingAs($user)->get('/api/users/'.$user2->id);

        $response->assertStatus(200);
        $response->assertSimilarJson($user2->toArray());
    }

    public function test_show_deleted() {
        $user = User::first();
        $user2 = User::factory()->trashed()->create();
        $this->assertDatabaseCount('users', 2);

        $response = $this->actingAs($user)->getJson('/api/users/'.$user2->id);

        $response->assertStatus(200);
        $response->assertSimilarJson($user2->toArray());
    }

    public function test_update() {
        $user = User::first();
        $this->assertDatabaseCount('users', 1);

        $faker = $this->faker();
        $user2 = User::factory()->create();
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
        $response->assertSimilarJson($expected);

        $expected['role_names'] = [];
        $response = $this->actingAs($user)->putJson('/api/users/'.$user2->id, [
            'roles' => $expected['role_names']
        ]);
        $response->assertStatus(200);
        $this->assertSame(User::find($user2->id)->getRoleNames()->toArray(), $expected['role_names']);
        $response->assertSimilarJson($expected);

        $expected['role_names'] = ['mentor', 'student-lead'];
        $response = $this->actingAs($user)->putJson('/api/users/'.$user2->id, [
            'roles' => $expected['role_names']
        ]);
        $response->assertStatus(200);
        $this->assertSame(User::find($user2->id)->getRoleNames()->toArray(), $expected['role_names']);
        $response->assertSimilarJson($expected);
    }

    public function test_update_self() {
        $user = User::first();
        $this->assertDatabaseCount('users', 1);

        $response = $this->actingAs($user)->putJson('/api/users/'.$user->id, [
            'roles' => [ ]
        ]);

        $response->assertStatus(422);
    }

    public function test_delete() {
        $user = User::first();
        $user2 = User::factory()->create();

        $this->assertDatabaseCount('users', 2);

        $this->assertNull($user2->deleted_at);

        $this->actingAs($user)->delete('/api/users/'.$user2->id)->assertStatus(200);
        $user2->refresh();

        $this->assertNotNull($user2->deleted_at);
        $this->assertLessThan(5, now()->diffInSeconds($user2->deleted_at));

        $this->assertNull($user->deleted_at);
        $this->actingAs($user)->delete('/api/users/'.$user->id)->assertStatus(422);

        $user->refresh();
        $this->assertNull($user->deleted_at);
    }

    public function test_delete_permissions() {
        $users = User::factory()->count(2)->create();

        /**
         * @var \App\Models\User $user1
         * @var \App\Models\User $user2
         */
        $user1 = $users[0];
        $user2 = $users[1];

        $user1->syncRoles([]);

        $this->assertDatabaseCount('users', 3);

        $this->assertNull($user2->deleted_at);

        $this->actingAs($user1)->delete('/api/users/'.$user2->id)->assertStatus(403);
        $user2->refresh();

        $this->assertNull($user2->deleted_at);
    }
}
