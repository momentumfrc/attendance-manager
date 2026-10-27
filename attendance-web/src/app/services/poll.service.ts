import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Student } from '../models/student.model';
import { MeetingEvent } from '../models/meeting-event.model';
import { EMPTY, Observable, distinctUntilChanged, fromEvent, map, merge, startWith, switchMap, tap, timer } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PollResponse {
  updated_students: Student[],
  meeting_events: MeetingEvent[]
};

class Poller {
  private lastUpdate: DateTime = DateTime.now().minus({milliseconds: environment.pollInterval});

  public constructor(
    private pollService: PollService
  ) {}

  private getSince(): DateTime {
    return this.lastUpdate.minus({milliseconds: 1000});
  }

  public getObservable(): Observable<PollResponse> {
    // pageshow and focus are fallbacks in case a browser misses a visibilitychange (e.g. WebKit
    // bugs around restoring pages), which would otherwise leave polling stopped
    const isVisible = merge(
      fromEvent(document, 'visibilitychange'),
      fromEvent(window, 'pageshow'),
      fromEvent(window, 'focus')
    ).pipe(
      startWith(null),
      map(() => document.visibilityState === 'visible'),
      distinctUntilChanged()
    );

    // Don't poll while the page is hidden. On becoming visible again, poll immediately: since
    // lastUpdate wasn't advanced while hidden, that poll catches up on everything we missed.
    return isVisible.pipe(
      switchMap(visible => visible ? timer(0, environment.pollInterval) : EMPTY),
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
