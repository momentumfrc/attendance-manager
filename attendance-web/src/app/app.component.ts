import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './services/auth.service';
import { StudentsService } from './services/students.service';
import { HttpClient } from '@angular/common/http';
import { ServerInfoService } from './services/server-info.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
  title = 'attendance-web';

  readonly logoutUrl = environment.authRoot + '/logout';

  readonly client_hash = environment.gitHash;
  readonly server_hash: Observable<string>;

  constructor(
    protected authService: AuthService,
    protected studentsService: StudentsService,
    protected snackbar: MatSnackBar,
    private serverInfo: ServerInfoService
  ) {
    this.server_hash = serverInfo.getServerHash();
  }

  getFirstName(): Observable<string|null> {
    return this.authService.getUser().pipe(map(user =>
      user?.name.split(" ")[0] ?? null
    ));
  }
}
