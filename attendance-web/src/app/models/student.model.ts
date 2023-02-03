import { DateTime } from "luxon"
import { AttendanceEvent } from "./attendance-event.model"

export interface Student {
    id: number,
    name: string,
    registered_by: number,
    created_at: DateTime,
    updated_at: DateTime,
    last_check_in?: AttendanceEvent,
    last_check_out?: AttendanceEvent
}
