import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { map, Observable } from 'rxjs';
import { PermissionsService } from 'src/app/services/permissions.service';

@Injectable({
  providedIn: 'root'
})
export class MustHavePermissionGuard implements CanActivate, CanActivateChild {

  constructor(private permissionsService: PermissionsService, private router: Router) {}

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

  private checkPermissions(route: ActivatedRouteSnapshot) : Observable<boolean | UrlTree> {
    let routePermissions = route.data['permissions'] as Array<string>;
    return this.permissionsService.checkPermissions(routePermissions).pipe(
      map(hasPermission => hasPermission ? true : this.router.parseUrl("/"))
    );
  }

}
