<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAttendanceEventsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('attendance_events', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('registered_by')->constrained('users')->onDelete('restrict');
            $table->string('type', 16);
        });

        if(config('app.debug', false)) {
            // This integrity check adds overhead to registering new attendance events, so only add it for debugging
            DB::statement("ALTER TABLE attendance_events ADD CONSTRAINT chk_type CHECK (type IN ('check-in', 'check-out'));");
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('attendance_events');
    }
}
