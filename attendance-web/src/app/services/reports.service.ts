import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MeetingStatistic } from '../models/meeting-statistic.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor(private httpClient: HttpClient) { }

  getMeetingList(options?: {
    since?: DateTime,
    until?: DateTime,
    limit?: number
  }): Observable<Array<MeetingStatistic>> {
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

    return this.httpClient.get<Array<MeetingStatistic>>(environment.apiRoot + '/reports/list-meetings', {params});
  }
}
