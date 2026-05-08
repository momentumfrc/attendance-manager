<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

use Spatie\Permission\Models\Role;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    public function configure(): static {
        return $this->afterCreating(function(User $user) {
            if(rand(0, 5) < 2) {
                $role = Role::all('name')->pluck('name')->random();
                $user->syncRoles([$role]);
            }
        });
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $now = now();
        return [
            'name' => fake()->name(),
            'slack_id' => Str::random(9),
            'avatar' => '',
            'remember_token' => Str::random(10),
            'created_at' => $now,
            'updated_at' => $now
        ];
    }
}
