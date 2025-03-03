import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, RouterStateSnapshot, UrlTree } from '@angular/router';
import { forkJoin, map, Observable, take } from 'rxjs';
import { PermissionsService } from 'src/app/services/permissions.service';

@Injectable({
  providedIn: 'root'
})
export class MustHavePermissionGuard implements CanActivate, CanActivateChild {

  constructor(private permissionsService: PermissionsService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkPermissions(route);
  }
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkPermissions(childRoute);
  }

  private checkPermissions(route: ActivatedRouteSnapshot) : Observable<boolean> {
    let routePermissions = route.data['permissions'] as Array<string>;
    return this.permissionsService.checkPermissions(routePermissions);
  }

}
