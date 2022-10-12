<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Student;
use App\Models\CheckIn;
use App\Models\CheckOut;

class StudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Student::factory()
            ->count(50)
            ->has(CheckIn::factory()->count(15))
            ->has(CheckOut::factory()->count(15))
            ->create();
    }
}
