import { Component } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'attendence-web';

  readonly logoutUrl = environment.authRoot + '/logout';

  constructor(protected authService: AuthService) {}

  getFirstName(): Observable<string|null> {
    return this.authService.getUser().pipe(map(user =>
      user?.name.split(" ")[0] ?? null
    ));
  }
}
