import { Injectable } from '@angular/core';
import { HttpContextToken, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ErrorService } from '../services/error.service';

export const CATCH_ERRORS = new HttpContextToken(() => true);

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private errorService: ErrorService
    ) {}

    intercept(req: HttpRequest<any>, next: HttpHandler) : Observable<HttpEvent<any>> {
        const catchErrors = req.context.get(CATCH_ERRORS);
        let result = next.handle(req);

        if(catchErrors) {
            result = result.pipe(this.errorService.interceptErrors());
        }

        return result;
    }
}
