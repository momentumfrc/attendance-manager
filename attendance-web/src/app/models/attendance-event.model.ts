export enum AttendanceEventType {
    CHECK_IN = "check-in",
    CHECK_OUT = "check-out"
}

export interface AttendanceEvent {
    id: number,
    student_id: number,
    registered_by: number,
    type: AttendanceEventType,
    created_at: Date,
    updated_at: Date
}
