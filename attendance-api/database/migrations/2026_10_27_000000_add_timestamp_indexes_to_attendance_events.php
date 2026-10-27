<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The poll endpoint ORs together ranges on each timestamp column. Separate indexes let the
     * database merge them instead of scanning the whole table.
     */
    public function up(): void
    {
        Schema::table('attendance_events', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('updated_at');
            $table->index('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_events', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['updated_at']);
            $table->dropIndex(['deleted_at']);
        });
    }
};
