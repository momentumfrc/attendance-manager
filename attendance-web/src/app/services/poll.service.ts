import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Student } from '../models/student.model';
import { MeetingEvent } from '../models/meeting-event.model';
import { Observable, interval, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PollResponse {
  updated_students: Student[],
  meeting_events: MeetingEvent[]
};

@Injectable({
  providedIn: 'root'
})
export class PollService {

  constructor(private httpClient: HttpClient) { }

  private getUpdates(options: {since: DateTime, until?: DateTime}): Observable<PollResponse> {
    let params = new HttpParams();
    params = params.set('since', Math.floor(options.since.toMillis() / 1000));
    if(options.until) {
      params = params.set('until', Math.floor(options.until.toMillis() / 1000));
    }

    return this.httpClient.get<PollResponse>(environment.apiRoot + '/poll', {params});
  }

  public getPollingObservable(): Observable<PollResponse> {
    return interval(environment.pollInterval).pipe(
      switchMap(() => {
        const since = DateTime.now().minus({milliseconds: (1000 + environment.pollInterval)});
        return this.getUpdates({since});
      })
    );
  }
}
