import { DateTime } from "luxon"
import { AttendanceEvent, areAttendanceEventsEqual } from "./attendance-event.model"

export interface StudentProfileImage {
    id: number,
    created_at: DateTime,
    updated_at: DateTime,
    student_id: number,
    uploaded_by: number,
    basename: string
}

export interface Student {
    id: number,
    name: string,
    graduation_year?: number,
    registered_by: number,
    created_at: DateTime,
    updated_at: DateTime,
    deleted_at?: DateTime,
    last_check_in?: AttendanceEvent,
    last_check_out?: AttendanceEvent,
    profile_image?: StudentProfileImage
}

export function areStudentsEqual(a: Student, b: Student): boolean {
    const compare_optional_dates = (d1: DateTime|undefined, d2: DateTime|undefined) => {
        if(d1 == undefined || d2 == undefined) {
            return d1 === d2;
        }
        return d1.equals(d2);
    };
    const compare_optional_events = (e1: AttendanceEvent|undefined, e2: AttendanceEvent|undefined) => {
        if(e1 == undefined || e2 == undefined) {
            return e1 === e2;
        }
        return areAttendanceEventsEqual(e1, e2);
    };
    return a.id === b.id
        && a.name === b.name
        && a.graduation_year === b.graduation_year
        && a.registered_by === b.registered_by
        && a.created_at.equals(b.created_at)
        && a.updated_at.equals(b.updated_at)
        && compare_optional_dates(a.deleted_at, b.deleted_at)
        && compare_optional_events(a.last_check_in, b.last_check_in)
        && compare_optional_events(a.last_check_out, b.last_check_out);
}

export function compareStudents(a: Student, b: Student): number {
    const aName = a.name.toLocaleLowerCase();
    const bName = b.name.toLocaleLowerCase();

    if(aName != bName) {
        return aName.localeCompare(bName);
    }

    return (a.graduation_year ?? 0) - (b.graduation_year ?? 0);
}

export class StudentList {
    private nameRepetitions: Map<string, number> = new Map();

    constructor(
        public students: Student[]
    ){
        this.students.forEach(student => {
            if(this.nameRepetitions.has(student.name)) {
                this.nameRepetitions.set(student.name, this.nameRepetitions.get(student.name)!! + 1);
            } else {
                this.nameRepetitions.set(student.name, 1);
            }
        })
    }

    nameIsRepeated(name: string): boolean {
        return (this.nameRepetitions.get(name) ?? 0) > 1;
    }

    getQualifiedName(student: Student): string {
        if(this.nameIsRepeated(student.name) && student.graduation_year) {
            return `${student.name} (${student.graduation_year})`;
        } else {
            return student.name;
        }
    }
}
