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
        Permission::create(['name' => 'take attendance']);

        Permission::create(['name' => 'list users']);
        Permission::create(['name' => 'list roles']);
        Permission::create(['name' => 'elevate users']);

        $role = Role::create(['name' => 'mentor'])
            ->givePermissionTo([
                'add students',
                'take attendance',
                'list users',
                'list roles',
                'elevate users'
            ]);


        if(config('app.debug', false)) {
            $adminId = 'U2Q3A63J9';
        } else {
            $adminId = 'U2YL0PXB5';
        }

        $adminUser = \App\Models\User::create([
            'slack_id' => $adminId,
            'name' => 'Jordan Powers',
            'avatar' => ''
        ]);

        $adminUser->assignRole('mentor');

        /*
        $adminRole = Role::create(['name' => 'admin'])
            ->givePermissionTo(Permission::all());

        $adminuser->assignRole('admin');
        */
    }
}
