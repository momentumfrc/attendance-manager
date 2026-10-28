<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_events', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->softDeletes();
            // NULL for new-season events, which apply to every student
            $table->foreignId('student_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('registered_by')->constrained('users')->restrictOnDelete();
            $table->string('event_type', 24);

            $table->index(['student_id', 'event_type']);
            // The poll endpoint ORs together ranges on each timestamp column
            $table->index('created_at');
            $table->index('updated_at');
            $table->index('deleted_at');
        });

        if(config('app.env', 'production') == 'local') {
            // This integrity check adds overhead to registering new events, so only add it for debugging
            DB::statement(<<<'EOD'
                ALTER TABLE registration_events ADD CONSTRAINT chk_event_type CHECK (
                    event_type IN ('student_contract', 'shared_science', 'first_cr', 'new_season')
                    AND (event_type <> 'new_season' OR student_id IS NULL)
                );
                EOD);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_events');
    }
};
