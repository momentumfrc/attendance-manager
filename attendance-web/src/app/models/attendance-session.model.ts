import { DateTime } from "luxon";

export interface AttendanceSession {
    student_id: number,
    checkin_id: number,
    checkin_date: DateTime,
    checkout_id: number|null,
    checkout_date: DateTime|null
}
