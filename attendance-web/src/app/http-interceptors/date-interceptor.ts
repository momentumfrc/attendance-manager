import { Injectable } from '@angular/core';
import { HttpEvent, HttpEventType, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { map, Observable } from 'rxjs';

const date_keys = ['created_at', 'updated_at', 'checkin_date', 'checkout_date'];

@Injectable()
export class DateInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler) : Observable<HttpEvent<any>> {
        return next.handle(req).pipe( map((event: HttpEvent<any>) => {
            if(event.type != HttpEventType.Response) {
                return event;
            }

            let body = event.body;

            this.convertDates(body);

            return event.clone({body: body});
        }));
    }

    private convertDates(object: any) {
        if(!object || !(object instanceof Object)) {
            return;
        }

        if(object instanceof Array) {
            for(const item of object) {
                this.convertDates(item);
            }
        }

        if(object instanceof Object) {
            for(const key of Object.keys(object)) {
                this.convertDates(object[key]);
            }
        }

        date_keys.forEach(key => {
            if(key in object) {
                const value = object[key];
                if(value) {
                    object[key] = new Date(value);
                }
            }
        });

    }
}
