import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, retry } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  public static readonly unknownErrorMsg = "Unknown error";
  private lastError: Error|null = null;

  constructor(
    private router: Router
  ) {}

  public handleError(error: Error) {
    this.lastError = error;
    this.router.navigateByUrl('/error');
  }

  public clearError(): Error|null {
    const error = this.lastError;
    this.lastError = null;
    return error;
  }

  public interceptErrors() {
    const errorService = this;
    return function<T>(source: Observable<T>): Observable<T> {
      return source.pipe(
        retry(1),
        catchError(error => {
          errorService.handleError(error);
          throw error;
        })
      );
    };
  }
}
