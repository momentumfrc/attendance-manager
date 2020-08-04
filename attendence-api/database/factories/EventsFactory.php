<?php

/** @var \Illuminate\Database\Eloquent\Factory $factory */

use App\Model;
use App\Event;
use Faker\Generator as Faker;

$factory->define(Event::class, function (Faker $faker) {
    return [
        'subjectId' => $faker->randomNumber(),
        'type' => $faker->randomElement(['in', 'out']),
        'registrarId' => $faker->randomNumber(),
        'date' => $faker->dateTime(),
        'notes' => $faker->paragraph()
    ];
});
