import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable, take } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { PermissionsService } from 'src/app/services/permissions.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit {
  tabs = [
    {
      path: './check-in',
      name: 'Check In',
    }, {
      path: './check-out',
      name: 'Check Out'
    }
  ];

  requiredPermission = 'student check in';

  constructor(
    protected authService: AuthService,
    protected permissionsService: PermissionsService,
    route: ActivatedRoute,
    router: Router
  ) {
    if(route.snapshot.url.length == 0) {
      permissionsService.checkPermissions([this.requiredPermission]).subscribe(authorized => {
        if(authorized) {
          router.navigate(['check-in']);
        }
      })
    }
  }

  protected shouldShowNavBar(): Observable<boolean> {
    return this.authService.getUser().pipe(take(1), map(user => user !== null && user.role_names.length > 0));
  }

  ngOnInit(): void {
  }

}
