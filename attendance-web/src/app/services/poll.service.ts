import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Student } from '../models/student.model';
import { MeetingEvent } from '../models/meeting-event.model';
import { Observable, interval, switchMap, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PollResponse {
  updated_students: Student[],
  meeting_events: MeetingEvent[]
};

class Poller {
  private lastUpdate: DateTime|null = null;

  public constructor(
    private pollService: PollService
  ) {}

  private getSince(): DateTime {
    if(this.lastUpdate == null) {
      return DateTime.now().minus({milliseconds: (1000 + environment.pollInterval)});
    } else {
      return this.lastUpdate.minus({milliseconds: 1000});
    }
  }

  public getObservable(): Observable<PollResponse> {
    return interval(environment.pollInterval).pipe(
      switchMap(() => this.pollService.getUpdates({since: this.getSince()}).pipe(tap(() => {
        this.lastUpdate = DateTime.now();
      })))
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class PollService {

  constructor(private httpClient: HttpClient) { }

  public getUpdates(options: {since: DateTime, until?: DateTime}): Observable<PollResponse> {
    let params = new HttpParams();
    params = params.set('since', Math.floor(options.since.toMillis() / 1000));
    if(options.until) {
      params = params.set('until', Math.floor(options.until.toMillis() / 1000));
    }

    return this.httpClient.get<PollResponse>(environment.apiRoot + '/poll', {params});
  }

  public getPollingObservable(): Observable<PollResponse> {
    return new Poller(this).getObservable();
  }
}
