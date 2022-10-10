import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { environment } from 'src/environments/environment';

import { User } from 'src/app/models/user.model';
import { catchError, map, Observable, of, throwError } from 'rxjs';

export class UnauthenticatedError implements Error {
  readonly name = "UnauthenticatedError";
  constructor(public readonly message: string) {};
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private httpClient: HttpClient) { }

  public logIn() : void {
    window.location.href = "/auth/redirect";
  }

  public getUser() : Observable<User> {
    return this.httpClient.get<User>(environment.apiRoot + '/user');
  }

  public checkLoggedIn(): Observable<boolean> {
    return this.getUser().pipe(
      map((_: User) => true),
      catchError((error: HttpErrorResponse) => {
        if(error.status == 401 || error.status == 419) {
          return of(false);
        }
        return throwError(() => error);
      })
    );
  }

}
