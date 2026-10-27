<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

use App\Models\Concerns\RecordsPollChanges;

class AttendanceEvent extends Model
{
    use HasFactory;
    use SoftDeletes;
    use RecordsPollChanges;

    protected $casts = [
        'student_id' => 'integer',
        'registered_by' => 'integer'
    ];
}
