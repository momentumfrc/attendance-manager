import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { forkJoin, map, Observable, of, ReplaySubject, switchMap, take, tap } from 'rxjs';
import { User } from 'src/app/models/user.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  /**
   * User cache will include all active users, and may include some inactive/deleted users.
   */
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

  /**
   * Get all active users. Does not include deleted users.
   */
  public getAllUsers() : Observable<Array<User>> {
    return this.getUsers().pipe(map(usersMap => Array.from(usersMap.values()).filter(user => user.deleted_at == null)));
  }

  /**
   * Get specific user by id. Includes deleted users.
   */
  public getUser(userId: number): Observable<User> {
    return this.getSomeUsers([userId]).pipe(map(users => users.get(userId)!!));
  }

  /**
   * Get some specific users by id. Includes deleted users.
   */
  public getSomeUsers(userIds: number[]): Observable<Map<number, User>> {
    return this.getUsers().pipe(
      take(1),
      switchMap(users => {
        const requestedIds = new Set(userIds);
        const cachedIds = new Set([...users.keys()]);
        const missingIds = new Set([...requestedIds].filter(id => !cachedIds.has(id)));

        if(missingIds.size == 0) {
          return of(new Map([...users.entries()].filter(entry => requestedIds.has(entry[0]))));
        }

        const missingUserObservables = [...missingIds].map(id => this.httpClient.get<User>(environment.apiRoot +'/users/' + id));
        return forkJoin(missingUserObservables).pipe(
          tap(missingUsers => {
            this.cachedUsers.pipe(take(1)).subscribe(users => {
              const updated = new Map([...users.entries()].concat(missingUsers.map(user => [user.id, user])));
              this.cachedUsers.next(updated);
            });
          }),
          map(missingUsers =>
            new Map(
              [...users.entries()].filter(entry => requestedIds.has(entry[0]))
              .concat(missingUsers.map(user => [user.id, user]))
            )
          )
        );
      })
    );
  }

  public syncUserRoles(userId: number, roles: Array<string>) : Observable<User> {
    return this.httpClient.put<User>(environment.apiRoot + '/users/' + userId, {
      roles: roles
    });
  }

  public deleteUser(userId: number): Observable<void> {
    return this.httpClient.delete<User>(environment.apiRoot + '/users/' + userId).pipe(
      tap(user => {
        this.cachedUsers.pipe(take(1)).subscribe(users => {
          this.cachedUsers.next(new Map([...users.entries()].map(entry => entry[0] != user.id ? entry : [user.id, user])));
        });
      }),
      map(user => void 0)
    );
  }
}
