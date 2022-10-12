import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { environment } from 'src/environments/environment';

import { User } from 'src/app/models/user.model';
import { AsyncSubject, BehaviorSubject, catchError, map, Observable, of, ReplaySubject, Subject, tap, throwError } from 'rxjs';

export class UnauthenticatedError implements Error {
  readonly name = "UnauthenticatedError";
  constructor(public readonly message: string) {};
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private cachedUser = new AsyncSubject<User | null>();

  constructor(private httpClient: HttpClient) {
    this.invalidateUserCache();
  }

  public invalidateUserCache() {
    this.cachedUser = new AsyncSubject<User | null>();
    this.httpClient.get<User | null>(environment.apiRoot + '/user').pipe(
      catchError((error: HttpErrorResponse) => {
        if(error.status == 401 || error.status == 419) {
          return of(null);
        }
        return throwError(() => error);
      })
    ).subscribe(this.cachedUser);
  }

  public logIn() : void {
    window.location.href = environment.authRoot + '/redirect';
  }

  public getUser() : Observable<User | null> {
    return this.cachedUser;
  }

  public checkLoggedIn(): Observable<boolean> {
    return this.cachedUser.pipe(map((user: User|null) => user != null));
  }

  public checkHasAnyRole(roles: Array<string>): Observable<boolean> {
    return this.cachedUser.pipe(
      map((user: User|null) => {
        if(user == null) {
          return false;
        }
        return roles.reduce((previousValue, currentValue) =>
          previousValue || user.role_names.includes(currentValue), false
        );
      })
    );
  }

}
