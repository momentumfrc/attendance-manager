import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http'
import { environment } from 'src/environments/environment';

import { Observable, map } from 'rxjs';

import { AttendanceEvent, AttendanceEventType } from 'src/app/models/attendance-event.model';
import { AttendanceSession } from '../models/attendance-session.model';
import { DateTime } from 'luxon';
import { CATCH_ERRORS } from '../http-interceptors/error-interceptor';


@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  constructor(private httpClient: HttpClient) { }

  registerEvent(studentId: number, eventType: AttendanceEventType, options: {
    catchErrors?: boolean
  } = {}): Observable<AttendanceEvent> {
    let context = new HttpContext();
    if(options.catchErrors !== undefined) {
      context = context.set(CATCH_ERRORS, options.catchErrors);
    }
    return this.httpClient.post<AttendanceEvent>(environment.apiRoot + '/attendance/events', {
      'student_id': studentId,
      'type': eventType
    }, {
      context
    });
  }

  deleteEvent(eventId: number, options: {
    force?: boolean
  } = {}): Observable<AttendanceEvent> {
    let params = new HttpParams();
    if(options.force) {
      params = params.set('force', options.force ? 1 : 0);
    }
    return this.httpClient.delete<AttendanceEvent>(environment.apiRoot + '/attendance/events/' + eventId, {
      params
    });
  }

  restoreEvent(eventId: number): Observable<AttendanceEvent> {
    return this.httpClient.put<AttendanceEvent>(environment.apiRoot + '/attendance/events/' + eventId, {});
  }

  getEvents(options: {
      since?: DateTime,
      until?: DateTime,
      forStudentId?: number,
      limit?: number,
      type?: AttendanceEventType,
      withTrashed?: boolean
  }): Observable<Array<AttendanceEvent>> {
    let params = new HttpParams();
    if(options.since) {
      params = params.set('since', Math.floor(options.since.toMillis() / 1000));
    }
    if(options.until) {
      params = params.set('until', Math.floor(options.until.toMillis() / 1000));
    }
    if(options.forStudentId) {
      params = params.set('student_id', options.forStudentId);
    }
    if(options.limit) {
      params = params.set('limit', options.limit);
    }
    if(options.type) {
      params = params.set('type', options.type);
    }
    if(options.withTrashed) {
      params = params.set('with_trashed', options.withTrashed ? 1 : 0);
    }

    return this.httpClient.get<Array<AttendanceEvent>>(environment.apiRoot + '/attendance/events', {params});
  }

  getSessions(options: {
    since?: DateTime,
    until?: DateTime,
    forStudentId?: number,
    limit?: number,
    excludePartial?: boolean
  }) {
    let params = new HttpParams();
    if(options.since) {
      params = params.set('since', Math.floor(options.since.toMillis() / 1000));
    }
    if(options.until) {
      params = params.set('until', Math.floor(options.until.toMillis() / 1000));
    }
    if(options.forStudentId) {
      params = params.set('student_id', options.forStudentId);
    }
    if(options.limit) {
      params = params.set('limit', options.limit);
    }
    if(options.excludePartial) {
      params = params.set('exclude_partial', 1);
    }

    return this.httpClient.get<Array<AttendanceSession>>(environment.apiRoot + '/attendance/sessions', {params});
  }
}
