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
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY student_id, type ORDER BY created_at DESC, id DESC) AS rn')
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

    public function populateRegistration() {
        static::populateRegistrationFor(new Collection([$this]));
    }

    /**
     * Set registration on each of the students, mapping each registration step to the id of the
     * event that completed it this season (or null). A step counts if its event came after the
     * latest new_season event.
     */
    public static function populateRegistrationFor(Collection $students) {
        $types = config('enums.registration_event_types');
        $steps = [$types['STUDENT_CONTRACT'], $types['SHARED_SCIENCE'], $types['FIRST_CR']];

        $events = RegistrationEvent::query()
            ->whereIn('student_id', $students->modelKeys())
            ->whereIn('event_type', $steps)
            ->afterSeason(RegistrationEvent::currentSeason())
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get(['id', 'student_id', 'event_type'])
            ->groupBy('student_id');

        foreach($students as $student) {
            // Events are newest first, so the first of each type is the one that completed the step
            $latest = $events->get($student->id, new Collection())->unique('event_type')->keyBy('event_type');
            $student->registration = collect($steps)
                ->mapWithKeys(fn($step) => [$step => $latest->get($step)?->id])
                ->all();
        }
    }

    /**
     * Why the student may not be checked in, or null if they may. Students must sign this season's
     * contract before attending, and once mentors require full registration, complete every step.
     */
    public function checkInRejection(): ?string {
        $this->populateRegistration();
        if($this->registration[config('enums.registration_event_types')['STUDENT_CONTRACT']] === null) {
            return 'The student has not signed the student contract.';
        }
        if(RegistrationEvent::registrationRequirement() !== null && in_array(null, $this->registration, true)) {
            return 'The student has not completed registration.';
        }
        return null;
    }

}
