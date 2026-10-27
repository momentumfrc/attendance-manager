<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProfileImage extends Model
{
    use HasFactory;

    // The path on disk is a sever-side implementation detail, it should not be sent to the client
    protected $hidden = ['path'];

    // The image is part of the student's JSON, so changing it changes the student. Touching the student
    // also lets polling clients see the change, including deletions, which leave no row behind.
    protected $touches = ['student'];

    public function student(): BelongsTo {
        return $this->belongsTo(Student::class);
    }
}
