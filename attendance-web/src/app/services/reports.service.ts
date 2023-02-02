import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MeetingStatistic } from '../models/meeting-statistic.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor(private httpClient: HttpClient) { }

  getMeetingStats(options?: {
    since?: Date,
    until?: Date,
    limit?: number
  }): Observable<Array<MeetingStatistic>> {
    let params = new HttpParams();
    if(options?.since) {
      params = params.set('since', Math.floor(options.since.getTime() / 1000));
    }
    if(options?.until) {
      params = params.set('until', Math.floor(options.until.getTime() / 1000));
    }
    if(options?.limit) {
      params = params.set('limit', options.limit);
    }

    return this.httpClient.get<Array<MeetingStatistic>>(environment.apiRoot + '/stats/meetings', {params});
  }
}
