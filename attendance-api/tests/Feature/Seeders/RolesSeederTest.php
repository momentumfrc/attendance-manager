<?php

namespace Tests\Feature\Seeders;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use Database\Seeders\RolesSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

use App\Models\User;

class RolesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_reseeding_keeps_role_assignments() {
        $this->seed(RolesSeeder::class);

        $user = User::factory()->create();
        $user->syncRoles(['student-lead']);

        $this->seed(RolesSeeder::class);

        $this->assertTrue($user->fresh()->hasRole('student-lead'));
        $this->assertTrue($user->fresh()->can('student check in'));
    }

    public function test_reseeding_resets_role_permissions() {
        $this->seed(RolesSeeder::class);

        Role::findByName('student-lead')->givePermissionTo('delete users');

        $this->seed(RolesSeeder::class);

        $this->assertFalse(Role::findByName('student-lead')->hasPermissionTo('delete users'));
        $this->assertTrue(Role::findByName('student-lead')->hasPermissionTo('student check in'));
    }

    public function test_reseeding_deletes_unlisted_permissions() {
        $this->seed(RolesSeeder::class);

        Permission::create(['name' => 'old permission']);
        Role::findByName('mentor')->givePermissionTo('old permission');

        $this->seed(RolesSeeder::class);

        $this->assertDatabaseMissing('permissions', ['name' => 'old permission']);
    }

    public function test_reseeding_deletes_unlisted_roles() {
        $this->seed(RolesSeeder::class);

        $user = User::factory()->create();
        Role::create(['name' => 'old-role'])->givePermissionTo('list students');
        $user->syncRoles(['old-role']);

        $this->seed(RolesSeeder::class);

        $this->assertDatabaseMissing('roles', ['name' => 'old-role']);
        $this->assertFalse($user->fresh()->can('list students'));
    }

    public function test_configured_admin_is_made_a_mentor() {
        config(['auth.admin_slack_id' => 'U-ADMIN']);

        $this->seed(RolesSeeder::class);

        $admin = User::where('slack_id', 'U-ADMIN')->sole();
        $this->assertTrue($admin->hasRole('mentor'));
    }

    public function test_no_admin_is_created_when_none_is_configured() {
        config(['auth.admin_slack_id' => null]);

        $this->seed(RolesSeeder::class);

        $this->assertDatabaseCount('users', 0);
    }
}
