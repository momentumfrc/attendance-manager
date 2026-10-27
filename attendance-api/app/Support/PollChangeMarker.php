<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Tracks when any polled model last changed, so the heavily-polled poll endpoint can answer
 * "nothing changed" without querying the database.
 */
class PollChangeMarker
{
    public const CACHE_KEY = 'poll:last_change';

    public static function touch(): void {
        Cache::forever(self::CACHE_KEY, now()->timestamp);
    }

    /**
     * The timestamp of the last change, or null if unknown (e.g. the cache was cleared), in which
     * case callers must assume anything may have changed.
     */
    public static function lastChange(): ?int {
        return Cache::get(self::CACHE_KEY);
    }
}
