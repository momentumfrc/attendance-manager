import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatSelectionList } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';
import { User } from 'src/app/models/user.model';
import { AdminService } from 'src/app/services/admin.service';

@Component({
  selector: 'app-user-role-selector',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  @Input() user!: User
  @ViewChild('selectedRoles') selectedRoles!: MatSelectionList;

  protected roles = this.adminService.getAllRoles();

  constructor(private adminService: AdminService, private snackbar: MatSnackBar) { }

  ngOnInit(): void {
  }

  shouldSelectRole(role: string): boolean {
    return this.user.role_names.includes(role);
  }

  menuClosed(): void {
    let selectedRoles = this.selectedRoles.selectedOptions.selected.map(it => it.value).sort();
    let currentRoles = this.user.role_names.sort();

    var role_did_change = selectedRoles.length != currentRoles.length;
    if(!role_did_change) {
      for(var i = 0; i < selectedRoles.length; i++) {
        if(selectedRoles[i] != currentRoles[i]) {
          role_did_change = true;
          break;
        }
      }
    }
    if(!role_did_change) {
      return;
    }

    this.adminService.syncUserRoles(this.user.id, selectedRoles).subscribe((updatedUser) => {
      this.user = updatedUser;
      let selectedOptions = this.selectedRoles.options.filter(option => this.user.role_names.includes(option.value));
      this.selectedRoles.selectedOptions.setSelection(...selectedOptions);

      this.snackbar.open("Roles updated for " + updatedUser.name, '', {
        duration: 4000
      });
    });
  }

}
