import { Component, OnInit } from '@angular/core';
import { share } from 'rxjs';
import { AdminService } from 'src/app/services/admin.service';

@Component({
  selector: 'app-elevate-users',
  templateUrl: './elevate-users.component.html',
  styleUrls: ['./elevate-users.component.scss']
})
export class ElevateUsersComponent implements OnInit {

  protected users = this.adminService.getAllUsers()
  protected availableRoles = this.adminService.getAllRoles().pipe(share());

  constructor(protected adminService : AdminService) { }

  ngOnInit(): void {
  }

}
