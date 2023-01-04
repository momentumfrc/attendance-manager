import { AttendanceEvent } from "./attendance-event.model"

export interface Student {
    id: number,
    name: string,
    registered_by: number,
    created_at: Date,
    updated_at: Date,
    last_check_in?: AttendanceEvent,
    last_check_out?: AttendanceEvent
}
