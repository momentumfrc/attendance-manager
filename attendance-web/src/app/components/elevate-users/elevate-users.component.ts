import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { combineLatest, map, Observable, startWith, Subject } from 'rxjs';
import { User } from 'src/app/models/user.model';
import { AdminService } from 'src/app/services/admin.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-elevate-users',
  templateUrl: './elevate-users.component.html',
  styleUrls: ['./elevate-users.component.scss']
})
export class ElevateUsersComponent implements OnInit {

  protected users = new Subject<Array<User>>();

  constructor(private adminService : AdminService, private authService: AuthService) { }

  searchControl = new FormControl('');

  ngOnInit(): void {
    combineLatest([
      this.adminService.getAllUsers(),
      this.authService.getUser(),
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(map((inputs) => {
      const users = inputs[0] as Array<User>
      const loggedInUser = inputs[1] as User;
      const search = (inputs[2] as string).toLocaleLowerCase();

      let retval = users.filter(user => user.id != loggedInUser.id);

      if(search != "") {
        retval = retval.filter(user => user.name.split(' ').some(namePart => namePart.toLocaleLowerCase().startsWith(search)));
      };

      retval = retval.sort();

      return retval;
    })).subscribe(this.users);
  }

  noUsers(): Observable<boolean> {
    return this.users.pipe(map(users => users.length == 0));
  }

}