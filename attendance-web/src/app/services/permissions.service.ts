import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, ReplaySubject, switchMap, take } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Permission, Role, RolesResponse } from 'src/app/models/role.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private readonly roles = new ReplaySubject<Map<string, Role>>(1);
  private readonly permissions = new ReplaySubject<Permission[]>(1);

  constructor(private httpClient: HttpClient, private authService: AuthService) {
    this.httpClient.get<RolesResponse>(environment.apiRoot + '/roles').subscribe(roles => {
      this.roles.next(new Map(roles.roles.map(role => [role.name, role])));
      this.permissions.next(roles.permissions);
    });
  }

  public getAllRoles(): Observable<Role[]> {
    return this.roles.pipe(map(roles => Array.from(roles.values())));
  }

  public checkPermissions(permissions: string[]): Observable<boolean> {
    return this.authService.getUser().pipe(
      take(1),
      switchMap(user => this.roles.pipe(map(roles => {
        if(user === null) {
          return false;
        }

        return user.role_names.reduce((prev, role) => {
          if(prev) {
            return true;
          }

          if(!roles.has(role)) {
            return false;
          }

          const role_permissions = roles.get(role)!!.permissions;
          return permissions.reduce((prev, permission) => prev && role_permissions.includes(permission), true);
        }, false);
      }
      ))
    ));
  }
}
