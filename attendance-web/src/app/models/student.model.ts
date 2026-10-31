import { DateTime } from "luxon"
import { AttendanceEvent, areAttendanceEventsEqual } from "./attendance-event.model"

export interface StudentProfileImage {
    id: number,
    created_at: DateTime,
    updated_at: DateTime,
    student_id: number,
    uploaded_by: number
}

export interface ProfileImageData {
    id: number,
    student_id: number,
    // base64-encoded PNG
    data: string
}

export enum RegistrationStep {
    STUDENT_CONTRACT = "student_contract",
    SHARED_SCIENCE = "shared_science",
    FIRST_CR = "first_cr"
}

/** For each registration step, the id of the event that completed it this season, or null. */
export type StudentRegistration = Record<RegistrationStep, number|null>;

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
    profile_image?: StudentProfileImage,
    registration?: StudentRegistration
}

function hasCompleted(student: Student, step: RegistrationStep): boolean {
    return student.registration?.[step] != null;
}

/** Students may not attend meetings until they've signed this season's contract. */
export function hasSignedContract(student: Student): boolean {
    return hasCompleted(student, RegistrationStep.STUDENT_CONTRACT);
}

export function isRegistered(student: Student): boolean {
    return Object.values(RegistrationStep).every(step => hasCompleted(student, step));
}

/**
 * Students must sign the contract to check in, and once mentors require full registration,
 * complete every step.
 */
export function mayCheckIn(student: Student, registrationRequired: boolean): boolean {
    return registrationRequired ? isRegistered(student) : hasSignedContract(student);
}

function areRegistrationsEqual(a?: StudentRegistration, b?: StudentRegistration): boolean {
    return Object.values(RegistrationStep).every(step => (a?.[step] ?? null) === (b?.[step] ?? null));
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
        && compare_optional_events(a.last_check_out, b.last_check_out)
        && a.profile_image?.id === b.profile_image?.id
        && areRegistrationsEqual(a.registration, b.registration);
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
