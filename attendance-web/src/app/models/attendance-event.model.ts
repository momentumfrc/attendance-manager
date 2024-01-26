import { DateTime } from "luxon";

export enum AttendanceEventType {
    CHECK_IN = "check-in",
    CHECK_OUT = "check-out"
}

export interface AttendanceEvent {
    id: number,
    student_id: number,
    registered_by: number,
    type: AttendanceEventType,
    created_at: DateTime,
    updated_at: DateTime
}

export function areAttendanceEventsEqual(a: AttendanceEvent, b: AttendanceEvent) {
    return a.id === b.id
        && a.student_id === b.student_id
        && a.registered_by === b.registered_by
        && a.type === b.type
        && a.created_at.equals(b.created_at)
        && a.updated_at.equals(b.updated_at);
}
