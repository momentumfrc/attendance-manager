import { DateTime } from "luxon";

export interface MeetingStatistic {
    meeting_date: DateTime,
    student_count: number
}
