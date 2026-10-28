import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { DateTime } from "luxon";
import { of } from "rxjs";
import { Student } from "src/app/models/student.model";
import { AuthService } from "src/app/services/auth.service";
import { PermissionsService } from "src/app/services/permissions.service";
import { StudentsService } from "src/app/services/students.service";
import { ListStudentsComponent } from "./list-students.component";

describe('ListStudentsComponent', () => {
    const now = DateTime.now();

    const student = (id: number, name: string, options: {contract?: boolean, graduation_year?: number} = {}): Student => ({
        id,
        name,
        graduation_year: options.graduation_year,
        registered_by: 1,
        created_at: now,
        updated_at: now,
        registration: {
            student_contract: options.contract ? id : null,
            shared_science: null,
            first_cr: null
        }
    });

    let component: ListStudentsComponent;

    beforeEach(() => {
        const studentsServiceSpy: jasmine.SpyObj<StudentsService> = jasmine.createSpyObj('StudentsService', ['getAllStudents']);
        studentsServiceSpy.getAllStudents.and.returnValue(of([
            student(1, 'Alice', {contract: true, graduation_year: now.year}),
            student(2, 'Bob'),
            student(3, 'Carol', {contract: true, graduation_year: now.year + 2}),
            student(4, 'Dave', {graduation_year: now.year + 1})
        ]));

        component = new ListStudentsComponent(
            studentsServiceSpy,
            {} as AuthService,
            {} as Router,
            {} as MatDialog,
            {} as PermissionsService
        );
        component.ngOnInit();
    });

    afterEach(() => component.ngOnDestroy());

    const checkedNames = () => component.checkedStudents.getValue().map(it => it.name);

    it('should select students without a signed contract', () => {
        component.selectStudentsWithoutContract();

        expect(checkedNames()).toEqual(['Bob', 'Dave']);
    });

    it('should select graduating students', () => {
        component.selectAllGraduatingStudents();

        expect(checkedNames()).toEqual(['Alice']);
    });

    it('should replace the previous selection', () => {
        component.selectAllGraduatingStudents();
        component.selectStudentsWithoutContract();

        expect(checkedNames()).toEqual(['Bob', 'Dave']);
    });
});
