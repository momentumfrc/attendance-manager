import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, startWith } from 'rxjs';
import { User } from 'src/app/models/user.model';
import { UsersService } from 'src/app/services/users.service';
import { AuthService } from 'src/app/services/auth.service';
import { SearchBoxComponent } from '../reuse/search-box/search-box.component';

@Component({
  selector: 'app-elevate-users',
  templateUrl: './elevate-users.component.html',
  styleUrls: ['./elevate-users.component.scss']
})
export class ElevateUsersComponent implements AfterViewInit {

  @ViewChild(SearchBoxComponent) searchBox!: SearchBoxComponent

  protected users = new BehaviorSubject<Array<User>>([]);

  constructor(private usersService : UsersService, private authService: AuthService) { }

  ngAfterViewInit(): void {
    console.log(this.searchBox)
    combineLatest([
      this.usersService.getAllUsers(),
      this.authService.getUser(),
      this.searchBox.searchUpdatedEvent.pipe(startWith(""))
    ]).pipe(map((inputs) => {
      const users = inputs[0] as Array<User>
      const loggedInUser = inputs[1] as User;
      const search = (inputs[2] as string).toLocaleLowerCase();

      let retval = users.filter(user => user.id != loggedInUser.id);

      if(search != "") {
        retval = retval.filter(user => user.name.toLocaleLowerCase().includes(search));
      };

      retval = retval.sort();

      return retval;
    })).subscribe(this.users);
  }

  noUsers(): Observable<boolean> {
    return this.users.pipe(map(users => users.length == 0));
  }

}
