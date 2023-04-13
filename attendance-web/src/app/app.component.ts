import { Component, HostListener } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './services/auth.service';
import { StudentsService } from './services/students.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'attendance-web';

  readonly logoutUrl = environment.authRoot + '/logout';

  constructor(
    protected authService: AuthService,
    protected studentsService: StudentsService,
    protected snackbar: MatSnackBar
  ) {}

  getFirstName(): Observable<string|null> {
    return this.authService.getUser().pipe(map(user =>
      user?.name.split(" ")[0] ?? null
    ));
  }
}
