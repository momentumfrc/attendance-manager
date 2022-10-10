<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

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

        Permission::create(['name' => 'add students']);
        Permission::create(['name' => 'remove students']);
        Permission::create(['name' => 'take attendence']);

        Permission::create(['name' => 'list users']);
        Permission::create(['name' => 'elevate users']);

        $role = Role::create(['name' => 'mentor'])
            ->givePermissionTo([
                'add students',
                'take attendence',
                'list users',
                'elevate users'
            ]);

        $adminRole = Role::create(['name' => 'admin'])
            ->givePermissionTo(Permission::all());

        $adminUser = \App\Models\User::create([
            'slack_id' => 'U2Q3A63J9',
            'name' => 'Jordan Powers',
            'avatar' => ''
        ]);

        $adminUser->assignRole('mentor', 'admin');
    }
}
