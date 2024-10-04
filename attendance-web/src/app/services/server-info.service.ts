import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, ReplaySubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ServerInfo } from '../models/server-info.model';

@Injectable({
  providedIn: 'root'
})
export class ServerInfoService {

  constructor(private httpClient: HttpClient) {
    httpClient.get<ServerInfo>(environment.apiRoot + '/info').subscribe(info => this.serverInfo.next(info));
  }

  private serverInfo: ReplaySubject<ServerInfo> = new ReplaySubject(1);

  public getServerHash(): Observable<string> {
    return this.serverInfo.pipe(
      map(info => info.git_hash)
    );
  }
}
