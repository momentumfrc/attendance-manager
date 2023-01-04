<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMeetingEventsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('meeting_events', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->foreignId('registered_by')->constrained('users')->onDelete('restrict');
            $table->string('type', 24);
        });

        if(config('app.env', 'production') == 'local') {
            // This integrity check adds overhead to registering new meeting events, so only add it for debugging
            DB::statement("ALTER TABLE meeting_events ADD CONSTRAINT chk_type CHECK (type IN ('end-of-meeting'));");
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('meeting_events');
    }
}
