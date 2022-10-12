<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CheckOut>
 */
class CheckOutFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        $checkOut = fake()->dateTimeBetween('-3 month', 'now');
        return [
            'created_at' => $checkOut,
            'updated_at' => $checkOut
        ];
    }
}
