<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    // Profile images used to live on the public disk, so the webserver could serve them directly.
    // That also served them to anyone who knew the URL, so they now live on the private disk and
    // are only sent to authenticated users through StudentProfileImageController.
    private const PUBLIC_DIR = 'public/student_profiles';
    private const PRIVATE_DIR = 'student_profiles';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->move(self::PUBLIC_DIR, self::PRIVATE_DIR);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->move(self::PRIVATE_DIR, self::PUBLIC_DIR);
    }

    private function move(string $from, string $to): void
    {
        if(Storage::missing($to)) {
            Storage::makeDirectory($to);
        }

        // Move every file, including any without a database row, so none are left publicly accessible
        foreach(Storage::files($from) as $file) {
            Storage::move($file, $to.'/'.basename($file));
        }

        DB::table('student_profile_images')
            ->where('path', 'like', $from.'/%')
            // by id, as the update removes rows from the where clause, which would make offset paging skip rows
            ->eachById(function ($image) use ($to) {
                DB::table('student_profile_images')
                    ->where('id', $image->id)
                    ->update(['path' => $to.'/'.basename($image->path)]);
            });
    }
};
