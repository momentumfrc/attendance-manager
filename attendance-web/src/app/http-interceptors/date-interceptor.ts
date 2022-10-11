import { Injectable } from '@angular/core';
import { HttpEvent, HttpEventType, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { map, Observable } from 'rxjs';


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

        if('created_at' in object) {
            object.created_at = new Date(object.created_at);
        }

        if('updated_at' in object) {
            object.updated_at = new Date(object.updated_at);
        }

    }
}
