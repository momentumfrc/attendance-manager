import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectionList } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, map } from 'rxjs';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
    selector: 'app-user-role-selector',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss'],
    standalone: false
})
export class UserComponent implements OnInit {
  @Input() user!: User

  protected selectedRole! : FormControl<string|null>

  protected roles = this.usersService.getAllRoles().pipe(map(roles => roles.concat(['none'])));
  protected loggedInUser = this.authService.getUser();

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private snackbar: MatSnackBar
  ) { }

  getRoleFromRoles(roles: Array<string>): string {
    if(roles.length == 0) {
      return 'none';
    } else {
      return roles[0];
    }
  }

  ngOnInit(): void {
    this.selectedRole = new FormControl(this.getRoleFromRoles(this.user.role_names));
  }

  menuClosed(): void {
    let selectedRole = this.selectedRole.value;
    if(selectedRole == null) {
      return;
    }
    let role_did_change =
      this.user.role_names.length > 1
      || (this.user.role_names.length == 0 && selectedRole != 'none')
      || (this.user.role_names.length > 0 && this.user.role_names[0] != selectedRole);

    if(!role_did_change) {
      return;
    }

    let rolesArr: Array<string> = [];
    if(selectedRole != 'none') {
      rolesArr = [selectedRole];
    }

    this.usersService.syncUserRoles(this.user.id, rolesArr).subscribe((updatedUser) => {
      this.user = updatedUser;
      const role = this.getRoleFromRoles(updatedUser.role_names);
      this.selectedRole.setValue(role);
      this.snackbar.open("Updated role for " + updatedUser.name + " to " + role, '', {
        duration: 4000
      });
    });
  }

}
