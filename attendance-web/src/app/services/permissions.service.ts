import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { Role, RolesResponse } from 'src/app/models/role.model';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private readonly roles: Observable<Map<string, Role>>;

  constructor(private httpClient: HttpClient, private authService: AuthService) {
    this.roles = this.httpClient.get<RolesResponse>(environment.apiRoot + '/roles').pipe(
      map(rolesResponse => new Map(rolesResponse.roles.map(role => [role.name, role]))),
      shareReplay(1)
    );
  }

  public getAllRoles(): Observable<Role[]> {
    return this.roles.pipe(map(roles => Array.from(roles.values())));
  }

  public getCurrentUserPermissions(): Observable<string[]> {
    return this.authService.getUser().pipe(
      switchMap(user => user === null ? of([])
        : this.roles.pipe(
          map(roles => user.role_names.flatMap(role => roles.get(role)?.permissions ?? []))
        )
      )
    );
  }

  public checkPermissions(neededPermissions: string[]): Observable<boolean> {
    return this.getCurrentUserPermissions().pipe(
      map(userPermissions => {
        return neededPermissions.reduce((allowed, neededPermission) => allowed && userPermissions.includes(neededPermission), true);
      })
    );
  }
}
