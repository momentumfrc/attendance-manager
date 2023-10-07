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
        Role::query()->delete();
        Permission::query()->delete();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'add students']);
        Permission::create(['name' => 'modify students']);
        Permission::create(['name' => 'remove students']);
        Permission::create(['name' => 'student check in']);
        Permission::create(['name' => 'student check out']);

        Permission::create(['name' => 'list meeting events']);
        Permission::create(['name' => 'add meeting events']);
        Permission::create(['name' => 'remove meeting events']);

        Permission::create(['name' => 'list users']);
        Permission::create(['name' => 'list roles']);
        Permission::create(['name' => 'elevate users']);

        Permission::create(['name' => 'view stats']);

        Role::create(['name' => 'mentor'])
            ->givePermissionTo([
                'add students',
                'modify students',
                'remove students',
                'student check in',
                'student check out',
                'list users',
                'list roles',
                'elevate users',
                'list meeting events',
                'add meeting events',
                'remove meeting events',
                'view stats'
            ]);

        Role::create(['name' => 'student-lead'])
            ->givePermissionTo([
                'student check in',
                'list users',
                'list roles',
                'list meeting events',
                'add meeting events',
                'view stats'
            ]);

        if(config('app.debug', false)) {
            $adminId = 'U2Q3A63J9';
        } else {
            $adminId = 'U2YL0PXB5';
        }

        $adminUser = \App\Models\User::firstOrCreate([
            'slack_id' => $adminId,
        ], [
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
