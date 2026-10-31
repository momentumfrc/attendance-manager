<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

use App\Models\Concerns\RecordsPollChanges;

/**
 * One step of a student's yearly registration, or an event with no student: new_season clears
 * everyone's registration, and require_registration requires full registration (not just the
 * contract) to check in until it's undone or a new season starts. Events are never edited, only
 * soft-deleted to undo them.
 */
class RegistrationEvent extends Model
{
    use HasFactory;
    use SoftDeletes;
    use RecordsPollChanges;

    protected $casts = [
        'student_id' => 'integer',
        'registered_by' => 'integer'
    ];

    /** The latest new_season event, or null if there hasn't been one. */
    public static function currentSeason(): ?RegistrationEvent {
        return static::query()
            ->where('event_type', config('enums.registration_event_types')['NEW_SEASON'])
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->first();
    }

    /** Events that came after the given new_season event. */
    public function scopeAfterSeason(Builder $query, ?RegistrationEvent $season) {
        $query->when($season, fn($query) => $query->where(fn($query) => $query
            ->where('created_at', '>', $season->created_at)
            ->orWhere(fn($query) => $query
                ->where('created_at', '=', $season->created_at)
                ->where('id', '>', $season->id))));
    }

    /** The require_registration event in effect this season, or null if it's not required. */
    public static function registrationRequirement(): ?RegistrationEvent {
        return static::query()
            ->where('event_type', config('enums.registration_event_types')['REQUIRE_REGISTRATION'])
            ->afterSeason(static::currentSeason())
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->first();
    }
}
