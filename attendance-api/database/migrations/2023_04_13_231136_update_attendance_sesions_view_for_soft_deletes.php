<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateAttendanceSesionsViewForSoftDeletes extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $query = <<<'EOD'
            CREATE OR REPLACE VIEW attendance_sessions AS
            SELECT
                check_in.student_id AS student_id,
                check_in.id AS checkin_id,
                check_in.created_at AS checkin_date,
                check_out.id AS checkout_id,
                check_out.created_at as checkout_date
            FROM (
                SELECT check_in.id, check_in.created_at, check_in.student_id, (
                    SELECT IF(type = 'check-out', id, NULL) FROM attendance_events AS check_out_id_subquery
                    WHERE check_out_id_subquery.student_id = check_in.student_id
                        AND check_out_id_subquery.created_at > check_in.created_at
                        AND check_out_id_subquery.deleted_at IS NULL
                    ORDER BY check_out_id_subquery.created_at ASC
                    LIMIT 1
                ) AS checkout_id
                FROM attendance_events AS check_in
                WHERE type = 'check-in' AND deleted_at IS NULL
            ) AS check_in
            LEFT JOIN attendance_events AS check_out
                ON check_in.checkout_id = check_out.id
            WHERE check_out.deleted_at IS NULL
            ORDER BY student_id ASC, checkin_date DESC;
            EOD;
        DB::statement($query);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement("DROP VIEW IF EXISTS attendance_sessions;");
    }
}
