import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { DateInterceptor } from "./date-interceptor";

export const httpInterceptorProviders = [
    { provide: HTTP_INTERCEPTORS, useClass: DateInterceptor, multi: true}
];
