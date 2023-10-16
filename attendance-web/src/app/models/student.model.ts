import { DateTime } from "luxon"
import { AttendanceEvent } from "./attendance-event.model"

export interface Student {
    id: number,
    name: string,
    graduation_year?: number,
    registered_by: number,
    created_at: DateTime,
    updated_at: DateTime,
    deleted_at?: DateTime,
    last_check_in?: AttendanceEvent,
    last_check_out?: AttendanceEvent
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
    public students: Student[];

    private nameRepetitions: Map<string, number> = new Map();

    constructor(
        students: Student[],
        sort: boolean = true
    ){
        if(sort) {
            this.students = [...students].sort(compareStudents);
        } else {
            this.students = students;
        }

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
