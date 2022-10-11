<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CheckIn>
 */
class CheckInFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        $checkIn = fake()->dateTimeBetween('-3 month', 'now');
        return [
            'created_at' => $checkIn,
            'updated_at' => $checkIn
        ];
    }
}
