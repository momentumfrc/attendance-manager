<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Student>
 */
class StudentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        $faker = \Faker\Factory::create();

        $values = [
            'name' => $faker->name(),
            'registered_by' => 1,
            'deleted_at' => null,
            'graduation_year' => null
        ];

        if(rand(0, 10) < 7) {
            $values['graduation_year'] = $faker->year('+10 years');
        }

        if(rand(0, 10) < 2) {
            $values['deleted_at'] = Carbon::now();
        }

        return $values;
    }
}
