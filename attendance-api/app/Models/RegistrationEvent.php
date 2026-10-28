<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

use App\Models\Concerns\RecordsPollChanges;

/**
 * One step of a student's yearly registration, or a new_season event (with no student) that
 * clears everyone's registration. Events are never edited, only soft-deleted to undo them.
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
}
