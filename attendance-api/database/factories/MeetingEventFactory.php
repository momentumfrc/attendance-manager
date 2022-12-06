<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class MeetingEventFactory extends Factory
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
        $type = config('enums.meeting_event_types')[array_rand(config('enums.meeting_event_types'))];
        return [
            'created_at' => $eventDate,
            'updated_at' => $eventDate,
            'registered_by' => '1',
            'type' => $type,
        ];
    }
}
