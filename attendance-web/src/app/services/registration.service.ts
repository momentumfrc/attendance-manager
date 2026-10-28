import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CATCH_ERRORS } from '../http-interceptors/error-interceptor';
import { RegistrationStep } from '../models/student.model';
import { ErrorService } from './error.service';
import { StudentsService } from './students.service';

export const NEW_SEASON = "new_season";

export interface RegistrationEvent {
  id: number,
  student_id: number|null,
  registered_by: number,
  event_type: RegistrationStep|typeof NEW_SEASON,
  created_at: DateTime,
  updated_at: DateTime,
  deleted_at?: DateTime
}

export type CanvasPushStatus = 'pushed'|'unchanged';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

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
   * Undo a registration event: uncheck a step, or undo a new season. Emits null if someone else
   * already undid it.
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

  private refreshAffectedStudents(studentId: number|null) {
    if(studentId === null) {
      // A new season affects everyone. Include deleted students so pages listing them keep them.
      this.studentsService.refreshCache(true);
    } else {
      this.studentsService.refreshSingleStudent(studentId);
    }
  }
}
