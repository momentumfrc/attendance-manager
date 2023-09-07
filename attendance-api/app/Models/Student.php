<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $appends = ['last_check_in', 'last_check_out'];
    protected $fillable = ['name'];

    public function getLastCheckInAttribute() {
        return $this->attendanceEvents()->where('type', '=', config('enums.attendance_event_types')['CHECK_IN'])->orderBy('updated_at', 'desc')->first();
    }
    public function getLastCheckOutAttribute() {
        return $this->attendanceEvents()->where('type', '=', config('enums.attendance_event_types')['CHECK_OUT'])->orderBy('updated_at', 'desc')->first();
    }

    public function attendanceEvents() {
        return $this->hasMany(AttendanceEvent::class);
    }

    public function attendanceSessions() {
        return $this->hasMany(attendanceSessions::class, 'student_id');
    }

}
