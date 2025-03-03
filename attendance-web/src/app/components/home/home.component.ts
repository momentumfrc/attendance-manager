import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterEvent } from '@angular/router';
import { filter, map, Observable, Subscription, take } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { PermissionsService } from 'src/app/services/permissions.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  tabs = [
    {
      path: './check-in',
      name: 'Check In',
    }, {
      path: './check-out',
      name: 'Check Out'
    }
  ];

  requiredPermission = 'list attendance events';

  routersub!: Subscription;

  constructor(
    protected permissionsService: PermissionsService,
    protected route: ActivatedRoute,
    protected router: Router
  ) {
  }

  protected shouldShowAttendanceEvents(): Observable<boolean> {
    return this.permissionsService.checkPermissions(['list attendance events']);
  }

  ngOnInit(): void {
    if(this.route.snapshot.url.length == 0) {
      this.permissionsService.checkPermissions([this.requiredPermission]).subscribe(authorized => {
        if(authorized) {
          this.router.navigate(['check-in']);
        }
      })
    }

    this.routersub = this.router.events.pipe(
      filter(e => e instanceof RouterEvent)
    ).subscribe(event => {
      if(event.url == '/') {
        this.permissionsService.checkPermissions([this.requiredPermission]).subscribe(authorized => {
          if(authorized) {
            this.router.navigate(['check-in']);
          }
        })
      }
    });
  }

  ngOnDestroy(): void {
    this.routersub.unsubscribe();
  }

}
