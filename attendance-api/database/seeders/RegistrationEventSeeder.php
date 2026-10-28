<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

use App\Models\RegistrationEvent;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;

class RegistrationEventSeeder extends Seeder
{
    /**
     * Seed last season's registration, a new season, and a mix of progress on this season's.
     *
     * @return void
     */
    public function run()
    {
        $faker = \Faker\Factory::create();
        $types = config('enums.registration_event_types');
        $steps = [$types['STUDENT_CONTRACT'], $types['SHARED_SCIENCE'], $types['FIRST_CR']];

        $mentors = User::role('mentor')->get();
        $students = Student::all();
        $seasonStart = Carbon::now()->subMonths(2);

        $makeEvent = function(?Student $student, string $type, $date) use ($mentors) {
            $event = new RegistrationEvent;
            $event->student_id = $student?->id;
            $event->event_type = $type;
            $event->registered_by = $mentors->random()->id;
            $event->created_at = $date;
            $event->updated_at = $date;
            $event->save();
        };

        // Last season, most students registered fully
        foreach($students as $student) {
            if(rand(0, 10) < 8) {
                foreach($steps as $step) {
                    $makeEvent($student, $step, $faker->dateTimeBetween('-1 year', $seasonStart->copy()->subMonth()));
                }
            }
        }

        $makeEvent(null, $types['NEW_SEASON'], $seasonStart);

        // This season, each step has its own chance of being done, with the contract the most likely
        $chances = [
            $types['STUDENT_CONTRACT'] => 8,
            $types['SHARED_SCIENCE'] => 6,
            $types['FIRST_CR'] => 5
        ];
        foreach($students as $student) {
            foreach($chances as $step => $chance) {
                if(rand(0, 10) < $chance) {
                    $makeEvent($student, $step, $faker->dateTimeBetween($seasonStart, 'now'));
                }
            }
        }
    }
}
