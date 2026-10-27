import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { of, ReplaySubject, take } from "rxjs";
import { AttendanceEventType } from "src/app/models/attendance-event.model";
import { MeetingEventType } from "src/app/models/meeting-event.model";
import { Student } from "src/app/models/student.model";
import { User } from "src/app/models/user.model";
import { AttendanceService } from "src/app/services/attendance.service";
import { MeetingsService } from "src/app/services/meetings.service";
import { PermissionsService } from "src/app/services/permissions.service";
import { StudentsService } from "src/app/services/students.service";
import { UsersService } from "src/app/services/users.service";
import { EventLogComponent } from "./event-log.component";

describe('EventLogComponent', () => {
    let usersServiceSpy: jasmine.SpyObj<UsersService>;
    let component: EventLogComponent;

    const created = DateTime.fromISO('2026-01-02T03:04:05Z');
    const activeUser = { id: 3, name: 'Active User' } as User;
    const deletedUser = { id: 4, name: 'Deleted User', deleted_at: created } as User;

    beforeEach(() => {
        const studentsServiceSpy = jasmine.createSpyObj<StudentsService>('StudentsService', ['getAllStudents']);
        const permissionsServiceSpy = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['checkPermissions']);
        usersServiceSpy = jasmine.createSpyObj('UsersService', ['getAllUsers', 'getSomeUsers']);

        // The services' caches are ReplaySubjects, which never complete
        const students = new ReplaySubject<Array<Student>>(1);
        students.next([{ id: 2, name: 'Student Two' } as Student]);
        studentsServiceSpy.getAllStudents.and.returnValue(students);
        permissionsServiceSpy.checkPermissions.and.returnValue(of(false));

        const allUsers = new ReplaySubject<Array<User>>(1);
        allUsers.next([activeUser]);
        usersServiceSpy.getAllUsers.and.returnValue(allUsers);
        usersServiceSpy.getSomeUsers.and.callFake(ids => of(new Map(
            [activeUser, deletedUser].filter(user => ids.includes(user.id)).map(user => [user.id, user])
        )));

        component = new EventLogComponent(
            {} as MatDialog,
            {} as AttendanceService,
            studentsServiceSpy,
            usersServiceSpy,
            {} as MeetingsService,
            permissionsServiceSpy
        );
    });

    it('should show the registrar of events registered by deleted users', () => {
        component.ngOnInit();
        component.events.next({
            attendance: [{
                id: 1,
                student_id: 2,
                registered_by: deletedUser.id,
                type: AttendanceEventType.CHECK_IN,
                created_at: created,
                updated_at: created
            }],
            meetings: [{
                id: 5,
                registered_by: activeUser.id,
                type: MeetingEventType.END_OF_MEETING,
                created_at: created.plus({ hours: 1 }),
                updated_at: created.plus({ hours: 1 })
            }]
        });

        let registrars: Array<string|undefined> = [];
        component.richEvents.connect(null!).pipe(take(1)).subscribe(events => {
            registrars = events.map(event => event.registrar?.name);
        });

        expect(registrars).toEqual(['Active User', 'Deleted User']);
    });
});
