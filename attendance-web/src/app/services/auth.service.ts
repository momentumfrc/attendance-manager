import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http'
import { environment } from 'src/environments/environment';

import { User } from 'src/app/models/user.model';
import { AsyncSubject, BehaviorSubject, catchError, map, Observable, of, ReplaySubject, Subject, tap, throwError } from 'rxjs';
import { CATCH_ERRORS } from '../http-interceptors/error-interceptor';
import { ErrorService } from './error.service';

export class UnauthenticatedError implements Error {
  readonly name = "UnauthenticatedError";
  constructor(public readonly message: string) {};
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private cachedUser = new AsyncSubject<User | null>();

  constructor(
    private httpClient: HttpClient,
    private errorService: ErrorService
  ) {
    this.invalidateUserCache();
  }

  public invalidateUserCache() {
    this.cachedUser = new AsyncSubject<User | null>();
    this.httpClient.get<User | null>(environment.apiRoot + '/user', {
      context: new HttpContext().set(CATCH_ERRORS, false)
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if(error.status == 401 || error.status == 419) {
          return of(null);
        }
        throw error;
      }),
      this.errorService.interceptErrors()
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

}
