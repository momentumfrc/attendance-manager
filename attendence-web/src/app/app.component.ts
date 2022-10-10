import { Component } from '@angular/core';
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
}
