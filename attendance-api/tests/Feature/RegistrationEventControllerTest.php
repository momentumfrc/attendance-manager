<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\RegistrationEvent;
use App\Models\Student;
use App\Models\User;

use Carbon\Carbon;

use Database\Seeders\RolesSeeder;

class RegistrationEventControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Student $student;

    protected function setUp(): void {
        parent::setUp();
        $this->seed(RolesSeeder::class);
        $this->admin = User::first();
        $this->student = Student::factory()->registeredBy($this->admin)->untrashed()->create();
    }

    private function userWithRole(string $role): User {
        $user = User::factory()->create();
        $user->syncRoles([$role]);
        return $user;
    }

    private function makeEvent(?Student $student, string $type, Carbon $date): RegistrationEvent {
        return RegistrationEvent::forceCreate([
            'student_id' => $student?->id,
            'registered_by' => $this->admin->id,
            'event_type' => $type,
            'created_at' => $date,
            'updated_at' => $date
        ]);
    }

    public function test_store() {
        $response = $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'student_id' => $this->student->id,
            'event_type' => 'shared_science'
        ]);

        $response->assertStatus(201)->assertJson([
            'student_id' => $this->student->id,
            'event_type' => 'shared_science',
            'registered_by' => $this->admin->id
        ]);
        $this->assertDatabaseHas('registration_events', [
            'id' => $response['id'],
            'student_id' => $this->student->id,
            'event_type' => 'shared_science',
            'registered_by' => $this->admin->id,
            'deleted_at' => null
        ]);
    }

    public function test_store_validation() {
        $post = fn($body) => $this->actingAs($this->admin)->postJson('/api/registration/events', $body);

        $post([])->assertStatus(422);
        $post(['event_type' => 'first_cr'])->assertStatus(422)->assertJsonValidationErrors('student_id');
        $post(['event_type' => 'not-a-type', 'student_id' => $this->student->id])
            ->assertStatus(422)->assertJsonValidationErrors('event_type');
        $post(['event_type' => 'first_cr', 'student_id' => 999999])
            ->assertStatus(422)->assertJsonValidationErrors('student_id');
        $post(['event_type' => 'new_season', 'student_id' => $this->student->id])
            ->assertStatus(422)->assertJsonValidationErrors('student_id');

        $this->assertDatabaseCount('registration_events', 0);
    }

    public function test_store_rejects_deleted_student() {
        $this->student->delete();

        $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'student_id' => $this->student->id,
            'event_type' => 'first_cr'
        ])->assertStatus(422)->assertJsonValidationErrors('student_id');

        $this->assertDatabaseCount('registration_events', 0);
    }

    public function test_store_rejects_completed_step() {
        $this->makeEvent($this->student, 'student_contract', Carbon::now()->subDay());

        $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'student_id' => $this->student->id,
            'event_type' => 'student_contract'
        ])->assertStatus(422)->assertJsonValidationErrors('event_type');

        $this->assertDatabaseCount('registration_events', 1);
    }

    public function test_store_allows_step_completed_last_season() {
        $this->makeEvent($this->student, 'student_contract', Carbon::now()->subYear());
        $this->makeEvent(null, 'new_season', Carbon::now()->subMonth());

        $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'student_id' => $this->student->id,
            'event_type' => 'student_contract'
        ])->assertStatus(201);

        $this->assertDatabaseCount('registration_events', 3);
    }

    public function test_store_new_season() {
        $this->makeEvent($this->student, 'student_contract', Carbon::now()->subDay());

        $response = $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'event_type' => 'new_season'
        ]);

        $response->assertStatus(201)->assertJson([
            'student_id' => null,
            'event_type' => 'new_season',
            'registered_by' => $this->admin->id
        ]);

        $this->actingAs($this->admin)->getJson('/api/students/'.$this->student->id)
            ->assertJsonPath('registration.student_contract', null);
    }

    public function test_destroy() {
        $event = $this->makeEvent($this->student, 'first_cr', Carbon::now()->subDay());

        $this->actingAs($this->admin)->deleteJson('/api/registration/events/'.$event->id)
            ->assertStatus(200)
            ->assertJsonPath('id', $event->id);
        $this->assertSoftDeleted($event);

        $this->actingAs($this->admin)->getJson('/api/students/'.$this->student->id)
            ->assertJsonPath('registration.first_cr', null);

        // Already deleted
        $this->actingAs($this->admin)->deleteJson('/api/registration/events/'.$event->id)->assertStatus(404);
        $this->actingAs($this->admin)->deleteJson('/api/registration/events/999999')->assertStatus(404);
    }

    public function test_destroy_new_season() {
        $contract = $this->makeEvent($this->student, 'student_contract', Carbon::now()->subYear());
        $season = $this->makeEvent(null, 'new_season', Carbon::now()->subDay());

        $this->actingAs($this->admin)->deleteJson('/api/registration/events/'.$season->id)->assertStatus(200);
        $this->assertSoftDeleted($season);

        $this->actingAs($this->admin)->getJson('/api/students/'.$this->student->id)
            ->assertJsonPath('registration.student_contract', $contract->id);
    }

    public function test_store_registration_requirement() {
        $response = $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'event_type' => 'require_registration'
        ]);

        $response->assertStatus(201)->assertJson([
            'student_id' => null,
            'event_type' => 'require_registration',
            'registered_by' => $this->admin->id
        ]);

        $this->actingAs($this->admin)->getJson('/api/registration/requirement')
            ->assertStatus(200)
            ->assertJsonPath('event.id', $response['id']);
    }

    public function test_store_registration_requirement_validation() {
        $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'event_type' => 'require_registration',
            'student_id' => $this->student->id
        ])->assertStatus(422)->assertJsonValidationErrors('student_id');

        $this->assertDatabaseCount('registration_events', 0);
    }

    public function test_store_rejects_active_registration_requirement() {
        $this->makeEvent(null, 'require_registration', Carbon::now()->subDay());

        $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'event_type' => 'require_registration'
        ])->assertStatus(422)->assertJsonValidationErrors('event_type');

        $this->assertDatabaseCount('registration_events', 1);
    }

    public function test_store_allows_registration_requirement_after_undo_or_new_season() {
        $this->makeEvent(null, 'require_registration', Carbon::now()->subYear());
        $this->makeEvent(null, 'new_season', Carbon::now()->subMonth());
        $this->makeEvent(null, 'require_registration', Carbon::now()->subDay())->delete();

        $this->actingAs($this->admin)->getJson('/api/registration/requirement')
            ->assertJsonPath('event', null);

        $this->actingAs($this->admin)->postJson('/api/registration/events', [
            'event_type' => 'require_registration'
        ])->assertStatus(201);
    }

    public function test_destroy_registration_requirement() {
        $requirement = $this->makeEvent(null, 'require_registration', Carbon::now()->subDay());

        $this->actingAs($this->admin)->deleteJson('/api/registration/events/'.$requirement->id)->assertStatus(200);
        $this->assertSoftDeleted($requirement);

        $this->actingAs($this->admin)->getJson('/api/registration/requirement')
            ->assertJsonPath('event', null);
    }

    public function test_everyone_can_read_registration_requirement() {
        $requirement = $this->makeEvent(null, 'require_registration', Carbon::now()->subDay());

        foreach(['mentor', 'student-lead', 'read-only'] as $role) {
            $this->actingAs($this->userWithRole($role))->getJson('/api/registration/requirement')
                ->assertStatus(200)
                ->assertJsonPath('event.id', $requirement->id);
        }
    }

    public function test_read_only_cannot_modify() {
        $contract = $this->makeEvent($this->student, 'student_contract', Carbon::now()->subDay());
        $user = $this->userWithRole('read-only');

        foreach(['shared_science', 'first_cr'] as $type) {
            $this->actingAs($user)->postJson('/api/registration/events', [
                'student_id' => $this->student->id,
                'event_type' => $type
            ])->assertStatus(403);
        }
        // Rejected before validation, so invalid requests don't reveal anything either
        $this->actingAs($user)->postJson('/api/registration/events', [])->assertStatus(403);
        $this->actingAs($user)->postJson('/api/registration/events', ['event_type' => 'new_season'])
            ->assertStatus(403);
        $this->actingAs($user)->deleteJson('/api/registration/events/'.$contract->id)->assertStatus(403);

        $this->assertDatabaseCount('registration_events', 1);
        $this->assertNotSoftDeleted($contract);
    }

    public function test_student_leads_can_only_modify_the_contract() {
        $user = $this->userWithRole('student-lead');

        // Signing the contract, and undoing it
        $contractId = $this->actingAs($user)->postJson('/api/registration/events', [
            'student_id' => $this->student->id,
            'event_type' => 'student_contract'
        ])->assertStatus(201)['id'];
        $this->actingAs($user)->deleteJson('/api/registration/events/'.$contractId)->assertStatus(200);

        // Everything else
        foreach(['shared_science', 'first_cr'] as $type) {
            $this->actingAs($user)->postJson('/api/registration/events', [
                'student_id' => $this->student->id,
                'event_type' => $type
            ])->assertStatus(403);
        }
        $this->actingAs($user)->postJson('/api/registration/events', ['event_type' => 'new_season'])
            ->assertStatus(403);
        $this->actingAs($user)->postJson('/api/registration/events', ['event_type' => 'require_registration'])
            ->assertStatus(403);

        $ssci = $this->makeEvent($this->student, 'shared_science', Carbon::now()->subDay());
        $season = $this->makeEvent(null, 'new_season', Carbon::now()->subMonth());
        $requirement = $this->makeEvent(null, 'require_registration', Carbon::now()->subDay());
        $this->actingAs($user)->deleteJson('/api/registration/events/'.$ssci->id)->assertStatus(403);
        $this->actingAs($user)->deleteJson('/api/registration/events/'.$season->id)->assertStatus(403);
        $this->actingAs($user)->deleteJson('/api/registration/events/'.$requirement->id)->assertStatus(403);

        $this->assertNotSoftDeleted($ssci);
        $this->assertNotSoftDeleted($season);
        $this->assertNotSoftDeleted($requirement);
        $this->assertDatabaseCount('registration_events', 4);
    }

    public function test_roles_can_view_registration() {
        foreach(['mentor', 'student-lead', 'read-only'] as $role) {
            $this->assertTrue($this->userWithRole($role)->can('view student registration'), $role);
        }
        $this->assertTrue($this->userWithRole('mentor')->can('modify student registration'));
        $this->assertTrue($this->userWithRole('mentor')->can('modify student contract'));
        $this->assertTrue($this->userWithRole('student-lead')->can('modify student contract'));
        $this->assertFalse($this->userWithRole('student-lead')->can('modify student registration'));
        $this->assertFalse($this->userWithRole('read-only')->can('modify student contract'));
    }
}
