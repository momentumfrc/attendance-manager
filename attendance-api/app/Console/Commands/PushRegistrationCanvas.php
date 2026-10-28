<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

use App\Services\RegistrationCanvas;
use App\Services\RegistrationCanvasException;

class PushRegistrationCanvas extends Command
{
    protected $signature = 'registration:push-canvas {--force : Push the canvas even if nothing changed since the last push}';
    protected $description = 'Update the Slack canvas showing every student\'s registration status, if it changed.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(RegistrationCanvas $canvas)
    {
        try {
            $pushed = $canvas->push($this->option('force'));
        } catch(RegistrationCanvasException $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        if($pushed) {
            $this->info('Updated the registration canvas.');
        } else {
            $this->info('No changes since the last update, and \'--force\' was not specified. Skipping the canvas update.');
        }

        return self::SUCCESS;
    }
}
