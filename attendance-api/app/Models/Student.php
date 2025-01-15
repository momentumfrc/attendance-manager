<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = ['name', 'graduation_year'];
    protected $with = ['profileImage'];

    protected $casts = [
        'graduation_year' => 'integer'
    ];

    public function attendanceEvents() {
        return $this->hasMany(AttendanceEvent::class);
    }

    public function attendanceSessions() {
        return $this->hasMany(AttendanceSession::class, 'student_id');
    }

    public function profileImage(): HasOne {
        return $this->hasOne(StudentProfileImage::class);
    }

}
