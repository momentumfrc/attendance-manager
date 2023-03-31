import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ErrorService } from '../services/error.service';


@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private errorServcie: ErrorService
    ) {}

    intercept(req: HttpRequest<any>, next: HttpHandler) : Observable<HttpEvent<any>> {
        return next.handle(req).pipe(this.errorServcie.interceptErrors());
    }
}
