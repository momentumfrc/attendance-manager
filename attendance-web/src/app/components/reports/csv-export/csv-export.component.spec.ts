import { DateTime } from "luxon";
import { Papa } from "ngx-papaparse";
import { of, ReplaySubject } from "rxjs";
import { AttendanceEventType } from "src/app/models/attendance-event.model";
import { Student } from "src/app/models/student.model";
import { User } from "src/app/models/user.model";
import { AttendanceService } from "src/app/services/attendance.service";
import { StudentsService } from "src/app/services/students.service";
import { UsersService } from "src/app/services/users.service";
import { CsvExportComponent } from "./csv-export.component";

describe('CsvExportComponent', () => {
    let attendanceServiceSpy: jasmine.SpyObj<AttendanceService>;
    let studentsServiceSpy: jasmine.SpyObj<StudentsService>;
    let usersServiceSpy: jasmine.SpyObj<UsersService>;
    let component: CsvExportComponent;
    let downloads: string[];

    const created = DateTime.fromISO('2026-01-02T03:04:05Z');

    beforeEach(() => {
        attendanceServiceSpy = jasmine.createSpyObj('AttendanceService', ['getEvents']);
        studentsServiceSpy = jasmine.createSpyObj('StudentsService', ['getAllStudents']);
        usersServiceSpy = jasmine.createSpyObj('UsersService', ['getAllUsers']);
        component = new CsvExportComponent(attendanceServiceSpy, studentsServiceSpy, usersServiceSpy, new Papa());

        // The services' caches are ReplaySubjects, which never complete
        const students = new ReplaySubject<Array<Student>>(1);
        students.next([{ id: 2, name: 'Student Two' } as Student]);
        studentsServiceSpy.getAllStudents.and.returnValue(students);
        const users = new ReplaySubject<Array<User>>(1);
        users.next([{ id: 3, name: 'User Three' } as User]);
        usersServiceSpy.getAllUsers.and.returnValue(users);

        attendanceServiceSpy.getEvents.and.returnValue(of([{
            id: 1,
            student_id: 2,
            registered_by: 3,
            type: AttendanceEventType.CHECK_IN,
            created_at: created,
            updated_at: created
        }]));

        downloads = [];
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function(this: HTMLAnchorElement) {
            downloads.push(decodeURIComponent(this.href.substring(this.href.indexOf(',') + 1)));
        });
    });

    it('should download the events as a csv', () => {
        component.dateRangeSelection = { since: created.minus({ days: 1 }), until: created.plus({ days: 1 }) };

        component.downloadCsv();

        expect(downloads.length).toBe(1);
        const lines = downloads[0].split(/\r?\n/);
        expect(lines[0]).toBe('"event_id","student_id","student_name","event_registered_by_id","event_registered_by_name","event_type","event_created_at"');
        expect(lines[1]).toBe(`"1","2","Student Two","3","User Three","check-in","${created.toISO()}"`);
    });
});
