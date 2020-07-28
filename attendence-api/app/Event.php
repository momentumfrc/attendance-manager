<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $fillable = ['subjectId', 'type', 'registrarId', 'notes'];
}
