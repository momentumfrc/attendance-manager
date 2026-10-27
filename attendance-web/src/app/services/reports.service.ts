import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MeetingAttendance, MeetingStudentCount, StudentStats } from '../models/report-models';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor(private httpClient: HttpClient) { }

  /**
   * Meetings are grouped by date in the browser's timezone. An IANA name (rather than the current offset) lets the
   * server account for daylight saving time.
   */
  private timezoneParams(): HttpParams {
    return new HttpParams().set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  }

  getMeetingList(options?: {
    since?: DateTime,
    until?: DateTime,
    limit?: number
  }): Observable<Array<MeetingStudentCount>> {
    let params = this.timezoneParams();
    if(options?.since) {
      params = params.set('since', Math.floor(options.since.toMillis() / 1000));
    }
    if(options?.until) {
      params = params.set('until', Math.floor(options.until.toMillis() / 1000));
    }
    if(options?.limit) {
      params = params.set('limit', options.limit);
    }

    return this.httpClient.get<Array<MeetingStudentCount>>(environment.apiRoot + '/reports/list-meetings', {params});
  }

  getMeetingAttendance(options?: {
    meeting_date?: DateTime
  }): Observable<MeetingAttendance> {
    let params = this.timezoneParams();
    if(options?.meeting_date) {
      const formatted = options.meeting_date.toISODate();
      if(formatted) {
        params = params.set('on', formatted);
      }
    }

    return this.httpClient.get<MeetingAttendance>(environment.apiRoot + '/reports/meeting-attendance', {params});
  }

  getStudentStats(options?: {
    since?: DateTime,
    until?: DateTime
  }) {
    let params = new HttpParams();
    if(options?.since) {
      params = params.set('since', Math.floor(options.since.toMillis() / 1000));
    }
    if(options?.until) {
      params = params.set('until', Math.floor(options.until.toMillis() / 1000));
    }

    return this.httpClient.get<Array<StudentStats>>(environment.apiRoot + '/reports/student-stats', {params});
  }
}
