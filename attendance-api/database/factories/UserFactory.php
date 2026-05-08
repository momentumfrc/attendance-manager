<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
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
