<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;

use App\Models\Concerns\RecordsPollChanges;

class Student extends Model
{
    use HasFactory;
    use SoftDeletes;
    use RecordsPollChanges;

    protected $fillable = ['name', 'graduation_year'];
    protected $with = ['profileImage'];

    protected $casts = [
        'graduation_year' => 'integer',
        'registered_by' => 'integer'
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

    public function populateAttendanceEvents() {
        static::populateAttendanceEventsFor(new Collection([$this]));
    }

    /**
     * Set last_check_in and last_check_out on each of the students, using a single query for all of them.
     */
    public static function populateAttendanceEventsFor(Collection $students) {
        $types = config('enums.attendance_event_types');

        $ranked = AttendanceEvent::query()
            ->select('*')
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY student_id, type ORDER BY updated_at DESC) AS rn')
            ->whereIn('student_id', $students->modelKeys())
            ->whereIn('type', [$types['CHECK_IN'], $types['CHECK_OUT']]);

        $latest = AttendanceEvent::query()
            ->fromSub($ranked, 'attendance_events')
            ->select(['id', 'created_at', 'updated_at', 'student_id', 'registered_by', 'type', 'deleted_at'])
            ->where('rn', 1)
            ->get();

        $checkins = $latest->where('type', $types['CHECK_IN'])->keyBy('student_id');
        $checkouts = $latest->where('type', $types['CHECK_OUT'])->keyBy('student_id');

        foreach($students as $student) {
            $student->last_check_in = $checkins->get($student->id);
            $student->last_check_out = $checkouts->get($student->id);
        }
    }

}
