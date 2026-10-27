<?php

namespace App\Models\Concerns;

use App\Support\PollChangeMarker;

/**
 * For models returned by the poll endpoint. Every write must go through Eloquent so that it
 * updates the change marker, otherwise polling clients won't see it.
 */
trait RecordsPollChanges
{
    public static function bootRecordsPollChanges(): void {
        static::saved(fn() => PollChangeMarker::touch());
        static::deleted(fn() => PollChangeMarker::touch());
        if(method_exists(static::class, 'restored')) {
            static::restored(fn() => PollChangeMarker::touch());
        }
    }
}
