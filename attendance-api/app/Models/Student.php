<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $appends = ['last_check_in', 'last_check_out'];
    protected $fillable = ['name', 'graduation_year'];

    protected $casts = [
        'graduation_year' => 'integer'
    ];

    // TODO: Unhide this field once profile photos are enabled
    protected $hidden = ['profile_photo'];

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
        return $this->hasMany(AttendanceSession::class, 'student_id');
    }

}
