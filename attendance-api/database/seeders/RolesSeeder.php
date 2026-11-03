<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

/**
 * Makes the permissions and roles match the ones listed here, deleting any that aren't listed.
 * Safe to run against a live database: users keep the listed roles they have.
 */
class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $roles = [
            'mentor' => [
                'list students',
                'add students',
                'view student images',
                'modify students',
                'modify student images',
                'remove students',
                'view student registration',
                'modify student registration',
                'modify student contract',
                'list attendance events',
                'student check in',
                'student check out',
                'undo attendance event',
                'delete attendance event',
                'list users',
                'list roles',
                'elevate users',
                'delete users',
                'list meeting events',
                'add meeting events',
                'remove meeting events',
                'view stats'
            ],
            'student-lead' => [
                'list students',
                'add students',
                'view student images',
                'modify students',
                'modify student images',
                'view student registration',
                // Only the student contract step, which leads check off as students sign it at meetings
                'modify student contract',
                'list attendance events',
                'student check in',
                'undo attendance event',
                'list users',
                'list roles',
                'list meeting events',
                'add meeting events',
                'view stats'
            ],
            'read-only' => [
                'list students',
                'list attendance events',
                'view student images',
                'view student registration',
                'list users',
                'list roles',
                'list meeting events',
                'view stats'
            ],
        ];
        // Every permission belongs to at least one role, so the roles list them all
        $permissions = array_values(array_unique(array_merge(...array_values($roles))));

        // Removing a permission or role here removes it from every role and user that has it
        Permission::whereNotIn('name', $permissions)->delete();
        Role::whereNotIn('name', array_keys($roles))->delete();

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }
        foreach ($roles as $role => $rolePermissions) {
            Role::firstOrCreate(['name' => $role])->syncPermissions($rolePermissions);
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // The initial admin, who will then add the rest of the users
        $adminId = config('auth.admin_slack_id');
        if (empty($adminId)) {
            $this->command?->warn('ADMIN_SLACK_ID is not set, so no admin user was seeded.');
            return;
        }

        $adminUser = \App\Models\User::firstOrCreate([
            'slack_id' => $adminId,
        ], [
            'name' => 'Admin',
            'avatar' => ''
        ]);

        $adminUser->assignRole('mentor');
    }
}
