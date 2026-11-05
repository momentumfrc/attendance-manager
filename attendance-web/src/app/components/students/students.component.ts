import { Component } from '@angular/core';
import { combineLatest, ReplaySubject } from 'rxjs';
import { PermissionsService } from 'src/app/services/permissions.service';

interface Tab {
  path: string;
  name: string;
}

@Component({
    selector: 'app-students',
    templateUrl: './students.component.html',
    styleUrls: ['./students.component.scss'],
    standalone: false
})
export class StudentsComponent {
  tabs = new ReplaySubject<Tab[]>(1);

  constructor(
    permissionsService: PermissionsService
  ) {

    combineLatest([
      permissionsService.checkPermissions(["add students"]),
      permissionsService.checkPermissions(["view student registration"])
    ]).subscribe(([userMayAddStudents, userMayViewRegistration]) => {
      let tabs: Tab[] = [
        {
          path: './list',
          name: 'List Students',
        }
      ];

      if(userMayViewRegistration) {
        tabs.push({
          path: './registration',
          name: 'Registration'
        });
      }

      if(userMayAddStudents) {
        tabs.push({
          path: './add',
          name: 'Add Student'
        });
      }

      this.tabs.next(tabs);
    })
  }

}
