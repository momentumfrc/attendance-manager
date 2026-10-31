import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { catchError, map, Observable, of, ReplaySubject, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CATCH_ERRORS } from '../http-interceptors/error-interceptor';
import { RegistrationStep } from '../models/student.model';
import { ErrorService } from './error.service';
import { StudentsService } from './students.service';

export const NEW_SEASON = "new_season";
export const REQUIRE_REGISTRATION = "require_registration";

export interface RegistrationEvent {
  id: number,
  student_id: number|null,
  registered_by: number,
  event_type: RegistrationStep|typeof NEW_SEASON|typeof REQUIRE_REGISTRATION,
  created_at: DateTime,
  updated_at: DateTime,
  deleted_at?: DateTime
}

export type CanvasPushStatus = 'pushed'|'unchanged';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  /** The require_registration event in effect, or null. Only fetched once a page asks for it. */
  private requirement?: ReplaySubject<RegistrationEvent|null>;

  constructor(
    private httpClient: HttpClient,
    private studentsService: StudentsService,
    private errorService: ErrorService
  ) { }

  /**
   * Mark a registration step as completed for a student. Emits null if someone else already
   * completed it.
   */
  completeStep(studentId: number, step: RegistrationStep): Observable<RegistrationEvent|null> {
    const request = this.httpClient.post<RegistrationEvent>(environment.apiRoot + '/registration/events', {
      student_id: studentId,
      event_type: step
    }, {
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      this.ignoreErrorStatus(422),
      shareReplay(1)
    );

    // Errors are reported through the caller's subscription
    request.subscribe({next: () => this.refreshAffectedStudents(studentId), error: () => {}});

    return request;
  }

  /**
   * The require_registration event in effect, or null if students only need to sign the contract
   * to check in. Pages that poll keep it up to date with updateRequirement(). Pages only poll for
   * changes from when they open, so it's refetched each time a page asks for it.
   */
  getRegistrationRequirement(): Observable<RegistrationEvent|null> {
    this.requirement ??= new ReplaySubject(1);
    this.refreshRequirement();
    return this.requirement;
  }

  /** Record a requirement change reported by polling. */
  updateRequirement(event: RegistrationEvent|null) {
    this.requirement?.next(event);
  }

  /**
   * Require full registration to check in, until it's undone with removeEvent() or a new season
   * starts. Emits null if someone else already required it.
   */
  requireRegistration(): Observable<RegistrationEvent|null> {
    const request = this.httpClient.post<RegistrationEvent>(environment.apiRoot + '/registration/events', {
      event_type: REQUIRE_REGISTRATION
    }, {
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      this.ignoreErrorStatus(422),
      shareReplay(1)
    );

    request.subscribe({next: () => this.refreshRequirement(), error: () => {}});

    return request;
  }

  /**
   * Undo a registration event: uncheck a step, or undo a new season or registration requirement.
   * Emits null if someone else already undid it.
   */
  removeEvent(event: {id: number, student_id: number|null}): Observable<RegistrationEvent|null> {
    const request = this.httpClient.delete<RegistrationEvent>(environment.apiRoot + '/registration/events/' + event.id, {
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      this.ignoreErrorStatus(404),
      shareReplay(1)
    );

    request.subscribe({next: () => this.refreshAffectedStudents(event.student_id), error: () => {}});

    return request;
  }

  /** Clear every student's registration. */
  startNewSeason(): Observable<RegistrationEvent> {
    const request = this.httpClient.post<RegistrationEvent>(environment.apiRoot + '/registration/events', {
      event_type: NEW_SEASON
    }).pipe(shareReplay(1));

    request.subscribe({next: () => this.refreshAffectedStudents(null), error: () => {}});

    return request;
  }

  /**
   * Update the Slack canvas, if anything changed since it was last updated. Errors are left to the
   * caller, since Slack can reject an update (e.g. while someone else edits the canvas).
   */
  pushCanvas(): Observable<CanvasPushStatus> {
    return this.httpClient.post<{status: CanvasPushStatus}>(environment.apiRoot + '/registration/canvas', {}, {
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      map(response => response.status)
    );
  }

  /**
   * The given status means another user already made the change, so it isn't an error. Others are
   * handled as usual.
   */
  private ignoreErrorStatus<T>(status: number) {
    return (source: Observable<T>) => source.pipe(
      catchError(error => {
        if(error instanceof HttpErrorResponse && error.status == status) {
          return of(null);
        }
        throw error;
      }),
      this.errorService.interceptErrors()
    );
  }

  private refreshRequirement() {
    const requirement = this.requirement;
    if(!requirement) {
      return;
    }
    this.httpClient.get<{event: RegistrationEvent|null}>(environment.apiRoot + '/registration/requirement')
      .subscribe(response => requirement.next(response.event));
  }

  private refreshAffectedStudents(studentId: number|null) {
    if(studentId === null) {
      // A new season affects everyone. Include deleted students so pages listing them keep them.
      this.studentsService.refreshCache(true);
      // Starting or undoing a new season also resets the requirement, or this undid the requirement
      this.refreshRequirement();
    } else {
      this.studentsService.refreshSingleStudent(studentId);
    }
  }
}
