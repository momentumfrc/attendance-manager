import { HttpErrorResponse } from "@angular/common/http";
import { MatCheckbox, MatCheckboxChange } from "@angular/material/checkbox";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggle, MatSlideToggleChange } from "@angular/material/slide-toggle";
import { MatSnackBar } from "@angular/material/snack-bar";
import { DateTime } from "luxon";
import { NEVER, of, ReplaySubject, Subject, take, throwError } from "rxjs";
import { RegistrationStep, Student } from "src/app/models/student.model";
import { PermissionsService } from "src/app/services/permissions.service";
import { PollResponse, PollService } from "src/app/services/poll.service";
import { RegistrationEvent, RegistrationService, REQUIRE_REGISTRATION } from "src/app/services/registration.service";
import { StudentsService } from "src/app/services/students.service";
import { RegistrationComponent, RegistrationRow } from "./registration.component";

describe('RegistrationComponent', () => {
    const now = DateTime.now();
    const {STUDENT_CONTRACT, SHARED_SCIENCE, FIRST_CR} = RegistrationStep;

    let students: ReplaySubject<Student[]>;
    let studentsServiceSpy: jasmine.SpyObj<StudentsService>;
    let registrationServiceSpy: jasmine.SpyObj<RegistrationService>;
    let component: RegistrationComponent;

    const student = (id: number, name: string, registration: Partial<Record<RegistrationStep, number>> = {}, graduation_year?: number): Student => ({
        id,
        name,
        graduation_year,
        registered_by: 1,
        created_at: now,
        updated_at: now,
        registration: {
            student_contract: registration.student_contract ?? null,
            shared_science: registration.shared_science ?? null,
            first_cr: registration.first_cr ?? null
        }
    });

    const change = (checked: boolean): MatCheckboxChange => {
        const source = {checked} as MatCheckbox;
        return {checked, source};
    };

    const rows = (): RegistrationRow[] => {
        let result: RegistrationRow[] = [];
        component.rows.pipe(take(1)).subscribe(it => result = it);
        return result;
    };

    beforeEach(() => {
        students = new ReplaySubject(1);
        studentsServiceSpy = jasmine.createSpyObj('StudentsService', ['getAllStudents', 'updateStudentsInCache']);
        studentsServiceSpy.getAllStudents.and.returnValue(students);
        registrationServiceSpy = jasmine.createSpyObj('RegistrationService', [
            'completeStep', 'removeEvent', 'startNewSeason', 'pushCanvas', 'isCanvasStale',
            'getRegistrationRequirement', 'updateRequirement', 'requireRegistration'
        ]);
        registrationServiceSpy.getRegistrationRequirement.and.returnValue(of(null));
        registrationServiceSpy.isCanvasStale.and.returnValue(of(true));
        const pollServiceSpy: jasmine.SpyObj<PollService> = jasmine.createSpyObj('PollService', ['getPollingObservable']);
        pollServiceSpy.getPollingObservable.and.returnValue(NEVER);
        const permissionsServiceSpy: jasmine.SpyObj<PermissionsService> = jasmine.createSpyObj('PermissionsService', ['checkPermissions']);
        permissionsServiceSpy.checkPermissions.and.returnValue(of(true));

        component = new RegistrationComponent(
            studentsServiceSpy,
            registrationServiceSpy,
            pollServiceSpy,
            {} as MatDialog,
            {} as MatSnackBar,
            permissionsServiceSpy
        );
        component.ngOnInit();
    });

    afterEach(() => component.ngOnDestroy());

    it('should list students sorted by name', () => {
        students.next([
            student(1, 'Carol'),
            student(2, 'alice'),
            student(3, 'Bob')
        ]);

        expect(rows().map(row => row.name)).toEqual(['alice', 'Bob', 'Carol']);
    });

    it('should qualify duplicate names against the whole roster while searching', () => {
        students.next([
            student(1, 'Sam Lee', {}, 2026),
            student(2, 'Sam Lee', {}, 2027),
            student(3, 'Pat')
        ]);

        component.studentSearch.next('sam');

        expect(rows().map(row => row.name)).toEqual(['Sam Lee (2026)', 'Sam Lee (2027)']);
    });

    it('should complete a step when its box is checked', () => {
        const alice = student(1, 'Alice');
        registrationServiceSpy.completeStep.and.returnValue(of(null));

        component.toggleStep(alice, SHARED_SCIENCE, change(true));

        expect(registrationServiceSpy.completeStep).toHaveBeenCalledOnceWith(1, SHARED_SCIENCE);
        expect(registrationServiceSpy.removeEvent).not.toHaveBeenCalled();
    });

    it('should remove the event that completed a step when its box is unchecked', () => {
        const alice = student(1, 'Alice', {first_cr: 42});
        registrationServiceSpy.removeEvent.and.returnValue(of(null));

        component.toggleStep(alice, FIRST_CR, change(false));

        expect(registrationServiceSpy.removeEvent).toHaveBeenCalledOnceWith({id: 42, student_id: 1});
        expect(registrationServiceSpy.completeStep).not.toHaveBeenCalled();
    });

    it('should disable a box while its request is pending', () => {
        const response = new Subject<null>();
        registrationServiceSpy.completeStep.and.returnValue(response);

        component.toggleStep(student(1, 'Alice'), STUDENT_CONTRACT, change(true));
        expect(component.pending.getValue()).toEqual(['1:student_contract']);

        response.next(null);
        response.complete();
        expect(component.pending.getValue()).toEqual([]);
    });

    it('should only let student leads change the contract', () => {
        const permissionsServiceSpy: jasmine.SpyObj<PermissionsService> = jasmine.createSpyObj('PermissionsService', ['checkPermissions']);
        permissionsServiceSpy.checkPermissions.and.callFake(
            permissions => of(permissions.every(permission => permission == 'modify student contract'))
        );
        const leadComponent = new RegistrationComponent(
            studentsServiceSpy,
            registrationServiceSpy,
            jasmine.createSpyObj('PollService', {getPollingObservable: NEVER}),
            {} as MatDialog,
            {} as MatSnackBar,
            permissionsServiceSpy
        );
        registrationServiceSpy.isCanvasStale.calls.reset();
        leadComponent.ngOnInit();
        students.next([student(1, 'Alice')]);

        let modifiableSteps: RegistrationStep[] = [];
        let mayModify = true;
        leadComponent.view.pipe(take(1)).subscribe(view => modifiableSteps = view.modifiableSteps);
        leadComponent.mayModify.pipe(take(1)).subscribe(it => mayModify = it);

        expect(modifiableSteps).toEqual([STUDENT_CONTRACT]);
        expect(mayModify).toBeFalse();
        // Only mentors may see whether the canvas is out of date
        expect(registrationServiceSpy.isCanvasStale).not.toHaveBeenCalled();
        leadComponent.ngOnDestroy();
    });

    describe('canvas', () => {
        let poll: Subject<PollResponse>;
        let pollServiceSpy: jasmine.SpyObj<PollService>;
        let canvasComponent: RegistrationComponent;

        beforeEach(() => {
            poll = new Subject();
            pollServiceSpy = jasmine.createSpyObj('PollService', {getPollingObservable: poll});
            canvasComponent = new RegistrationComponent(
                studentsServiceSpy,
                registrationServiceSpy,
                pollServiceSpy,
                {} as MatDialog,
                jasmine.createSpyObj('MatSnackBar', ['open']),
                jasmine.createSpyObj('PermissionsService', {checkPermissions: of(true)})
            );
        });

        afterEach(() => canvasComponent.ngOnDestroy());

        it('should start out with whether the canvas is out of date', () => {
            registrationServiceSpy.isCanvasStale.and.returnValue(of(false));
            canvasComponent.ngOnInit();
            expect(canvasComponent.canvasStale.getValue()).toBeFalse();
        });

        it('should take canvas updates from polling', () => {
            registrationServiceSpy.isCanvasStale.and.returnValue(of(false));
            canvasComponent.ngOnInit();
            expect(pollServiceSpy.getPollingObservable).toHaveBeenCalledOnceWith({canvas: true});

            poll.next({updated_students: [], meeting_events: [], canvas_stale: true});
            expect(canvasComponent.canvasStale.getValue()).toBeTrue();

            // Polls without canvas changes leave it alone
            poll.next({updated_students: [], meeting_events: []});
            expect(canvasComponent.canvasStale.getValue()).toBeTrue();

            poll.next({updated_students: [], meeting_events: [], canvas_stale: false});
            expect(canvasComponent.canvasStale.getValue()).toBeFalse();
        });

        for(const status of ['pushed', 'unchanged'] as const) {
            it(`should mark the canvas up to date once ${status}`, () => {
                registrationServiceSpy.pushCanvas.and.returnValue(of(status));
                canvasComponent.ngOnInit();
                expect(canvasComponent.canvasStale.getValue()).toBeTrue();

                canvasComponent.updateCanvas();
                expect(canvasComponent.canvasStale.getValue()).toBeFalse();
            });
        }

        it('should mark the canvas out of date as soon as we change a step', () => {
            registrationServiceSpy.isCanvasStale.and.returnValue(of(false));
            registrationServiceSpy.completeStep.and.returnValue(of(null));
            registrationServiceSpy.removeEvent.and.returnValue(of(null));
            canvasComponent.ngOnInit();

            canvasComponent.toggleStep(student(1, 'Alice'), STUDENT_CONTRACT, change(true));
            expect(canvasComponent.canvasStale.getValue()).toBeTrue();

            canvasComponent.canvasStale.next(false);
            canvasComponent.toggleStep(student(1, 'Alice', {student_contract: 4}), STUDENT_CONTRACT, change(false));
            expect(canvasComponent.canvasStale.getValue()).toBeTrue();
        });

        it('should leave the canvas alone if changing a step fails', () => {
            registrationServiceSpy.isCanvasStale.and.returnValue(of(false));
            registrationServiceSpy.completeStep.and.returnValue(throwError(() => new Error('nope')));
            canvasComponent.ngOnInit();

            canvasComponent.toggleStep(student(1, 'Alice'), STUDENT_CONTRACT, change(true));
            expect(canvasComponent.canvasStale.getValue()).toBeFalse();
        });

        it('should mark the canvas out of date as soon as we start a new season', () => {
            const dialog = jasmine.createSpyObj('MatDialog', {open: {afterClosed: () => of(true)}});
            const snackbar = jasmine.createSpyObj('MatSnackBar', {open: {onAction: () => NEVER}});
            const seasonComponent = new RegistrationComponent(
                studentsServiceSpy,
                registrationServiceSpy,
                pollServiceSpy,
                dialog,
                snackbar,
                jasmine.createSpyObj('PermissionsService', {checkPermissions: of(true)})
            );
            registrationServiceSpy.isCanvasStale.and.returnValue(of(false));
            registrationServiceSpy.startNewSeason.and.returnValue(of({} as RegistrationEvent));
            seasonComponent.ngOnInit();

            seasonComponent.startNewSeason();
            expect(seasonComponent.canvasStale.getValue()).toBeTrue();
            seasonComponent.ngOnDestroy();
        });

        it('should leave the canvas out of date if the push fails', () => {
            registrationServiceSpy.pushCanvas.and.returnValue(throwError(() => new HttpErrorResponse({status: 502})));
            canvasComponent.ngOnInit();

            canvasComponent.updateCanvas();
            expect(canvasComponent.canvasStale.getValue()).toBeTrue();
        });
    });

    describe('registration requirement', () => {
        const requirement: RegistrationEvent = {
            id: 9,
            student_id: null,
            registered_by: 1,
            event_type: REQUIRE_REGISTRATION,
            created_at: now,
            updated_at: now
        };

        const toggleChange = (checked: boolean): MatSlideToggleChange => {
            const source = {checked} as MatSlideToggle;
            return {checked, source};
        };

        it('should require registration when toggled on', () => {
            registrationServiceSpy.requireRegistration.and.returnValue(of(requirement));

            component.toggleRequirement(toggleChange(true), null);

            expect(registrationServiceSpy.requireRegistration).toHaveBeenCalledTimes(1);
            expect(registrationServiceSpy.removeEvent).not.toHaveBeenCalled();
        });

        it('should remove the requirement when toggled off', () => {
            registrationServiceSpy.removeEvent.and.returnValue(of(requirement));

            component.toggleRequirement(toggleChange(false), requirement);

            expect(registrationServiceSpy.removeEvent).toHaveBeenCalledOnceWith(requirement);
            expect(registrationServiceSpy.requireRegistration).not.toHaveBeenCalled();
        });

        it('should disable the toggle while its request is pending', () => {
            const response = new Subject<RegistrationEvent>();
            registrationServiceSpy.requireRegistration.and.returnValue(response);

            component.toggleRequirement(toggleChange(true), null);
            expect(component.updatingRequirement).toBeTrue();

            response.next(requirement);
            response.complete();
            expect(component.updatingRequirement).toBeFalse();
        });

        it('should put the toggle back if the request fails', () => {
            registrationServiceSpy.requireRegistration.and.returnValue(throwError(() => new Error('nope')));
            const change = toggleChange(true);

            component.toggleRequirement(change, null);

            expect(change.source.checked).toBeFalse();
            expect(component.updatingRequirement).toBeFalse();
        });

        it('should take requirement updates from polling', () => {
            const poll = new Subject<PollResponse>();
            const pollingComponent = new RegistrationComponent(
                studentsServiceSpy,
                registrationServiceSpy,
                jasmine.createSpyObj('PollService', {getPollingObservable: poll}),
                {} as MatDialog,
                {} as MatSnackBar,
                jasmine.createSpyObj('PermissionsService', {checkPermissions: of(true)})
            );
            pollingComponent.ngOnInit();

            poll.next({updated_students: [], meeting_events: []});
            expect(registrationServiceSpy.updateRequirement).not.toHaveBeenCalled();

            poll.next({updated_students: [], meeting_events: [], registration_requirement: null});
            expect(registrationServiceSpy.updateRequirement).toHaveBeenCalledOnceWith(null);
            pollingComponent.ngOnDestroy();
        });
    });

    it('should put the box back if the request fails', () => {
        registrationServiceSpy.completeStep.and.returnValue(throwError(() => new Error('nope')));
        const checkboxChange = change(true);

        component.toggleStep(student(1, 'Alice'), STUDENT_CONTRACT, checkboxChange);

        expect(checkboxChange.source.checked).toBeFalse();
        expect(component.pending.getValue()).toEqual([]);
    });
});
