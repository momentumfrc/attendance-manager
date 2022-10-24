import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AsyncSubject, Observable, share } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private roles = new AsyncSubject<Array<string>>();

  constructor(private httpClient: HttpClient) {
    this.httpClient.get<Array<string>>(environment.apiRoot + '/roles').subscribe(this.roles);
  }

  public getAllUsers() : Observable<Array<User>> {
    return this.httpClient.get<Array<User>>(environment.apiRoot + '/users').pipe(share());
  }

  public getUser(userId: number): Observable<User> {
    return this.httpClient.get<User>(environment.apiRoot + '/users/' + userId);
  }

  public getAllRoles() : Observable<Array<string>> {
    return this.roles;
  }

  public syncUserRoles(userId: number, roles: Array<string>) : Observable<User> {
    return this.httpClient.put<User>(environment.apiRoot + '/users/' + userId, {
      roles: roles
    });
  }
}
