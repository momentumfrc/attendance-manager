<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\MeetingEvent;
use App\Models\User;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class MeetingEventControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->admin = User::first();
    }

    private function userWithRole(string $role): User {
        $user = User::factory()->create();
        $user->syncRoles([$role]);
        return $user;
    }

    private function makeEvent(Carbon $date): MeetingEvent {
        $event = new MeetingEvent;
        $event->type = 'end-of-meeting';
        $event->registered_by = $this->admin->id;
        $event->created_at = $date;
        $event->updated_at = $date;
        $event->save();
        return $event;
    }

    public function test_index_validation() {
        $this->actingAs($this->admin)->getJson('/api/meetings?since=01-01-2023')->assertStatus(422);
        $this->actingAs($this->admin)->getJson('/api/meetings?until=yesterday')->assertStatus(422);
        $this->actingAs($this->admin)->getJson('/api/meetings?limit=0')->assertStatus(422);
        $this->actingAs($this->admin)->getJson('/api/meetings?type=invalid-type')->assertStatus(422);
    }

    public function test_index_response() {
        $oldest = $this->makeEvent(Carbon::parse('2024-01-01 12:00:00'));
        $middle = $this->makeEvent(Carbon::parse('2024-02-01 12:00:00'));
        $newest = $this->makeEvent(Carbon::parse('2024-03-01 12:00:00'));

        $this->actingAs($this->admin)->getJson('/api/meetings')
            ->assertStatus(200)
            ->assertExactJson([$newest->fresh()->toArray(), $middle->fresh()->toArray(), $oldest->fresh()->toArray()]);

        $this->actingAs($this->admin)->getJson('/api/meetings?since='.$middle->created_at->timestamp)
            ->assertExactJson([$newest->fresh()->toArray(), $middle->fresh()->toArray()]);

        $this->actingAs($this->admin)->getJson('/api/meetings?until='.$middle->created_at->timestamp)
            ->assertExactJson([$middle->fresh()->toArray(), $oldest->fresh()->toArray()]);

        $this->actingAs($this->admin)->getJson('/api/meetings?type=end-of-meeting&limit=1')
            ->assertExactJson([$newest->fresh()->toArray()]);
    }

    public function test_store() {
        $response = $this->actingAs($this->admin)->postJson('/api/meetings', ['type' => 'end-of-meeting']);
        $response->assertStatus(201)->assertJson([
            'type' => 'end-of-meeting',
            'registered_by' => $this->admin->id
        ]);
        $this->assertDatabaseCount('meeting_events', 1);
        $this->assertLessThan(5, Carbon::now()->diffInSeconds(Carbon::parse($response['created_at']), true));
    }

    public function test_store_with_date() {
        $date = Carbon::parse('2024-01-01 12:00:00');
        $response = $this->actingAs($this->admin)->postJson('/api/meetings', [
            'type' => 'end-of-meeting',
            'date' => $date->timestamp
        ]);
        $response->assertStatus(201);
        $this->assertEquals($date->timestamp, MeetingEvent::findOrFail($response['id'])->created_at->timestamp);
    }

    public function test_store_validation() {
        $this->actingAs($this->admin)->postJson('/api/meetings', [])->assertStatus(422);
        $this->actingAs($this->admin)->postJson('/api/meetings', ['type' => 'invalid-type'])->assertStatus(422);
        $this->actingAs($this->admin)->postJson('/api/meetings', ['type' => 'end-of-meeting', 'date' => 'yesterday'])->assertStatus(422);
        $this->assertDatabaseCount('meeting_events', 0);
    }

    public function test_show() {
        $event = $this->makeEvent(Carbon::parse('2024-01-01 12:00:00'));

        $this->actingAs($this->admin)->getJson('/api/meetings/'.$event->id)
            ->assertStatus(200)
            ->assertExactJson($event->fresh()->toArray());
    }

    public function test_show_missing() {
        $this->actingAs($this->admin)->getJson('/api/meetings/9999')->assertStatus(404);
    }

    public function test_destroy() {
        $event = $this->makeEvent(Carbon::parse('2024-01-01 12:00:00'));
        $other = $this->makeEvent(Carbon::parse('2024-02-01 12:00:00'));

        $this->actingAs($this->admin)->deleteJson('/api/meetings/'.$event->id)->assertStatus(200);

        $this->assertDatabaseMissing('meeting_events', ['id' => $event->id]);
        $this->assertDatabaseHas('meeting_events', ['id' => $other->id]);
    }

    public function test_destroy_missing() {
        $this->actingAs($this->admin)->deleteJson('/api/meetings/9999')->assertStatus(404);
    }

    public function test_read_only_permissions() {
        $event = $this->makeEvent(Carbon::parse('2024-01-01 12:00:00'));
        $user = $this->userWithRole('read-only');

        $this->actingAs($user)->getJson('/api/meetings')->assertStatus(200);
        $this->actingAs($user)->getJson('/api/meetings/'.$event->id)->assertStatus(200);
        $this->actingAs($user)->postJson('/api/meetings', ['type' => 'end-of-meeting'])->assertStatus(403);
        $this->actingAs($user)->deleteJson('/api/meetings/'.$event->id)->assertStatus(403);
        $this->assertDatabaseCount('meeting_events', 1);
    }

    public function test_student_lead_permissions() {
        $event = $this->makeEvent(Carbon::parse('2024-01-01 12:00:00'));
        $user = $this->userWithRole('student-lead');

        $this->actingAs($user)->postJson('/api/meetings', ['type' => 'end-of-meeting'])->assertStatus(201);
        $this->actingAs($user)->deleteJson('/api/meetings/'.$event->id)->assertStatus(403);
        $this->assertDatabaseHas('meeting_events', ['id' => $event->id]);
    }
}
