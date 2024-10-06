<?php

namespace App\Console\Commands;

use App\Models\StudentProfileImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;

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

        $onDisk = collect(Storage::files('student_profiles'));
        $inDb = StudentProfileImage::all();

        $danglingFiles = $onDisk->diff($inDb->pluck('path'));
        $danglingModels = $inDb->diffUsing($onDisk, fn($f1, $f2) => strcmp(is_string($f1) ? $f1 : $f1->path, is_string($f2) ? $f2 : $f2->path));

        $danglingFilesFormatted = $danglingFiles->map(fn($f) => [$f, Storage::size($f), Carbon::createFromTimestamp(Storage::lastModified($f))->toDateTimeString(), Storage::mimeType($f)]);
        $danglingModelsFormatted = $danglingModels->map(fn($m) => [$m->id, $m->path, $m->updated_at, $m->student_id, $m->uploaded_by]);

        $this->info("Identified the following dangling files on disk:");
        $this->table(["Path", "Size", "Last Modified", "Mime Type"], $danglingFilesFormatted);

        $this->info("\nIdentified the following dangling models in the database:");
        $this->table(["Id", "Path", "Last Modified", "Student Id", "Uploaded By"], $danglingModelsFormatted);
        $this->info("");

        if($dryRun) {
            $this->info("--dry-run specified, exiting");
            return;
        }

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
    }
}
