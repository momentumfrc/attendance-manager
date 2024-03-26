import { DateTime } from "luxon";
import { AttendanceSession } from "./attendance-session.model";

export interface MeetingStudentCount {
    meeting_date: DateTime,
    student_count: number
}

export interface MeetingAttendance {
    meeting_date: DateTime,
    attendance_sessions: AttendanceSession[]
}
