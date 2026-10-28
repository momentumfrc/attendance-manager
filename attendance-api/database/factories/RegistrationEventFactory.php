<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Student;
use App\Models\User;

class RegistrationEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        $types = config('enums.registration_event_types');
        return [
            'registered_by' => User::all('id')->pluck('id')->random(),
            'event_type' => $types[array_rand(array_diff_key($types, ['NEW_SEASON' => true]))],
        ];
    }

    public function registeredBy(User $user) {
        return $this->state(fn($attribute) => ['registered_by' => $user->id]);
    }

    public function forStudent(Student $student, string $type) {
        return $this->state(fn($attribute) => ['student_id' => $student->id, 'event_type' => $type]);
    }

    public function newSeason() {
        return $this->state(fn($attribute) => [
            'student_id' => null,
            'event_type' => config('enums.registration_event_types')['NEW_SEASON']
        ]);
    }
}
