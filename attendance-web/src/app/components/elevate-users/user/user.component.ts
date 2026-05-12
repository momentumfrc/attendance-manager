import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest, map, Observable, take } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/reuse/confirm-dialog/confirm-dialog.component';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
import { PermissionsService } from 'src/app/services/permissions.service';
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

  protected roles = this.permissionsService.getAllRoles().pipe(map(roles => roles.map(role => role.name).concat(['none'])));
  protected loggedInUser = this.authService.getUser();

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private permissionsService: PermissionsService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
  ) { }

  getRoleFromRoles(roles: Array<string>): string {
    if(roles.length == 0) {
      return 'none';
    } else {
      return roles[0];
    }
  }

  currentUserIsLoggedInUser(): Observable<Boolean> {
    return this.loggedInUser.pipe(map(loggedInUser => loggedInUser?.id == this.user.id));
  }

  canElevateUser(): Observable<Boolean> {
    return combineLatest({
      currentUserIsLoggedInUser: this.currentUserIsLoggedInUser(),
      canPromoteUsers: this.permissionsService.checkPermissions(['elevate users'])
    }).pipe(
      map(({currentUserIsLoggedInUser, canPromoteUsers}) => currentUserIsLoggedInUser == false && canPromoteUsers)
    );
  }

  canDeleteUser(): Observable<Boolean> {
    return combineLatest({
      currentUserIsLoggedInUser: this.currentUserIsLoggedInUser(),
      canDeleteUsers: this.permissionsService.checkPermissions(['delete users'])
    }).pipe(
      map(({currentUserIsLoggedInUser, canDeleteUsers}) => currentUserIsLoggedInUser == false && canDeleteUsers && this.user.role_names.length == 0)
    );
  }

  ngOnInit(): void {
    this.selectedRole = new FormControl({value: this.getRoleFromRoles(this.user.role_names), disabled: true});

    this.canElevateUser().pipe(take(1)).subscribe(canElevate => {
      if(canElevate) {
        this.selectedRole.enable();
      }
    });
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

  deleteUser(): void {
    let dialogref = this.dialog.open(ConfirmDialogComponent, {
      width: '320px',
      data: {action: 'Deletion', message: 'Continue deleting user ' + this.user.name + '?', closeColor: 'warn'}
    });
    dialogref.afterClosed().subscribe((confirmed: boolean) => {
      if(!confirmed) {
        return;
      }
      this.usersService.deleteUser(this.user.id).subscribe();
    });
  }

}
