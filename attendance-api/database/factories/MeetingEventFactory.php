<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;

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
            'registered_by' => User::all('id')->pluck('id')->random(),
            'type' => $type,
        ];
    }

    public function registeredBy(User $user) {
        return $this->state(fn($attribute) => ['registered_by' => $user->id]);
    }
}
