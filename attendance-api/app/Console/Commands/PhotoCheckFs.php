<?php

namespace App\Console\Commands;

use App\Models\StudentProfileImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

use Spatie\Image\Image;
use Spatie\Image\Manipulations;

class PhotoCheckFs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:photo-check-fs {--dry-run} {--no-confirm}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify integrity of profile photos database and file system.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $noConfirm = $this->option('no-confirm');

        $onDisk = collect(Storage::files('public/student_profiles'));
        $inDb = StudentProfileImage::all();

        $danglingFiles = $onDisk->diff($inDb->pluck('path'));
        $danglingModels = $inDb->diffUsing($onDisk, fn($f1, $f2) => strcmp(is_string($f1) ? $f1 : $f1->path, is_string($f2) ? $f2 : $f2->path));

        $danglingFilesFormatted = $danglingFiles->map(fn($f) => [$f, Storage::size($f), Carbon::createFromTimestamp(Storage::lastModified($f))->toDateTimeString(), Storage::mimeType($f)]);
        $danglingModelsFormatted = $danglingModels->map(fn($m) => [$m->id, $m->path, $m->updated_at, $m->student_id, $m->uploaded_by]);

        $this->info("STEP 1: Clean up dangling files and models");

        $this->info("Identified the following dangling files on disk:");
        $this->table(["Path", "Size", "Last Modified", "Mime Type"], $danglingFilesFormatted);

        $this->info("\nIdentified the following dangling models in the database:");
        $this->table(["Id", "Path", "Last Modified", "Student Id", "Uploaded By"], $danglingModelsFormatted);
        $this->info("");

        if(!$dryRun) {
            if($noConfirm) {
                $this->warn("--no-confirm specified, skipping confirmation");
            } else {
                $this->warn("Clean up is a destructive operation and will delete data!");
                if(!$this->confirm("Proceed with cleanup?")) {
                    $this->info("Abort");
                    return;
                }
            }

            foreach($danglingFiles as $file) {
                Storage::delete($file);
            }

            StudentProfileImage::destroy($danglingModels->pluck("id"));

            $this->info($danglingFiles->count().' files and '.$danglingModels->count().' models deleted');
        } else {
            $this->info("--dry-run specified, skipping cleanup");
        }

        $this->info("");
        $this->info("STEP 2: Verify image sizes and formats");

        $inDb = StudentProfileImage::all();
        $info = [];

        $resize_size = config('config.profile_image_resolution');

        foreach($inDb as $m) {
            $path = $m->path;
            if(Storage::exists($path)) {
                $image = Image::load(Storage::path($path))->useImageDriver('gd');

                $width = $image->getWidth();
                $height = $image->getHeight();
                $mimetype = Storage::mimeType($path);

                $reformat = ($width > $resize_size) || ($height > $resize_size) || ($mimetype !== 'image/png');
            } else {
                $width = "???";
                $height = "???";
                $mimetype = "???";
                $reformat = False;
            }

            if(!$dryRun && $reformat) {
                $new_path = 'public/student_profiles/'.Str::random(40).'.png';
                $fullpath = Storage::path($new_path);

                $image->fit(Manipulations::FIT_CONTAIN, $resize_size, $resize_size)
                    ->save($fullpath);

                $m->path = $new_path;
                $m->save();
            } else {
                $new_path = "N/A";
            }


            $info[] = [$m->id, $path, $m->updated_at, $width, $height, $mimetype, $reformat ? "Yes": "No", $new_path];

        }

        $this->table(['Id', 'Path', 'Last Modified', 'Width', 'Height', 'Mime Type', 'Will Reformat?', 'New Path'], $info);
    }
}
