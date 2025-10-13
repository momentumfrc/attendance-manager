import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { filter, map, Observable, ReplaySubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private cachedUsers = new ReplaySubject<Map<number, User>>(1);
  private lastRefresh: DateTime|null = null;

  constructor(private httpClient: HttpClient) {}

  private getUsers(): Observable<Map<number, User>> {
    const now = DateTime.now();
    if(this.lastRefresh === null || now.diff(this.lastRefresh).toMillis() > environment.cacheTTL) {
      this.lastRefresh = now;
      this.httpClient.get<Array<User>>(environment.apiRoot + '/users').pipe(
        map(users => new Map(users.map(user => [user.id, user])))
      ).subscribe(users => this.cachedUsers.next(users));
    }

    return this.cachedUsers;
  }

  public getAllUsers() : Observable<Array<User>> {
    return this.getUsers().pipe(map(usersMap => Array.from(usersMap.values())));
  }

  public getUser(userId: number): Observable<User> {
    return this.getUsers().pipe(
      map(usersMap => usersMap.get(userId) ?? null),
       filter(it => it != null)
    );
  }

  public syncUserRoles(userId: number, roles: Array<string>) : Observable<User> {
    return this.httpClient.put<User>(environment.apiRoot + '/users/' + userId, {
      roles: roles
    });
  }
}
