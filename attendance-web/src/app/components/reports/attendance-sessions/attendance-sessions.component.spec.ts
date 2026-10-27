import { DateTime } from "luxon";
import { of, ReplaySubject, take } from "rxjs";
import { Student } from "src/app/models/student.model";
import { AttendanceService } from "src/app/services/attendance.service";
import { StudentsService } from "src/app/services/students.service";
import { AttendanceSessionRow, AttendanceSessionsComponent } from "./attendance-sessions.component";

describe('AttendanceSessionsComponent', () => {
    let attendanceServiceSpy: jasmine.SpyObj<AttendanceService>;
    let component: AttendanceSessionsComponent;

    const checkin = DateTime.fromISO('2026-01-02T03:04:05Z');
    const student = { id: 2, name: 'Student Two' } as Student;
    const deletedStudent = { id: 3, name: 'Deleted Student', deleted_at: checkin } as Student;

    beforeEach(() => {
        const studentsServiceSpy = jasmine.createSpyObj<StudentsService>('StudentsService', ['getStudentMap']);
        attendanceServiceSpy = jasmine.createSpyObj<AttendanceService>('AttendanceService', ['getSessions']);

        // The students service's cache is a ReplaySubject, which never completes
        const students = new ReplaySubject<Map<number, Student>>(1);
        students.next(new Map([student, deletedStudent].map(it => [it.id, it])));
        studentsServiceSpy.getStudentMap.and.returnValue(students);

        attendanceServiceSpy.getSessions.and.returnValue(of([
            { student_id: student.id, checkin_id: 1, checkin_date: checkin,
                checkout_id: 2, checkout_date: checkin.plus({ hours: 2, seconds: 5 }) },
            { student_id: deletedStudent.id, checkin_id: 3, checkin_date: checkin.plus({ days: 1 }),
                checkout_id: null, checkout_date: null }
        ]));

        component = new AttendanceSessionsComponent(attendanceServiceSpy, studentsServiceSpy);
        component.ngOnInit();
    });

    afterEach(() => {
        component.ngOnDestroy();
    });

    function currentSessions(): AttendanceSessionRow[]|null {
        let sessions: AttendanceSessionRow[]|null = null;
        component.sessions.pipe(take(1)).subscribe(it => sessions = it);
        return sessions;
    }

    it('should load the sessions of every student in the selected date range', () => {
        const range = { since: checkin.minus({ days: 7 }), until: checkin.plus({ days: 7 }) };
        component.updateDateSelection(range);

        expect(attendanceServiceSpy.getSessions).toHaveBeenCalledOnceWith(range);
        expect(currentSessions()?.map(row => row.student?.name)).toEqual(['Deleted Student', 'Student Two']);
    });

    it('should export the sessions as csv rows', () => {
        component.updateDateSelection({ since: checkin.minus({ days: 7 }), until: checkin.plus({ days: 7 }) });

        const rows = currentSessions()!.map(row => component.csvColumns.map(column => column.value(row)));

        expect(component.csvColumns.map(column => column.header)).toEqual(
            ['student_id', 'student_name', 'checkin_at', 'checkout_at', 'duration_seconds']);
        expect(rows).toEqual([
            [deletedStudent.id, 'Deleted Student', checkin.plus({ days: 1 }).toISO(), undefined, null],
            [student.id, 'Student Two', checkin.toISO(), checkin.plus({ hours: 2, seconds: 5 }).toISO(), 7205]
        ]);
    });

    it('should format the session durations', () => {
        component.updateDateSelection({ since: checkin.minus({ days: 7 }), until: checkin.plus({ days: 7 }) });

        expect(currentSessions()!.map(row => component.formatDuration(row))).toEqual(['-', '2:00:05']);
    });
});
