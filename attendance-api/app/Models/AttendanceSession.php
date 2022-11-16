<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceSession extends Model
{
    use HasFactory;

    protected $primaryKey = 'checkin_id';
    protected $casts = [
        'student_id' => 'integer',
        'checkin_id' => 'integer',
        'checkout_id' => 'integer',
        'checkin_date' => 'datetime',
        'checkout_date' => 'datetime'
    ];
}
