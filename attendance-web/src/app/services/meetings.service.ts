import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MeetingEvent, MeetingEventType } from '../models/meeting-event.model';

@Injectable({
  providedIn: 'root'
})
export class MeetingsService {

  constructor(private httpClient: HttpClient) { }

  registerEvent(eventType: MeetingEventType, options?: {
    date?: DateTime
  }): Observable<MeetingEvent> {
    const postBody: any = {
      type: eventType
    }

    if(options?.date) {
      postBody['date'] = Math.floor(options.date.toMillis() / 1000);
    }

    return this.httpClient.post<MeetingEvent>(environment.apiRoot + '/meetings', postBody);
  }

  getEvents(options?: {
    since?: DateTime,
    until?: DateTime,
    limit?: number,
    type?: MeetingEventType
  }): Observable<Array<MeetingEvent>> {
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
    if(options?.type) {
      params = params.set('type', options.type);
    }

    return this.httpClient.get<Array<MeetingEvent>>(environment.apiRoot + '/meetings', {params});
  }

  deleteEvent(eventId: number): Observable<HttpResponse<any>> {
    return this.httpClient.delete(environment.apiRoot + '/meetings/' + eventId, {
      observe: 'response'
    });
  }
}
