<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\Concerns\RecordsPollChanges;

class MeetingEvent extends Model
{
    use HasFactory;
    use RecordsPollChanges;

    protected $casts = [
        'registered_by' => 'integer'
    ];
}
