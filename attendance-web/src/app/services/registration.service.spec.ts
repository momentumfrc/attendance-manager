import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { DateTime } from "luxon";
import { of, throwError } from "rxjs";
import { ErrorService } from "./error.service";
import { RegistrationStep, Student } from "../models/student.model";
import { NEW_SEASON, RegistrationEvent, RegistrationService } from "./registration.service";
import { StudentsService } from "./students.service";

describe('RegistrationService', () => {
    const now = DateTime.now();

    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    let studentsServiceSpy: jasmine.SpyObj<StudentsService>;
    let service: RegistrationService;

    const event = (student_id: number|null, event_type: RegistrationEvent['event_type']): RegistrationEvent => ({
        id: 7,
        student_id,
        registered_by: 1,
        event_type,
        created_at: now,
        updated_at: now
    });

    let errorServiceSpy: jasmine.SpyObj<ErrorService>;

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['post', 'delete']);
        studentsServiceSpy = jasmine.createSpyObj('StudentsService', ['refreshSingleStudent', 'refreshCache']);
        studentsServiceSpy.refreshSingleStudent.and.returnValue(of({} as Student));
        errorServiceSpy = jasmine.createSpyObj('ErrorService', ['interceptErrors']);
        errorServiceSpy.interceptErrors.and.returnValue((obs: any) => obs);
        service = new RegistrationService(httpClientSpy, studentsServiceSpy, errorServiceSpy);
    });

    it('should treat a step someone else already changed as done', (done: DoneFn) => {
        httpClientSpy.post.and.returnValue(throwError(() => new HttpErrorResponse({status: 422})));

        service.completeStep(3, RegistrationStep.FIRST_CR).subscribe(result => {
            expect(result).toBeNull();
            // Show what the other user did
            expect(studentsServiceSpy.refreshSingleStudent).toHaveBeenCalledOnceWith(3);
            done();
        });
    });

    it('should pass on other errors', (done: DoneFn) => {
        httpClientSpy.delete.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));

        service.removeEvent({id: 7, student_id: 3}).subscribe({
            error: (error: HttpErrorResponse) => {
                expect(error.status).toBe(500);
                expect(studentsServiceSpy.refreshSingleStudent).not.toHaveBeenCalled();
                done();
            }
        });
    });

    it('should complete a step and refresh the student', () => {
        httpClientSpy.post.and.returnValue(of(event(3, RegistrationStep.FIRST_CR)));

        service.completeStep(3, RegistrationStep.FIRST_CR).subscribe();

        expect(httpClientSpy.post).toHaveBeenCalledOnceWith(
            jasmine.stringMatching(/\/registration\/events$/),
            {student_id: 3, event_type: 'first_cr'},
            jasmine.anything()
        );
        expect(studentsServiceSpy.refreshSingleStudent).toHaveBeenCalledOnceWith(3);
        expect(studentsServiceSpy.refreshCache).not.toHaveBeenCalled();
    });

    it('should remove a step and refresh the student', () => {
        httpClientSpy.delete.and.returnValue(of(event(3, RegistrationStep.FIRST_CR)));

        service.removeEvent({id: 7, student_id: 3}).subscribe();

        expect(httpClientSpy.delete).toHaveBeenCalledOnceWith(jasmine.stringMatching(/\/registration\/events\/7$/), jasmine.anything());
        expect(studentsServiceSpy.refreshSingleStudent).toHaveBeenCalledOnceWith(3);
    });

    it('should refresh every student after starting or undoing a new season', () => {
        httpClientSpy.post.and.returnValue(of(event(null, NEW_SEASON)));
        httpClientSpy.delete.and.returnValue(of(event(null, NEW_SEASON)));

        service.startNewSeason().subscribe();
        expect(httpClientSpy.post).toHaveBeenCalledOnceWith(
            jasmine.stringMatching(/\/registration\/events$/),
            {event_type: 'new_season'}
        );
        expect(studentsServiceSpy.refreshCache).toHaveBeenCalledTimes(1);

        service.removeEvent({id: 7, student_id: null}).subscribe();
        expect(studentsServiceSpy.refreshCache).toHaveBeenCalledTimes(2);
        expect(studentsServiceSpy.refreshSingleStudent).not.toHaveBeenCalled();
    });

    it('should report whether the canvas was pushed', (done: DoneFn) => {
        httpClientSpy.post.and.returnValue(of({status: 'unchanged'}));

        service.pushCanvas().subscribe(status => {
            expect(status).toBe('unchanged');
            expect(httpClientSpy.post).toHaveBeenCalledOnceWith(jasmine.stringMatching(/\/registration\/canvas$/), {}, jasmine.anything());
            done();
        });
    });
});
