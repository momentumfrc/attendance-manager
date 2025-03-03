import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AsyncSubject, Observable, share } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(private httpClient: HttpClient) {}

  public getAllUsers() : Observable<Array<User>> {
    return this.httpClient.get<Array<User>>(environment.apiRoot + '/users').pipe(share());
  }

  public getUser(userId: number): Observable<User> {
    return this.httpClient.get<User>(environment.apiRoot + '/users/' + userId);
  }

  public syncUserRoles(userId: number, roles: Array<string>) : Observable<User> {
    return this.httpClient.put<User>(environment.apiRoot + '/users/' + userId, {
      roles: roles
    });
  }
}
