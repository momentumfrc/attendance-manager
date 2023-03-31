import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { DateInterceptor } from "./date-interceptor";
import { CredentialsInterceptor } from "./credentials-interceptor";
import { ErrorInterceptor } from "./error-interceptor";

export const httpInterceptorProviders = [
    { provide: HTTP_INTERCEPTORS, useClass: DateInterceptor, multi: true},
    { provide: HTTP_INTERCEPTORS, useClass: CredentialsInterceptor, multi: true},
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true}
];
