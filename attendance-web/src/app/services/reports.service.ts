import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MeetingAttendance, MeetingStudentCount } from '../models/report-models';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor(private httpClient: HttpClient) { }

  getMeetingList(options?: {
    since?: DateTime,
    until?: DateTime,
    limit?: number
  }): Observable<Array<MeetingStudentCount>> {
    let params = new HttpParams();
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
    let params = new HttpParams();
    if(options?.meeting_date) {
      const formatted = options.meeting_date.toISODate();
      if(formatted) {
        params = params.set('on', formatted);
      }
    }

    return this.httpClient.get<MeetingAttendance>(environment.apiRoot + '/reports/meeting-attendance', {params});
  }
}
