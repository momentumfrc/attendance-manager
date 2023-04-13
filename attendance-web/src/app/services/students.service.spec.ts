import { HttpClient } from "@angular/common/http";
import { DateTime } from "luxon";
import { of } from "rxjs";
import { AttendanceEventType } from "../models/attendance-event.model";
import { Student } from "../models/student.model";
import { StudentsService } from "./students.service";

describe('StudentsService', () => {
    it('should return all students', (done: DoneFn) => {
        let httpClientSpy: jasmine.SpyObj<HttpClient> = jasmine.createSpyObj('HttpClient', ['get']);
        let studentsService: StudentsService;

        const now = DateTime.now();
        const expectedStudents: Array<Student> = [
            {
                id: 1,
                name: "Foo Bar",
                registered_by: 1,
                created_at: now,
                updated_at: now,
                last_check_in: {
                    id: 1,
                    student_id: 1,
                    registered_by: 1,
                    type: AttendanceEventType.CHECK_IN,
                    created_at: now,
                    updated_at: now
                }
            },
            {
                id: 2,
                name: "Foo Baz",
                registered_by: 1,
                created_at: now,
                updated_at: now
            }
        ];

        httpClientSpy.get.and.returnValue(of(expectedStudents));
        studentsService = new StudentsService(httpClientSpy);

        studentsService.getAllStudents().subscribe({
            next: students => {
                expect(students).toEqual(expectedStudents);
                done();
            },
            error: done.fail
        })
        expect(httpClientSpy.get.calls.count()).toBe(1);
    });
});
