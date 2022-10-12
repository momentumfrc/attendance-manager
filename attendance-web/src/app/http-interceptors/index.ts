import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { DateInterceptor } from "./date-interceptor";
import { CredentialsInterceptor } from "./credentials-interceptor";

export const httpInterceptorProviders = [
    { provide: HTTP_INTERCEPTORS, useClass: DateInterceptor, multi: true},
    { provide: HTTP_INTERCEPTORS, useClass: CredentialsInterceptor, multi: true}
];
