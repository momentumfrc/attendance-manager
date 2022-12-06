export enum MeetingEventType {
    END_OF_MEETING = "end-of-meeting"
}

export interface MeetingEvent {
    id: number,
    registered_by: number,
    type: MeetingEventType,
    created_at: Date,
    updated_at: Date
}
