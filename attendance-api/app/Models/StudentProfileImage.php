<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Illuminate\Database\Eloquent\Casts\Attribute;

class StudentProfileImage extends Model
{
    use HasFactory;

    // The path on disk is a sever-side implementation detail, it should not be sent to the client
    // but we do want to send the basename, so the client can construct the URL to find the photo
    protected $hidden = ['path'];
    protected $appends = ['basename'];

    public function student(): BelongsTo {
        return $this->belongsTo(Student::class);
    }

    protected function basename(): Attribute {
        return Attribute::make(
            get: fn() => basename($this->path)
        );
    }
}
