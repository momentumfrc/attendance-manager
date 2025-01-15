import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

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

  allowedRoles = ['mentor', 'student-lead'];

  constructor(
    protected authService: AuthService,
    route: ActivatedRoute,
    router: Router
  ) {
    if(route.snapshot.url.length == 0 && authService.checkHasAnyRole(this.allowedRoles)) {
      router.navigate(['check-in']);
    }
  }

  ngOnInit(): void {
  }

}
