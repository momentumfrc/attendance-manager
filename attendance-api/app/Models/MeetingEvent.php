<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingEvent extends Model
{
    use HasFactory;

    protected $casts = [
        'registered_by' => 'integer'
    ];
}
