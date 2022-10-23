<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

use \App\Models\AttendanceEvent;

class AttendanceEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $faker = \Faker\Factory::create();
        $eventDate = $faker->dateTimeBetween('-3 month', 'now');
        $type = config('enums.attendance_event_types')[array_rand(config('enums.attendance_event_types'))];
        return [
            'created_at' => $eventDate,
            'updated_at' => $eventDate,
            'registered_by' => '1',
            'type' => $type,
        ];
    }
}
