<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Student;
use App\Models\AttendanceEvent;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class StudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $faker = \Faker\Factory::create();

        $students = [];
        for($i = 0; $i < 40; $i++) {
            $student = new Student;
            $student->name = $faker->firstName() . ' ' . $faker->lastName();
            $student->registered_by = 1;

            if(rand(0, 10) < 7) {
                $student->graduation_year = Carbon::instance($faker->dateTimeBetween('-2 years', '+4 years'))->year;
            }

            if(rand(0, 10) < 2) {
                $student->deleted_at = $faker->dateTimeBetween('-1 years', 'now');
            }

            $student->save();

            $students[] = $student;
        }

        $currYear = Carbon::now()->year;
        $meetingDates = [];
        for($i = 0; $i < 100; $i++) {
            $meetingDates[] = (new Carbon($faker->dateTimeBetween('-2 years', 'now'), 'America/Los_Angeles'))
                ->setTime(16, 0, 0);
        }

        $meetingDates = new Collection($meetingDates);
        $meetingDates = $meetingDates->unique()->values();

        $biasFn1 = fn($x) => (-2*pow($x-0.5, 2)) + 0.5;
        $biasFn2 = fn($x) => pow($x, 3);

        foreach($meetingDates as $meetingDate) {
            foreach($students as $student) {
                // Students have a 2 in 3 chance of attending a given meeting
                if(rand(0, 3) > 2) {
                    continue;
                }

                $checkinDate = $meetingDate->copy()
                    ->addSeconds($faker->biasedNumberBetween(-900, 1800, $biasFn1))
                    ->timezone('+0:00');

                $checkin = new AttendanceEvent;
                $checkin->created_at = $checkinDate;
                $checkin->updated_at = $checkinDate;
                $checkin->student_id = $student->id;
                $checkin->registered_by = 1;
                $checkin->type = config('enums.attendance_event_types')['CHECK_IN'];
                $checkin->save();

                //Students have a 1 in 6 chance of leaving without checking out
                if(rand(0, 5) < 1) {
                    continue;
                }
                $checkoutDate = $meetingDate->copy()->setTime(20, 0, 0)
                    ->addSeconds($faker->biasedNumberBetween(-1800, 0, $biasFn2))
                    ->timezone('+0:00');

                $checkout = new AttendanceEvent;
                $checkout->created_at = $checkoutDate;
                $checkout->updated_at = $checkoutDate;
                $checkout->student_id = $student->id;
                $checkout->registered_by = 1;
                $checkout->type = config('enums.attendance_event_types')['CHECK_OUT'];
                $checkout->save();
            }
        }
    }
}
