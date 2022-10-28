import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, ReplaySubject, startWith } from 'rxjs';
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

  protected users = new ReplaySubject<Array<User>>(1);

  constructor(private usersService : UsersService, private authService: AuthService) { }

  ngAfterViewInit(): void {
    console.log(this.searchBox)
    combineLatest([
      this.usersService.getAllUsers(),
      this.searchBox.searchUpdatedEvent.pipe(startWith(""))
    ]).pipe(map(([users, search]) => {
      let retval = users;

      const lcSearch = search.toLocaleLowerCase();

      if(lcSearch != "") {
        retval = retval.filter(user => user.name.toLocaleLowerCase().includes(lcSearch));
      };

      retval = retval.sort();

      return retval;
    })).subscribe(this.users);
  }

  noUsers(): Observable<boolean> {
    return this.users.pipe(map(users => users.length == 0));
  }

}
