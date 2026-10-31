<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The integrity check is only added for debugging, see create_registration_events_table
        if(config('app.env', 'production') == 'local') {
            DB::statement('ALTER TABLE registration_events DROP CONSTRAINT chk_event_type');
            DB::statement(<<<'EOD'
                ALTER TABLE registration_events ADD CONSTRAINT chk_event_type CHECK (
                    event_type IN ('student_contract', 'shared_science', 'first_cr', 'new_season', 'require_registration')
                    AND (event_type NOT IN ('new_season', 'require_registration') OR student_id IS NULL)
                );
                EOD);
        }
    }

    public function down(): void
    {
        if(config('app.env', 'production') == 'local') {
            DB::statement('ALTER TABLE registration_events DROP CONSTRAINT chk_event_type');
            DB::statement(<<<'EOD'
                ALTER TABLE registration_events ADD CONSTRAINT chk_event_type CHECK (
                    event_type IN ('student_contract', 'shared_science', 'first_cr', 'new_season')
                    AND (event_type <> 'new_season' OR student_id IS NULL)
                );
                EOD);
        }
    }
};
